import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getOrCreateUser, AccountDeactivatedError } from "@/lib/auth";
import { updateChat } from "@/lib/stack-server";
import { logger } from "@/lib/logger";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

const scryptAsync = promisify(scrypt);

// Hash password using scrypt (built-in Node.js crypto)
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(Buffer.from(password), salt, 32)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Verify password against stored hash
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  try {
    const derivedKey = (await scryptAsync(Buffer.from(password), salt, 32)) as Buffer;
    return timingSafeEqual(derivedKey, Buffer.from(key, "hex"));
  } catch {
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    // Check if querying by chatId (from dialog) or by shareToken (direct access)
    const byChatId = url.searchParams.get("by") === "chatId";

    console.log("[Share GET] id:", id, "byChatId:", byChatId);

    if (byChatId) {
      // Look up by chat ID (for dialog to load existing share state)
      const chat = await prisma.chat.findFirst({
        where: { id, visibility: "public", shareToken: { not: null } },
        select: {
          id: true,
          shareToken: true,
          shareExpiry: true,
          sharePassword: true,
        },
      });

      console.log("[Share GET] Chat by chatId:", chat ? JSON.stringify(chat) : "not found");

      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }

      return NextResponse.json({
        shareToken: chat.shareToken,
        shareExpiry: chat.shareExpiry?.toISOString() ?? null,
        hasPassword: !!chat.sharePassword,
      });
    }

    // Look up chat by shareToken (for public share page access)
    const chat = await prisma.chat.findFirst({
      where: { shareToken: id, visibility: "public" },
      select: {
        id: true,
        title: true,
        shareExpiry: true,
        sharePassword: true,
        user: {
          select: { email: true },
        },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Check if expired
    if (chat.shareExpiry && chat.shareExpiry < new Date()) {
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    return NextResponse.json({
      id: chat.id,
      title: chat.title,
      shareExpiry: chat.shareExpiry?.toISOString() ?? null,
      requiresPassword: !!chat.sharePassword,
      sharedBy: chat.user?.email?.split("@")[0] || "Anonymous",
    });
  } catch (e: unknown) {
    logger.error("[Share] Failed to get share info", e as Error);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get share info" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    console.log("[Share POST] Starting...");
    const user = await getOrCreateUser(request);
    console.log("[Share POST] User:", user?.id);

    if (!user) {
      console.log("[Share POST] No user, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    console.log("[Share POST] Chat ID:", id);

    const body = await request.json().catch(() => ({}));
    const { expiryHours = 24, password } = body;
    console.log("[Share POST] Body:", { expiryHours, hasPassword: !!password });

    // Generate a cryptographically secure share token
    const shareToken = randomBytes(24).toString("base64url");
    console.log("[Share POST] Generated token:", shareToken);

    // Calculate expiry time
    const shareExpiry = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    // Hash password if provided
    const sharePassword = password ? await hashPassword(password) : null;
    console.log("[Share POST] Hashing password:", !!password);

    const chat = await updateChat(id, user.id, {
      visibility: "public",
      shareExpiry,
      shareToken,
      sharePassword,
    });

    console.log("[Share POST] Updated chat:", JSON.stringify(chat));

    return NextResponse.json({
      success: true,
      visibility: "public",
      shareExpiry: chat.shareExpiry?.toISOString() ?? null,
      shareToken: chat.shareToken,
      shareUrl: `/share/${chat.shareToken}`,
    });
  } catch (e: unknown) {
    if (e instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    logger.error("[Share] Failed to create share link", e as Error);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create share link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOrCreateUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const chat = await updateChat(id, user.id, {
      visibility: "private",
      shareExpiry: null,
      shareToken: null,
      sharePassword: null,
    });

    return NextResponse.json({
      success: true,
      visibility: "private",
    });
  } catch (e: unknown) {
    if (e instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    logger.error("[Share] Failed to remove share link", e as Error);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to remove share link" },
      { status: 500 }
    );
  }
}