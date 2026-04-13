/**
 * Queue Workers
 * Process jobs from BullMQ queues
 *
 * Run these workers in a separate process:
 *   bun run services/workers.ts
 *
 * Or in same process during development:
 *   import { startAllWorkers } from "@/services/workers";
 *   startAllWorkers();
 */

import { createWorker, getQueue, QUEUE_NAMES } from "@/services/queue.service";
import { Job } from "bullmq";
import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";
import Groq from "groq-sdk";
import { aiConfig } from "@/lib/config";
import { logger } from "@/lib/logger";

const groq = new Groq();

// ============================================
// SUMMARIZATION WORKER
// ============================================

async function processSummarization(job: Job<{ chatId: string }>): Promise<void> {
  const { chatId } = job.data;
  logger.info(`[Summarization] Processing chat ${chatId}`);

  try {
    // Get messages for summarization
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    if (messages.length < 10) {
      logger.info(`[Summarization] Chat ${chatId} has fewer than 10 messages, skipping`);
      return;
    }

    // Generate summary via LLM
    const formattedMessages = messages.map((m, i) => {
      const role = m.role === "user" || m.role === "assistant" ? m.role : "assistant";
      return `${i + 1}. [${role}]: ${m.content.slice(0, 300)}`;
    }).join("\n");

    const prompt = `Summarize this conversation concisely.

MESSAGES:
${formattedMessages}

Return valid JSON only:
{
  "summary": "2-3 sentence overview",
  "topics": ["topic1", "topic2"],
  "keyFacts": ["specific fact 1"]
}`;

    const response = await groq.chat.completions.create({
      model: aiConfig.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from LLM");

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      logger.error(`[Summarization] Failed to parse LLM response for chat ${chatId}`, err as Error);
      return;
    }

    const { summary, topics = [], keyFacts = [] } = parsed;

    // Get existing summary to link branches
    const existingSummary = await prisma.chatSummary.findUnique({
      where: { chatId },
    });

    // Save to database
    await prisma.chatSummary.upsert({
      where: { chatId },
      create: {
        chatId,
        summary,
        topics,
        keyFacts,
        startMessageId: messages[0].id,
        endMessageId: messages[messages.length - 1].id,
        messageCount: messages.length,
        tokenCount: Math.ceil(formattedMessages.length / 4),
        parentSummaryId: existingSummary?.parentSummaryId || null,
      },
      update: {
        summary,
        topics,
        keyFacts,
        startMessageId: messages[0].id,
        endMessageId: messages[messages.length - 1].id,
        messageCount: messages.length,
        tokenCount: Math.ceil(formattedMessages.length / 4),
      },
    });

    // Cache in Redis
    const cacheData = { summary, topics, keyFacts, updatedAt: new Date().toISOString() };
    await redis.setex(KEYS.chatSummary(chatId), TTL.chatSummary, JSON.stringify(cacheData));

    logger.info(`[Summarization] Completed for chat ${chatId}`);
  } catch (err) {
    logger.error(`[Summarization] Failed for chat ${chatId}`, err as Error);
    throw err; // Re-throw to trigger retry
  }
}

// ============================================
// WEBHOOK WORKER
// ============================================

async function processWebhook(job: Job<{ eventType: string; payload: Record<string, unknown> }>): Promise<void> {
  const { eventType, payload } = job.data;
  logger.info(`[Webhook] Processing ${eventType}`);

  try {
    // Import webhook handler
    const { handlePolarWebhookEvent } = await import("@/services/webhook-handler.service");
    await handlePolarWebhookEvent(eventType, payload);
    logger.info(`[Webhook] Processed ${eventType} successfully`);
  } catch (err) {
    logger.error(`[Webhook] Failed to process ${eventType}`, err as Error);
    throw err;
  }
}

// ============================================
// FILE PROCESSING WORKER
// ============================================

async function processFile(job: Job<{ fileId: string; s3Key: string; type: string }>): Promise<void> {
  const { fileId, s3Key, type } = job.data;
  logger.info(`[FileProcessing] Processing file ${fileId}`);

  try {
    // Update file status to processing
    await prisma.file.update({
      where: { id: fileId },
      data: { status: "PROCESSING" },
    });

    // Extract content based on type
    if (type.startsWith("image/")) {
      // For images, just update status
      await prisma.file.update({
        where: { id: fileId },
        data: { status: "READY" },
      });
    } else {
      // For documents, you would extract text here
      // For now, just mark as ready
      await prisma.file.update({
        where: { id: fileId },
        data: { status: "READY" },
      });
    }

    logger.info(`[FileProcessing] Completed for file ${fileId}`);
  } catch (err) {
    logger.error(`[FileProcessing] Failed for file ${fileId}`, err as Error);
    await prisma.file.update({
      where: { id: fileId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

// ============================================
// EMAIL WORKER
// ============================================

async function processEmail(job: Job<{ to: string; template: string; data: Record<string, unknown> }>): Promise<void> {
  const { to, template, data } = job.data;
  logger.info(`[Email] Sending ${template} to ${to}`);

  try {
    // Import email service
    const { sendEmail } = await import("@/services/email.service");
    await sendEmail(to, template, data);
    logger.info(`[Email] Sent ${template} to ${to}`);
  } catch (err) {
    logger.error(`[Email] Failed to send ${template} to ${to}`, err as Error);
    throw err;
  }
}

// ============================================
// START ALL WORKERS
// ============================================

export function startAllWorkers(): void {
  logger.info("[Workers] Starting all queue workers...");

  // Summarization worker
  createWorker(QUEUE_NAMES.SUMMARIZATION, processSummarization);
  logger.info(`[Workers] Summarization worker started (concurrency: 2)`);

  // Webhook worker
  createWorker(QUEUE_NAMES.WEBHOOK, processWebhook);
  logger.info(`[Workers] Webhook worker started (concurrency: 5)`);

  // File processing worker
  createWorker(QUEUE_NAMES.FILE_PROCESSING, processFile);
  logger.info(`[Workers] File processing worker started (concurrency: 3)`);

  // Email worker
  createWorker(QUEUE_NAMES.EMAIL, processEmail);
  logger.info(`[Workers] Email worker started (concurrency: 5)`);

  logger.info("[Workers] All workers started");
}

function startSpecificWorker(queueName: string): void {
  logger.info(`[Workers] Starting ${queueName} worker...`);

  switch (queueName) {
    case QUEUE_NAMES.SUMMARIZATION:
      createWorker(QUEUE_NAMES.SUMMARIZATION, processSummarization);
      logger.info(`[Workers] Summarization worker started (concurrency: 2)`);
      break;
    case QUEUE_NAMES.WEBHOOK:
      createWorker(QUEUE_NAMES.WEBHOOK, processWebhook);
      logger.info(`[Workers] Webhook worker started (concurrency: 5)`);
      break;
    case QUEUE_NAMES.FILE_PROCESSING:
      createWorker(QUEUE_NAMES.FILE_PROCESSING, processFile);
      logger.info(`[Workers] File processing worker started (concurrency: 3)`);
      break;
    case QUEUE_NAMES.EMAIL:
      createWorker(QUEUE_NAMES.EMAIL, processEmail);
      logger.info(`[Workers] Email worker started (concurrency: 5)`);
      break;
    default:
      logger.error(`[Workers] Unknown queue: ${queueName}`);
      process.exit(1);
  }
}

// Start workers if running directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const queueArg = args.find(arg => arg.startsWith("--queue="));

  if (queueArg) {
    const queueName = queueArg.split("=")[1];
    startSpecificWorker(queueName);
  } else {
    startAllWorkers();
  }

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    logger.info("[Workers] Received SIGTERM, shutting down...");
    const { closeAllQueues } = await import("@/services/queue.service");
    await closeAllQueues();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    logger.info("[Workers] Received SIGINT, shutting down...");
    const { closeAllQueues } = await import("@/services/queue.service");
    await closeAllQueues();
    process.exit(0);
  });
}
