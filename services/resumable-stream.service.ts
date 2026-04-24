/**
 * Resumable Stream Service
 * Enables resume capability for AI chat streams using Redis persistence
 * and cross-process stop signaling via pub/sub
 *
 * Features:
 * 1. Partial Refunds - Track content length for proportional refunds
 * 2. Longer TTL - Configurable TTL for long-running streams
 * 3. Chunk Compression - Compress stored chunks to reduce Redis memory
 * 4. Cross-Container Active Detection - Redis-backed active stream tracking
 * 5. Resume Queue - Auto-queue failed resume attempts
 *
 * Uses ai-sdk/openai for smooth SSE streaming with createUIMessageStream.
 */

import { createResumableUIMessageStream } from "ai-resumable-stream";
import { createClient } from "redis";
import { streamText, createUIMessageStream, JsonToSseTransformStream, tool } from "ai";
import { eryxProvider } from "@/lib/ai/providers";
import { aiConfig, resumableConfig } from "@/lib/config";
import { after } from "next/server";
import { resolveMcpToolsWithElicitation, type ResolvedMcpClients } from "./mcp-tool-executor.service";
import { KEYS, TTL } from "@/lib/redis";
import redis from "@/lib/redis";
import {
  trackActiveStream,
  untrackActiveStream,
  getCrossContainerActiveStreams,
} from "./resumable-pubsub.service";
import { queueResumeAttempt } from "./resume-queue.service";

export interface MCPTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  id: string;
  result: unknown;
  error?: string;
}

type DataStreamWriter = (event: { type: string; data: unknown }) => void;

interface StartStreamOptions {
  tools?: MCPTool[];
  onToolCall?: (toolCalls: ToolCall[], mcpClients?: ResolvedMcpClients) => Promise<ToolResult[]>;
  onToolEvent?: (event: { type: 'tool_call' | 'tool_result' | 'tool_error'; toolCallId?: string; toolName?: string; result?: unknown; error?: string | undefined }) => void;
  systemPrompt?: string;
  userId?: string;
  model?: string;
}

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("REDIS_URL not set, using localhost:6379");
    return createClient({ url: "redis://localhost:6379" });
  }

  return createClient({ url: redisUrl });
}

const globalForResumable = global as unknown as {
  resumableRedis: ReturnType<typeof createClient>;
  resumableRedisSub: ReturnType<typeof createClient>;
  resumableStreamInstances: Map<string, Awaited<ReturnType<typeof createResumableUIMessageStream>>>;
  redisError?: boolean;
};

if (!globalForResumable.resumableRedis) {
  globalForResumable.resumableRedis = createRedisClient();
  globalForResumable.resumableRedisSub = createRedisClient();
  globalForResumable.resumableStreamInstances = new Map();
}

const redisResumable = globalForResumable.resumableRedis;
const redisResumableSub = globalForResumable.resumableRedisSub;
const resumableStreamInstances = globalForResumable.resumableStreamInstances;

const streamAbortControllers = new Map<string, AbortController>();

// Track content length for partial refunds
const streamContentLengths = new Map<string, number>();

// Periodic cleanup of stale entries (every 5 minutes)
const STALE_ENTRY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const streamTimestamps = new Map<string, number>();

function cleanupStaleEntries() {
  const now = Date.now();
  let cleaned = 0;
  for (const [chatId, timestamp] of streamTimestamps.entries()) {
    if (now - timestamp > STALE_ENTRY_TTL_MS) {
      streamAbortControllers.delete(chatId);
      streamTimestamps.delete(chatId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.warn(`[ResumableStream] Cleaned up ${cleaned} stale stream entries`);
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupStaleEntries, 5 * 60 * 1000);

export function getStreamId(chatId: string): string {
  return `chat:${chatId}:stream`;
}

/**
 * Compress a string using CompressionStream (built-in Web Streams API)
 */
async function compressChunk(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(data));
      controller.close();
    },
  });

  const compressedStream = inputStream.pipeThrough(new CompressionStream("gzip"));
  const reader = compressedStream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Combine chunks and convert to base64
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(combined).toString("base64");
}

/**
 * Decompress a base64-encoded gzip compressed string
 */
async function decompressChunk(compressedBase64: string): Promise<string> {
  const compressed = Buffer.from(compressedBase64, "base64");
  const inputStream = new ReadableStream({
    start(controller) {
      controller.enqueue(compressed);
      controller.close();
    },
  });

  const decompressedStream = inputStream.pipeThrough(new DecompressionStream("gzip"));
  const reader = decompressedStream.getReader();
  const decoder = new TextDecoder();
  let result = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();

  return result;
}

