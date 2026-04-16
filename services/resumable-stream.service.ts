/**
 * Resumable Stream Service
 * Enables resume capability for AI chat streams using Redis persistence
 * and cross-process stop signaling via pub/sub
 *
 * Supports MCP tools via the tools/onToolCall options.
 */

import { createResumableUIMessageStream } from "ai-resumable-stream";
import { createClient } from "redis";
import { getCircuitBreaker } from "@/services/circuit-breaker.service";
import Groq from "groq-sdk";
import { Stream } from "groq-sdk/core/streaming";
import { aiConfig } from "@/lib/config";

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
  /**
   * Optional MCP tools to pass to the AI model.
   * If provided, the model will be called with tools support.
   */
  tools?: MCPTool[];

  /**
   * Callback to execute MCP tool calls.
   * Called when the AI model requests a tool call.
   * Should return the tool results.
   */
  onToolCall?: (toolCalls: ToolCall[]) => Promise<ToolResult[]>;

  /**
   * Callback for tool-related events (start, complete, error)
   */
  onToolEvent?: (event: { type: 'tool_call' | 'tool_result' | 'tool_error'; toolCallId?: string; toolName?: string; result?: unknown; error?: string | undefined }) => void;
}

// Redis configuration - use redis package for ai-resumable-stream compatibility
function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn("REDIS_URL not set, using localhost");
    return createClient({ url: "redis://localhost:6379" });
  }

  return createClient({ url: redisUrl });
}

// Singleton Redis clients for resumable streams
// These persist across serverless invocations in the same warm container
const globalForResumable = global as unknown as {
  resumableRedis: ReturnType<typeof createClient>;
  resumableRedisSub: ReturnType<typeof createClient>;
  resumableStreamInstances: Map<string, Awaited<ReturnType<typeof createResumableUIMessageStream>>>;
};

if (!globalForResumable.resumableRedis) {
  globalForResumable.resumableRedis = createRedisClient();
  globalForResumable.resumableRedisSub = createRedisClient();
  globalForResumable.resumableStreamInstances = new Map();
}

const redisResumable = globalForResumable.resumableRedis;
const redisResumableSub = globalForResumable.resumableRedisSub;
const resumableStreamInstances = globalForResumable.resumableStreamInstances;

// Groq instance
const groq = new Groq();
const groqBreaker = getCircuitBreaker("groq");

// Map to hold abort controllers per chat
const streamAbortControllers = new Map<string, AbortController>();

// Set to track active stream IDs for deduplication
const activeStreamIds = new Set<string>();

/**
 * Create a resumable stream ID for a chat
 */
export function getStreamId(chatId: string): string {
  return `chat:${chatId}:stream`;
}

/**
 * Get or create a resumable stream instance for a chat
 * Instance is reused for the lifetime of the serverless warm container
 */
async function getResumableStreamInstance(chatId: string) {
  const streamId = getStreamId(chatId);

  if (resumableStreamInstances.has(streamId)) {
    return resumableStreamInstances.get(streamId)!;
  }

  const instance = await createResumableUIMessageStream({
    subscriber: redisResumable,
    publisher: redisResumableSub,
    streamId,
  });

  resumableStreamInstances.set(streamId, instance);
  return instance;
}

/**
 * Cleanup function to call when stream ends
 */
function cleanupStream(chatId: string) {
  const streamId = getStreamId(chatId);

  // Remove abort controller
  const abortController = streamAbortControllers.get(chatId);
  if (abortController) {
    abortController.abort();
    streamAbortControllers.delete(chatId);
  }

  // Remove from active streams
  activeStreamIds.delete(streamId);

  // Note: We don't remove from resumableStreamInstances Map
  // because the instance is tied to the streamId and can be reused
  // The library handles cleanup internally via Redis TTL
}

