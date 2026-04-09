/**
 * Health Check Endpoint - Production Grade
 */

import { NextResponse } from "next/server";
import { performHealthCheck, getOverallStatus, getDetailedMetrics, getRecentChecks, getActiveIncidents } from "@/services/incident.service";
import redis, { CHANNELS } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const detailed = url.searchParams.get("detailed") === "true";
  const raw = url.searchParams.get("raw") === "true";
  const incident = url.searchParams.get("incident") === "true";

  try {
    // Run fresh health check
    await performHealthCheck();

    if (incident) {
      // Return active incidents
      return NextResponse.json({
        incidents: await getActiveIncidents(),
      });
    }

    if (raw) {
      const hours = parseInt(url.searchParams.get("hours") || "24");
      const service = url.searchParams.get("service") as "database" | "redis" | "api" | "search" | undefined;

      if (service) {
        const checks = await getRecentChecks(service, hours);
        return NextResponse.json({ service, checks });
      }

      // All services raw
      const [db, redis, api, search] = await Promise.all([
        getRecentChecks("database", hours),
        getRecentChecks("redis", hours),
        getRecentChecks("api", hours),
        getRecentChecks("search", hours),
      ]);

      return NextResponse.json({ database: db, redis, api, search });
    }

    if (detailed) {
      const [dbMetrics, redisMetrics, apiMetrics, searchMetrics, overall] = await Promise.all([
        getDetailedMetrics("database"),
        getDetailedMetrics("redis"),
        getDetailedMetrics("api"),
        getDetailedMetrics("search"),
        getOverallStatus(),
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
        },
        incidents: overall.activeIncidents,
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
        results: results.map(r => ({
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
