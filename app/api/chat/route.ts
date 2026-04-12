import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";
import { getRecentMessages } from "@/lib/stack-server";
import { buildChatContext } from "@/lib/context-manager";
import { buildSystemPrompt, type PromptConfig } from "@/lib/prompts";
import { validateAuth } from "@/lib/auth";
import { aiConfig } from "@/lib/config";

const groq = new Groq();

/**
 * Build system prompt with search context
 */
async function buildMessages(
  chatId: string,
  incomingMessages: Array<{ role: "user" | "assistant"; content: string }>
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
    },
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  const userPreferences = chat.project?.user?.customize
    ? {
        tone: chat.project.user.customize.responseTone || "balanced",
        detailLevel: chat.project.user.customize.knowledgeDetail || "BALANCED",
        preferredName: chat.project.user.customize.name || chat.project.user.email?.split("@")[0] || "User",
        interests: chat.project.user.customize.interest || [],
        firstName: chat.project.user.customize.firstName || "",
        lastName: chat.project.user.customize.lastName || "",
      }
    : { tone: "balanced" as const, detailLevel: "BALANCED" as const, preferredName: "User", interests: [] as string[], firstName: "", lastName: "" };

  const promptConfig: PromptConfig = {
    tone: userPreferences.tone as PromptConfig["tone"],
    detailLevel: userPreferences.detailLevel as PromptConfig["detailLevel"],
    userName: userPreferences.preferredName,
    userFirstName: userPreferences.firstName,
    userLastName: userPreferences.lastName,
    userInterests: userPreferences.interests,
    projectName: chat.project?.name,
    projectInstruction: chat.project?.instruction || undefined,
  };

  const recentMessages = await getRecentMessages(chatId, aiConfig.maxRecentMessages);

  const { messages: contextMessages, systemPrompt: optimizedSystemPrompt, truncated, keyFacts } =
    await buildChatContext(recentMessages, {
      maxTokens: aiConfig.maxContextTokens,
      systemPrompt: buildSystemPrompt(promptConfig),
    });

  let systemNote = "";
  if (truncated) {
    systemNote = `\n\n[Earlier conversation summarized. Key facts preserved: ${keyFacts.length} items]`;
  }

  const systemContent = (optimizedSystemPrompt || "") + systemNote;

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

    const body = await req.json().catch((e) => ({}) );
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
    const { stripeConfig } = await import("@/lib/stripe-config");

    // Determine cost based on model
    const model = aiConfig.model as keyof typeof stripeConfig.creditCosts;
    const cost = stripeConfig.creditCosts[model] || 1;

    // Check if user has enough credits
    const hasCredits = await checkCreditsForOperation(user.id, model);
    if (!hasCredits) {
      // Get current balance
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

    // Deduct credits (will be refunded if operation fails)
    const deduction = await deductCredits(user.id, model);

    // Build messages with optimized context
    const fullMessages = await buildMessages(chatId, messages);

    // Validate we have at least a system message or incoming messages
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
 * Saves directly to database after stream completes
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

    // Invalidate user chat list cache (AI response changes chat's updatedAt sort order)
    try {
      await redis.del(KEYS.userChats(userId));
    } catch {
      // Redis error, ignore
    }

    return message;
  } catch (error) {
    console.error("Failed to save AI response:", error);
  }
}