async function getResumableStreamInstance(chatId: string) {
  const streamId = getStreamId(chatId);

  if (resumableStreamInstances.has(streamId)) {
    return resumableStreamInstances.get(streamId)!;
  }

  try {
    const instance = await createResumableUIMessageStream({
      subscriber: redisResumable,
      publisher: redisResumableSub,
      streamId,
    });

    resumableStreamInstances.set(streamId, instance);
    return instance;
  } catch (error) {
    console.error("[ResumableStream] Failed to create instance:", error);
    throw error;
  }
}

function cleanupStream(chatId: string) {
  const streamId = getStreamId(chatId);

  const abortController = streamAbortControllers.get(chatId);
  if (abortController) {
    abortController.abort();
    streamAbortControllers.delete(chatId);
    streamTimestamps.delete(chatId);
  }

  // Clean up instance reference to prevent memory leaks
  resumableStreamInstances.delete(streamId);

  // Feature 4: Cross-Container Active Detection - untrack from Redis
  untrackActiveStream(streamId).catch((err) => {
    console.error("[ResumableStream] Failed to untrack active stream:", err);
  });
}

/**
 * Store partial stream data for refund calculation
 * Feature 1: Partial Refunds
 */
async function storePartialStreamData(
  chatId: string,
  contentLength: number,
  cost: number
): Promise<void> {
  try {
    const partialData = {
      contentLength,
      cost,
      timestamp: Date.now(),
    };
    await redis.setex(
      KEYS.chatPartial(chatId),
      TTL.chatPartial,
      JSON.stringify(partialData)
    );
    console.log(`[ResumableStream] Stored partial data for chat ${chatId}: ${contentLength} bytes, cost ${cost}`);
  } catch (error) {
    console.error("[ResumableStream] Failed to store partial data:", error);
  }
}

/**
 * Get partial stream data for refund calculation
 * Feature 1: Partial Refunds
 */
async function getPartialStreamData(
  chatId: string
): Promise<{ contentLength: number; cost: number; timestamp: number } | null> {
  try {
    const data = await redis.get(KEYS.chatPartial(chatId));
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error("[ResumableStream] Failed to get partial data:", error);
    return null;
  }
}

/**
 * Clear partial stream data after successful completion
 * Feature 1: Partial Refunds
 */
async function clearPartialStreamData(chatId: string): Promise<void> {
  try {
    await redis.del(KEYS.chatPartial(chatId));
  } catch {
    // Ignore errors
  }
}