/**
 * Start a new resumable stream for AI response
 * Optionally supports MCP tools for multi-turn tool calling
 */
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
  const { tools, onToolCall, onToolEvent } = options || {};

  // Check if stream already active (prevents duplicate streams)
  if (activeStreamIds.has(streamId)) {
    console.warn(`[ResumableStream] Stream already active for ${streamId}`);
    // Return a dummy stream that immediately closes
    return {
      stream: new ReadableStream({ start(c) { c.close(); } }),
      stop: () => cleanupStream(chatId),
    };
  }

  // Create abort controller for this stream
  const abortController = new AbortController();
  streamAbortControllers.set(chatId, abortController);
  activeStreamIds.add(streamId);

  // Get resumable stream instance
  const { startStream, stopStream: broadcastStop } = await getResumableStreamInstance(chatId);

  let fullContent = "";
  let streamEnded = false;

  // Determine which model to use
  const model = tools?.length ? aiConfig.modelWithTools : aiConfig.model;

  // Create the AI stream with proper error handling
  let aiStream: Stream<any>;
  try {
    const chatOptions: Record<string, unknown> = {
      model,
      messages: messages as any,
      stream: true,
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
    };

    // Add tools if provided
    if (tools?.length) {
      chatOptions.tools = tools;
      chatOptions.tool_choice = "auto";
    }

    aiStream = await groqBreaker.execute(() =>
      groq.chat.completions.create(chatOptions as any)
    ) as unknown as Stream<any>;
  } catch (error) {
    cleanupStream(chatId);
    throw error;
  }

  // Build a ReadableStream that handles both regular and tool-call responses
  const readableStream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      (async () => {
        try {
          // Accumulator for tool calls from streaming deltas
          const toolCallsMap = new Map<string, { id: string; name: string; arguments: string }>();

          for await (const chunk of aiStream!) {
            if (abortController.signal.aborted || streamEnded) break;

            // Check for content delta
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullContent += content;
              onChunk?.(content, false);
              controller.enqueue(
                encoder.encode(JSON.stringify({ content }) + "\n\n")
              );
            }

            // Check for tool call deltas
            const toolCalls = chunk.choices[0]?.delta?.tool_calls;
            if (toolCalls && Array.isArray(toolCalls)) {
              for (const tc of toolCalls) {
                const index = tc.index ?? 0;
                if (!toolCallsMap.has(String(index))) {
                  toolCallsMap.set(String(index), {
                    id: tc.id || `call_${Date.now()}_${index}`,
                    name: tc.function?.name || "",
                    arguments: "",
                  });
                }
                const existing = toolCallsMap.get(String(index))!;
                if (tc.function?.name) existing.name = tc.function.name;
                if (tc.function?.arguments) existing.arguments += tc.function.arguments;
              }
            }

            // Check if stream ended
            const finishReason = chunk.choices[0]?.finish_reason;
            if (finishReason === 'tool_calls' || (finishReason === 'stop' && toolCallsMap.size > 0)) {
              // We have tool calls to execute
              const allToolCalls = Array.from(toolCallsMap.values()).filter(tc => tc.name && tc.arguments);

              if (allToolCalls.length > 0 && onToolCall) {
                // Emit tool call events (callbacks + SSE stream)
                for (const tc of allToolCalls) {
                  onToolEvent?.({ type: 'tool_call', toolCallId: tc.id, toolName: tc.name });
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ type: 'tool_call', toolCallId: tc.id, toolName: tc.name }) + "\n\n")
                  );
                }

                // Parse arguments for each tool call
                const parsedToolCalls: ToolCall[] = allToolCalls.map((tc, idx) => {
                  let args = {};
                  try {
                    args = JSON.parse(tc.arguments);
                  } catch {
                    // Try to parse partial JSON
                    try {
                      const fixed = tc.arguments.endsWith('}') ? tc.arguments : tc.arguments + '}';
                      args = JSON.parse(fixed);
                    } catch {
                      console.warn(`[MCP] Failed to parse tool arguments for ${tc.name}`);
                    }
                  }
                  return { id: tc.id, name: tc.name, arguments: args };
                });

                // Execute tool calls
                const toolResults = await onToolCall(parsedToolCalls);

                // Build result messages for second AI call
                const toolResultMessages: Array<{ role: "assistant"; content: string; tool_calls?: unknown[] }> = [];

                for (const tc of allToolCalls) {
                  const result = toolResults.find(r => r.id === tc.id);
                  toolResultMessages.push({
                    role: "assistant",
                    content: "",
                    tool_calls: [{
                      id: tc.id,
                      type: "function",
                      function: { name: tc.name, arguments: tc.arguments }
                    }]
                  });
                }

                // Add tool result content
                const toolResultContent = toolResults.map(r => {
                  if (r.error) {
                    return { tool_call_id: r.id, role: "tool", content: `Error: ${r.error}` };
                  }
                  return { tool_call_id: r.id, role: "tool", content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result) };
                });

                // Add tool result message
                messages.push(...toolResultMessages as any);
                messages.push({ role: "user", content: JSON.stringify(toolResultContent) } as any);

                // Build a lookup for toolName by id
                const toolNameById = new Map(allToolCalls.map(tc => [tc.id, tc.name]));

                // Emit tool result events (callbacks + SSE stream)
                for (const r of toolResults) {
                  const toolName = toolNameById.get(r.id) || '';
                  onToolEvent?.({ type: 'tool_result', toolCallId: r.id, toolName, result: r.result, error: r.error });
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ type: 'tool_result', toolCallId: r.id, toolName, result: r.result, error: r.error }) + "\n\n")
                  );
                }

                // Make second AI call with tool results
                const model2 = tools?.length ? aiConfig.modelWithTools : aiConfig.model;
                const secondStream = await groqBreaker.execute(() =>
                  groq.chat.completions.create({
                    model: model2,
                    messages: messages as any,
                    stream: true,
                    temperature: aiConfig.temperature,
                    max_tokens: aiConfig.maxTokens,
                  } as any)
                ) as unknown as Stream<any>;

                // Stream the second response
                for await (const chunk2 of secondStream) {
                  if (abortController.signal.aborted || streamEnded) break;

                  const content2 = chunk2.choices[0]?.delta?.content;
                  if (content2) {
                    fullContent += content2;
                    onChunk?.(content2, false);
                    controller.enqueue(
                      encoder.encode(JSON.stringify({ content: content2 }) + "\n\n")
                    );
                  }
                }
              }

              // Clear tool calls - stream is done
              toolCallsMap.clear();
            }
          }
        } catch (error) {
          if (!abortController.signal.aborted && !streamEnded) {
            const err = error instanceof Error ? error : new Error(String(error));
            onError?.(err, false);
            controller.error(err);
            return;
          }
        } finally {
          if (!streamEnded) {
            streamEnded = true;
            cleanupStream(chatId);
          }
        }

        // Ensure close is called only once
        try {
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

  // Wrap with resumable stream
  let wrappedStream;
  try {
    wrappedStream = await startStream(readableStream, {
      keepAlive: Promise.resolve(),
      onFlush: () => {
        console.log(`[ResumableStream] Stream ${streamId} flush complete`);
        // onComplete is called here for post-flush operations
        if (fullContent) {
          onComplete?.(fullContent, false);
        }
      },
    });
  } catch (error) {
    cleanupStream(chatId);
    throw error;
  }

  return {
    stream: wrappedStream,
    stop: () => {
      abortController.abort();
      broadcastStop();
      cleanupStream(chatId);
    },
  };
}

