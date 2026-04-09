/**
 * Request Validation & DoS Prevention
 * Validates request body sizes and prevents abuse
 */

// Max body sizes for different endpoints
export const MAX_BODY_SIZES = {
  // JSON body limits
  default: 100 * 1024, // 100KB
  chat: 500 * 1024, // 500KB for chat messages
  search: 10 * 1024, // 10KB for search queries
  message: 100 * 1024, // 100KB per message
  feedback: 50 * 1024, // 50KB for feedback
  project: 50 * 1024, // 50KB for project creation
} as const;

// Request timeout limits (ms)
export const REQUEST_TIMEOUTS = {
  default: 30000, // 30s
  chat: 120000, // 2min for chat streaming
  search: 30000, // 30s for search
  health: 5000, // 5s for health checks
} as const;

/**
 * Validate request body size
 */
export function validateBodySize(
  contentLength: number | null,
  endpointType: keyof typeof MAX_BODY_SIZES = "default"
): { valid: boolean; maxSize: number } {
  const maxSize = MAX_BODY_SIZES[endpointType];

  if (contentLength === null) {
    // No Content-Length header, let the parser handle it
    return { valid: true, maxSize };
  }

  if (contentLength > maxSize) {
    return { valid: false, maxSize };
  }

  return { valid: true, maxSize };
}

/**
 * Create AbortController with timeout
 */
export function createTimeoutController(
  timeoutMs: number
): AbortController {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // Clear timeout when abort is called
  controller.signal.addEventListener("abort", () => {
    clearTimeout(timeout);
  });

  return controller;
}

/**
 * Validate content type
 */
export function validateContentType(
  contentType: string | null,
  allowed: string[]
): boolean {
  if (!contentType) return false;

  return allowed.some((type) =>
    contentType.toLowerCase().includes(type.toLowerCase())
  );
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Rate limit key for abuse detection
 */
export function getRateLimitKey(request: Request, action: string): string {
  const ip = getClientIP(request);
  return `abuse:${ip}:${action}`;
}
