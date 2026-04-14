/**
 * Docker Health Check - Lightweight endpoint for container orchestration
 * Returns 200 if the app is running, 503 if not
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Just check that the Next.js app is responding
    // Don't hit the database or Redis - that's too heavy for a health check
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "unhealthy" },
      { status: 503 }
    );
  }
}
