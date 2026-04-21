/**
 * Circuit Breaker Service - Distributed Version with Redis
 * Prevents cascading failures when external services go down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast without calling the service
 * - HALF_OPEN: Testing if service recovered, limited requests pass through
 *
 * Uses Redis for distributed state across multiple instances
 */

import redis from "@/lib/redis";
import { KEYS } from "@/lib/redis";

// Circuit breaker states
export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

interface CircuitBreakerConfig {
  failureThreshold: number;    // Failures before opening circuit (default: 5)
  successThreshold: number;    // Successes in half-open before closing (default: 3)
  openTimeoutMs: number;        // Time before trying half-open (default: 30s)
  halfOpenMaxCalls: number;     // Max calls allowed in half-open (default: 3)
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
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  openTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
};

// Per-service configs
const SERVICE_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
  openai: {
    failureThreshold: 3,        // More aggressive for AI - users notice latency
    successThreshold: 2,
    openTimeoutMs: 15000,       // Faster recovery check
    halfOpenMaxCalls: 2,
  },
  polar: {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30000,
    halfOpenMaxCalls: 1,       // Payments - be conservative
  },
  searxng: {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30000,
    halfOpenMaxCalls: 3,
  },
};

/**
 * Get Redis key for circuit breaker
 */
function getBreakerKey(service: string): string {
  return `circuit_breaker:${service}`;
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
  });
  // 1 hour TTL for stale breakers
  await redis.expire(key, 3600);
}

/**
 * Check if circuit breaker allows request (distributed version)
 */
async function canExecuteDistributed(
  service: string,
  config: CircuitBreakerConfig
): Promise<{ allowed: boolean; currentState: DistributedState }> {
  const state = await getDistributedState(service);
  const now = Date.now();

  switch (state.state) {
    case CircuitState.CLOSED:
      return { allowed: true, currentState: state };

    case CircuitState.OPEN:
      if (now >= state.nextAttemptTime) {
        // Time to try again
        const newState: DistributedState = {
          ...state,
          state: CircuitState.HALF_OPEN,
          halfOpenCalls: 0,
          successes: 0,
        };
        await saveDistributedState(service, newState);
        return { allowed: true, currentState: newState };
      }
      return { allowed: false, currentState: state };

    case CircuitState.HALF_OPEN:
      if (state.halfOpenCalls >= config.halfOpenMaxCalls) {
        return { allowed: false, currentState: state };
      }
      const newState: DistributedState = {
        ...state,
        halfOpenCalls: state.halfOpenCalls + 1,
        totalCalls: state.totalCalls + 1,
      };
      await saveDistributedState(service, newState);
      return { allowed: true, currentState: newState };

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
  const now = Date.now();

  const newState: DistributedState = {
    ...state,
    failures: 0, // Reset failure count on success
    totalCalls: state.totalCalls + 1,
  };

  if (state.state === CircuitState.HALF_OPEN) {
    newState.successes = state.successes + 1;
    if (newState.successes >= config.successThreshold) {
      newState.state = CircuitState.CLOSED;
      newState.successes = 0;
      newState.halfOpenCalls = 0;
    }
  }

  await saveDistributedState(service, newState);
}

/**
 * Record failure in distributed circuit breaker
 */
async function recordFailureDistributed(
  service: string,
  config: CircuitBreakerConfig
): Promise<void> {
  const state = await getDistributedState(service);
  const now = Date.now();

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
  } else if (state.state === CircuitState.CLOSED) {
    if (newState.failures >= config.failureThreshold) {
      newState.state = CircuitState.OPEN;
      newState.nextAttemptTime = now + config.openTimeoutMs;
    }
  }

  await saveDistributedState(service, newState);
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
}

/**
 * Get circuit breaker stats for a service
 */
export async function getCircuitBreakerStats(service: string): Promise<CircuitBreakerStats> {
  const state = await getDistributedState(service);

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
 */
export async function executeWithCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  const config = { ...DEFAULT_CONFIG, ...SERVICE_CONFIGS[service] };
  const { allowed, currentState } = await canExecuteDistributed(service, config);

  if (!allowed) {
    throw new CircuitBreakerOpenError(
      `Circuit breaker is OPEN for ${service}. Try again later.`,
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
    await recordFailureDistributed(service, config);
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
}

/**
 * Get circuit breaker for a service (factory pattern)
 */
export function getCircuitBreaker(service: string) {
  return {
    execute: <T>(fn: () => Promise<T>) => executeWithCircuitBreaker(service, fn),
  };
}

/**
 * Get all registered services
 */
export function getRegisteredServices(): string[] {
  return Object.keys(SERVICE_CONFIGS);
}