/**
 * Resume an existing stream
 */
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

  // If stream is currently active, don't try to resume
  // Just return null and let the active stream continue
  if (activeStreamIds.has(streamId)) {
    console.log(`[ResumableStream] Stream already active for ${streamId}`);
    return null;
  }

  // Create abort controller for resumed stream
  const abortController = new AbortController();
  streamAbortControllers.set(chatId, abortController);
  activeStreamIds.add(streamId);

  try {
    const { resumeStream, stopStream: broadcastStop } = await getResumableStreamInstance(chatId);

    const resumedStream = await resumeStream();

    if (!resumedStream) {
      cleanupStream(chatId);
      return null;
    }

    let fullContent = "";

    // Convert the resumed stream to ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        (async () => {
          try {
            for await (const chunk of resumedStream) {
              if (abortController.signal.aborted) break;

              // Handle UI message chunk format from ai-resumable-stream
              const content = (chunk as { delta?: string }).delta || (chunk as { content?: string }).content;
              if (content) {
                fullContent += content;
                onChunk?.(content, true); // isResume = true
                controller.enqueue(
                  new TextEncoder().encode(JSON.stringify(chunk) + "\n\n")
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
        broadcastStop();
        cleanupStream(chatId);
      },
      isNew: false,
      hasExisting: true,
    };
  } catch (error) {
    cleanupStream(chatId);

    // Stream not found or expired - this is expected, not an error
    if ((error as Error).message?.includes("not found") ||
        (error as Error).message?.includes("expired") ||
        (error as Error).message?.includes("no existing stream")) {
      console.log(`[ResumableStream] No existing stream for ${streamId}`);
      return null;
    }

    // Real error
    throw error;
  }
}

/**
 * Stop a running stream (broadcasts to all processes)
 */
export async function stopResumableStream(chatId: string): Promise<void> {
  const streamId = getStreamId(chatId);

  // Stop locally
  cleanupStream(chatId);

  // Broadcast stop to all processes
  try {
    const { stopStream: broadcastStop } = await getResumableStreamInstance(chatId);
    await broadcastStop();
  } catch (error) {
    console.error("[ResumableStream] Failed to broadcast stop:", error);
  }
}

/**
 * Check if a stream is currently active
 */
export function isStreamActive(chatId: string): boolean {
  return activeStreamIds.has(getStreamId(chatId));
}

/**
 * Get all active stream IDs (for debugging/monitoring)
 */
export function getActiveStreams(): string[] {
  return Array.from(activeStreamIds);
}
