/**
 * Settings - Delete All Chats
 * DELETE /api/settings/delete-chats - Permanently delete all user conversations
 */

import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";
import prisma from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await checkRateLimitWithAuth(request, "default");
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.resetAt);
    }

    const user = await stackServerApp.getUser({ tokenStore: request });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prismaUser = await prisma.user.findUnique({
      where: { stackId: user.id },
      select: { id: true },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all chat IDs for this user (to clean up related data)
    const userChats = await prisma.chat.findMany({
      where: { userId: prismaUser.id },
      select: { id: true },
    });
    const chatIds = userChats.map((c) => c.id);

    // Delete in transaction to ensure all related data is cleaned up
    await prisma.$transaction([
      // Delete messages for all chats
      prisma.message.deleteMany({
        where: { chatId: { in: chatIds } },
      }),
      // Delete chat summaries
      prisma.chatSummary.deleteMany({
        where: { chatId: { in: chatIds } },
      }),
      // Delete chat files
      prisma.chatFile.deleteMany({
        where: { chatId: { in: chatIds } },
      }),
      // Delete all user chats
      prisma.chat.deleteMany({
        where: { userId: prismaUser.id },
      }),
    ]);

    return NextResponse.json({
      success: true,
      deletedCount: userChats.length,
    });
  } catch (error) {
    console.error("Delete all chats error:", error);
    return NextResponse.json({ error: "Failed to delete conversations" }, { status: 500 });
  }
}
