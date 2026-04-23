/**
 * Security Headers Middleware
 * Adds essential security headers to all responses
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function securityHeaders(request: NextRequest) {
  // Clone the response to modify headers
  const response = NextResponse.next();

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // XSS Protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Strict Transport Security (force HTTPS)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (disable unnecessary features)
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  // Content Security Policy
  // Note: 'unsafe-inline' is required for Next.js/React inline styles
  // 'unsafe-eval' removed as it's not needed for modern React
  // In production, consider nonce-based CSP for better XSS protection
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.openai.com https://*.stack.auth wss://*.stack.auth"
  );

  return response;
}
