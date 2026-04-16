import { NextRequest, NextResponse } from "next/server";
import { trackPromptUsage } from "@/services/trending.service";

export async function POST(request: NextRequest) {
  try {
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
