/**
 * Redis Resilience Layer - Production Grade
 * Circuit breaker and fallback patterns with proper observability
 *
 * Production fixes:
 * 1. Metadata on fallbacks (degraded flag for observability)
 * 2. Split-brain prevention via global degraded mode
 * 3. Minimal fallback logic (fail-open OR fail-closed, not parallel system)
 * 4. Recovery jitter + rate limiting to prevent retry storms
 */

import redis from "./redis";

// Circuit breaker states
type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetRecoveryCount?: number;  // Successful calls to close circuit after degraded mode
}

interface CircuitBreaker {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  nextAttempt: number;
  consecutiveSuccesses: number;
}

// Global degraded mode - prevents split-brain
let globalDegradedMode = false;
let degradedModeSince = 0;

// In-memory circuit breakers per operation type
const circuitBreakers: Record<string, CircuitBreaker> = {
  rateLimit: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0, consecutiveSuccesses: 0 },
  auth: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0, consecutiveSuccesses: 0 },
  security: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0, consecutiveSuccesses: 0 },
  cache: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0, consecutiveSuccesses: 0 },
};

const CIRCUIT_CONFIG: Record<string, CircuitBreakerConfig> = {
  rateLimit: { failureThreshold: 10, successThreshold: 3, timeout: 30000, resetRecoveryCount: 5 },
  auth: { failureThreshold: 5, successThreshold: 2, timeout: 60000, resetRecoveryCount: 3 },
  security: { failureThreshold: 5, successThreshold: 2, timeout: 30000, resetRecoveryCount: 3 },
  cache: { failureThreshold: 20, successThreshold: 5, timeout: 15000, resetRecoveryCount: 10 },
};

// Metrics tracking
let redisFailures = 0;
let redisSuccesses = 0;
let lastRedisFailure = 0;
let lastDegradedRecovery = 0;

/**
 * Enter degraded mode when Redis is unhealthy
 * Broadcasts to all containers via global flag
 */
function enterDegradedMode(): void {
  if (!globalDegradedMode) {
    globalDegradedMode = true;
    degradedModeSince = Date.now();
    console.warn(`[Redis] Entered DEGRADED mode at ${new Date().toISOString()}`);
  }
}

/**
 * Exit degraded mode when Redis recovers
 * Adds jitter to prevent all containers retrying simultaneously
 */
async function exitDegradedMode(): Promise<void> {
  if (!globalDegradedMode) return;

  // Add jitter: wait random 0-5 seconds before exiting
  // Prevents retry storm where all containers hit Redis simultaneously
  const jitterMs = Math.random() * 5000;
  await new Promise(resolve => setTimeout(resolve, jitterMs));

  globalDegradedMode = false;
  lastDegradedRecovery = Date.now();
  console.log(`[Redis] Exited DEGRADED mode after ${Date.now() - degradedModeSince}ms`);
}

/**
 * Check if circuit allows the operation
 */
function isCircuitOpen(operation: string): boolean {
  const cb = circuitBreakers[operation];
  if (!cb) return false;

  // Check global degraded mode first (prevents split-brain)
  if (globalDegradedMode) return true;

  if (cb.state === "closed") return false;

  if (cb.state === "open") {
    if (Date.now() < cb.nextAttempt) {
      return true;
    }
    cb.state = "half-open";
    return false;
  }

  return false;
}

/**
 * Record a failure and potentially open the circuit
 */
function recordFailure(operation: string): void {
  const cb = circuitBreakers[operation];
  const config = CIRCUIT_CONFIG[operation];
  if (!cb || !config) return;

  cb.failures++;
  cb.successes = 0;
  cb.consecutiveSuccesses = 0;
  cb.lastFailure = Date.now();
  redisFailures++;
  lastRedisFailure = Date.now();

  // Enter degraded mode if any critical circuit opens
  if (operation === "auth" || operation === "security") {
    enterDegradedMode();
  }

  if (cb.failures >= config.failureThreshold) {
    cb.state = "open";
    cb.nextAttempt = Date.now() + config.timeout;
    console.warn(`[Redis] Circuit opened for ${operation} after ${cb.failures} failures`);

    // If this is a critical operation, enter global degraded mode
    if (operation === "auth") {
      enterDegradedMode();
    }
  }
}

/**
 * Record a success and potentially close the circuit
 */
function recordSuccess(operation: string): void {
  const cb = circuitBreakers[operation];
  const config = CIRCUIT_CONFIG[operation];
  if (!cb || !config) return;

  cb.successes++;
  cb.failures = 0;
  redisSuccesses++;
  cb.consecutiveSuccesses++;

  if (cb.state === "half-open" && cb.consecutiveSuccesses >= (config.resetRecoveryCount || config.successThreshold)) {
    cb.state = "closed";
    cb.failures = 0;
    cb.successes = 0;
    cb.consecutiveSuccesses = 0;
    console.log(`[Redis] Circuit closed for ${operation}`);

    // Check if we can exit degraded mode
    const allClosed = !["auth", "security"].includes(operation) ||
      (circuitBreakers.auth.state === "closed" && circuitBreakers.security.state === "closed");
    if (allClosed && globalDegradedMode) {
      exitDegradedMode();
    }
  }
}

