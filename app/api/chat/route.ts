import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";
import { getRecentMessages } from "@/lib/stack-server";
import { buildChatContext } from "@/lib/context-manager";
import { buildSystemPrompt, type PromptConfig } from "@/lib/prompts";
import { performWebSearch, type SearchSource } from "@/lib/scraper";
import { validateAuth } from "@/lib/auth";

const groq = new Groq();
const MODEL = "llama-3.1-8b-instant";
const SEARCH_CONTEXT_MAX_CHARS = 8000;

/**
 * Build search context for LLM - structured format with key points and code
 */
function buildSearchContext(sources: SearchSource[]): string {
  if (!sources.length) return "";

  const sourceEntries = sources
    .map((s, i) => {
      let entry = `[Source ${i + 1}] ${s.title}
URL: ${s.url}
Type: ${s.source}`;
      if (s.keyPoints && s.keyPoints.length > 0) {
        entry += `\nKey Points: ${s.keyPoints.join(" | ")}`;
      }
      if (s.codeSnippet) {
        entry += `\nCode: ${s.codeSnippet.slice(0, 300)}`;
      }
      entry += `\nContent: ${s.content.slice(0, 800)}`;
      return entry;
    })
    .join("\n\n");

  return `
## Web Search Results (Current Information)

Use these sources to provide accurate, up-to-date answers. Cite sources when referencing specific facts.

${sourceEntries}

SEARCH RULES:
- Always cite as [Source N] when referencing specific facts
- For code questions, use the provided code snippets as reference
- If context is insufficient, say "I couldn't find that in my search results"
- Prioritize StackOverflow/GitHub for technical questions
- Prioritize Reddit for opinions and real-world experiences

---
`;
}

/**
 * Build system prompt with search context
 */
