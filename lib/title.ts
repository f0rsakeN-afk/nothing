import Groq from "groq-sdk";
import prisma from "./prisma";
import redis, { KEYS, CHANNELS } from "./redis";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

const TITLE_PROMPT = `Given the following first message from a user in a chat application, generate a short, descriptive title (max 5 words) that summarizes the topic. Respond with ONLY the title, no quotes, no explanation.

Message: "{message}"

Title:`;

export async function generateTitle(chatId: string): Promise<string | null> {
  try {
    // Get the first user message
    const firstMessage = await prisma.message.findFirst({
      where: {
        chatId,
        sender: "user",
      },
      orderBy: { createdAt: "asc" },
      select: { content: true, chat: { select: { userId: true, projectId: true } } },
    });

    if (!firstMessage) {
      console.log(`No first message found for chat ${chatId}`);
      return null;
    }

    // Generate title using Groq
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: TITLE_PROMPT.replace("{message}", firstMessage.content),
        },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const title = response.choices[0]?.message?.content?.trim() || "New Chat";

    // Update chat title in database
    await prisma.chat.update({
      where: { id: chatId },
      data: { title },
    });

    // Update Redis cache
    await redis.hset(KEYS.chatMeta(chatId), "title", title);

    // Publish sidebar event for real-time update
    if (firstMessage.chat.userId) {
      await redis.publish(
        CHANNELS.sidebar(firstMessage.chat.userId),
        JSON.stringify({
          type: "chat:renamed",
          chatId,
          title,
        })
      );
    }

    return title;
  } catch (error) {
    console.error(`Failed to generate title for chat ${chatId}:`, error);
    return null;
  }
}
