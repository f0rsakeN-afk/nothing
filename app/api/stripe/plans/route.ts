/**
 * Stripe Plans API
 * GET /api/stripe/plans - Get available subscription plans and credit packages
 * Plans are read from database - NO AUTH REQUIRED (public pricing)
 */

import { NextRequest, NextResponse } from "next/server";
import { stripeConfig } from "@/lib/stripe-config";
import { getAllActivePlans } from "@/services/plan.service";

export async function GET(request: NextRequest) {
  try {
    // Fetch plans from database (no auth required)
    const dbPlans = await getAllActivePlans();

    // Transform DB plans to match frontend interface
    const plans = {
      free: dbPlans.find((p) => p.id === "free") || {
        id: "free",
        tier: "FREE",
        name: "Free",
        description: "Try out the basics.",
        price: 0,
        credits: 25,
        maxChats: 100,
        maxProjects: 2,
        maxMessages: 100,
        features: ["basic-chat", "basic-projects", "short-memory"],
        isActive: true,
        isVisible: true,
      },
      basic: dbPlans.find((p) => p.id === "basic") || {
        id: "basic",
        tier: "BASIC",
        name: "Basic",
        description: "For light users.",
        price: 499,
        credits: 200,
        maxChats: 500,
        maxProjects: 5,
        maxMessages: 500,
        features: ["basic-chat", "basic-projects", "longer-memory", "attachments"],
        isActive: true,
        isVisible: true,
      },
      pro: dbPlans.find((p) => p.id === "pro") || {
        id: "pro",
        tier: "PRO",
        name: "Pro",
        description: "For power users.",
        price: 1499,
        credits: 1000,
        maxChats: -1,
        maxProjects: -1,
        maxMessages: -1,
        features: ["basic-chat", "basic-projects", "longer-memory", "attachments", "advanced-customization", "chat-folders", "chat-branches", "export-chats"],
        isActive: true,
        isVisible: true,
      },
      enterprise: dbPlans.find((p) => p.id === "enterprise") || {
        id: "enterprise",
        tier: "ENTERPRISE",
        name: "Enterprise",
        description: "For teams.",
        price: 4999,
        credits: 5000,
        maxChats: -1,
        maxProjects: -1,
        maxMessages: -1,
        features: ["basic-chat", "basic-projects", "longer-memory", "attachments", "advanced-customization", "chat-folders", "chat-branches", "export-chats", "team-collaboration", "api-access", "priority-support", "dedicated-support"],
        isActive: true,
        isVisible: true,
      },
    };

    return NextResponse.json({
      plans,
      creditPackages: stripeConfig.creditPackages,
      creditCosts: stripeConfig.creditCosts,
    });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json({ error: "Failed to get plans" }, { status: 500 });
  }
}
