/**
 * GET /api/credit-costs - Get credit costs (public, heavily cached)
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

const CREDIT_COSTS_CACHE_KEY = "credit:costs";
const CREDIT_COSTS_CACHE_TTL = 300; // 5 minutes - admin changes propagate fairly quickly

interface CreditCost {
  operation: string;
  credits: number;
  description: string;
}

async function getCreditCosts(): Promise<CreditCost[]> {
  try {
    const cached = await redis.get(CREDIT_COSTS_CACHE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    // Redis unavailable
  }

  const setting = await prisma.adminSetting.findUnique({
    where: { key: "credit_costs" },
  });

  let costs: CreditCost[] = [];
  if (setting?.value) {
    try { costs = JSON.parse(setting.value); } catch { /* invalid JSON */ }
  }

  // If no costs configured, return defaults
  if (costs.length === 0) {
    costs = [
      { operation: "gpt-4.1-mini", credits: 1, description: "GPT-4.1 Mini" },
      { operation: "gpt-4.1-nano", credits: 1, description: "GPT-4.1 Nano" },
      { operation: "gpt-4.1", credits: 2, description: "GPT-4.1" },
      { operation: "gpt-4o-mini", credits: 2, description: "GPT-4o Mini" },
      { operation: "gpt-4o", credits: 3, description: "GPT-4o" },
      { operation: "gpt-5.1-mini", credits: 4, description: "GPT-5.1 Mini" },
      { operation: "gpt-5.1", credits: 5, description: "GPT-5.1" },
      { operation: "claude-3.5-haiku", credits: 1, description: "Claude 3.5 Haiku" },
      { operation: "claude-3.5-sonnet", credits: 3, description: "Claude 3.5 Sonnet" },
      { operation: "claude-3.5-opus", credits: 5, description: "Claude 3.5 Opus" },
      { operation: "web-search", credits: 3, description: "Web Search" },
      { operation: "file-analysis", credits: 5, description: "File Analysis" },
      { operation: "image-generation", credits: 20, description: "Image Generation" },
    ];
  }

  try {
    await redis.setex(CREDIT_COSTS_CACHE_KEY, CREDIT_COSTS_CACHE_TTL, JSON.stringify(costs));
  } catch {
    // Redis unavailable
  }

  return costs;
}

export async function GET(request: NextRequest) {
  try {
    const costs = await getCreditCosts();
    return NextResponse.json({ costs });
  } catch (error) {
    console.error("[Credit Costs API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit costs" },
      { status: 500 }
    );
  }
}
