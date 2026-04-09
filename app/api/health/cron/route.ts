/**
 * Health Check Cron - External cron service trigger
 */

import { NextResponse } from "next/server";
import { performHealthCheck } from "@/services/incident.service";

export const dynamic = "force-dynamic";

export async function GET() {
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
