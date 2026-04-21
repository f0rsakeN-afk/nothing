import OpenAI from "openai";
import prisma from "./prisma";
import redis, { KEYS, CHANNELS } from "./redis";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const TITLE_PROMPT = `Given the following first message from a user in a chat application, generate a short, descriptive title (max 5 words) that summarizes the topic. Respond with ONLY the title, no quotes, no explanation.

Message: "{message}"

Title:`;

export async function generateTitle(chatId: string): Promise<string | null> {
  try {
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

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
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

    await prisma.chat.update({
      where: { id: chatId },
      data: { title },
    });

    await redis.hset(KEYS.chatMeta(chatId), "title", title);

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
