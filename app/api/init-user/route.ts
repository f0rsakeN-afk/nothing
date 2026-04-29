import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";
import { queueEmail } from "@/services/queue.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  if (cookieHeader.includes("user_initialized=")) {
    return NextResponse.json({ ok: true, cached: true });
  }

  const user = await stackServerApp.getUser({ tokenStore: request });

  if (!user) {
    return NextResponse.json({ ok: false, reason: "no_user" });
  }

  if (!user.primaryEmail) {
    return NextResponse.json({ ok: false, reason: "no_email" });
  }

  let userCreated = false;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { stackId: user.id },
    });

    if (existingUser) {
      // Update email if changed
      if (existingUser.email !== user.primaryEmail) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { email: user.primaryEmail },
        });
        // Invalidate admin users cache
        try {
          const keys = await redis.keys("admin:users:*");
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } catch {
          // Redis unavailable
        }
      }
    } else {
      // Create new user
      await prisma.user.create({
        data: { stackId: user.id, email: user.primaryEmail, role: "USER" },
      });
      userCreated = true;

      // Invalidate admin users cache
      try {
        const keys = await redis.keys("admin:users:*");
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch {
        // Redis unavailable
      }

      // Send welcome email for new users
      queueEmail(user.primaryEmail, "welcome", {
        name: user.primaryEmail.split("@")[0] || "User",
      }).catch((err) => {
        console.error("[InitUser] Failed to queue welcome email:", err);
      });
    }
  } catch (err) {
    // Unique constraint — another request already created it
    if (err instanceof Error && (err as { code?: string }).code === "P2002") {
      // silently ignore, user already exists
    } else {
      throw err;
    }
  }

  const response = NextResponse.json({ ok: true, created: true });
  response.cookies.set("user_initialized", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
