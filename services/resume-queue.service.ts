/**
 * Resume Queue Service
 * Queues resume attempts when streams expire or are missing
 */

import { addJob, createWorker, getQueue, QUEUE_NAMES } from "./queue.service";
import prisma from "@/lib/prisma";

export interface ResumeJobData {
  chatId: string;
  userId: string;
  reason: string;
  attemptedAt: string;
  retryCount: number;
}

const MAX_RESUME_RETRIES = 3;
const RESUME_RETRY_DELAY_MS = 5000;

/**
 * Queue a resume attempt for a chat
 */
export async function queueResumeAttempt(
  chatId: string,
  userId: string,
  reason: string
): Promise<void> {
  try {
    const jobId = `resume:${chatId}:${Date.now()}`;
    await addJob(
      QUEUE_NAMES.RESUME,
      {
        chatId,
        userId,
        reason,
        attemptedAt: new Date().toISOString(),
        retryCount: 0,
      } as ResumeJobData,
      {
        jobId,
        attempts: MAX_RESUME_RETRIES,
        backoff: { type: "exponential", delay: RESUME_RETRY_DELAY_MS },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for debugging
      }
    );
    console.log(`[ResumeQueue] Queued resume attempt for chat ${chatId}: ${reason}`);
  } catch (error) {
    console.error("[ResumeQueue] Failed to queue resume attempt:", error);
  }
}

/**
 * Process a resume attempt
 * This worker runs asynchronously and notifies the client when resume is ready
 */
export function createResumeWorker(): void {
  const worker = createWorker<ResumeJobData>(QUEUE_NAMES.RESUME, async (job) => {
    const { chatId, userId, reason, retryCount } = job.data;

    console.log(`[ResumeQueue] Processing resume for chat ${chatId}, attempt ${retryCount + 1}`);

    try {
      // Check if chat still exists and user owns it
      const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId },
        select: { id: true, updatedAt: true },
      });

      if (!chat) {
        console.log(`[ResumeQueue] Chat ${chatId} not found or not owned by user, skipping`);
        return;
      }

      // Check if there's a newer stream (user sent new message)
      // If so, don't bother resuming old stream
      const newerStreamKey = `chat:${chatId}:stream:version`;
      const redisClient = (await import("@/lib/redis")).default;
      const currentVersion = await redisClient.get(newerStreamKey);

      if (currentVersion) {
        const jobVersion = job.data.attemptedAt;
        if (jobVersion < currentVersion) {
          console.log(`[ResumeQueue] Newer stream exists for chat ${chatId}, skipping resume`);
          return;
        }
      }

      // Store resume ready signal in Redis
      const resumeReadyKey = `resume:${chatId}:ready`;
      await redisClient.setex(
        resumeReadyKey,
        300, // 5 minutes TTL
        JSON.stringify({
          ready: true,
          chatId,
          readyAt: new Date().toISOString(),
        })
      );

      // Publish resume ready event
      const { publishChatResumeReady } = await import("@/services/chat-pubsub.service");
      await publishChatResumeReady(chatId, userId);

      console.log(`[ResumeQueue] Resume ready for chat ${chatId}`);
    } catch (error) {
      console.error(`[ResumeQueue] Failed to process resume for chat ${chatId}:`, error);
      throw error; // Re-throw to trigger retry
    }
  });

  worker.on("failed", (job, err) => {
    console.error(`[ResumeQueue] Resume job ${job?.id} failed after ${job?.attemptsMade} attempts:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[ResumeQueue] Resume job ${job.id} completed successfully`);
  });
}

/**
 * Check if a resume is ready for a chat
 */
export async function isResumeReady(chatId: string): Promise<boolean> {
  try {
    const redisClient = (await import("@/lib/redis")).default;
    const resumeReadyKey = `resume:${chatId}:ready`;
    const data = await redisClient.get(resumeReadyKey);
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Clear resume ready signal
 */
export async function clearResumeReady(chatId: string): Promise<void> {
  try {
    const redisClient = (await import("@/lib/redis")).default;
    const resumeReadyKey = `resume:${chatId}:ready`;
    await redisClient.del(resumeReadyKey);
  } catch {
    // Ignore errors
  }
}
