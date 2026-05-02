/**
 * Prometheus Metrics Endpoint
 * GET /api/metrics - Expose Prometheus metrics for Prometheus/Grafana
 */

import { NextResponse } from "next/server";
import { register } from "@/services/metrics.service";

export async function GET() {
  try {
    const metrics = await register.metrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        "Content-Type": register.contentType,
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (error) {
    console.error("[Metrics] Error collecting metrics:", error);
    return new NextResponse("Error collecting metrics", { status: 500 });
  }
}

export const dynamic = "force-dynamic";
