import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/src/stack/server";
import prisma from "@/lib/prisma";

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

  try {
    await prisma.user.upsert({
      where: { stackId: user.id },
      update: { email: user.primaryEmail },
      create: { stackId: user.id, email: user.primaryEmail, role: "USER" },
    });
  } catch (err) {
    // Unique constraint — another request already created it
    if ((err as any)?.code === "P2002") {
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
