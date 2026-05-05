/**
 * Circuit Breaker Service - Production Grade
 * Prevents cascading failures with distributed state coordination
 *
 * Production fixes:
 * 1. Distributed lock for HALF_OPEN probe (thundering herd prevention)
 * 2. Redis TIME for clock drift prevention
 * 3. Error classification (retryable vs fatal vs ignore)
 * 4. Warmup strategy for cold starts
 * 5. Progressive recovery (not binary OPEN→CLOSED)
 */

import redis from "@/lib/redis";
import { KEYS } from "@/lib/redis";

// Circuit breaker states
export enum CircuitState {
  CLOSED = "CLOSED",
  HALF_OPEN = "HALF_OPEN",
  OPEN = "OPEN",
}

// Error classification for proper circuit behavior
export enum ErrorType {
  RETRYABLE = "retryable",     // Timeout, 502/503/504, rate limit - should open circuit
  FATAL = "fatal",             // 400 bad request, 401 unauthorized - circuit stays closed
  IGNORED = "ignored",         // User errors, validation - don't affect circuit
}

interface CircuitBreakerConfig {
  failureThreshold: number;     // Failures before opening circuit (default: 5)
  successThreshold: number;      // Successes in half-open before closing (default: 3)
  openTimeoutMs: number;         // Time before trying half-open (default: 30s)
  halfOpenMaxCalls: number;     // Max calls allowed in half-open (default: 3)
  warmupCalls?: number;         // Calls to allow in CLOSED before threshold applies
  progressiveRecovery?: boolean; // Enable progressive recovery (default: true)
}

interface DistributedState {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number;
  nextAttemptTime: number;
  halfOpenCalls: number;
  totalCalls: number;
  totalFailures: number;
  halfOpenSuccesses: number;    // For progressive recovery tracking
  recoveryStep: number;         // Current recovery step (1, 2, 5, 10, etc.)
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  openTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
  warmupCalls: 10,              // Allow spike without opening
  progressiveRecovery: true,
};

// Per-service configs
const SERVICE_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
  openai: {
    failureThreshold: 3,
    successThreshold: 2,
    openTimeoutMs: 15000,
    halfOpenMaxCalls: 2,
    warmupCalls: 5,
  },
  polar: {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30000,
    halfOpenMaxCalls: 1,        // Conservative for payments
    progressiveRecovery: false, // Payments go straight to full
  },
  searxng: {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30000,
    halfOpenMaxCalls: 3,
    warmupCalls: 3,
  },
};

/**
 * Classify error type for circuit breaker decisions
 */
export function classifyError(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const statusCode = extractStatusCode(error);

    // FATAL errors - never open circuit
    if (statusCode === 400) return ErrorType.FATAL;
    if (statusCode === 401 || statusCode === 403) return ErrorType.FATAL;
    if (statusCode === 404) return ErrorType.FATAL;
    if (message.includes("validation") || message.includes("invalid")) return ErrorType.FATAL;

    // IGNORED errors - don't affect circuit
    if (statusCode === 422) return ErrorType.IGNORED;
    if (message.includes("user") && message.includes("error")) return ErrorType.IGNORED;

    // RETRYABLE errors - open circuit
    if (statusCode === 408) return ErrorType.RETRYABLE;
    if (statusCode >= 500 && statusCode < 600) return ErrorType.RETRYABLE;
    if (statusCode === 429) return ErrorType.RETRYABLE;
    if (message.includes("timeout") || message.includes("etimedout")) return ErrorType.RETRYABLE;
    if (message.includes("econnreset") || message.includes("econnrefused")) return ErrorType.RETRYABLE;
    if (message.includes("rate limit")) return ErrorType.RETRYABLE;
  }

  // Unknown errors - default to retryable (safe side)
  return ErrorType.RETRYABLE;
}

function extractStatusCode(error: Error): number | null {
  // Try to extract status code from error message or properties
  const match = error.message.match(/\b([4-5]\d{2})\b/);
  if (match) return parseInt(match[1], 10);

  // Check for specific error types
  if (error.name === "CircuitBreakerOpenError") return null; // Our own error
  if (error.name === "AbortError") return 408;

  return null;
}

/**
 * Get Redis key for circuit breaker
 */
function getBreakerKey(service: string): string {
  return `circuit_breaker:${service}`;
}

