import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { csrfMiddleware } from "@/middleware/csrf";
import login from "@/routes/auth/login";
import logout from "@/routes/auth/logout";
import me from "@/routes/auth/me";
import password from "@/routes/auth/password";
import refresh from "@/routes/auth/refresh";
import register from "@/routes/auth/register";
import resetPassword from "@/routes/auth/reset-password";
import sessions from "@/routes/auth/sessions";
import verifyEmail from "@/routes/auth/verify-email";

const app = new Hono();

// CORS for frontend communication
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3001",
    credentials: true,
  }),
);

// Global CSRF middleware
app.use(csrfMiddleware());

app.use(logger());

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Auth routes
app.route("/auth", register);
app.route("/auth", login);
app.route("/auth", logout);
app.route("/auth", refresh);
app.route("/auth", verifyEmail);
app.route("/auth", resetPassword);
app.route("/auth", password);
app.route("/auth", sessions);
app.route("/auth", me);

export default app;
