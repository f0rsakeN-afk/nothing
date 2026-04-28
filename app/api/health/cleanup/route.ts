/**
 * Cleanup Cron - Cleans orphaned chats and stale data
 * Protected by CRON_SECRET header verification
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * Find and clean orphaned chats (owner deleted, cascade set userId to null)
 * Also cleans up stale presence entries
 */
async function cleanupOrphanedChats(): Promise<{ deleted: number }> {
  // Find chats where userId is NULL (owner was deleted, SetNull cascade happened)
  // These chats have no owner and cascade deleted members/invitations
  // But they may still have messages that need cleanup
  const orphanedChats = await prisma.chat.findMany({
    where: { userId: null },
    select: { id: true },
  });

  if (orphanedChats.length === 0) {
    return { deleted: 0 };
  }

  const orphanedIds = orphanedChats.map((c) => c.id);

  // Delete messages first (has File relation with cascade)
  await prisma.message.deleteMany({
    where: { chatId: { in: orphanedIds } },
  });

  // Delete chat files
  await prisma.chatFile.deleteMany({
    where: { chatId: { in: orphanedIds } },
  });

  // Delete the orphaned chats
  const result = await prisma.chat.deleteMany({
    where: { id: { in: orphanedIds } },
  });

  return { deleted: result.count };
}

/**
 * Clean up stale presence entries (users who left or were removed)
 * This runs more frequently as it's lighter weight
 */
async function cleanupStalePresence(): Promise<{ cleaned: number }> {
  // This is handled by Redis TTL automatically (presence key expires)
  // But we can clean up presence hashes for deleted chats
  // Pattern: scan for presence:* keys and check if their chat still exists

  let cleaned = 0;
  const stream = await redis.scanStream({
    match: KEYS.chatPresence("*"),
    count: 100,
  });

  for await (const key of stream) {
    // Extract chatId from key pattern presence:{chatId}
    const chatId = key.replace("presence:", "");
    // Check if chat still exists
    const exists = await prisma.chat.count({ where: { id: chatId } });
    if (exists === 0) {
      await redis.del(key);
      cleaned++;
    }
  }

  return { cleaned };
}

export async function GET(request: NextRequest) {
  // Verify cron secret from cron service
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const start = Date.now();

    // Run cleanups
    const orphanedResult = await cleanupOrphanedChats();
    const presenceResult = await cleanupStalePresence();

    const duration = Date.now() - start;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      results: {
        orphanedChatsDeleted: orphanedResult.deleted,
        stalePresenceCleaned: presenceResult.cleaned,
      },
    });
  } catch (error) {
    console.error("Cleanup cron failed:", error);
    return NextResponse.json(
      { success: false, error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