/**
 * Get distributed lock for HALF_OPEN probe
 * Only ONE container should test recovery - prevents thundering herd
 */
async function acquireHalfOpenLock(
  service: string,
  lockTimeoutMs: number = 5000
): Promise<boolean> {
  const lockKey = `circuit_breaker:${service}:half_open_lock`;
  // SETNX with TTL - only one container wins
  const result = await redis.set(lockKey, process.pid.toString(), {
    NX: true,
    EX: Math.ceil(lockTimeoutMs / 1000),
  });
  return result === "OK";
}

/**
 * Release half-open lock
 */
async function releaseHalfOpenLock(service: string): Promise<void> {
  const lockKey = `circuit_breaker:${service}:half_open_lock`;
  await redis.del(lockKey);
}

/**
 * Get server-side time from Redis (consistent across containers)
 * Prevents clock drift issues
 */
async function getRedisTime(): Promise<number> {
  const time = await redis.time();
  // Redis TIME returns [seconds, microseconds]
  return parseInt(time[0], 10) * 1000 + Math.floor(parseInt(time[1], 10) / 1000);
}

/**
 * Get or initialize distributed circuit breaker state from Redis
 */
async function getDistributedState(service: string): Promise<DistributedState> {
  const key = getBreakerKey(service);
  const data = await redis.hgetall(key);

  if (!data || Object.keys(data).length === 0) {
    return {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0,
      halfOpenCalls: 0,
      totalCalls: 0,
      totalFailures: 0,
      halfOpenSuccesses: 0,
      recoveryStep: 1,
    };
  }

  return {
    state: (data.state as CircuitState) || CircuitState.CLOSED,
    failures: parseInt(data.failures) || 0,
    successes: parseInt(data.successes) || 0,
    lastFailureTime: parseInt(data.lastFailureTime) || 0,
    nextAttemptTime: parseInt(data.nextAttemptTime) || 0,
    halfOpenCalls: parseInt(data.halfOpenCalls) || 0,
    totalCalls: parseInt(data.totalCalls) || 0,
    totalFailures: parseInt(data.totalFailures) || 0,
    halfOpenSuccesses: parseInt(data.halfOpenSuccesses) || 0,
    recoveryStep: parseInt(data.recoveryStep) || 1,
  };
}

/**
 * Save distributed circuit breaker state to Redis
 */
async function saveDistributedState(
  service: string,
  state: DistributedState
): Promise<void> {
  const key = getBreakerKey(service);
  await redis.hset(key, {
    state: state.state,
    failures: String(state.failures),
    successes: String(state.successes),
    lastFailureTime: String(state.lastFailureTime),
    nextAttemptTime: String(state.nextAttemptTime),
    halfOpenCalls: String(state.halfOpenCalls),
    totalCalls: String(state.totalCalls),
    totalFailures: String(state.totalFailures),
    halfOpenSuccesses: String(state.halfOpenSuccesses),
    recoveryStep: String(state.recoveryStep),
  });
  // 1 hour TTL for stale breakers
  await redis.expire(key, 3600);
}

/**
 * Calculate progressive recovery step
 * Instead of binary OPEN→CLOSED, allows 1→2→5→10→full traffic
 */
function getNextRecoveryStep(currentStep: number): number {
  const steps = [1, 2, 5, 10, 25, 50, 100]; // Progressive values
  const currentIndex = steps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === steps.length - 1) {
    return 100; // Max step
  }
  return steps[currentIndex + 1];
}

/**
 * Get max calls for current recovery step (progressive recovery)
 */
function getMaxCallsForStep(
  step: number,
  baseMaxCalls: number
): number {
  // Each step allows more calls
  return Math.min(step, baseMaxCalls * 3);
}

/**
 * Check if circuit breaker allows request (distributed version)
 */
