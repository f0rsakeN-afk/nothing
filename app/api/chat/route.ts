import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";
import { buildSystemPrompt, type PromptConfig } from "@/lib/prompts";
import { validateAuth } from "@/lib/auth";
import { aiConfig } from "@/lib/config";
import { getUserPreferences } from "@/services/preferences.service";
import { getChatContext, queueSummarization } from "@/services/summarize.service";

const groq = new Groq();

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
  incomingMessages: Array<{ role: "user" | "assistant"; content: string }>
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
    const { checkCreditsForOperation, deductCredits } = await import("@/services/credit.service");
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

    // Deduct credits
    const deduction = await deductCredits(user.id, model);

    // Build messages with smart context
    const fullMessages = await buildMessages(chatId, messages);

    if (fullMessages.length === 0 || (fullMessages.length === 1 && fullMessages[0].role === "system")) {
      return new Response(JSON.stringify({ error: "No messages available" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream from Groq
    const stream = await groq.chat.completions.create({
      model: aiConfig.model,
      messages: fullMessages as any,
      stream: true,
      temperature: aiConfig.temperature,
      max_tokens: aiConfig.maxTokens,
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

    // Trigger async summarization check (fire and forget)
    queueSummarization(chatId).catch(console.error);

    return message;
  } catch (error) {
    console.error("Failed to save AI response:", error);
  }
}