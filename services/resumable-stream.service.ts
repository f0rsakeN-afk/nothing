/**
 * Resumable Stream Service
 * Enables resume capability for AI chat streams using Redis persistence
 * and cross-process stop signaling via pub/sub
 *
 * Uses ai-sdk/openai for smooth SSE streaming with createUIMessageStream.
 * Pattern copied from scira's implementation.
 */

import { createResumableUIMessageStream } from "ai-resumable-stream";
import { createClient } from "redis";
import { streamText, createUIMessageStream, JsonToSseTransformStream, tool } from "ai";
import { eryxProvider } from "@/lib/ai/providers";
import { aiConfig } from "@/lib/config";
import { after } from "next/server";

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

interface StartStreamOptions {
  tools?: MCPTool[];
  onToolCall?: (toolCalls: ToolCall[]) => Promise<ToolResult[]>;
  onToolEvent?: (event: { type: 'tool_call' | 'tool_result' | 'tool_error'; toolCallId?: string; toolName?: string; result?: unknown; error?: string | undefined }) => void;
  systemPrompt?: string;
}

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("REDIS_URL not set, using localhost:6380");
    return createClient({ url: "redis://localhost:6380" });
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
const activeStreamIds = new Set<string>();

export function getStreamId(chatId: string): string {
  return `chat:${chatId}:stream`;
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
  }

  activeStreamIds.delete(streamId);
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
  const { tools, onToolCall, onToolEvent, systemPrompt } = options || {};

  if (activeStreamIds.has(streamId)) {
    console.warn(`[ResumableStream] Stream already active for ${streamId}`);
    return {
      stream: new ReadableStream({ start(c) { c.close(); } }),
      stop: () => cleanupStream(chatId),
    };
  }

  const abortController = new AbortController();
  streamAbortControllers.set(chatId, abortController);
  activeStreamIds.add(streamId);

  const model = tools?.length ? aiConfig.modelWithTools : aiConfig.model;

  // Build tools for ai-sdk
  const aiTools: Record<string, any> = {};
  if (tools?.length) {
    for (const t of tools) {
      aiTools[t.function.name] = {
        description: t.function.description,
        parameters: t.function.parameters as any,
        execute: async (args: Record<string, unknown>) => {
          const result = await onToolCall?.([{ id: "", name: t.function.name, arguments: args }]);
          return result?.[0]?.result;
        },
      };
    }
  }

  const assistantMessageCreatedAt = new Date().toISOString();

  // Create the stream using scira's exact pattern
  // onFinish is OUTSIDE execute - this is critical for receiving complete messages
  const stream = createUIMessageStream({
    execute: async ({ writer: dataStream }: { writer: any }) => {
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
            onChunk?.(event.chunk.textDelta, false);
          }
          if (event.chunk.type === 'tool-call') {
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

      dataStream.merge(uiMessageStream as any);
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

      // Extract content from streamed messages (scira pattern)
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

      if (fullContent && fullContent.trim().length > 0) {
        onComplete?.(fullContent, false);
      } else {
        console.warn("[ResumableStream] No content to save - fullContent:", JSON.stringify(fullContent?.slice(0, 200)));
      }
    },
  });

  // Try to wrap with resumable stream, fallback to plain stream
  let wrappedStream: ReadableStream;
  try {
    const { startStream } = await getResumableStreamInstance(chatId);
    console.log("[ResumableStream] Starting resumable stream for chatId:", chatId);
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

  if (activeStreamIds.has(streamId)) {
    return null;
  }

  const abortController = new AbortController();
  streamAbortControllers.set(chatId, abortController);
  activeStreamIds.add(streamId);

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

              const content = (chunk as { delta?: string }).delta || (chunk as { content?: string }).content;
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

    if ((error as Error).message?.includes("not found") ||
        (error as Error).message?.includes("expired") ||
        (error as Error).message?.includes("no existing stream")) {
      return null;
    }

    throw error;
  }
}

export async function stopResumableStream(chatId: string): Promise<void> {
  cleanupStream(chatId);

  try {
    const { stopStream } = await getResumableStreamInstance(chatId);
    await stopStream();
  } catch (error) {
    console.warn("[ResumableStream] Failed to broadcast stop:", error);
  }
}

export function isStreamActive(chatId: string): boolean {
  return activeStreamIds.has(getStreamId(chatId));
}

export function getActiveStreams(): string[] {
  return Array.from(activeStreamIds);
}
