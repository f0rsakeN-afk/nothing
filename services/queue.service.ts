/**
 * BullMQ Queue Service - Production Grade
 * Handles async job processing with proper retry, backoff, and monitoring
 *
 * Production fixes:
 * 1. Idempotency keys per job (prevent duplicates)
 * 2. Visibility timeout + stalled job detection
 * 3. Backpressure (queue size limits)
 * 4. Separate workers for priority queues (no starvation)
 * 5. Job versioning for schema compatibility
 */

import {
  Queue,
  Worker,
  Job,
  QueueEvents,
  QueueEventsOptions,
  WorkerOptions,
} from "bullmq";
import IORedis from "ioredis";

// Redis connection for BullMQ
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Queue configuration with backpressure limits
const QUEUE_CONFIG = {
  webhook: {
    maxLength: 10000,        // High limit for critical queue
    stalledInterval: 30000,  // Check for stalled jobs every 30s
  },
  summarization: {
    maxLength: 1000,         // AI queue - limit to prevent overload
    stalledInterval: 60000,  // Longer for expensive operations
  },
  "file-processing": {
    maxLength: 500,
    stalledInterval: 45000,
  },
  email: {
    maxLength: 5000,
    stalledInterval: 30000,
  },
  resume: {
    maxLength: 2000,
    stalledInterval: 30000,
  },
  export: {
    maxLength: 50,           // Memory intensive - very low limit
    stalledInterval: 120000, // Very long for big exports
  },
};

// Current job schema version - increment on breaking changes
const JOB_VERSION = 1;

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

function createRedisConnection(): IORedis {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

/**
 * Get or create a queue with backpressure limits
 */
export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const connection = createRedisConnection();
    const config = QUEUE_CONFIG[name as keyof typeof QUEUE_CONFIG] || {};

    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: {
          count: 100,
        },
        removeOnFail: {
          count: 500,
        },
        // Visibility timeout - if job not completed in this time, it's considered stalled
        // Should be longer than expected job duration
        visibilityTimeout: config.stalledInterval || 30000,
      },
      // Backpressure: limit queue size to prevent memory issues
      ...(config.maxLength && { maxLength: config.maxLength }),
    });

    queues.set(name, queue);
  }
  return queues.get(name)!;
}

/**
 * Add a job with idempotency key and versioning
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
    idempotencyKey?: string;  // Unique key to prevent duplicate processing
  } = {}
): Promise<{ job: Job<T>; isDuplicate: boolean }> {
  const queue = getQueue(queueName);

  // Check idempotency key to prevent duplicates
  if (options.idempotencyKey) {
    const existingJob = await queue.getJob(options.idempotencyKey);
    if (existingJob) {
      const state = await existingJob.getState();
      // If job exists and is not failed/stuck, return existing instead of creating new
      if (state !== "failed" && state !== "stuck") {
        return { job: existingJob as Job<T>, isDuplicate: true };
      }
    }
  }

  // Version the data for schema compatibility
  const versionedData = {
    ...(data as Record<string, unknown>),
    _jobVersion: JOB_VERSION,
    _createdAt: Date.now(),
  };

  const jobOptions: Job["opts"] = {
    jobId: options.jobId || options.idempotencyKey,  // Use idempotency key as job ID
    priority: options.priority ?? 1,
    delay: options.delay,
    attempts: options.attempts ?? 3,
    backoff: options.backoff ?? { type: "exponential", delay: 1000 },
    removeOnComplete: options.removeOnComplete ?? true,
    removeOnFail: options.removeOnFail ?? false,  // Keep failed for debugging
  };

  const job = await queue.add(queueName, versionedData as T, jobOptions);
  return { job, isDuplicate: false };
}

/**
 * Add webhook processing job with idempotency
 */
