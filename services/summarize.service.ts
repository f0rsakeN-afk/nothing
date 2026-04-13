/**
 * Chat Context Summarization Service
 *
 * Performance-optimized hierarchical context management.
 * Uses incremental summarization to avoid re-reading all messages.
 */

import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";
import Groq from "groq-sdk";
import { aiConfig } from "@/lib/config";

const groq = new Groq();

// Summarize when chat has 50+ messages
const SUMMARY_THRESHOLD = 50;

// Token estimation (4 chars per token)
const CHARS_PER_TOKEN = 4;

interface MessageData {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

/**
 * Check if chat needs summarization - O(1) check
 */
export async function shouldSummarize(chatId: string): Promise<boolean> {
  // Quick check - is there already a summary?
  try {
    const cached = await redis.get(KEYS.chatSummary(chatId));
    if (cached) {
      // Summary exists - check message count via Redis counter
      const msgCountKey = `chat:${chatId}:msg_count`;
      const countStr = await redis.get(msgCountKey);
      if (countStr) {
        return parseInt(countStr, 10) >= SUMMARY_THRESHOLD;
      }
    }
  } catch {
    // Redis unavailable, do DB check
  }

  // DB fallback - count messages only
  const count = await prisma.message.count({ where: { chatId } });
  return count >= SUMMARY_THRESHOLD;
}

/**
 * Increment message count for a chat (for threshold tracking)
 * Call this when adding a message
 */
export async function incrementMessageCount(chatId: string): Promise<void> {
  try {
    const key = `chat:${chatId}:msg_count`;
    const count = await redis.incr(key);
    if (count === 1) {
      // First message, set TTL to 7 days
      await redis.expire(key, 7 * 24 * 60 * 60);
    }
  } catch {
    // Non-critical
  }
}

/**
 * Generate structured summary using LLM
 */
async function generateSummary(messages: MessageData[]): Promise<{
  summary: string;
  topics: string[];
  keyFacts: string[];
} | null> {
  if (messages.length < 10) return null;

  // Format messages - truncate to 300 chars each for efficiency
  const formattedMessages = messages.map((m, i) => {
    const role = m.role === "user" || m.role === "assistant" ? m.role : "assistant";
    const content = m.content.slice(0, 300);
    return `${i + 1}. [${role}]: ${content}`;
  }).join("\n");

  const prompt = `Summarize this conversation concisely.

MESSAGES:
${formattedMessages}

Return valid JSON only:
{
  "summary": "2-3 sentence overview of the conversation",
  "topics": ["topic1", "topic2", "topic3"],
  "keyFacts": ["specific fact 1", "important detail 2"]
}`;

  try {
    const response = await groq.chat.completions.create({
      model: aiConfig.model,
      messages: [
        { role: "system", content: "You are a helpful assistant that summarizes conversations accurately. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("LLM summary generation failed:", error);
    return null;
  }
}

/**
 * Summarize chat - optimized to only read NEW messages
 */
export async function summarizeChat(chatId: string): Promise<boolean> {
  // Check if already summarizing
  try {
    const lockKey = KEYS.summarizing(chatId);
    const locked = await redis.get(lockKey);
    if (locked) return false; // Already in progress
    await redis.setex(lockKey, 300, "1");
  } catch {
    // Redis unavailable, proceed anyway
  }

  try {
    // Get existing summary to know where to start
    let existingSummary = await prisma.chatSummary.findUnique({
      where: { chatId },
    });

    let messagesToSummarize: MessageData[];
    let startMsgId: string;
    let endMsgId: string;

    if (existingSummary) {
      // Incremental: only get messages AFTER the last summary
      const lastMsg = await prisma.message.findFirst({
        where: {
          chatId,
          id: { gt: existingSummary.endMessageId },
        },
        orderBy: { createdAt: "asc" },
      });

      if (!lastMsg) {
        // No new messages since last summary
        return true;
      }

      // Get all messages from last summary point to now
      messagesToSummarize = await prisma.message.findMany({
        where: {
          chatId,
          createdAt: { gte: lastMsg.createdAt },
        },
        orderBy: { createdAt: "asc" },
        take: 100, // Cap at 100 messages per summary
      });

      if (messagesToSummarize.length < 10) return true;

      startMsgId = existingSummary.endMessageId;
      endMsgId = messagesToSummarize[messagesToSummarize.length - 1].id;
    } else {
      // First summary - get first 100 messages
      messagesToSummarize = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        take: 100,
      });

      if (messagesToSummarize.length < 10) return true;

      startMsgId = messagesToSummarize[0].id;
      endMsgId = messagesToSummarize[messagesToSummarize.length - 1].id;
    }

    // Generate summary via LLM
    const result = await generateSummary(messagesToSummarize);
    if (!result) return false;

    // Calculate tokens
    const tokenCount = Math.ceil(
      messagesToSummarize.reduce((sum, m) => sum + m.content.length, 0) / CHARS_PER_TOKEN
    );

    if (existingSummary) {
      // Append to existing summary
      await prisma.chatSummary.update({
        where: { id: existingSummary.id },
        data: {
          summary: existingSummary.summary + "\n\n[Continued]: " + result.summary,
          topics: { push: result.topics },
          keyFacts: { push: result.keyFacts },
          endMessageId: endMsgId,
          messageCount: existingSummary.messageCount + messagesToSummarize.length,
          tokenCount: existingSummary.tokenCount + tokenCount,
        },
      });
    } else {
      // Create new summary
      await prisma.chatSummary.create({
        data: {
          chatId,
          summary: result.summary,
          topics: result.topics,
          keyFacts: result.keyFacts,
          startMessageId,
          endMessageId,
          messageCount: messagesToSummarize.length,
          tokenCount,
        },
      });
    }

    // Cache in Redis
    await redis.setex(KEYS.chatSummary(chatId), TTL.chatSummary, JSON.stringify({
      summary: result.summary,
      topics: result.topics,
      keyFacts: result.keyFacts,
    }));

    return true;
  } catch (error) {
    console.error("Summarization failed:", error);
    return false;
  } finally {
    try {
      await redis.del(KEYS.summarizing(chatId));
    } catch {
      // Ignore
    }
  }
}

/**
 * Get chat context - optimized retrieval
 * Returns: summary (if exists), recent messages, and metadata
 */
export async function getChatContext(
  chatId: string,
  options: { maxTokens?: number } = {}
): Promise<{
  messages: { id: string; role: string; content: string; createdAt: string }[];
  summary?: string;
  topics?: string[];
  keyFacts?: string[];
  truncated: boolean;
}> {
  const maxTokens = options.maxTokens || aiConfig.maxContextTokensFallback;

  // Fast path: Try Redis cache first (single round trip)
  let cachedSummary: { summary: string; topics: string[]; keyFacts: string[] } | null = null;
  try {
    const cached = await redis.get(KEYS.chatSummary(chatId));
    if (cached) {
      cachedSummary = JSON.parse(cached);
    }
  } catch {
    // Redis miss, continue
  }

  // Get DB summary if not in cache
  if (!cachedSummary) {
    const dbSummary = await prisma.chatSummary.findUnique({
      where: { chatId },
    });
    if (dbSummary) {
      cachedSummary = {
        summary: dbSummary.summary,
        topics: dbSummary.topics,
        keyFacts: dbSummary.keyFacts,
      };
      // Populate cache for next time
      try {
        await redis.setex(KEYS.chatSummary(chatId), TTL.chatSummary, JSON.stringify(cachedSummary));
      } catch {
        // Non-critical
      }
    }
  }

  // Get recent messages (last 20) - single query
  const recentMessages = await prisma.message.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  // Reverse to chronological
  const messages = recentMessages.reverse().map(m => ({
    id: m.id,
    role: m.role as string,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  // Estimate tokens
  const summaryLen = cachedSummary?.summary?.length || 0;
  const msgLen = messages.reduce((sum, m) => sum + m.content.length, 0);
  const estimatedTokens = Math.ceil((summaryLen + msgLen) / CHARS_PER_TOKEN);

  // If under budget, return everything
  if (estimatedTokens <= maxTokens) {
    return {
      messages,
      summary: cachedSummary?.summary,
      topics: cachedSummary?.topics,
      keyFacts: cachedSummary?.keyFacts,
      truncated: false,
    };
  }

  // Over budget - truncate recent messages
  // Keep last 10 messages for continuity
  return {
    messages: messages.slice(-10),
    summary: cachedSummary?.summary,
    topics: cachedSummary?.topics,
    keyFacts: cachedSummary?.keyFacts,
    truncated: true,
  };
}

/**
 * Queue async summarization - fire and forget
 */
export async function queueSummarization(chatId: string): Promise<void> {
  // Increment message count for threshold tracking
  await incrementMessageCount(chatId);

  // Check threshold (fast)
  const count = await prisma.message.count({ where: { chatId } });
  if (count < SUMMARY_THRESHOLD) return;

  // Already have recent summary in cache? Skip
  try {
    const cached = await redis.get(KEYS.chatSummary(chatId));
    if (cached) return;
  } catch {
    // Redis miss, proceed
  }

  // Fire and forget summarization
  summarizeChat(chatId).catch(err => {
    console.error(`Summarization failed for chat ${chatId}:`, err);
  });
}

/**
 * Delete summary when chat is deleted
 */
export async function deleteSummary(chatId: string): Promise<void> {
  await prisma.chatSummary.deleteMany({ where: { chatId } });
  try {
    await redis.del(KEYS.chatSummary(chatId));
    await redis.del(`chat:${chatId}:msg_count`);
    await redis.del(KEYS.summarizing(chatId));
  } catch {
    // Ignore
  }
}

/**
 * Get summary for a chat (helper for UI)
 */
export async function getSummary(chatId: string): Promise<{
  summary?: string;
  topics?: string[];
  keyFacts?: string[];
} | null> {
  try {
    const cached = await redis.get(KEYS.chatSummary(chatId));
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // Redis miss
  }

  const dbSummary = await prisma.chatSummary.findUnique({
    where: { chatId },
  });

  if (dbSummary) {
    return {
      summary: dbSummary.summary,
      topics: dbSummary.topics,
      keyFacts: dbSummary.keyFacts,
    };
  }

  return null;
}