async function canExecuteDistributed(
  service: string,
  config: CircuitBreakerConfig
): Promise<{ allowed: boolean; currentState: DistributedState; reason?: string }> {
  const state = await getDistributedState(service);
  const now = await getRedisTime(); // Use Redis time for consistency

  switch (state.state) {
    case CircuitState.CLOSED:
      // Warmup phase - allow calls without tracking failures
      if (config.warmupCalls && state.totalCalls < config.warmupCalls) {
        return { allowed: true, currentState: state };
      }
      return { allowed: true, currentState: state };

    case CircuitState.OPEN:
      if (now >= state.nextAttemptTime) {
        // Try to acquire lock for HALF_OPEN probe
        const lockAcquired = await acquireHalfOpenLock(service, config.openTimeoutMs);

        if (!lockAcquired) {
          // Another container is testing, don't allow call yet
          return { allowed: false, currentState: state, reason: "Another container testing recovery" };
        }

        // We got the lock - transition to HALF_OPEN
        const newState: DistributedState = {
          ...state,
          state: CircuitState.HALF_OPEN,
          halfOpenCalls: 0,
          successes: 0,
          halfOpenSuccesses: 0,
          recoveryStep: config.progressiveRecovery ? 1 : 100, // Start at step 1 or full
        };
        await saveDistributedState(service, newState);
        return { allowed: true, currentState: newState };
      }
      return { allowed: false, currentState: state, reason: `Circuit open, retry after ${state.nextAttemptTime - now}ms` };

    case CircuitState.HALF_OPEN: {
      // Calculate max calls for current recovery step
      const maxCalls = config.progressiveRecovery
        ? getMaxCallsForStep(state.recoveryStep, config.halfOpenMaxCalls)
        : config.halfOpenMaxCalls;

      if (state.halfOpenCalls >= maxCalls) {
        return {
          allowed: false,
          currentState: state,
          reason: `Half-open limit reached (${state.halfOpenCalls}/${maxCalls})`
        };
      }

      const newState: DistributedState = {
        ...state,
        halfOpenCalls: state.halfOpenCalls + 1,
        totalCalls: state.totalCalls + 1,
      };
      await saveDistributedState(service, newState);
      return { allowed: true, currentState: newState };
    }

    default:
      return { allowed: true, currentState: state };
  }
}

/**
 * Record success in distributed circuit breaker
 */
async function recordSuccessDistributed(
  service: string,
  config: CircuitBreakerConfig
): Promise<void> {
  const state = await getDistributedState(service);
  const now = await getRedisTime();

  const newState: DistributedState = {
    ...state,
    failures: 0,
    totalCalls: state.totalCalls + 1,
  };

  if (state.state === CircuitState.HALF_OPEN) {
    newState.halfOpenSuccesses = state.halfOpenSuccesses + 1;

    if (config.progressiveRecovery) {
      // Progressive recovery: need multiple successes at each step
      const requiredSuccesses = state.recoveryStep;
      if (newState.halfOpenSuccesses >= requiredSuccesses) {
        if (state.recoveryStep >= 100) {
          // Full recovery
          newState.state = CircuitState.CLOSED;
          newState.halfOpenSuccesses = 0;
          newState.halfOpenCalls = 0;
          newState.recoveryStep = 1;
        } else {
          // Progress to next step
          newState.recoveryStep = getNextRecoveryStep(state.recoveryStep);
          newState.halfOpenSuccesses = 0;
        }
      }
    } else {
      // Binary recovery (original behavior)
      newState.successes = state.successes + 1;
      if (newState.successes >= config.successThreshold) {
        newState.state = CircuitState.CLOSED;
        newState.successes = 0;
        newState.halfOpenCalls = 0;
      }
    }
  }

  await saveDistributedState(service, newState);

  // Release half-open lock if we transitioned to CLOSED
  if (newState.state === CircuitState.CLOSED && state.state === CircuitState.HALF_OPEN) {
    await releaseHalfOpenLock(service);
  }
}

/**
 * Record failure in distributed circuit breaker (with error classification)
 */
