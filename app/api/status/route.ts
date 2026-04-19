/**
 * System Status API
 * GET /api/status - Get health status of all system components
 */

import { NextRequest, NextResponse } from "next/server";
import { getCircuitBreakerHealth } from "@/services/circuit-breaker.service";
import { getQueueMetrics } from "@/services/queue.service";
import { getOverallStatus, getSLAData, getDetailedMetrics, getRecentChecks } from "@/services/incident.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get("view") || "summary";

    if (view === "full") {
      // Detailed view with all metrics
      const [overall, circuitBreakers, sla] = await Promise.all([
        getOverallStatus(),
        getCircuitBreakerHealth(),
        getSLAData(30),
      ]);

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        overall,
        circuitBreakers,
        sla,
      });
    }

    if (view === "simple") {
      // Simple status for quick checks
      const overall = await getOverallStatus();
      return NextResponse.json({
        status: overall.status,
        uptime: overall.uptimePercent,
        timestamp: overall.lastUpdated,
      });
    }

    // Default: summary with components
    const [overall, circuitBreakers, queues] = await Promise.all([
      getOverallStatus(),
      getCircuitBreakerHealth(),
      getQueueMetrics().catch(() => ({ queues: [] })),
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: overall.status,
      uptimePercent: overall.uptimePercent,
      components: overall.components,
      circuitBreakers,
      queues,
      sla: overall.sla,
      activeIncidents: overall.activeIncidents,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to get system status", status: "error" },
      { status: 500 }
    );
  }
}
