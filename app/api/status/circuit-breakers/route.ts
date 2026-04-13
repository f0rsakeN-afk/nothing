/**
 * Circuit Breaker Status API
 * GET /api/status/circuit-breakers - Get health status of all circuit breakers
 *
 * Returns the state of all circuit breakers for monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { getCircuitBreakerHealth } from "@/services/circuit-breaker.service";

export async function GET(request: NextRequest) {
  try {
    const health = await getCircuitBreakerHealth();

    return NextResponse.json({
      circuitBreakers: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Circuit breaker health check error:", error);
    return NextResponse.json(
      { error: "Failed to get circuit breaker status" },
      { status: 500 }
    );
  }
}
