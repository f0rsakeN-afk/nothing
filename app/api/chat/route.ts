import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";
import { buildSystemPrompt, type PromptConfig } from "@/lib/prompts";
import { validateAuth } from "@/lib/auth";
import { aiConfig } from "@/lib/config";
import { getUserPreferences } from "@/services/preferences.service";
import { getChatContext, queueSummarization } from "@/services/summarize.service";
import { getCircuitBreaker, CircuitBreakerOpenError } from "@/services/circuit-breaker.service";
import { publishMessageNew } from "@/services/chat-pubsub.service";
import { notifyNewMessage } from "@/services/push-notification.service";
import { checkChatRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { webSearch, type SearchResult } from "@/lib/web-search";

const groq = new Groq();
const groqBreaker = getCircuitBreaker("groq");

/**
 * Format search results for injection into system prompt
 */
function formatSearchResultsForPrompt(results: SearchResult[]): string {
  if (!results.length) return "";

  const formatted = results.slice(0, 8).map((r, i) => {
    const date = r.publishedDate ? ` • ${r.publishedDate}` : "";
    const source = extractDomain(r.url);
    return `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    Source: ${source}${date}\n    Summary: ${r.description}`;
  }).join("\n\n");

  return `

## Web Search Results (Use these to answer the user's question)

${formatted}

## Citation Guidelines
- When using information from search results, cite inline with [1], [2], etc. matching the numbered sources above
- Always include the source number when referencing specific facts, data, or claims from search results
- Prefer citing the most recent and authoritative sources
- If information is from your own knowledge (not search results), don't cite`;
}

/**
 * Extract domain from URL for cleaner display
 */
function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Build messages for AI with smart context retrieval
 *
 * Uses hierarchical context:
 * 1. If chat has summary: summary + recent messages
 * 2. If chat is short: all messages
 * 3. Always preserves key facts
 */
async function buildMessages(
  chatId: string,
  incomingMessages: Array<{ role: "user" | "assistant"; content: string }>,
  searchResults?: SearchResult[]
): Promise<Array<{ role: "system" | "user" | "assistant"; content: string }>> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      user: {
        select: { id: true, email: true },
      },
      project: true,
    },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  // Get user preferences from cache
  // @ts-expect-error Prisma email type inference issue
  const userPreferences = await getUserPreferences(chat.userId, chat.user.email ?? '');

  const promptConfig: PromptConfig = {
    tone: userPreferences.tone as PromptConfig["tone"],
    detailLevel: userPreferences.detailLevel as PromptConfig["detailLevel"],
    userName: userPreferences.name || userPreferences.firstName || userPreferences.email?.split("@")[0] || "User",
    userFirstName: userPreferences.firstName,
    userLastName: userPreferences.lastName,
    userInterests: userPreferences.interests,
    projectName: chat.project?.name,
    projectInstruction: chat.project?.instruction || undefined,
  };

  // Get smart context (uses summary + recent messages)
  const { messages: contextMessages, summary, topics, keyFacts, truncated } = await getChatContext(chatId, {
    maxTokens: aiConfig.maxContextTokens,
  });

  // Build system prompt
  let systemPrompt = buildSystemPrompt(promptConfig);

  // Add summary context if available
  if (summary) {
    systemPrompt += `\n\nCONVERSATION SUMMARY:\n${summary}`;
  }

  // Add topics if we have them
  if (topics && topics.length > 0) {
    systemPrompt += `\n\nTopics: ${topics.join(", ")}`;
  }

  // Add key facts preservation note
  if (keyFacts && keyFacts.length > 0) {
    systemPrompt += `\n\nKEY FACTS TO PRESERVE:\n${keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;
  }

  // Add truncation notice if needed
  if (truncated) {
    systemPrompt += `\n\n[Note: Earlier messages were summarized for context efficiency. Recent messages are shown below.]`;
  }

  // Add web search results if available
  if (searchResults && searchResults.length > 0) {
    systemPrompt += formatSearchResultsForPrompt(searchResults);
  }

  // Build final message array
  const contextParts = contextMessages.map((m): { role: "user" | "assistant"; content: string } => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return [
    { role: "system" as const, content: systemPrompt },
    ...contextParts,
    ...incomingMessages,
  ];
}

export async function POST(req: NextRequest) {
  try {
    // Check rate limit
    const rateLimit = await checkChatRateLimit(req);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { messages, chatId, mode } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!chatId) {
      return new Response(JSON.stringify({ error: "Chat ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user owns this chat
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id },
      select: { id: true },
    });

    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check credits before processing
    const { checkCreditsForOperation, deductCredits, addCredits } = await import("@/services/credit.service");
    const { polarConfig } = await import("@/lib/polar-config");

    // Determine cost based on model
    const model = aiConfig.model as keyof typeof polarConfig.creditCosts;
    const cost = polarConfig.creditCosts[model] || 1;

    // Check if user has enough credits
    const hasCredits = await checkCreditsForOperation(user.id, model);
    if (!hasCredits) {
      const { getUserCredits } = await import("@/services/credit.service");
      const balance = await getUserCredits(user.id);
      return new Response(JSON.stringify({
        error: "Insufficient credits",
        required: cost,
        current: balance,
        message: `This operation requires ${cost} credits. You have ${balance} credits remaining.`,
      }), {
        status: 402,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build messages with smart context (before deducting - if this fails, no credits deducted)
    let fullMessages = await buildMessages(chatId, messages);

    if (fullMessages.length === 0 || (fullMessages.length === 1 && fullMessages[0].role === "system")) {
      return new Response(JSON.stringify({ error: "No messages available" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream from Groq with circuit breaker protection
    let stream;
    let creditsDeducted = false;
    let webSearchCreditsDeducted = false;
    let searchResults: SearchResult[] = [];

    // Helper to emit SSE event
    const emitEvent = (controller: ReadableStreamDefaultController, event: object) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    const encoder = new TextEncoder();

    // Web search mode: perform search with timeout, don't block AI
    if (mode === "web") {
      // Check web search credits
      const webSearchCost = polarConfig.creditCosts["web-search"] || 3;
      const hasWebSearchCredits = await checkCreditsForOperation(user.id, "web-search");
      if (!hasWebSearchCredits) {
        const { getUserCredits } = await import("@/services/credit.service");
        const balance = await getUserCredits(user.id);
        return new Response(JSON.stringify({
          error: "Insufficient credits",
          required: webSearchCost,
          current: balance,
          type: "web_search",
          message: `Web search requires ${webSearchCost} credits. You have ${balance} credits remaining.`,
        }), {
          status: 402,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Deduct web search credits upfront (will be refunded if AI fails)
      try {
        await deductCredits(user.id, "web-search");
        webSearchCreditsDeducted = true;
      } catch (deductError) {
        console.error("[Chat] Failed to deduct web search credits:", deductError);
      }
    }

    let fullResponse = "";

    // Build initial messages without search (for streaming start)
    fullMessages = await buildMessages(chatId, messages);

    // Web search mode: prepare search but don't block
    let searchPromise: Promise<void> | null = null;
    let searchCompleted = false;

    if (mode === "web") {
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const searchQuery = lastUserMessage.slice(0, 500);

      // Fire search in background
      searchPromise = webSearch(searchQuery, { limit: 10 })
        .then(async (searchResponse) => {
          searchResults = searchResponse.results;
          if (searchResults.length > 0) {
            fullMessages = await buildMessages(chatId, messages, searchResults);
          }
          searchCompleted = true;
        })
        .catch((searchError) => {
          console.error("[Chat] Web search error:", searchError);
          searchCompleted = true;
        });
    }

    // Deduct AI credits and start AI stream
    try {
      await deductCredits(user.id, model);
      creditsDeducted = true;

      stream = await groqBreaker.execute(() =>
        groq.chat.completions.create({
          model: aiConfig.model,
          messages: fullMessages as any,
          stream: true,
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens,
        })
      );
    } catch (error) {
      // Refund credits if Groq call failed
      if (creditsDeducted) {
        addCredits(user.id, cost).catch((err) => {
          console.error("[Chat] Failed to refund AI credits after Groq failure:", err);
        });
      }
      if (webSearchCreditsDeducted) {
        addCredits(user.id, polarConfig.creditCosts["web-search"] || 3).catch((err) => {
          console.error("[Chat] Failed to refund web search credits:", err);
        });
      }

      if (error instanceof CircuitBreakerOpenError) {
        return new Response(JSON.stringify({
          error: "AI service temporarily unavailable",
          message: "The AI service is experiencing issues. Please try again in a moment.",
          retryAfter: 30,
        }), {
          status: 503,
          headers: { "Content-Type": "application/json", "Retry-After": "30" },
        });
      }
      throw error;
    }

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Web mode: emit step events for progress feedback
          if (mode === "web") {
            // Emit search_start event immediately
            emitEvent(controller, {
              type: "step",
              step: "search",
              status: "start",
              message: "Searching the web...",
            });

            // Wait for search to complete (with 5s timeout) while AI is warming up
            const timeoutPromise = new Promise<void>((resolve) =>
              setTimeout(() => resolve(), 5000)
            );

            await Promise.race([searchPromise, timeoutPromise]);

            // Emit search complete/skip
            if (searchResults.length > 0) {
              emitEvent(controller, {
                type: "step",
                step: "search",
                status: "complete",
                message: `Found ${searchResults.length} sources`,
                results: searchResults,
              });
            } else {
              emitEvent(controller, {
                type: "step",
                step: "search",
                status: "skipped",
                message: "No search results",
              });
            }
          }

          // Emit AI start event
          emitEvent(controller, {
            type: "step",
            step: "ai",
            status: "start",
            message: "Generating response...",
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
              );
            }
          }
        } catch (streamError) {
          console.error("[chat] Stream error:", streamError);
        } finally {
          // Emit completion step
          emitEvent(controller, {
            type: "step",
            step: "ai",
            status: "complete",
            message: "Response complete",
          });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          // Save response and trigger summarization check
          saveAIResponse(chatId, user.id, fullResponse).catch(console.error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("[chat] Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Backend-side save of AI response
 * Saves to database and triggers async summarization
 */
async function saveAIResponse(
  chatId: string,
  userId: string,
  content: string
): Promise<any> {
  if (!content || content.trim().length === 0) {
    return null;
  }

  try {
    const message = await prisma.message.create({
      data: {
        chatId,
        sender: "assistant",
        role: "assistant",
        content,
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Invalidate user chat list cache
    try {
      await redis.del(KEYS.userChats(userId));
    } catch {
      // Redis error, ignore
    }

    // Publish to Redis for real-time SSE subscribers
    // This notifies other devices viewing the same chat
    await publishMessageNew(chatId, userId, {
      id: message.id,
      role: message.role || "assistant",
      content: message.content,
      createdAt: message.createdAt,
    });

    // Send push notification (fire and forget)
    // This notifies users who are not currently viewing the chat
    notifyNewMessage(
      userId,
      chatId,
      content.slice(0, 100),
      "Eryx"
    ).catch((err) => {
      console.error("[Push] Failed to send notification:", err);
    });

    // Trigger async summarization check (fire and forget)
    queueSummarization(chatId).catch(console.error);

    return message;
  } catch (error) {
    console.error("Failed to save AI response:", error);
  }
}