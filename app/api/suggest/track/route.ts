import { NextRequest, NextResponse } from "next/server";
import { trackPromptUsage } from "@/services/trending.service";
import { checkRateLimitWithAuth } from "@/lib/rate-limit";
import { rateLimitError } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimitWithAuth(request, "default");
    if (!rateLimit.success) {
      return rateLimitError(rateLimit);
    }

    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }

    await trackPromptUsage(prompt);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[suggest/track] error:", error);
    return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
  }
}
