/**
 * Message Feedback API
 * POST /api/messages/[id]/feedback - Record reaction to a message
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get prisma user by stackId to get internal UUID
    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id: messageId } = await params;
    const body = await request.json();
    const { reaction, chatId } = body as { reaction: "like" | "dislike"; chatId: string };

    if (!reaction || !["like", "dislike"].includes(reaction)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    // Verify message belongs to user's chat (using prisma UUID)
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        chat: {
          userId: prismaUser.id,
        },
      },
      select: { id: true },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Upsert feedback (toggle on/off)
    const existing = await prisma.messageFeedback.findFirst({
      where: { messageId, userId: prismaUser.id },
    });

    if (existing) {
      if (existing.reaction === reaction) {
        // Toggle off - remove feedback
        await prisma.messageFeedback.delete({
          where: { id: existing.id },
        });
        return NextResponse.json({ feedback: null });
      } else {
        // Change reaction
        await prisma.messageFeedback.update({
          where: { id: existing.id },
          data: { reaction },
        });
        return NextResponse.json({ feedback: reaction });
      }
    }

    // Create new feedback
    const _newFeedback = await prisma.messageFeedback.create({
      data: { messageId, chatId, userId: prismaUser.id, reaction },
    });

    // Update user preferences based on feedback
    try {
      await updateUserPreferencesFromFeedback(prismaUser.id);
    } catch (e) {
      console.error("Failed to update preferences:", e);
    }

    return NextResponse.json({ feedback: reaction });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}

/**
 * Update user preferences based on accumulated feedback
 */
async function updateUserPreferencesFromFeedback(userId: string) {
  // Get all feedback for this user
  const feedbackList = await prisma.messageFeedback.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100, // Consider last 100 messages
  });

  const totalLikes = feedbackList.filter((f) => f.reaction === "like").length;
  const totalDislikes = feedbackList.filter((f) => f.reaction === "dislike").length;
  const total = totalLikes + totalDislikes;

  if (total === 0) return;

  // Calculate like ratio
  const likeRatio = totalLikes / total;

  // Determine preferred settings based on feedback patterns
  let preferredTone = "balanced";
  let detailLevel = "BALANCED";

  // If user gives lots of dislikes, try adjusting tone/detail
  if (likeRatio < 0.4) {
    // User is critical - maybe they want more concise responses
    detailLevel = "CONCISE";
    preferredTone = "concise";
  } else if (likeRatio > 0.8) {
    // User is satisfied - they might want more detailed responses
    detailLevel = "DETAILED";
    preferredTone = "detailed";
  }

  // Upsert preferences
  await prisma.userPreference.upsert({
    where: { userId },
    create: {
      userId,
      preferredTone,
      detailLevel,
      totalLikes,
      totalDislikes,
      likeRatio,
    },
    update: {
      totalLikes,
      totalDislikes,
      likeRatio,
      detailLevel,
      preferredTone,
    },
  });
}