/**
 * Health Check Cron - External cron service trigger
 * Protected by CRON_SECRET header verification
 */

import { NextRequest, NextResponse } from "next/server";
import { performHealthCheck } from "@/services/incident.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Verify cron secret from cron service
  const cronSecret = request.headers.get("x-cron-secret");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || cronSecret !== expectedSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const start = Date.now();
    const results = await performHealthCheck();
    const duration = Date.now() - start;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      results: results.map(r => ({
        service: r.service,
        status: r.status,
        latencyMs: r.latencyMs,
      })),
    });
  } catch (error) {
    console.error("Health cron failed:", error);
    return NextResponse.json(
      { success: false, error: "Health check failed" },
      { status: 500 }
    );
  }
}