export async function queueWebhook(
  eventType: string,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<{ job: Job; isDuplicate: boolean }> {
  return addJob(
    QUEUE_NAMES.WEBHOOK,
    { eventType, payload, _jobVersion: JOB_VERSION },
    {
      jobId: idempotencyKey,
      idempotencyKey,
      priority: 1,
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
    }
  );
}

/**
 * Add summarization job with idempotency
 */
export async function queueSummarizationJob(
  chatId: string,
  idempotencyKey?: string
): Promise<{ job: Job; isDuplicate: boolean }> {
  const key = idempotencyKey || `summarize:${chatId}`;
  return addJob(
    QUEUE_NAMES.SUMMARIZATION,
    { chatId, _jobVersion: JOB_VERSION },
    {
      jobId: key,
      idempotencyKey: key,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    }
  );
}

/**
 * Add file processing job with idempotency
 */
export async function queueFileProcessing(
  fileId: string,
  s3Key: string,
  type: string,
  idempotencyKey?: string
): Promise<{ job: Job; isDuplicate: boolean }> {
  const key = idempotencyKey || `file:${fileId}`;
  return addJob(
    QUEUE_NAMES.FILE_PROCESSING,
    { fileId, s3Key, type, _jobVersion: JOB_VERSION },
    {
      jobId: key,
      idempotencyKey: key,
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
    }
  );
}

/**
 * Add email job with idempotency
 */
export async function queueEmail(
  to: string,
  template: string,
  data: Record<string, unknown>,
  idempotencyKey?: string
): Promise<{ job: Job; isDuplicate: boolean }> {
  // Create deterministic idempotency key from email + template + data hash
  const key = idempotencyKey || `email:${to}:${template}:${hashData(data)}`;

  return addJob(
    QUEUE_NAMES.EMAIL,
    { to, template, data, _jobVersion: JOB_VERSION },
    {
      jobId: key,
      idempotencyKey: key,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );
}

/**
 * Add export job with idempotency (no retries - expensive operation)
 */
export async function queueExportJob(
  exportJobId: string,
  userId: string
): Promise<{ job: Job; isDuplicate: boolean }> {
  return addJob(
    QUEUE_NAMES.EXPORT,
    { exportJobId, userId, _jobVersion: JOB_VERSION },
    {
      jobId: `export:${exportJobId}`,
      idempotencyKey: `export:${exportJobId}`,
      attempts: 1, // No retries for exports - if failed, user must retry manually
      backoff: { type: "fixed", delay: 0 },
    }
  );
}

/**
 * Simple hash for idempotency keys
 */
function hashData(data: Record<string, unknown>): string {
  const str = JSON.stringify(data, Object.keys(data).sort());
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Create a worker with proper stalled job detection and backpressure handling
 */
export function createWorker<T = Record<string, unknown>>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  options?: {
    concurrency?: number;
    maxStalledCount?: number;  // Max times a job can stall before being moved to failed
  }
): Worker {
  if (workers.has(queueName)) {
    return workers.get(queueName)!;
  }

  const connection = createRedisConnection();
  const config = QUEUE_CONFIG[queueName as keyof typeof QUEUE_CONFIG] || {};

  // Worker options for proper stalled job handling
  const workerOptions: WorkerOptions = {
    connection,
    concurrency: getConcurrency(queueName),
    // Stall detection - how often to check for stalled jobs
    stalledInterval: config.stalledInterval || 30000,
    // Max stalled retries before moving job to failed
    maxStalledCount: options?.maxStalledCount ?? 3,
  };

  const worker = new Worker(queueName, async (job: Job<T>) => {
    // Version check before processing
    const jobData = job.data as Record<string, unknown>;
    const jobVersion = jobData._jobVersion as number | undefined;

    if (jobVersion && jobVersion !== JOB_VERSION) {
      console.warn(`[Queue:${queueName}] Job ${job.id} has version ${jobVersion}, current is ${JOB_VERSION}`);
      // Could add migration logic here
    }

    await processor(job);
  }, workerOptions);

  worker.on("failed", (job, err) => {
    console.error(`[Queue:${queueName}] Job ${job?.id} failed:`, err.message);
    // Check if moved to failed state due to max stalled
    if (err.message.includes("stalled")) {
      console.warn(`[Queue:${queueName}] Job ${job?.id} stalled too many times`);
    }
  });

  worker.on("completed", (job) => {
    console.log(`[Queue:${queueName}] Job ${job.id} completed`);
  });

  worker.on("stalled", (jobId) => {
    console.warn(`[Queue:${queueName}] Job ${jobId} stalled - may need attention`);
  });

  // Handle worker errors
  worker.on("error", (err) => {
    console.error(`[Queue:${queueName}] Worker error:`, err);
  });

  workers.set(queueName, worker);
  return worker;
}

/**
 * Get concurrency based on queue type - tuned for workload characteristics
 */
function getConcurrency(queueName: string): number {
  switch (queueName) {
    case QUEUE_NAMES.WEBHOOK:
      return 5;   // Webhooks need quick response
    case QUEUE_NAMES.SUMMARIZATION:
      return 2;   // AI calls are expensive
    case QUEUE_NAMES.FILE_PROCESSING:
      return 3;   // Moderate CPU
    case QUEUE_NAMES.EMAIL:
      return 5;   // Fast operations
    case QUEUE_NAMES.RESUME:
      return 3;   // Moderate priority
    case QUEUE_NAMES.EXPORT:
      return 1;   // Memory intensive - one at a time
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
 * Get queue metrics for monitoring including backpressure status
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
      paused: boolean;
      backpressureStatus: "normal" | "high" | "critical";
    }
  >
> {
  const metrics: Record<string, {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
    backpressureStatus: "normal" | "high" | "critical";
  }> = {};

  for (const name of queues.keys()) {
    const queue = getQueue(name);
    const config = QUEUE_CONFIG[name as keyof typeof QUEUE_CONFIG];
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    // Calculate backpressure status
    let backpressureStatus: "normal" | "high" | "critical" = "normal";
    if (config?.maxLength) {
      const total = waiting + active + delayed;
      const utilization = total / config.maxLength;
      if (utilization >= 0.9) backpressureStatus = "critical";
      else if (utilization >= 0.7) backpressureStatus = "high";
    }

    metrics[name] = { waiting, active, completed, failed, delayed, paused, backpressureStatus };
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
 * Check if a job exists (for idempotency checking)
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
): Promise<{ state: string; progress: number } | null> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (!job) return null;

  const state = await job.getState();
  const progress = job.progress as number || 0;

  return { state, progress };
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

/**
 * Move job to front of queue (priority boost)
 */
export async function prioritizeJob(queueName: string, jobId: string): Promise<void> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.priority(0); // Priority 0 = highest
  }
}

/**
 * Retry failed jobs in a queue
 */
export async function retryFailedJobs(queueName: string, limit: number = 100): Promise<number> {
  const queue = getQueue(queueName);
  const failed = await queue.getFailed();

  let retried = 0;
  for (const job of failed.slice(0, limit)) {
    try {
      await job.retry();
      retried++;
    } catch (err) {
      console.error(`[Queue:${queueName}] Failed to retry job ${job.id}:`, err);
    }
  }

  return retried;
}

/**
 * Drain queue (process all pending jobs)
 */
export async function drainQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.drain();
}

/**
 * Pause queue (stop processing new jobs)
 */
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
}

/**
 * Resume queue (continue processing)
 */
export async function resumeQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
}