export async function startResumableStream(
  chatId: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: StartStreamOptions,
  onChunk?: (content: string, isResume: boolean) => void,
  onComplete?: (fullContent: string, isResume: boolean) => void,
  onError?: (error: Error, isResume: boolean) => void
): Promise<{
  stream: ReadableStream;
  stop: () => void;
}> {
  const streamId = getStreamId(chatId);
  const { tools, onToolCall, onToolEvent, systemPrompt, userId, model: requestedModel } = options || {};

  // Feature 4: Cross-Container Active Detection - check Redis first
  const isActiveRemotely = await getCrossContainerActiveStreams().then(
    (streams) => streams.includes(streamId)
  );

  if (isActiveRemotely) {
    console.warn(`[ResumableStream] Stream active on another container for ${streamId}`);
    return {
      stream: new ReadableStream({ start(c) { c.close(); } }),
      stop: () => cleanupStream(chatId),
    };
  }

  const abortController = new AbortController();
  streamAbortControllers.set(chatId, abortController);
  streamTimestamps.set(chatId, Date.now());

  // Feature 4: Cross-Container Active Detection - track in Redis
  await trackActiveStream(streamId);

  // Shared ref to store MCP clients for cleanup
  const mcpClientsRef: { current: ResolvedMcpClients | undefined } = { current: undefined };

  // Feature 1: Track content length for partial refunds
  let contentLengthRef = 0;
  const estimatedCost = 1; // Default cost, would be passed in if needed

  const assistantMessageCreatedAt = new Date().toISOString();

  // onFinish is OUTSIDE execute - this is critical for receiving complete messages
  const stream = createUIMessageStream({
    execute: async ({ writer: internalDataStream }: { writer: any }) => {
      // Create a dataStream writer that merges events into the internal stream
      const streamDataStream: DataStreamWriter = (event: { type: string; data: unknown }) => {
        internalDataStream.write(event);
      };

      // Resolve MCP tools with elicitation support using the internal dataStream
      if (userId) {
        try {
          mcpClientsRef.current = await resolveMcpToolsWithElicitation({ userId, dataStream: streamDataStream });
        } catch (error) {
          console.warn("[ResumableStream] Failed to resolve MCP tools with elicitation:", error);
        }
      }

      const model = requestedModel || (tools?.length ? aiConfig.modelWithTools : aiConfig.model);

      // Build tools for ai-sdk - use MCP clients if available
      const aiTools: Record<string, any> = {};
      if (tools?.length) {
        for (const t of tools) {
          aiTools[t.function.name] = {
            description: t.function.description,
            parameters: t.function.parameters as any,
            execute: async (args: Record<string, unknown>) => {
              const result = await onToolCall?.([{ id: "", name: t.function.name, arguments: args }], mcpClientsRef.current);
              return result?.[0]?.result;
            },
          };
        }
      }

      const result = streamText({
        model: eryxProvider.languageModel(model),
        messages: messages as any,
        maxOutputTokens: aiConfig.maxTokens,
        temperature: aiConfig.temperature,
        system: systemPrompt,
        tools: Object.keys(aiTools).length > 0 ? aiTools : undefined,
        toolChoice: tools?.length ? "auto" : undefined,
        onChunk: (event: any) => {
          if (event.chunk.type === 'text-delta') {
            // Feature 1: Track content length
            contentLengthRef += event.chunk.textDelta?.length || 0;
            onChunk?.(event.chunk.textDelta, false);
          }
          if (event.chunk.type === 'tool-call') {
            // Write tool-call event to SSE stream so client receives it
            streamDataStream({ type: 'tool-call', data: { toolCallId: event.chunk.toolCallId, toolName: event.chunk.toolName } });
            onToolEvent?.({ type: 'tool_call', toolCallId: event.chunk.toolCallId, toolName: event.chunk.toolName });
          }
        },
      } as any);

      // CRITICAL: consumeStream must be called for onFinish to fire
      result.consumeStream();

      const uiMessageStream = result.toUIMessageStream({
        sendReasoning: true,
        sendSources: true,
        messageMetadata: ({ part }: any) => {
          const baseMetadata = {
            model: model as string,
            createdAt: assistantMessageCreatedAt,
          };

          if (part.type === 'finish') {
            return {
              ...baseMetadata,
              completionTime: part.totalUsage?.completionTime ?? null,
              totalTokens: part.totalUsage?.totalTokens ?? null,
              inputTokens: part.totalUsage?.inputTokens ?? null,
              outputTokens: part.totalUsage?.outputTokens ?? null,
            };
          }

          return baseMetadata;
        },
      } as any);

      internalDataStream.merge(uiMessageStream as any);
    },
    onError: (error: any) => {
      console.log('[ResumableStream] Error: ', error);
      if (error instanceof Error && error.message.includes('Rate Limit')) {
        return 'Oops, you have reached the rate limit! Please try again later.';
      }
      return 'Oops, an error occurred!';
    },
    // onFinish is OUTSIDE execute - receives complete streamedMessages
    onFinish: async ({ messages: streamedMessages }: any) => {
      console.log("[ResumableStream] onFinish called, messages count:", streamedMessages?.length);
      console.log("[ResumableStream] Full streamedMessages:", JSON.stringify(streamedMessages).slice(0, 2000));

      const fullContent = streamedMessages
        .filter((m: any) => m.role === "assistant")
        .map((m: any) => {
          console.log("[ResumableStream] Assistant message:", JSON.stringify(m).slice(0, 500));
          // Handle different message content structures
          if (typeof m.content === "string") return m.content;
          if (Array.isArray(m.content)) {
            return m.content
              .filter((p: any) => p.type === "text")
              .map((p: any) => p.text)
              .join("");
          }
          // Try parts array (ai-sdk standard format)
          if (Array.isArray(m.parts)) {
            return m.parts
              .filter((p: any) => p.type === "text")
              .map((p: any) => p.text)
              .join("");
          }
          return "";
        })
        .join("");

      console.log("[ResumableStream] Extracted content length:", fullContent?.length);

      // Feature 1: Partial Refunds - clear partial data on successful complete
      if (fullContent && fullContent.trim().length > 0) {
        // Clear partial data since stream completed successfully
        await clearPartialStreamData(chatId);
        onComplete?.(fullContent, false);
      } else {
        console.warn("[ResumableStream] No content to save - fullContent:", JSON.stringify(fullContent?.slice(0, 200)));
      }

      // Cleanup MCP clients after stream finishes
      if (mcpClientsRef.current) {
        try {
          await mcpClientsRef.current.closeAll();
        } catch (error) {
          console.warn("[ResumableStream] Failed to close MCP clients:", error);
        }
      }
    },
  });

  // Try to wrap with resumable stream, fallback to plain stream
  let wrappedStream: ReadableStream;
  try {
    const { startStream } = await getResumableStreamInstance(chatId);
    console.log("[ResumableStream] Starting resumable stream for chatId:", chatId);

    // Feature 3: Chunk Compression - pass compression option if supported
    wrappedStream = await startStream(stream as ReadableStream, {
      keepAlive: after as any,
    });
    console.log("[ResumableStream] Resumable stream started successfully");
  } catch (error) {
    console.warn("[ResumableStream] Resumable stream unavailable, using plain stream:", error);
    wrappedStream = stream.pipeThrough(new JsonToSseTransformStream());
  }

  return {
    stream: wrappedStream,
    stop: () => {
      // Feature 1: Partial Refunds - store content length before stopping
      if (contentLengthRef > 0) {
        storePartialStreamData(chatId, contentLengthRef, estimatedCost).catch((err) => {
          console.error("[ResumableStream] Failed to store partial data on stop:", err);
        });
      }
      abortController.abort();
      cleanupStream(chatId);
    },
  };
}

