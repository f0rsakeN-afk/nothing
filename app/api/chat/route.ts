import { NextRequest, NextResponse } from "next/server";
import { JsonToSseTransformStream } from "ai";
import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";
import { buildSystemPrompt, type PromptConfig, type ResponseStyle } from "@/lib/prompts";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { aiConfig } from "@/lib/config";
import { getUserPreferences } from "@/services/preferences.service";
import { getChatContext, queueSummarization } from "@/services/summarize.service";
import { getCircuitBreaker, CircuitBreakerOpenError } from "@/services/circuit-breaker.service";
import { publishMessageNew } from "@/services/chat-pubsub.service";
import { notifyNewMessage } from "@/services/push-notification.service";
import { checkChatRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { webSearch, type SearchResult } from "@/lib/web-search";
import {
  startResumableStream,
  resumeResumableStream,
  stopResumableStream,
  getStreamId,
  isStreamActive,
} from "@/services/resumable-stream.service";
import { getMCPToolsForChat, formatMCPToolsForOpenAI } from "@/services/mcp-tools.service";
import { executeMCPToolCalls } from "@/services/mcp-tool-executor.service";
import { buildProjectContext, buildProjectContextSection, getProjectFilesForContext } from "@/services/project-context.service";
import { retrieveContext, formatContextForPrompt } from "@/services/rag.service";

// Track which chat+stream combinations have been superseded (user sent new message)
const supersededStreams = new Set<string>();

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
 * Get extracted content from files attached to recent chat messages
 * Uses keyword matching to prioritize relevant content for large files
 * Results cached per chat with 1-hour TTL
 */
async function getChatFileContents(
  chatId: string,
  incomingMessages?: Array<{ role: string; content: string }>
): Promise<Array<{ name: string; content: string }>> {
  const cacheKey = KEYS.chatFileContents(chatId);

  // Try cache first
  let fileMap: Map<string, { name: string; content: string; tokenCount: number }> | undefined;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      try {
        fileMap = new Map(JSON.parse(cached) as [string, { name: string; content: string; tokenCount: number }][]);
      } catch {
        console.warn('[Chat] File contents cache parse error, fetching fresh');
        fileMap = undefined;
      }
    }
  } catch (err) {
    console.warn('[Chat] File contents cache read error:', err);
  }

  // Cache miss - fetch from DB
  if (!fileMap) {
    // Get recent messages with their file attachments
    const recentMessages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        messageFiles: {
          select: {
            file: {
              select: {
                id: true,
                name: true,
                extractedContent: true,
                tokenCount: true,
              },
            },
          },
        },
      },
    });

    // Collect unique files with their contents
    fileMap = new Map<string, { name: string; content: string; tokenCount: number }>();
    for (const msg of recentMessages) {
      for (const mf of msg.messageFiles) {
        const file = mf.file;
        if (file.extractedContent && !fileMap.has(file.id)) {
          fileMap.set(file.id, {
            name: file.name,
            content: file.extractedContent,
            tokenCount: file.tokenCount || Math.ceil(file.extractedContent.length / 4),
          });
        }
      }
    }

    // Store in cache (errors are non-fatal)
    try {
      await redis.setex(cacheKey, TTL.chatFileContents, JSON.stringify([...fileMap]));
    } catch (err) {
      console.warn('[Chat] File contents cache write error:', err);
    }
  }

  // Extract keywords from incoming messages for relevance scoring
  const keywords = extractKeywords(incomingMessages || []);

  // Score and sort files by relevance
  const scoredFiles = Array.from(fileMap.values()).map((file) => {
    const relevanceScore = keywords.length > 0
      ? calculateRelevance(file.content, keywords)
      : 1;
    return {
      ...file,
      relevanceScore,
    };
  });

  // Sort by relevance (descending) then by token count (ascending for packing)
  scoredFiles.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return a.tokenCount - b.tokenCount;
  });

  // Select files respecting token budget
  const result: Array<{ name: string; content: string }> = [];
  let totalTokens = 0;
  const maxTokens = 4000;

  for (const file of scoredFiles) {
    // For large files (>2000 tokens), try to extract relevant sections
    if (file.tokenCount > 2000 && keywords.length > 0) {
      const relevantContent = extractRelevantSection(file.content, keywords, 3000);
      if (relevantContent.length > 0) {
        result.push({ name: file.name, content: relevantContent });
        totalTokens += Math.ceil(relevantContent.length / 4);
        continue;
      }
    }

    // For smaller files or when no keywords, use full content with truncation
    const truncatedContent = file.content.slice(0, 5000);
    const tokens = Math.ceil(truncatedContent.length / 4);

    if (totalTokens + tokens <= maxTokens) {
      result.push({ name: file.name, content: truncatedContent });
      totalTokens += tokens;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Extract keywords from messages for relevance scoring
 */
function extractKeywords(messages: Array<{ role: string; content: string }>): string[] {
  // Get all content
  const allContent = messages.map((m) => m.content).join(" ");

  // Extract words (3+ chars) and count frequency
  const wordCounts = new Map<string, number>();
  const words = allContent.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];

  for (const word of words) {
    // Filter common stop words
    const stopWords = new Set(["the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "this", "that", "with", "have", "from", "they", "been", "were", "going", "know", "like", "just", "more", "than", "what", "when", "your"]);
    if (stopWords.has(word)) continue;

    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  // Get top keywords by frequency
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Calculate relevance score based on keyword matches
 */
function calculateRelevance(content: string, keywords: string[]): number {
  const lowerContent = content.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = lowerContent.match(regex);
    if (matches) {
      score += matches.length;
    }
  }
  return score;
}

/**
 * Extract relevant section from content based on keywords
 * Returns content around keyword matches
 */
function extractRelevantSection(content: string, keywords: string[], maxLength: number): string {
  const lowerContent = content.toLowerCase();

  // Find all keyword positions
  const positions: number[] = [];
  for (const keyword of keywords) {
    let pos = 0;
    while (true) {
      const found = lowerContent.indexOf(keyword, pos);
      if (found === -1) break;
      positions.push(found);
      pos = found + 1;
    }
  }

  if (positions.length === 0) {
    // No keywords found, return beginning
    return content.slice(0, maxLength);
  }

  // Sort positions and find dense clusters
  positions.sort((a, b) => a - b);

  // Find the most dense region
  let bestStart = 0;
  let bestDensity = 0;
  const windowSize = 500; // characters

  for (let i = 0; i < positions.length; i++) {
    const windowStart = positions[i];
    const windowEnd = positions[i] + windowSize;
    const density = positions.filter((p) => p >= windowStart && p <= windowEnd).length;

    if (density > bestDensity) {
      bestDensity = density;
      bestStart = Math.max(0, windowStart - 100);
    }
  }

  // Extract content around the best region
  let start = bestStart;
  let end = Math.min(start + maxLength, content.length);

  // Adjust to word boundaries
  if (start > 0) {
    const spacePos = content.lastIndexOf(" ", start);
    if (spacePos !== -1 && spacePos > start - 100) {
      start = spacePos + 1;
    }
  }

  if (end < content.length) {
    const spacePos = content.indexOf(" ", end);
    if (spacePos !== -1 && spacePos < end + 100) {
      end = spacePos;
    }
  }

  let result = content.slice(start, end);

  // Add context markers
  if (start > 0) {
    result = "... " + result;
  }
  if (end < content.length) {
    result = result + " ...";
  }

  return result;
}

/**
 * Build messages for AI with smart context retrieval
 */
async function buildMessages(
  chatId: string,
  incomingMessages: Array<{ role: "user" | "assistant"; content: string }>,
  searchResults?: SearchResult[],
  responseStyle?: ResponseStyle
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

  // @ts-expect-error Prisma email type inference issue
  const userPreferences = await getUserPreferences(chat.userId, chat.user.email ?? '');

  const promptConfig: PromptConfig = {
    tone: userPreferences.tone as PromptConfig["tone"],
    detailLevel: userPreferences.detailLevel as PromptConfig["detailLevel"],
    userName: userPreferences.name || userPreferences.email?.split("@")[0] || "User",
    userInterests: userPreferences.interests,
    projectName: chat.project?.name,
    projectInstruction: chat.project?.instruction || undefined,
    responseStyle,
  };

  // Get smart context
  const { messages: contextMessages, summary, topics, keyFacts, truncated } = await getChatContext(chatId, {
    maxTokens: aiConfig.maxContextTokens,
  });

  // Build system prompt
  let systemPrompt = buildSystemPrompt(promptConfig);

  // Get memory context for user
  const memoryContexts = await retrieveContext(incomingMessages.map(m => m.content).join(" "), {
    maxTokens: 1000,
    userId: chat.userId || undefined,
  });

  if (memoryContexts.length > 0) {
    const memoryContextText = formatContextForPrompt(memoryContexts);
    systemPrompt += "\n\n" + memoryContextText;
  }

  // Get project context files and use RAG for semantic retrieval
  if (chat.projectId && chat.project) {
    const projectContext = await buildProjectContext(chat.projectId);
    if (projectContext.files.length > 0) {
      // Get file IDs for RAG retrieval
      const fileIds = projectContext.files.map(f => f.id);

      // Use RAG to retrieve relevant context with embeddings
      const ragContexts = await retrieveContext(incomingMessages.map(m => m.content).join(" "), {
        fileIds,
        maxTokens: 3000,
        userId: chat.userId || undefined,
      });

      if (ragContexts.length > 0) {
        const ragContextText = formatContextForPrompt(ragContexts);
        systemPrompt += "\n\n" + ragContextText;
      } else {
        // Fallback to keyword-based retrieval if RAG returns nothing
        const filesForContext = getProjectFilesForContext(projectContext.files, 4000);
        if (filesForContext.length > 0) {
          systemPrompt += "\n\n" + buildProjectContextSection(
            chat.project.name,
            projectContext.instruction,
            filesForContext
          );
        }
      }
    }
  }

  // Add chat-attached file contents from recent messages
  const chatFileContents = await getChatFileContents(chatId, incomingMessages);
  if (chatFileContents.length > 0) {
    systemPrompt += "\n\n## Attached Files\n";
    for (const file of chatFileContents) {
      systemPrompt += `### ${file.name}\n${file.content}\n---\n`;
    }
  }

  if (summary) {
    systemPrompt += `\n\nCONVERSATION SUMMARY:\n${summary}`;
  }

  if (topics && topics.length > 0) {
    systemPrompt += `\n\nTopics: ${topics.join(", ")}`;
  }

  if (keyFacts && keyFacts.length > 0) {
    systemPrompt += `\n\nKEY FACTS TO PRESERVE:\n${keyFacts.map((f, i) => `${i + 1}. ${f}`).join("\n")}`;
  }

  if (truncated) {
    systemPrompt += `\n\n[Note: Earlier messages were summarized for context efficiency.]`;
  }

  if (searchResults && searchResults.length > 0) {
    systemPrompt += formatSearchResultsForPrompt(searchResults);
  }

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

/**
 * Get stream tracking key for superseded check
 */
function getSupersededKey(chatId: string, streamVersion: number): string {
  return `superseded:${chatId}:${streamVersion}`;
}

/**
 * POST - Start or resume a chat stream
 */
export async function POST(req: NextRequest) {
  const streamVersion = Date.now();

  try {
    // Check rate limit
    const rateLimit = await checkChatRateLimit(req);
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    const user = await validateAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { messages, chatId, mode, resume, style, model: requestedModel } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }

    // Verify user owns this chat
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id },
      select: { id: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const supersededKey = getSupersededKey(chatId, streamVersion);

    // Check credits before processing
    const { checkCreditsForOperation, deductCredits, addCredits } = await import("@/services/credit.service");
    const { polarConfig } = await import("@/lib/polar-config");

    // Map user-facing model name to internal model key
    const modelKey = requestedModel || aiConfig.model;
    const cost = polarConfig.creditCosts[modelKey as keyof typeof polarConfig.creditCosts] || polarConfig.creditCosts[aiConfig.model as keyof typeof polarConfig.creditCosts] || 1;

    // Try to resume existing stream if requested
    if (resume) {
      const streamId = getStreamId(chatId);
      console.log(`[Chat] Attempting to resume stream: ${streamId}`);

      try {
        const resumed = await resumeResumableStream(
          chatId,
          (chunk, isResume) => {
            // Chunks from resume - we don't save during resume, just stream to client
          },
          (content, isResume) => {
            // Check if this stream was superseded before saving
            if (supersededStreams.has(supersededKey)) {
              console.log(`[Chat] Resumed stream was superseded, not saving`);
              return;
            }
            // Save to DB only if this is the current active stream
            saveAIResponse(chatId, user.id, content).catch(console.error);
          },
          (error, isResume) => {
            console.error("[Chat] Resume stream error:", error);
          }
        );

        if (resumed && resumed.hasExisting) {
          console.log(`[Chat] Resumed existing stream: ${streamId}`);
          return new Response(resumed.stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Stream-Resumed": "true",
              "X-Stream-ID": streamId,
            },
          });
        }
      } catch (resumeError) {
        console.log(`[Chat] Could not resume stream, starting fresh:`, resumeError);
      }
    }

    // If there's an existing active stream for this chat, STOP IT FIRST
    // This is critical to prevent race conditions
    if (isStreamActive(chatId)) {
      console.log(`[Chat] Stopping existing stream for chat ${chatId}`);
      // Mark current stream as superseded BEFORE stopping
      // The old stream's onComplete will check this and not save
      supersededStreams.add(supersededKey);
      // Clean up old superseded keys (keep only last 10)
      cleanupSupersededKeys(chatId);
      // Stop the old stream
      await stopResumableStream(chatId);
    }

    // Check credits for new stream
    const hasCredits = await checkCreditsForOperation(user.id, modelKey);
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

    // Build messages
    let fullMessages = await buildMessages(chatId, messages, undefined, style);

    if (fullMessages.length === 0 || (fullMessages.length === 1 && fullMessages[0].role === "system")) {
      return NextResponse.json({ error: "No messages available" }, { status: 400 });
    }

    // Track state
    let creditsDeducted = false;
    let webSearchCreditsDeducted = false;
    let searchResults: SearchResult[] = [];
    let stopFn: (() => void) | null = null;

    const encoder = new TextEncoder();

    // Helper to emit SSE event
    const emitEvent = (controller: ReadableStreamDefaultController, event: object) => {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    };

    // Load MCP tools for user's enabled servers
    let mcpTools: Array<{
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
    }> = [];
    try {
      const rawTools = await getMCPToolsForChat(user.id);
      mcpTools = formatMCPToolsForOpenAI(rawTools);
    } catch (mcpError) {
      console.error("[Chat] Failed to load MCP tools:", mcpError);
      // Continue without MCP tools - graceful degradation
    }

    // Web search mode
    if (mode === "web") {
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

      try {
        await deductCredits(user.id, "web-search");
        webSearchCreditsDeducted = true;
      } catch (deductError) {
        console.error("[Chat] Failed to deduct web search credits:", deductError);
      }
    }

    // Deduct AI credits
    try {
      await deductCredits(user.id, modelKey);
      creditsDeducted = true;
    } catch (error) {
      if (creditsDeducted) {
        addCredits(user.id, cost).catch((err) => {
          console.error("[Chat] Failed to refund AI credits:", err);
        });
      }
      if (webSearchCreditsDeducted) {
        addCredits(user.id, polarConfig.creditCosts["web-search"] || 3).catch((err) => {
          console.error("[Chat] Failed to refund web search credits:", err);
        });
      }
      throw error;
    }

    // Web search preparation
    let searchCompleted = false;
    let searchPromise: Promise<void> | null = null;

    if (mode === "web") {
      const lastUserMessage = messages[messages.length - 1]?.content || "";
      const searchQuery = lastUserMessage.slice(0, 500);

      searchPromise = webSearch(searchQuery, { limit: 10 })
        .then(async (searchResponse) => {
          searchResults = searchResponse.results;
          if (searchResults.length > 0) {
            fullMessages = await buildMessages(chatId, messages, searchResults, style);
          }
          searchCompleted = true;
        })
        .catch((searchError) => {
          console.error("[Chat] Web search error:", searchError);
          searchCompleted = true;
        });
    }

    // Create resumable stream
    let resumableStream: ReadableStream | null = null;

    try {
      const result = await startResumableStream(
        chatId,
        fullMessages,
        {
          tools: mcpTools,
          onToolCall: async (toolCalls, mcpClients) => executeMCPToolCalls(toolCalls, user.id, mcpClients),
          userId: user.id,
          model: modelKey,
        },
        (chunk, isResume) => {
          // onChunk - content streamed to client via SSE
        },
        (content, isResume) => {
          // onComplete - save to DB ONLY if not superseded
          if (supersededStreams.has(supersededKey)) {
            console.log(`[Chat] Stream was superseded (user sent new message), not saving`);
            return;
          }
          console.log(`[Chat] Stream complete, saving AI response of length:`, content?.length);
          // This is the final, active stream - save to DB
          saveAIResponse(chatId, user.id, content)
            .then((result) => console.log(`[Chat] saveAIResponse result:`, result))
            .catch((err) => console.error(`[Chat] saveAIResponse error:`, err));
        },
        (error, isResume) => {
          console.error("[Chat] Stream error:", error);
        }
      );

      resumableStream = result.stream;
      stopFn = result.stop;
    } catch (error) {
      // Refund credits on stream creation failure
      if (creditsDeducted) {
        addCredits(user.id, cost).catch((err) => {
          console.error("[Chat] Failed to refund AI credits:", err);
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

    const streamId = getStreamId(chatId);

    // Return the stream directly - JsonToSseTransformStream handles the SSE framing
    return new Response(resumableStream!.pipeThrough(new JsonToSseTransformStream()), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Stream-ID": streamId,
      },
    });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    console.error("[chat] Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE - Stop a running stream
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await validateAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { chatId } = body;

    if (!chatId) {
      return NextResponse.json({ error: "Chat ID required" }, { status: 400 });
    }

    // Verify user owns this chat
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id },
      select: { id: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Stop the resumable stream
    await stopResumableStream(chatId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[chat] Stop stream error:", error);
    return NextResponse.json({ error: "Failed to stop stream" }, { status: 500 });
  }
}

/**
 * Cleanup old superseded stream keys for a chat
 */
function cleanupSupersededKeys(chatId: string) {
  // Keep only the last 10 superseded keys per chat
  const prefix = `superseded:${chatId}:`;
  for (const key of supersededStreams) {
    if (key.startsWith(prefix)) {
      supersededStreams.delete(key);
    }
  }
}

/**
 * Backend-side save of AI response
 */
async function saveAIResponse(
  chatId: string,
  userId: string,
  content: string
): Promise<unknown> {
  console.log(`[saveAIResponse] Called with chatId=${chatId}, content length=${content?.length}`);
  if (!content || content.trim().length === 0) {
    console.log(`[saveAIResponse] Empty content, skipping save`);
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

    try {
      await redis.del(KEYS.userChats(userId));
    } catch {
      // Redis error, ignore
    }

    await publishMessageNew(chatId, userId, {
      id: message.id,
      role: message.role || "assistant",
      content: message.content,
      createdAt: message.createdAt,
    });

    notifyNewMessage(
      userId,
      chatId,
      content.slice(0, 100),
      "Eryx"
    ).catch((err) => {
      console.error("[Push] Failed to send notification:", err);
    });

    queueSummarization(chatId).catch(console.error);

    return message;
  } catch (error) {
    console.error("Failed to save AI response:", error);
  }
}
