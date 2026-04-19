/**
 * Health Check Endpoint - Production Grade
 * Real-time health monitoring with incident detection
 */

import { NextResponse } from "next/server";
import {
  performHealthCheck,
  getOverallStatus,
  getDetailedMetrics,
  getRecentChecks,
  getActiveIncidents,
  recordSLADatapoint,
} from "@/services/incident.service";
import { getCircuitBreakerHealth } from "@/services/circuit-breaker.service";
import redis, { CHANNELS } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const detailed = url.searchParams.get("detailed") === "true";
  const raw = url.searchParams.get("raw") === "true";
  const incident = url.searchParams.get("incident") === "true";
  const service = url.searchParams.get("service") as "database" | "redis" | "api" | "search" | "groq" | "polar" | "searxng" | undefined;

  try {
    // Run fresh health check
    const checkResults = await performHealthCheck();

    if (incident) {
      return NextResponse.json({
        incidents: await getActiveIncidents(),
      });
    }

    if (raw) {
      const hours = parseInt(url.searchParams.get("hours") || "24");

      if (service) {
        const checks = await getRecentChecks(service, hours);
        return NextResponse.json({ service, checks });
      }

      // All services raw
      const [db, redis, api, search, groq, polar, searxng] = await Promise.all([
        getRecentChecks("database", hours),
        getRecentChecks("redis", hours),
        getRecentChecks("api", hours),
        getRecentChecks("search", hours),
        getRecentChecks("groq", hours),
        getRecentChecks("polar", hours),
        getRecentChecks("searxng", hours),
      ]);

      return NextResponse.json({
        database: db,
        redis,
        api,
        search,
        groq,
        polar,
        searxng,
      });
    }

    if (detailed) {
      const [dbMetrics, redisMetrics, apiMetrics, searchMetrics, groqMetrics, overall, circuitBreakers] =
        await Promise.all([
          getDetailedMetrics("database"),
          getDetailedMetrics("redis"),
          getDetailedMetrics("api"),
          getDetailedMetrics("search"),
          getDetailedMetrics("groq"),
          getOverallStatus(),
          getCircuitBreakerHealth(),
        ]);

      return NextResponse.json({
        overall: {
          status: overall.status,
          uptimePercent: overall.uptimePercent,
          components: overall.components,
        },
        metrics: {
          database: dbMetrics,
          redis: redisMetrics,
          api: apiMetrics,
          search: searchMetrics,
          groq: groqMetrics,
        },
        circuitBreakers,
        incidents: overall.activeIncidents,
        sla: overall.sla,
      });
    }

    // Simple status
    const overall = await getOverallStatus();
    return NextResponse.json({
      status: overall.status,
      uptimePercent: overall.uptimePercent,
      timestamp: overall.lastUpdated,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { status: "unhealthy", error: "Health check failed" },
      { status: 503 }
    );
  }
}

// POST to trigger check and broadcast
export async function POST() {
  try {
    const results = await performHealthCheck();

    // Broadcast to all SSE subscribers
    await redis.publish(
      CHANNELS.status(),
      JSON.stringify({
        type: "health_update",
        timestamp: new Date().toISOString(),
        results: results.map((r) => ({
          service: r.service,
          status: r.status,
          latencyMs: r.latencyMs,
        })),
      })
    );

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Health check failed" }, { status: 500 });
  }
}

// PUT to record SLA datapoint (called by cron)
export async function PUT() {
  try {
    await recordSLADatapoint();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to record SLA" }, { status: 500 });
  }
}