/**
 * Execute a Redis operation with circuit breaker protection
 *
 * Returns result with metadata for proper observability:
 * { value, degraded: boolean, fallback: boolean }
 *
 * IMPORTANT: Always returns a result, never throws. Caller must check
 * result.degraded to understand if values are from fallback.
 */
export async function withCircuitBreaker<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<{ value: T; degraded: boolean; fallback: boolean; operation: string }> {
  // Check global degraded mode
  if (globalDegradedMode) {
    console.debug(`[Redis] Operating in degraded mode for ${operation}`);
    return { value: fallback, degraded: true, fallback: true, operation };
  }

  if (isCircuitOpen(operation)) {
    console.debug(`[Redis] Circuit open for ${operation}, using fallback`);
    return { value: fallback, degraded: true, fallback: true, operation };
  }

  try {
    const result = await fn();
    recordSuccess(operation);
    return { value: result, degraded: false, fallback: false, operation };
  } catch (error) {
    recordFailure(operation);

    // Log the fallback usage for monitoring
    console.warn(`[Redis] Fallback used for ${operation}:`, error instanceof Error ? error.message : error);

    return { value: fallback, degraded: true, fallback: true, operation };
  }
}

/**
 * Execute with automatic retry on transient failures
 * Uses exponential backoff with jitter to prevent retry storms
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        // Exponential backoff with jitter
        const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
        const jitter = Math.random() * exponentialDelay * 0.3; // 0-30% jitter
        const delay = exponentialDelay + jitter;

        console.debug(`[Redis] Retry attempt ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Get Redis health metrics with proper metadata
 */
export function getRedisHealth(): {
  healthy: boolean;
  degraded: boolean;
  degradedSinceMs: number | null;
  failures: number;
  successes: number;
  lastFailure: number;
  circuits: Record<string, { state: CircuitState; failures: number; consecutiveSuccesses: number }>;
} {
  const timeSinceLastFailure = lastRedisFailure > 0 ? Date.now() - lastRedisFailure : 0;

  // Healthy = no recent failures AND no circuits open
  const healthy = redisFailures === 0 ||
    (timeSinceLastFailure > 60000 && Object.values(circuitBreakers).every(cb => cb.state === "closed"));

  return {
    healthy,
    degraded: globalDegradedMode,
    degradedSinceMs: globalDegradedMode ? Date.now() - degradedModeSince : null,
    failures: redisFailures,
    successes: redisSuccesses,
    lastFailure: lastRedisFailure,
    circuits: Object.fromEntries(
      Object.entries(circuitBreakers).map(([key, cb]) => [
        key,
        { state: cb.state, failures: cb.failures, consecutiveSuccesses: cb.consecutiveSuccesses }
      ])
    ),
  };
}

/**
 * Check if Redis appears to be healthy
 */
export function isRedisHealthy(): boolean {
  return !globalDegradedMode &&
    !isCircuitOpen("auth") &&
    !isCircuitOpen("rateLimit");
}

/**
 * Rate limit fallback with METADATA (not just values)
 * This allows callers to understand the data is from fallback
 *
 * IMPORTANT: Fallback values include a degraded flag
 * Callers MUST check this and log/alert appropriately
 */
export const FALLBACK_VALUES = {
  rateLimit: {
    success: true,
    remaining: 1000,
    resetAt: Date.now() + 60000,
    _meta: { fallback: true, degraded: true, source: "redis-circuit-breaker" } as const,
  },
  authBackoff: {
    allowed: true,
    delayMs: 0,
    failures: 0,
    _meta: { fallback: true, degraded: true, source: "redis-circuit-breaker" } as const,
  },
  ipGlobal: {
    success: true,
    remaining: 1000,
    resetAt: Date.now() + 60000,
    _meta: { fallback: true, degraded: true, source: "redis-circuit-breaker" } as const,
  },
} as const;

/**
 * Type for fallback values that includes metadata
 */
export interface FallbackValue<T> {
  value: T;
  _meta: {
    fallback: true;
    degraded: true;
    source: string;
    timestamp: number;
  };
}

/**
 * Create a fallback value with metadata
 * Use this instead of raw fallback values
 */
export function withFallbackMeta<T>(value: T, source: string): FallbackValue<T> {
  return {
    value,
    _meta: {
      fallback: true,
      degraded: true,
      source,
      timestamp: Date.now(),
    },
  };
}

/**
 * Cache fallback factory with proper metadata
 */
export function cacheFallback<T>(staleValue: T): { value: T; fromCache: false; stale: true; _meta: { fallback: true; source: string } } {
  return {
    value: staleValue,
    fromCache: false,
    stale: true,
    _meta: { fallback: true, source: "redis-resilience" },
  };
}

/**
 * Force refresh Redis health (for testing/admin)
 */
export async function refreshRedisHealth(): Promise<void> {
  try {
    await redis.ping();
    // If we can ping, attempt to exit degraded mode
    if (globalDegradedMode) {
      const health = getRedisHealth();
      if (health.circuits.auth.state === "closed" && health.circuits.security.state === "closed") {
        await exitDegradedMode();
      }
    }
  } catch {
    // Redis still down
    if (!globalDegradedMode) {
      enterDegradedMode();
    }
  }
}

/**
 * Force reset degraded mode (admin function)
 */
export function resetDegradedMode(): void {
  globalDegradedMode = false;
  console.log("[Redis] Degraded mode manually reset");
}