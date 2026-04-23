/**
 * Circuit Breaker Status API
 * GET /api/status/circuit-breakers - Get health status of all circuit breakers
 *
 * Returns the state of all circuit breakers for monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { getCircuitBreakerHealth } from "@/services/circuit-breaker.service";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const health = await getCircuitBreakerHealth();

    return NextResponse.json({
      circuitBreakers: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[CircuitBreakers] Health check failed", error as Error);
    return NextResponse.json(
      { error: "Failed to get circuit breaker status" },
      { status: 500 }
    );
  }
}