async function buildMessages(
  chatId: string,
  incomingMessages: Array<{ role: "user" | "assistant"; content: string }>,
  webSearchSources?: SearchSource[]
): Promise<Array<{ role: "system" | "user" | "assistant"; content: string }>> {
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: {
      user: true,
      project: {
        include: {
          user: { include: { customize: true } },
        },
      },
      searchResult: true,  // Include persisted search context
    },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  const userPreferences = chat.project?.user?.customize
    ? {
        tone: chat.project.user.customize.responseTone || "balanced",
        detailLevel: chat.project.user.customize.knowledgeDetail || "BALANCED",
      }
    : { tone: "balanced" as const, detailLevel: "BALANCED" as const };

  const promptConfig: PromptConfig = {
    tone: userPreferences.tone as PromptConfig["tone"],
    detailLevel: userPreferences.detailLevel as PromptConfig["detailLevel"],
    userName: chat.project?.user?.email?.split("@")[0] || "User",
    projectName: chat.project?.name,
    projectInstruction: chat.project?.instruction || undefined,
    includeSearchContext: !!(webSearchSources?.length || chat.searchResult),
  };

  const recentMessages = await getRecentMessages(chatId, 50);

  const { messages: contextMessages, systemPrompt: optimizedSystemPrompt, truncated, keyFacts } =
    await buildChatContext(recentMessages, {
      maxTokens: 6000,
      systemPrompt: buildSystemPrompt(promptConfig, webSearchSources),
    });

  let systemNote = "";
  if (truncated) {
    systemNote = `\n\n[Earlier conversation summarized. Key facts preserved: ${keyFacts.length} items]`;
  }

  // Build search context: use new search sources, or fall back to persisted chat search
  let searchContext = "";
  if (webSearchSources?.length) {
    searchContext = buildSearchContext(webSearchSources);
  } else if (chat.searchResult) {
    // Use persisted search context from chat
    const persistedSources = chat.searchResult.sources as unknown as SearchSource[];
    searchContext = buildSearchContext(persistedSources);
  }

  const systemContent = (optimizedSystemPrompt || "") + systemNote + searchContext;

  const contextParts = contextMessages.map((m): { role: "user" | "assistant"; content: string } => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  return [
    { role: "system" as const, content: systemContent },
    ...contextParts,
    ...incomingMessages,
  ];
}

export async function POST(req: NextRequest) {
  try {
    const user = await validateAuth(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { messages, chatId, mode, performWebSearch: shouldSearch } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Web search mode - perform search and return results only
    if (mode === "web") {
      const query = messages[messages.length - 1]?.content || "";
      const searchResult = await performWebSearch(query);

      // Build suggested questions
      const suggestedQuestions = generateSuggestedQuestions(query, searchResult.sources);

      // Format as JSON for the frontend formatter
      const searchData = {
        sources: searchResult.sources,
        images: searchResult.images,
        suggestedQuestions,
        query,
        totalResults: searchResult.totalResults,
      };

      // Save search to history
      try {
        await prisma.searchResult.create({
          data: {
            userId: user.id,
            query,
            sources: searchResult.sources as unknown as object,
          },
        });
      } catch (e) {
        console.error("Failed to save search:", e);
      }

      // Return search results as SSE
      const encoder = new TextEncoder();
      const searchChunk = {
        choices: [{
          delta: {
            content: `\`\`\`web-search\n${JSON.stringify(searchData)}\n\`\`\`\n\n`,
          },
        }],
      };

      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(searchChunk)}\n\n`)
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
    }

    if (!chatId) {
      return new Response(JSON.stringify({ error: "Chat ID required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user owns this chat
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId: user.id, deletedAt: null },
      select: { id: true },
    });

    if (!chat) {
      return new Response(JSON.stringify({ error: "Chat not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Perform web search if requested (增强模式)
    let webSearchSources: SearchSource[] | undefined;
    let searchResultId: string | undefined;
    if (shouldSearch) {
      try {
        const query = messages[messages.length - 1]?.content || "";
        const searchResult = await performWebSearch(query);
        webSearchSources = searchResult.sources;

        // Save search to history and link to chat
        const savedSearch = await prisma.searchResult.create({
          data: {
            userId: user.id,
            query,
            sources: searchResult.sources as unknown as object,
          },
        });
        searchResultId = savedSearch.id;

        // Update chat with search context reference
        await prisma.chat.update({
          where: { id: chatId },
          data: { searchResultId: savedSearch.id },
        });
      } catch (e) {
        console.error("Failed to save search:", e);
      }
    }

    // Build messages with optimized context (and search context if available)
    // Note: messages may be empty for subsequent calls where server fetches history from DB
    const fullMessages = await buildMessages(chatId, messages, webSearchSources);

    // Validate we have at least a system message or incoming messages
    if (fullMessages.length === 0 || (fullMessages.length === 1 && fullMessages[0].role === "system")) {
      console.error("[chat] No messages available for chatId:", chatId, "incomingMessages count:", messages.length);
      return new Response(JSON.stringify({ error: "No messages available" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream from Groq
    const stream = await groq.chat.completions.create({
      model: MODEL,
      messages: fullMessages as any,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
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
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
          saveAIResponse(chatId, user.id, fullResponse, searchResultId).catch(console.error);
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
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

interface SuggestedQuestion {
  id: string;
  question: string;
  topic: string;
}

/**
 * Generate suggested questions based on actual search result content
 * Creates context-aware follow-up questions
 */
function generateSuggestedQuestions(
  query: string,
  sources: SearchSource[]
): SuggestedQuestion[] {
  const questions: SuggestedQuestion[] = [];
  const queryLower = query.toLowerCase();
  const queryWords = new Set(queryLower.split(/\s+/).filter(w => w.length > 3));

  // Collect topics and key points from content
  const keyTerms = new Set<string>();
  const keyPoints: string[] = [];
  const codeExamples: string[] = [];

  for (const source of sources) {
    // Extract key points if available
    if (source.keyPoints && source.keyPoints.length > 0) {
      keyPoints.push(...source.keyPoints.slice(0, 2));
    }

    // Look for code snippets to suggest "show me code" questions
    if (source.codeSnippet && source.codeSnippet.length > 50) {
      const langMatch = source.codeSnippet.match(/```(\w+)/);
      const lang = langMatch ? langMatch[1] : '';
      if (lang && !queryLower.includes('code') && !queryLower.includes('example')) {
        codeExamples.push(lang);
      }
    }

    // Extract significant terms from title and content
    const text = `${source.title} ${source.snippet} ${source.content}`.toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 4 && !queryWords.has(w));

    // Prioritize domain-specific terms
    const stopWords = new Set(['about', 'from', 'have', 'were', 'been', 'some', 'more', 'than', 'then', 'this', 'that', 'what', 'when', 'where', 'which', 'while', 'would', 'could', 'should', 'their', 'there', 'these', 'think', 'thing', 'think', 'after', 'before', 'being', 'other', 'into', 'over', 'such', 'take', 'only', 'also', 'very', 'with', 'your', 'used', 'using', 'based', 'first', 'last', 'back', 'found', 'know', 'like', 'make', 'want', 'get', 'got', 'let', 'see', 'way']);
    words.forEach(w => {
      if (!stopWords.has(w) && !queryWords.has(w)) {
        keyTerms.add(w);
      }
    });
  }

  const termList = Array.from(keyTerms).slice(0, 8);
  const uniqueCodeLangs = [...new Set(codeExamples)].slice(0, 2);

  // Question 1: "What is X?" - definition question
  const mainTopic = termList[0] || 'this topic';
  if (!queryLower.startsWith('what is') && !queryLower.includes('what is')) {
    questions.push({
      id: crypto.randomUUID(),
      question: `What is ${mainTopic}?`,
      topic: 'definition',
    });
  }

  // Question 2: "How does X work?" - explanation question
  const secondTopic = termList[1] || termList[0] || 'it';
  if (!queryLower.startsWith('how') && !queryLower.includes('how does')) {
    questions.push({
      id: crypto.randomUUID(),
      question: `How does ${secondTopic} work?`,
      topic: 'explanation',
    });
  }

  // Question 3: Based on key points - ask about specific info found
  if (keyPoints.length > 0) {
    const keyPoint = keyPoints[0];
    // Create a question from the key point
    if (keyPoint.length < 60 && !queryLower.includes(keyPoint.slice(0, 20).toLowerCase())) {
      questions.push({
        id: crypto.randomUUID(),
        question: `Tell me more about ${keyPoint.toLowerCase()}`,
        topic: 'follow-up',
      });
    }
  }

  // Question 4: Best practices (if not already asked)
  const practiceTopic = termList[2] || termList[0] || 'this';
  if (!queryLower.includes('best practice') && !queryLower.includes('how to')) {
    questions.push({
      id: crypto.randomUUID(),
      question: `What are best practices for ${practiceTopic}?`,
      topic: 'best practices',
    });
  }

  // Question 5: Code example question
  if (uniqueCodeLangs.length > 0 && !queryLower.includes('code') && !queryLower.includes('example')) {
    questions.push({
      id: crypto.randomUUID(),
      question: `Show me an example in ${uniqueCodeLangs[0]}`,
      topic: 'examples',
    });
  }

  // Question 6: "Why is X important?" - relevance question
  const importantTopic = termList[3] || termList[0] || 'it';
  if (!queryLower.startsWith('why') && Math.random() > 0.3) {
    questions.push({
      id: crypto.randomUUID(),
      question: `Why is ${importantTopic} important?`,
      topic: 'importance',
    });
  }

  // Question 7: Comparison question if we have multiple sources
  if (sources.length >= 2 && termList.length >= 2) {
    questions.push({
      id: crypto.randomUUID(),
      question: `What is the difference between ${termList[0]} and ${termList[1]}?`,
      topic: 'comparison',
    });
  }

  // Question 8: Next steps / getting started
  if (!queryLower.includes('start') && !queryLower.includes('begin') && termList.length >= 1) {
    questions.push({
      id: crypto.randomUUID(),
      question: `How do I get started with ${termList[0]}?`,
      topic: 'getting started',
    });
  }

  return questions.slice(0, 6);
}

/**
 * Backend-side save of AI response
 * Saves directly to database after stream completes
 */
async function saveAIResponse(
  chatId: string,
  userId: string,
  content: string,
  searchResultId?: string
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
        searchResultId,
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    // Invalidate user chat list cache (AI response changes chat's updatedAt sort order)
    try {
      await redis.del(KEYS.userChats(userId));
    } catch {
      // Redis error, ignore
    }

    return message;
  } catch (error) {
    console.error("Failed to save AI response:", error);
    // Don't throw - the response was already streamed to user
    // A retry mechanism could be added here
  }
}
