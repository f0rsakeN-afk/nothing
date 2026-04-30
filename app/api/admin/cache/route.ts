/**
 * POST /api/admin/cache/flush - Flush Redis cache (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import redis from "@/lib/redis";
import { validateAuth, isAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/admin/audit-log";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await validateAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: { type: "authentication_required", message: "Authentication required" } },
        { status: 401 },
      );
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json(
        { error: { type: "forbidden", message: "Admin access required" } },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { pattern = "*", dryRun = false } = body;

    logAuditEvent({
      action: "ADMIN_CACHE_FLUSH",
      userId: user.id,
      metadata: { pattern, dryRun },
      request,
    });

    if (dryRun) {
      const keys = await redis.keys(pattern);
      return NextResponse.json({
        success: true,
        dryRun: true,
        matchedKeys: keys.length,
        keys: keys.slice(0, 100), // preview first 100
      });
    }

    // Flush by pattern
    const keys = await redis.keys(pattern);
    let deletedCount = 0;

    if (keys.length > 0) {
      await redis.del(...keys);
      deletedCount = keys.length;
    }

    logger.info(`Redis cache flush by admin ${user.id}`, {
      pattern,
      deletedCount,
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      pattern,
    });
  } catch (error) {
    logger.error("Admin cache flush error:", error);
    return NextResponse.json(
      { error: { type: "internal_error", message: "Failed to flush cache" } },
      { status: 500 },
    );
  }
}