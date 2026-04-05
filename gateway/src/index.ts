import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { config } from "./config";
import { identityMiddleware } from "./middleware/auth";
import authProxy from "./routes/auth";

const app = new Hono();

// 1. Core Observability (Tracing & Logging)
app.use("*", requestId());
app.use("*", logger());

// 2. Global Rate Limiter (Basic In-Memory protection)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
app.use("*", async (c, next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  const now = Date.now();
  const limitRecord = rateLimitMap.get(ip);

  if (limitRecord && now < limitRecord.resetAt) {
    if (limitRecord.count >= 100) {
      // 100 req per minute
      return c.json(
        { error: "Too Many Requests", message: "Rate limit exceeded." },
        429,
      );
    }
    limitRecord.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 });
  }
  await next();
});

// 3. Production Security Headers (HSTS, CSP, etc.)
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.googleusercontent.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", ...config.allowedOrigins],
    },
    strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
    xFrameOptions: "DENY",
  }),
);

// 2. Logging
app.use("*", logger());

// 3. Strict Production CORS
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin") || "";
  const isAllowed =
    config.allowedOrigins.includes(origin) ||
    (origin.endsWith(".vercel.app") && !config.isProduction);

  const allowedOrigin = isAllowed ? origin : config.allowedOrigins[0] || "";

  const corsMiddleware = cors({
    origin: allowedOrigin,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "set-cookie",
    ],
    exposeHeaders: ["X-User-ID", "Set-Cookie"],
  });
  return corsMiddleware(c, next);
});

// 4. Identity Projection (Transforms cookies to internal headers)
app.use("*", identityMiddleware);

// 5. Service Routes
app.route("/auth", authProxy);

// 6. Utility Routes
app.get("/health", (c) =>
  c.json({
    status: "healthy",
    service: "gateway",
    runtime: "Bun",
    env: config.environment,
  }),
);

// 7. Production Error Handling (Never leak stack traces)
app.onError((err: Error, c) => {
  console.error("[Gateway Global Error]:", err);

  // Extract status if available (e.g. from Hono HTTPException)
  const status = (err as { status?: number }).status ?? 500;
  const message = config.isProduction
    ? "An unexpected error occurred. Please contact support."
    : err.message;

  return c.json(
    {
      error: "Internal Gateway Error",
      message,
      code: status,
    },
    status >= 100 && status < 600 ? (status as any) : 500,
  );
});

console.log(`🚀 Gateway starting on port ${config.port}`);

export default {
  port: config.port,
  fetch: app.fetch,
};
