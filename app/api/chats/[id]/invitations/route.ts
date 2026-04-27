import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis, { KEYS } from "@/lib/redis";
import { validateAuth, AccountDeactivatedError } from "@/lib/auth";
import { requireChatAccess, invalidateMemberCache, generateInviteToken } from "@/lib/chat-access";
import { checkApiRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const INVITATIONS_CACHE_TTL = 30; // 30 seconds

/**
 * POST /api/chats/:id/invitations - Create an invitation
 * Body: { email?: string, role?: "VIEWER" | "EDITOR" }
 *
 * Security considerations:
 * - Rate limited to prevent invitation spam
 * - Idempotent based on email (one pending invite per email per chat)
 * - Uses transaction to prevent race conditions
 * - Cryptographically secure token generation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimit = await checkApiRateLimit(request, "chat");
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetAt);
    }

    // Auth
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    const body = await request.json().catch(() => ({}));
    const { email, role = "VIEWER" } = body;

    // Input validation
    if (!["VIEWER", "EDITOR"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Access check - EDITOR or OWNER can invite
    await requireChatAccess(user.id, chatId, "EDITOR");

    // Use transaction for atomicity
    const invitation = await prisma.$transaction(async (tx) => {
      // If email provided, check if user already a member
      if (email) {
        const existingUser = await tx.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (existingUser) {
          const existingMember = await tx.chatMember.findUnique({
            where: { chatId_userId: { chatId, userId: existingUser.id } },
          });

          if (existingMember) {
            throw new Error("USER_ALREADY_MEMBER");
          }
        }

        // Check for existing pending invitation (idempotency)
        const existingInvite = await tx.chatInvitation.findFirst({
          where: {
            chatId,
            email,
            status: "pending",
            expiresAt: { gt: new Date() },
          },
        });

        if (existingInvite) {
          throw new Error("INVITATION_EXISTS");
        }
      }

      // Create invitation with secure token
      return tx.chatInvitation.create({
        data: {
          chatId,
          email: email || null,
          token: generateInviteToken(),
          role: role as "VIEWER" | "EDITOR",
          invitedBy: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }, {
      maxWait: 5000, // Wait up to 5s for transaction
      timeout: 10000, // Transaction timeout
    });

    // Invalidate member cache
    await invalidateMemberCache(chatId);

    // Invalidate invitations cache for this chat
    try {
      await redis.del(`chat:${chatId}:invitations`);
    } catch {
      // Redis unavailable
    }

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${invitation.token}`;

    return NextResponse.json({
      invitation,
      inviteLink,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error) {
      if (error.message === "USER_ALREADY_MEMBER") {
        return NextResponse.json({ error: "User is already a member" }, { status: 409 });
      }
      if (error.message === "INVITATION_EXISTS") {
        return NextResponse.json({ error: "Invitation already sent to this email" }, { status: 409 });
      }
      if (error.message.startsWith("Access denied")) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    console.error("Create invitation error:", error);
    return NextResponse.json({ error: "Failed to create invitation" }, { status: 500 });
  }
}

/**
 * GET /api/chats/:id/invitations - List pending invitations
 * Only owners can view all invitations
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;

    // Must be owner to view all invitations
    await requireChatAccess(user.id, chatId, "OWNER");

    // Try cache first
    const cacheKey = `chat:${chatId}:invitations`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return NextResponse.json({ invitations: JSON.parse(cached) });
      }
    } catch {
      // Redis unavailable, fall through to DB
    }

    const invitations = await prisma.chatInvitation.findMany({
      where: {
        chatId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    // Cache the result
    try {
      await redis.setex(cacheKey, INVITATIONS_CACHE_TTL, JSON.stringify(invitations));
    } catch {
      // Redis unavailable
    }

    return NextResponse.json({ invitations });
  } catch (error) {
    if (error instanceof AccountDeactivatedError) {
      return NextResponse.json({ error: "Account deactivated" }, { status: 403 });
    }
    if (error instanceof Error && error.message.startsWith("Access denied")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Get invitations error:", error);
    return NextResponse.json({ error: "Failed to get invitations" }, { status: 500 });
  }
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}