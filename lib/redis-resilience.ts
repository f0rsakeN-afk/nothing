/**
 * Redis Resilience Layer
 * Circuit breaker and fallback patterns for Redis failures
 * Ensures the app stays available when Redis is down
 */

import redis from "./redis";

// Circuit breaker states
type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerConfig {
  failureThreshold: number;  // Failures before opening circuit
  successThreshold: number;  // Successes before closing circuit
  timeout: number;           // ms before trying again (half-open)
}

interface CircuitBreaker {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  nextAttempt: number;
}

// In-memory circuit breakers per operation type
const circuitBreakers: Record<string, CircuitBreaker> = {
  rateLimit: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0 },
  auth: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0 },
  security: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0 },
  cache: { state: "closed", failures: 0, successes: 0, lastFailure: 0, nextAttempt: 0 },
};

const CIRCUIT_CONFIG: Record<string, CircuitBreakerConfig> = {
  rateLimit: { failureThreshold: 10, successThreshold: 3, timeout: 30000 },
  auth: { failureThreshold: 5, successThreshold: 2, timeout: 60000 },
  security: { failureThreshold: 5, successThreshold: 2, timeout: 30000 },
  cache: { failureThreshold: 20, successThreshold: 5, timeout: 15000 },
};

// Metrics tracking
let redisFailures = 0;
let redisSuccesses = 0;
let lastRedisFailure = 0;

/**
 * Check if circuit allows the operation
 */
function isCircuitOpen(operation: string): boolean {
  const cb = circuitBreakers[operation];
  if (!cb) return false;

  if (cb.state === "closed") return false;

  if (cb.state === "open") {
    if (Date.now() < cb.nextAttempt) {
      return true; // Still open, don't attempt
    }
    // Time expired, try half-open
    cb.state = "half-open";
    return false;
  }

  // half-open state - allow the attempt
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
  cb.lastFailure = Date.now();
  redisFailures++;
  lastRedisFailure = Date.now();

  if (cb.failures >= config.failureThreshold) {
    cb.state = "open";
    cb.nextAttempt = Date.now() + config.timeout;
    console.warn(`[Redis] Circuit opened for ${operation} after ${cb.failures} failures`);
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

  if (cb.state === "half-open" && cb.successes >= config.successThreshold) {
    cb.state = "closed";
    cb.failures = 0;
    cb.successes = 0;
    console.log(`[Redis] Circuit closed for ${operation}`);
  }
}

/**
 * Execute a Redis operation with circuit breaker protection
 * Returns null on failure instead of throwing
 */
export async function withCircuitBreaker<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (isCircuitOpen(operation)) {
    return fallback;
  }

  try {
    const result = await fn();
    recordSuccess(operation);
    return result;
  } catch (error) {
    recordFailure(operation);
    return fallback;
  }
}

/**
 * Execute with automatic retry on transient failures
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
        await new Promise(resolve => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError;
}

/**
 * Get Redis health metrics
 */
export function getRedisHealth(): {
  healthy: boolean;
  failures: number;
  successes: number;
  lastFailure: number;
  circuits: Record<string, { state: CircuitState; failures: number }>;
} {
  return {
    healthy: redisFailures === 0 || (Date.now() - lastRedisFailure > 60000),
    failures: redisFailures,
    successes: redisSuccesses,
    lastFailure: lastRedisFailure,
    circuits: Object.fromEntries(
      Object.entries(circuitBreakers).map(([key, cb]) => [key, { state: cb.state, failures: cb.failures }])
    ),
  };
}

/**
 * Check if Redis appears to be healthy
 */
export function isRedisHealthy(): boolean {
  // If circuit is open for auth or rateLimit, Redis is likely unhealthy
  return !isCircuitOpen("auth") && !isCircuitOpen("rateLimit");
}

/**
 * Rate limit specific fallback values when Redis is unavailable
 * Returns generous limits to not block legitimate users during Redis outage
 */
export const FALLBACK_VALUES = {
  // Allow requests through with these generous limits during outage
  rateLimit: {
    success: true,
    remaining: 1000,
    resetAt: Date.now() + 60000,
  },
  authBackoff: {
    allowed: true,
    delayMs: 0,
    failures: 0,
  },
  ipGlobal: {
    success: true,
    remaining: 1000,
    resetAt: Date.now() + 60000,
  },
} as const;

/**
 * Cache fallback factory - returns stale data indicator
 */
export function cacheFallback<T>(staleValue: T): { value: T; fromCache: false; stale: true } {
  return { value: staleValue, fromCache: false, stale: true };
}
