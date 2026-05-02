/**
 * Prometheus Metrics Service
 * Application performance and business metrics for monitoring
 */

import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from "prom-client";

// Create a custom registry
export const register = new Registry();

// Add default Node.js metrics (CPU, memory, event loop, etc.)
collectDefaultMetrics({ register });

// ============================================
// HTTP/Request Metrics
// ============================================

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "path", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "path", "status"],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// ============================================
// Business Metrics
// ============================================

export const activeUsersGauge = new Gauge({
  name: "eryx_active_users",
  help: "Number of currently active users",
  registers: [register],
});

export const chatMessagesTotal = new Counter({
  name: "eryx_chat_messages_total",
  help: "Total number of chat messages sent",
  labelNames: ["model"],
  registers: [register],
});

export const chatConversationsTotal = new Counter({
  name: "eryx_conversations_total",
  help: "Total number of chat conversations created",
  registers: [register],
});

export const apiTokensUsed = new Counter({
  name: "eryx_api_tokens_used_total",
  help: "Total number of API tokens used",
  labelNames: ["model"],
  registers: [register],
});

// ============================================
// Security Metrics
// ============================================

export const rateLimitHitsTotal = new Counter({
  name: "eryx_rate_limit_hits_total",
  help: "Total number of rate limit violations",
  labelNames: ["type", "tier"],
  registers: [register],
});

export const authFailuresTotal = new Counter({
  name: "eryx_auth_failures_total",
  help: "Total number of authentication failures",
  labelNames: ["reason"],
  registers: [register],
});

export const anomalyDetectionsTotal = new Counter({
  name: "eryx_anomaly_detections_total",
  help: "Total number of anomaly detections",
  labelNames: ["type", "severity"],
  registers: [register],
});

// ============================================
// Redis/Queue Metrics
// ============================================

export const redisOperationDuration = new Histogram({
  name: "eryx_redis_operation_duration_seconds",
  help: "Redis operation duration in seconds",
  labelNames: ["operation", "status"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

export const queueJobsTotal = new Counter({
  name: "eryx_queue_jobs_total",
  help: "Total number of queue jobs processed",
  labelNames: ["queue", "status"],
  registers: [register],
});

export const queueJobDuration = new Histogram({
  name: "eryx_queue_job_duration_seconds",
  help: "Queue job processing duration in seconds",
  labelNames: ["queue"],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30, 60],
  registers: [register],
});

// ============================================
// Database Metrics
// ============================================

export const dbQueryDuration = new Histogram({
  name: "eryx_db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["operation", "table"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

// ============================================
// External Service Metrics
// ============================================

export const aiApiDuration = new Histogram({
  name: "eryx_ai_api_duration_seconds",
  help: "AI API call duration in seconds",
  labelNames: ["provider", "model", "status"],
  buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30],
  registers: [register],
});

export const aiApiTokensTotal = new Counter({
  name: "eryx_ai_api_tokens_total",
  help: "Total AI API tokens used",
  labelNames: ["provider", "model", "type"],
  registers: [register],
});

// ============================================
// Helper Functions
// ============================================

/**
 * Normalize path for metrics (remove dynamic segments)
 * /api/chat/abc-123 → /api/chat/:id
 */
export function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
    .replace(/\/[0-9a-f]{32,}/gi, "/:hash")
    .replace(/\/\d+/g, "/:num");
}

/**
 * Get metrics handler for /metrics endpoint
 */
export function getMetricsHandler() {
  return async () => {
    return await register.metrics();
  };
}

/**
 * Get metrics as string (for testing)
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Record HTTP request metrics
 */
export function recordHttpRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
): void {
  const normalizedPath = normalizePath(path);
  httpRequestsTotal.inc({ method, path: normalizedPath, status });
  httpRequestDuration.observe(
    { method, path: normalizedPath, status },
    durationMs / 1000
  );
}

/**
 * Record security event
 */
export function recordSecurityEvent(
  type: "rate_limit" | "auth_failure" | "anomaly",
  details: Record<string, string>
): void {
  if (type === "rate_limit") {
    rateLimitHitsTotal.inc({
      type: details.type || "unknown",
      tier: details.tier || "unknown",
    });
  } else if (type === "auth_failure") {
    authFailuresTotal.inc({ reason: details.reason || "unknown" });
  } else if (type === "anomaly") {
    anomalyDetectionsTotal.inc({
      type: details.type || "unknown",
      severity: details.severity || "unknown",
    });
  }
}

/**
 * Record AI API call
 */
export function recordAiApiCall(
  provider: string,
  model: string,
  status: number,
  durationMs: number,
  tokensUsed?: { input?: number; output?: number }
): void {
  aiApiDuration.observe({ provider, model, status }, durationMs / 1000);

  if (tokensUsed) {
    if (tokensUsed.input) {
      aiApiTokensTotal.inc({ provider, model, type: "input" }, tokensUsed.input);
    }
    if (tokensUsed.output) {
      aiApiTokensTotal.inc({ provider, model, type: "output" }, tokensUsed.output);
    }
  }
}