async function recordFailureDistributed(
  service: string,
  config: CircuitBreakerConfig,
  errorType: ErrorType = ErrorType.RETRYABLE
): Promise<void> {
  // Don't record IGNORED errors - they don't affect circuit
  if (errorType === ErrorType.IGNORED) {
    return;
  }

  const state = await getDistributedState(service);
  const now = await getRedisTime();

  const newState: DistributedState = {
    ...state,
    failures: state.failures + 1,
    lastFailureTime: now,
    totalCalls: state.totalCalls + 1,
    totalFailures: state.totalFailures + 1,
  };

  if (state.state === CircuitState.HALF_OPEN) {
    // Any failure in half-open immediately opens the circuit
    newState.state = CircuitState.OPEN;
    newState.nextAttemptTime = now + config.openTimeoutMs;
    newState.successes = 0;
    newState.halfOpenCalls = 0;
    newState.halfOpenSuccesses = 0;
    newState.recoveryStep = 1;

    await saveDistributedState(service, newState);
    await releaseHalfOpenLock(service);
  } else if (state.state === CircuitState.CLOSED) {
    // Check if we should open
    if (errorType === ErrorType.FATAL) {
      // FATAL errors don't open circuit but are logged
      console.warn(`[CircuitBreaker] Fatal error for ${service} (not opening circuit):`, errorType);
      return;
    }

    // Warmup phase - don't count failures
    if (config.warmupCalls && state.totalCalls < config.warmupCalls) {
      return;
    }

    if (newState.failures >= config.failureThreshold) {
      newState.state = CircuitState.OPEN;
      newState.nextAttemptTime = now + config.openTimeoutMs;
    }

    await saveDistributedState(service, newState);
  }
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: string | null;
  nextAttempt: string | null;
  failureRate: number;
  totalCalls: number;
  totalFailures: number;
  uptimePercent: number;
  recoveryStep: number;
  isWarm: boolean;
}

/**
 * Get circuit breaker stats for a service
 */
export async function getCircuitBreakerStats(service: string): Promise<CircuitBreakerStats> {
  const state = await getDistributedState(service);
  const config = { ...DEFAULT_CONFIG, ...SERVICE_CONFIGS[service] };

  const failureRate = state.totalCalls > 0
    ? (state.totalFailures / state.totalCalls) * 100
    : 0;

  const uptimePercent = state.totalCalls > 0
    ? ((state.totalCalls - state.totalFailures) / state.totalCalls) * 100
    : 100;

  return {
    state: state.state,
    failures: state.failures,
    successes: state.successes,
    lastFailure: state.lastFailureTime > 0
      ? new Date(state.lastFailureTime).toISOString()
      : null,
    nextAttempt: state.state === CircuitState.OPEN && state.nextAttemptTime > 0
      ? new Date(state.nextAttemptTime).toISOString()
      : null,
    failureRate: Math.round(failureRate * 100) / 100,
    totalCalls: state.totalCalls,
    totalFailures: state.totalFailures,
    uptimePercent: Math.round(uptimePercent * 1000) / 1000,
    recoveryStep: state.recoveryStep,
    isWarm: config.warmupCalls ? state.totalCalls >= config.warmupCalls : true,
  };
}

/**
 * Circuit Breaker Open Error
 */
export class CircuitBreakerOpenError extends Error {
  constructor(
    message: string,
    public readonly service: string,
    public readonly state: CircuitState,
    public readonly nextAttempt: number
  ) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}

/**
 * Execute with circuit breaker protection (distributed version)
 * Classifies errors automatically
 */
export async function executeWithCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  const config = { ...DEFAULT_CONFIG, ...SERVICE_CONFIGS[service] };
  const { allowed, currentState, reason } = await canExecuteDistributed(service, config);

  if (!allowed) {
    throw new CircuitBreakerOpenError(
      `Circuit breaker is OPEN for ${service}. ${reason || ""} Try again later.`,
      service,
      currentState.state,
      currentState.nextAttemptTime
    );
  }

  try {
    const result = await fn();
    await recordSuccessDistributed(service, config);
    return result;
  } catch (error) {
    const errorType = classifyError(error);
    await recordFailureDistributed(service, config, errorType);
    throw error;
  }
}

/**
 * Get health status of all circuit breakers
 */
export async function getCircuitBreakerHealth(): Promise<Record<string, CircuitBreakerStats>> {
  const services = Object.keys(SERVICE_CONFIGS);
  const health: Record<string, CircuitBreakerStats> = {};

  await Promise.all(
    services.map(async (service) => {
      health[service] = await getCircuitBreakerStats(service);
    })
  );

  return health;
}

/**
 * Force reset a circuit breaker (admin function)
 */
export async function resetCircuitBreaker(service: string): Promise<void> {
  const key = getBreakerKey(service);
  await redis.del(key);
  await releaseHalfOpenLock(service);
}

/**
 * Get circuit breaker for a service (factory pattern)
 */
export function getCircuitBreaker(service: string) {
  return {
    execute: <T>(fn: () => Promise<T>) => executeWithCircuitBreaker(service, fn),
    classifyError,
  };
}

/**
 * Get all registered services
 */
export function getRegisteredServices(): string[] {
  return Object.keys(SERVICE_CONFIGS);
}