import { NextRequest, NextResponse } from "next/server";
import { getTrendingPrompts, getTrendingStats } from "@/services/trending.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const stats = searchParams.get("stats") === "true";

    if (stats) {
      const trendingStats = await getTrendingStats();
      return NextResponse.json({ trending: trendingStats });
    }

    const trending = await getTrendingPrompts(limit);
    return NextResponse.json({ trending });
  } catch (error) {
    console.error("[suggest/trending] error:", error);
    return NextResponse.json({ error: "Failed to get trending" }, { status: 500 });
  }
}
