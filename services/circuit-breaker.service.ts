/**
 * Circuit Breaker Service
 * Prevents cascading failures when external services go down
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is down, requests fail fast without calling the service
 * - HALF_OPEN: Testing if service recovered, limited requests pass through
 *
 * Usage:
 *   const breaker = circuitBreaker('groq');
 *   const result = await breaker.execute(() => groq.chat());
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
  openTimeoutMs: number;       // Time before trying half-open (default: 30s)
  halfOpenMaxCalls: number;    // Max calls allowed in half-open state (default: 3)
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: string | null;
  nextAttempt: string | null;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  openTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
};

// Per-service configs
const SERVICE_CONFIGS: Record<string, Partial<CircuitBreakerConfig>> = {
  groq: {
    failureThreshold: 3,        // More aggressive for AI - users notice latency
    successThreshold: 2,
    openTimeoutMs: 15000,       // Faster recovery check
    halfOpenMaxCalls: 2,
  },
  polar: {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30000,
    halfOpenMaxCalls: 1,        // Payments - be conservative
  },
  searxng: {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30000,
    halfOpenMaxCalls: 3,
  },
};

class CircuitBreaker {
  private service: string;
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private nextAttempt: number = 0;
  private halfOpenCalls: number = 0;

  constructor(service: string, config?: Partial<CircuitBreakerConfig>) {
    this.service = service;
    this.config = { ...DEFAULT_CONFIG, ...SERVICE_CONFIGS[service], ...config };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit allows request
    if (!this.canExecute()) {
      throw new CircuitBreakerOpenError(
        `Circuit breaker is OPEN for ${this.service}. Service unavailable.`,
        this.service,
        this.state,
        this.nextAttempt
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if request can proceed
   */
  private canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if timeout has passed
        if (now >= this.nextAttempt) {
          this.state = CircuitState.HALF_OPEN;
          this.halfOpenCalls = 0;
          this.successes = 0;
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        // Limit concurrent calls in half-open
        if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
          return false;
        }
        this.halfOpenCalls++;
        return true;

      default:
        return true;
    }
  }

  /**
   * Record a successful call
   */
  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successes = 0;
      }
    }
  }

  /**
   * Record a failed call
   */
  private onFailure(): void {
    this.failures++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open opens the circuit again
      this.state = CircuitState.OPEN;
      this.nextAttempt = Date.now() + this.config.openTimeoutMs;
      this.successes = 0;
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
        this.nextAttempt = Date.now() + this.config.openTimeoutMs;
      }
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.failures > 0 ? this.service : null,
      nextAttempt: this.state === CircuitState.OPEN
        ? new Date(this.nextAttempt).toISOString()
        : null,
    };
  }

  /**
   * Force state change (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.state = state;
    this.failures = 0;
    this.successes = 0;
    this.halfOpenCalls = 0;
  }
}

// In-memory store for circuit breakers (per-process)
// In production with multiple instances, this won't sync across instances
// For true distributed circuit breakers, use Redis
const breakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service
 */
export function getCircuitBreaker(service: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!breakers.has(service)) {
    breakers.set(service, new CircuitBreaker(service, config));
  }
  return breakers.get(service)!;
}

/**
 * Circuit breaker is open - service unavailable
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
 * Redis-backed circuit breaker state for distributed systems
 * Use this when running multiple instances
 */
export async function getCircuitBreakerStateRedis(service: string): Promise<CircuitBreakerStats> {
  const key = `circuit_breaker:${service}`;
  const data = await redis.hgetall(key);

  if (!data || Object.keys(data).length === 0) {
    return {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailure: null,
      nextAttempt: null,
    };
  }

  return {
    state: data.state as CircuitState,
    failures: parseInt(data.failures) || 0,
    successes: parseInt(data.successes) || 0,
    lastFailure: data.lastFailure || null,
    nextAttempt: data.nextAttempt ? new Date(parseInt(data.nextAttempt)).toISOString() : null,
  };
}

/**
 * Update circuit breaker state in Redis (for distributed systems)
 */
export async function updateCircuitBreakerStateRedis(
  service: string,
  state: CircuitState,
  failures: number,
  successes: number,
  nextAttempt: number | null
): Promise<void> {
  const key = `circuit_breaker:${service}`;
  const data: Record<string, string> = {
    state,
    failures: String(failures),
    successes: String(successes),
    lastFailure: nextAttempt ? String(nextAttempt) : "",
  };

  if (nextAttempt) {
    data.nextAttempt = String(nextAttempt);
  }

  await redis.hset(key, data);
  await redis.expire(key, 3600); // 1 hour TTL
}

/**
 * Health check - returns status of all circuit breakers
 */
export async function getCircuitBreakerHealth(): Promise<Record<string, CircuitBreakerStats>> {
  const health: Record<string, CircuitBreakerStats> = {};

  for (const [service, breaker] of breakers) {
    health[service] = breaker.getState();
  }

  return health;
}
