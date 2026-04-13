/**
 * System Status API
 * GET /api/status - Get health status of all system components
 */

import { NextRequest, NextResponse } from "next/server";
import { getCircuitBreakerHealth } from "@/services/circuit-breaker.service";
import { getQueueMetrics } from "@/services/queue.service";

export async function GET(request: NextRequest) {
  try {
    const [circuitBreakers, queues] = await Promise.all([
      getCircuitBreakerHealth(),
      getQueueMetrics(),
    ]);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      circuitBreakers,
      queues,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Failed to get system status" },
      { status: 500 }
    );
  }
}
