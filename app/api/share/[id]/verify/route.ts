import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

const scryptAsync = promisify(scrypt);

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting - protect against brute force password attacks
    const rateLimit = await checkRateLimitWithAuth(request, "auth");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    // Find the chat by shareToken
    const chat = await prisma.chat.findFirst({
      where: { shareToken: id, visibility: "public" },
      select: { sharePassword: true, shareExpiry: true },
    });

    if (!chat) {
      return NextResponse.json({ error: "Share not found" }, { status: 404 });
    }

    // Check expiry
    if (chat.shareExpiry && chat.shareExpiry < new Date()) {
      return NextResponse.json({ error: "Share has expired" }, { status: 410 });
    }

    // Verify password
    if (chat.sharePassword) {
      const valid = await verifyPassword(password, chat.sharePassword);
      if (!valid) {
        return NextResponse.json({ error: "Invalid password" }, { status: 401 });
      }
    }

    // Set a secure cookie to track verified share access
    // Cookie expires when browser closes (session)
    const response = NextResponse.json({ success: true });
    response.cookies.set(`share_verified_${id}`, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: `/share/${id}`,
    });

    return response;
  } catch (e: unknown) {
    logger.error("[Share] Failed to verify password", e as Error);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to verify password" },
      { status: 500 }
    );
  }
}