/**
 * BullMQ Queue Service
 * Handles async job processing with retry, backoff, and monitoring
 *
 * Queues:
 * - webhook: Polar webhook processing (critical, high priority)
 * - summarization: Chat context summarization (medium priority)
 * - fileProcessing: Post-upload file processing (medium priority)
 * - email: Email delivery (low priority)
 */

import {
  Queue,
  Worker,
  Job,
  QueueEvents,
} from "bullmq";
import IORedis from "ioredis";

// Redis connection for BullMQ
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

function createRedisConnection(): IORedis {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// Queue names
export const QUEUE_NAMES = {
  WEBHOOK: "webhook",
  SUMMARIZATION: "summarization",
  FILE_PROCESSING: "file-processing",
  EMAIL: "email",
  RESUME: "resume",
  EXPORT: "export",
} as const;

// Queue instances (singleton)
const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<string, QueueEvents>();

/**
 * Get or create a queue
 */
export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const connection = createRedisConnection();
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
        },
        removeOnFail: {
          count: 500, // Keep last 500 failed jobs
        },
      },
    });
    queues.set(name, queue);
  }
  return queues.get(name)!;
}

/**
 * Add a job to a queue
 */
export async function addJob<T = Record<string, unknown>>(
  queueName: string,
  data: T,
  options: {
    jobId?: string;
    priority?: number;
    delay?: number;
    attempts?: number;
    backoff?: { type: "exponential" | "fixed"; delay: number };
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  } = {}
): Promise<Job<T>> {
  const queue = getQueue(queueName);

  const jobOptions: Job["opts"] = {
    jobId: options.jobId,
    priority: options.priority,
    delay: options.delay,
    attempts: options.attempts ?? 3,
    backoff: options.backoff ?? { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: true,
  };

  return queue.add(queueName, data, jobOptions);
}

/**
 * Add a webhook processing job
 */
export async function queueWebhook(
  eventType: string,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<Job> {
  return addJob(
    QUEUE_NAMES.WEBHOOK,
    { eventType, payload },
    {
      jobId: idempotencyKey, // Idempotency - same key won't be processed twice
      priority: 1, // High priority
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    }
  );
}

/**
 * Add a summarization job
 */
export async function queueSummarizationJob(chatId: string): Promise<Job> {
  return addJob(
    QUEUE_NAMES.SUMMARIZATION,
    { chatId },
    {
      jobId: `summarize:${chatId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}

/**
 * Add a file processing job
 */
export async function queueFileProcessing(
  fileId: string,
  s3Key: string,
  type: string
): Promise<Job> {
  return addJob(
    QUEUE_NAMES.FILE_PROCESSING,
    { fileId, s3Key, type },
    {
      jobId: `file:${fileId}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    }
  );
}

/**
 * Add an email job
 */
export async function queueEmail(
  to: string,
  template: string,
  data: Record<string, unknown>
): Promise<Job> {
  return addJob(
    QUEUE_NAMES.EMAIL,
    { to, template, data },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );
}

/**
 * Add an export job
 */
export async function queueExportJob(
  exportJobId: string,
  userId: string
): Promise<Job> {
  return addJob(
    QUEUE_NAMES.EXPORT,
    { exportJobId, userId },
    {
      jobId: `export:${exportJobId}`,
      attempts: 1, // No retries for exports
      backoff: { type: "fixed", delay: 0 },
    }
  );
}

/**
 * Create a worker for a queue
 */
export function createWorker<T = Record<string, unknown>>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>
): Worker {
  if (workers.has(queueName)) {
    return workers.get(queueName)!;
  }

  const connection = createRedisConnection();
  const worker = new Worker(queueName, processor, {
    connection,
    concurrency: getConcurrency(queueName),
  });

  worker.on("failed", (job, err) => {
    console.error(`[Queue:${queueName}] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[Queue:${queueName}] Job ${job.id} completed`);
  });

  workers.set(queueName, worker);
  return worker;
}

/**
 * Get concurrency based on queue type
 */
function getConcurrency(queueName: string): number {
  switch (queueName) {
    case QUEUE_NAMES.WEBHOOK:
      return 5; // Webhooks need quick response, process many in parallel
    case QUEUE_NAMES.SUMMARIZATION:
      return 2; // AI calls are expensive, limit concurrency
    case QUEUE_NAMES.FILE_PROCESSING:
      return 3; // File processing is moderate
    case QUEUE_NAMES.EMAIL:
      return 5; // Email sending is fast
    case QUEUE_NAMES.RESUME:
      return 3; // Resume attempts are moderate priority
    case QUEUE_NAMES.EXPORT:
      return 1; // Export is expensive, only one at a time
    default:
      return 3;
  }
}

/**
 * Get queue events for monitoring
 */
export function getQueueEvents(queueName: string): QueueEvents {
  if (!queueEvents.has(queueName)) {
    const connection = createRedisConnection();
    const events = new QueueEvents(queueName, { connection });
    queueEvents.set(queueName, events);
  }
  return queueEvents.get(queueName)!;
}

/**
 * Get queue metrics for monitoring
 */
export async function getQueueMetrics(): Promise<
  Record<
    string,
    {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }
  >
> {
  const metrics: Record<string, { waiting: number; active: number; completed: number; failed: number; delayed: number }> = {};

  for (const name of queues.keys()) {
    const queue = getQueue(name);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    metrics[name] = { waiting, active, completed, failed, delayed };
  }

  return metrics;
}

/**
 * Close all queues and workers gracefully
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const worker of workers.values()) {
    closePromises.push(worker.close());
  }

  for (const queue of queues.values()) {
    closePromises.push(queue.close());
  }

  for (const events of queueEvents.values()) {
    closePromises.push(events.close());
  }

  await Promise.all(closePromises);
}

/**
 * Check if a job exists (for idempotency)
 */
export async function jobExists(queueName: string, jobId: string): Promise<boolean> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  return job !== null;
}

/**
 * Get job status
 */
export async function getJobStatus(
  queueName: string,
  jobId: string
): Promise<string | null> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (!job) return null;

  const state = await job.getState();
  return state;
}

/**
 * Remove a job
 */
export async function removeJob(queueName: string, jobId: string): Promise<void> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}
