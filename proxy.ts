/**
 * Security & Auth Proxy + i18n
 * Adds security headers, auth redirect, locale detection, and user header injection to all responses
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import redis, { KEYS, TTL } from "@/lib/redis";
import { validateCSRF, csrfErrorResponse } from "@/lib/csrf";
import { routing } from "./routing";

const PUBLIC_PATHS = ["/", "/home", "/apps", "/about", "/contact", "/status", "/changelog", "/onboarding"];
const PUBLIC_API_PATHS = ["/api/auth", "/api/init-user", "/api/models", "/api/mcp", "/api/polar/plans"];

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // i18n: Redirect root to /home (localePrefix: "never" so no locale in URL)
  if (pathname === "/") {
    const response = NextResponse.redirect(
      new URL("/home", request.url),
    );
    setSecurityHeaders(response);
    return response;
  }

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname)) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  // Allow static assets, RSC data, legal pages, and public API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/__nextjs") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/handler") ||
    pathname.startsWith("/legal") ||
    pathname.includes(".")
  ) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  // Public API paths - skip auth
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  // API routes need auth
  if (pathname.startsWith("/api/")) {
    // CSRF protection for state-changing methods
    // Skip for webhooks (they have signature validation) and public API paths
    const isWebhook = pathname.includes("/webhook");
    const isPublicApiPath = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

    if (!isWebhook && !isPublicApiPath && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      if (!validateCSRF(request)) {
        return csrfErrorResponse();
      }
    }

    // Rate limiting check - get client IP (skip in development)
    const clientIP =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const bruteForceKey = KEYS.bruteForce(clientIP);

    if (process.env.NODE_ENV === "production") {
      try {
        const failures = await redis.get(bruteForceKey);
        if (failures && parseInt(failures, 10) >= 10) {
          return NextResponse.json(
            { error: "Too many requests" },
            { status: 429 },
          );
        }
      } catch {
        // Redis error, continue
      }
    }

    try {
      // Authenticate via Stack
      const stackUser = await stackServerApp.getUser({ tokenStore: request });

      if (!stackUser) {
        // Increment failure count (skip in development)
        if (process.env.NODE_ENV === "production") {
          try {
            const current = await redis.get(bruteForceKey);
            const count = current ? parseInt(current, 10) + 1 : 1;
            await redis.setex(bruteForceKey, 3600, count.toString()); // 1 hour window
          } catch {
            // Redis error
          }
        }
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Check cache
      const cacheKey = KEYS.userCache(stackUser.id);
      let userData: { id: string; email: string } | null = null;

      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          userData = JSON.parse(cached);
        }
      } catch {
        // Cache miss
      }

      // DB lookup if not cached
      if (!userData) {
        const { default: prisma } = await import("@/lib/prisma");
        const dbUser = await prisma.user.findUnique({
          where: { stackId: stackUser.id },
          select: { id: true, email: true },
        });

        if (!dbUser) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        userData = { id: dbUser.id, email: dbUser.email };

        // Cache auth result
        try {
          await redis.setex(cacheKey, TTL.userCache, JSON.stringify(userData));
        } catch {
          // Redis error, ignore
        }
      }

      // Inject user headers into request for downstream use
      // Clear brute force counter on successful auth
      try {
        await redis.del(bruteForceKey);
      } catch {
        // Redis error, ignore
      }

      const response = NextResponse.next();
      response.headers.set("x-user-id", userData.id);
      response.headers.set("x-user-email", userData.email);
      response.headers.set("x-user-stack-id", stackUser.id);
      setSecurityHeaders(response);
      return response;
    } catch (error) {
      console.error("Auth error:", error);
      return NextResponse.json({ error: "Auth failed" }, { status: 500 });
    }
  }

  // Check for StackAuth session cookies for non-API routes
  const cookies = request.cookies.getAll();
  const hasStackSession = cookies.some(
    (cookie) =>
      cookie.name === "stack-access" ||
      cookie.name.startsWith("stack-refresh-"),
  );

  if (!hasStackSession) {
    const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
    const targetLocale = localeCookie && routing.locales.includes(localeCookie as (typeof routing.locales)[number])
      ? localeCookie
      : routing.defaultLocale;
    const redirectUrl = new URL("/home", request.url);
    redirectUrl.searchParams.set("from", pathname);
    const response = NextResponse.redirect(redirectUrl);
    setSecurityHeaders(response);
    return response;
  }

  // i18n: Check if pathname starts with a valid locale prefix
  const pathnameLocale = routing.locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // If no locale prefix, continue without adding one (localePrefix: "never")
  if (!pathnameLocale) {
    const response = NextResponse.next();
    setSecurityHeaders(response);
    return response;
  }

  const response = NextResponse.next();
  setSecurityHeaders(response);
  return response;
}

function setSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