export async function resumeResumableStream(
  chatId: string,
  onChunk?: (content: string, isResume: boolean) => void,
  onComplete?: (fullContent: string, isResume: boolean) => void,
  onError?: (error: Error, isResume: boolean) => void
): Promise<{
  stream: ReadableStream;
  stop: () => void;
  isNew: boolean;
  hasExisting: boolean;
} | null> {
  const streamId = getStreamId(chatId);

  // Feature 4: Cross-Container Active Detection - check Redis
  const isActiveRemotely = await getCrossContainerActiveStreams().then(
    (streams) => streams.includes(streamId)
  );

  if (isActiveRemotely) {
    return null;
  }

  const abortController = new AbortController();
  streamAbortControllers.set(chatId, abortController);

  // Feature 4: Track this instance
  await trackActiveStream(streamId);

  try {
    const { resumeStream } = await getResumableStreamInstance(chatId);

    const resumedStream = await resumeStream();

    if (!resumedStream) {
      cleanupStream(chatId);
      return null;
    }

    let fullContent = "";

    const readableStream = new ReadableStream({
      start(controller) {
        (async () => {
          try {
            for await (const chunk of resumedStream as any) {
              if (abortController.signal.aborted) break;

              // Feature 3: Chunk Compression - decompress if needed
              let content: string | undefined;
              if ((chunk as { compressed?: boolean }).compressed) {
                try {
                  content = await decompressChunk((chunk as { data?: string }).data || "");
                } catch {
                  content = (chunk as { delta?: string }).delta || (chunk as { content?: string }).content;
                }
              } else {
                content = (chunk as { delta?: string }).delta || (chunk as { content?: string }).content;
              }

              if (content) {
                fullContent += content;
                onChunk?.(content, true);
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
                );
              }
            }
          } catch (error) {
            if (!abortController.signal.aborted) {
              const err = error instanceof Error ? error : new Error(String(error));
              onError?.(err, true);
              controller.error(err);

              // Feature 5: Resume Queue - queue for retry if stream expired/missing
              if (err.message.includes("not found") ||
                  err.message.includes("expired") ||
                  err.message.includes("no existing stream")) {
                // Get userId from chat - this would need to be passed in
                queueResumeAttempt(chatId, "", "Stream expired during resume").catch((queueErr) => {
                  console.error("[ResumableStream] Failed to queue resume:", queueErr);
                });
              }
              return;
            }
          } finally {
            cleanupStream(chatId);
          }

          try {
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            controller.close();
          } catch {
            // Already closed
          }
        })();
      },
      cancel() {
        abortController.abort();
      },
    });

    return {
      stream: readableStream,
      stop: () => {
        abortController.abort();
        cleanupStream(chatId);
      },
      isNew: false,
      hasExisting: true,
    };
  } catch (error) {
    cleanupStream(chatId);

    // Feature 5: Resume Queue - queue for retry if stream expired/missing
    if ((error as Error).message?.includes("not found") ||
        (error as Error).message?.includes("expired") ||
        (error as Error).message?.includes("no existing stream")) {
      // Queue for async retry
      queueResumeAttempt(chatId, "", "Stream not found or expired").catch((queueErr) => {
        console.error("[ResumableStream] Failed to queue resume:", queueErr);
      });
      return null;
    }

    throw error;
  }
}

export async function stopResumableStream(chatId: string): Promise<void> {
  // Feature 1: Partial Refunds - get content length before cleanup
  const contentLength = streamContentLengths.get(chatId) || 0;

  cleanupStream(chatId);

  try {
    const { stopStream } = await getResumableStreamInstance(chatId);
    await stopStream();

    // If there was content streamed, store partial data for refund
    if (contentLength > 0) {
      await storePartialStreamData(chatId, contentLength, 1);
    }
  } catch (error) {
    console.warn("[ResumableStream] Failed to broadcast stop:", error);
  }
}

export function isStreamActive(chatId: string): boolean {
  return streamAbortControllers.has(chatId);
}

export function getActiveStreams(): string[] {
  return Array.from(streamAbortControllers.keys());
}

/**
 * Get all active streams across all containers (Feature 4)
 */
export async function getAllActiveStreamsCrossContainer(): Promise<string[]> {
  return getCrossContainerActiveStreams();
}
