import { NextRequest, NextResponse } from "next/server";
import { validateAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import redis, { KEYS, TTL } from "@/lib/redis";
import { checkRateLimitWithAuth, rateLimitResponse } from "@/lib/rate-limit";

// Model definitions with descriptions, capabilities and tier requirements
const MODELS = [
  // OpenAI models - Free tier
  {
    value: 'gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    provider: 'openai' as const,
    description: 'Fast & efficient',
    capabilities: { fast: true },
    tier: 'free',
  },
  {
    value: 'gpt-4.1-nano',
    label: 'GPT-4.1 Nano',
    provider: 'openai' as const,
    description: 'Fastest, lowest cost',
    capabilities: { fast: true },
    tier: 'free',
  },
  {
    value: 'gpt-4.1',
    label: 'GPT-4.1',
    provider: 'openai' as const,
    description: 'Balanced performance',
    tier: 'free',
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o Mini',
    provider: 'openai' as const,
    description: 'Vision support',
    capabilities: { vision: true },
    tier: 'free',
  },
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    provider: 'openai' as const,
    description: 'Full vision & audio',
    capabilities: { vision: true },
    tier: 'pro',
  },
  {
    value: 'gpt-5.1-mini',
    label: 'GPT-5.1 Mini',
    provider: 'openai' as const,
    description: 'Next gen fast',
    capabilities: { fast: true },
    tier: 'pro',
    isNew: true,
  },
  {
    value: 'gpt-5.1',
    label: 'GPT-5.1',
    provider: 'openai' as const,
    description: 'Next gen power',
    tier: 'pro',
    isNew: true,
  },
  {
    value: 'gpt-5.2-mini',
    label: 'GPT-5.2 Mini',
    provider: 'openai' as const,
    description: 'Latest fast',
    capabilities: { fast: true },
    tier: 'pro',
    isNew: true,
  },
  {
    value: 'gpt-5.2',
    label: 'GPT-5.2',
    provider: 'openai' as const,
    description: 'Latest power',
    tier: 'pro',
    isNew: true,
  },
  {
    value: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    provider: 'openai' as const,
    description: 'Lightning fast',
    capabilities: { fast: true },
    tier: 'pro',
  },
  {
    value: 'gpt-5.4',
    label: 'GPT-5.4',
    provider: 'openai' as const,
    description: 'Deep reasoning',
    capabilities: { reasoning: true },
    tier: 'pro',
  },
  {
    value: 'o3-mini',
    label: 'O3 Mini',
    provider: 'openai' as const,
    description: 'Advanced reasoning',
    capabilities: { reasoning: true },
    tier: 'pro',
  },
  {
    value: 'o4-mini',
    label: 'O4 Mini',
    provider: 'openai' as const,
    description: 'Extended reasoning',
    capabilities: { reasoning: true },
    tier: 'pro',
  },
  // Anthropic models - Free tier
  {
    value: 'claude-3.5-haiku',
    label: 'Claude 3.5 Haiku',
    provider: 'anthropic' as const,
    description: 'Fast & concise',
    capabilities: { fast: true },
    tier: 'free',
  },
  {
    value: 'claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic' as const,
    description: 'Complex tasks',
    tier: 'pro',
  },
  {
    value: 'claude-3.5-opus',
    label: 'Claude 3.5 Opus',
    provider: 'anthropic' as const,
    description: 'Most capable',
    tier: 'pro',
  },
  {
    value: 'claude-3.7-sonnet',
    label: 'Claude 3.7 Sonnet',
    provider: 'anthropic' as const,
    description: 'Extended thinking',
    capabilities: { reasoning: true },
    tier: 'pro',
    isNew: true,
  },
  {
    value: 'claude-3.7-opus',
    label: 'Claude 3.7 Opus',
    provider: 'anthropic' as const,
    description: 'Maximum capability',
    capabilities: { reasoning: true },
    tier: 'pro',
    isNew: true,
  },
  // xAI models
  {
    value: 'grok-3',
    label: 'Grok 3',
    provider: 'xai' as const,
    description: 'Most powerful xAI model',
    capabilities: { reasoning: true },
    tier: 'pro',
  },
  {
    value: 'grok-3-beta',
    label: 'Grok 3 Beta',
    provider: 'xai' as const,
    description: 'Beta version of Grok 3',
    capabilities: { reasoning: true },
    tier: 'pro',
    isNew: true,
  },
  {
    value: 'grok-2',
    label: 'Grok 2',
    provider: 'xai' as const,
    description: 'Previous generation',
    tier: 'free',
  },
  {
    value: 'grok-2-mini',
    label: 'Grok 2 Mini',
    provider: 'xai' as const,
    description: 'Fast & efficient',
    capabilities: { fast: true },
    tier: 'free',
  },
];

// Determine user tier from planTier field
function getUserTier(planTier: string | null): 'free' | 'pro' | 'max' {
  if (!planTier) return 'free';
  const tier = planTier.toUpperCase();
  if (tier === 'PRO' || tier === 'PAID' || tier === 'BASIC') return 'pro';
  if (tier === 'MAX' || tier === 'ENTERPRISE') return 'max';
  return 'free';
}

export async function GET(req: NextRequest) {
  const rateLimit = await checkRateLimitWithAuth(req, "default");
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  const user = await validateAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Try cache first (user's plan tier rarely changes)
  const cacheKey = KEYS.userPreferences(user.id);
  let userTier: 'free' | 'pro' | 'max' = 'free';

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      userTier = getUserTier(parsed.planTier ?? null);
    }
  } catch {
    // Redis error, fall through to DB
  }

  // If not cached, fetch from DB
  if (userTier === 'free') {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { planTier: true },
    });
    userTier = getUserTier(dbUser?.planTier ?? null);

    // Cache the tier (stale OK, we just need speed)
    try {
      await redis.setex(cacheKey, TTL.userPreferences, JSON.stringify({ planTier: dbUser?.planTier }));
    } catch {
      // Cache error, ignore
    }
  }

  // Add locked flag based on tier
  const modelsWithAccess = MODELS.map((model) => {
    const requiredTier = model.tier || 'free';
    let locked = false;
    let upgradeTo: 'pro' | 'max' | null = null;

    if (requiredTier === 'pro' && userTier === 'free') {
      locked = true;
      upgradeTo = 'pro';
    } else if (requiredTier === 'max' && userTier !== 'max') {
      locked = true;
      upgradeTo = userTier === 'pro' ? 'max' : 'pro';
    }

    return {
      ...model,
      locked,
      upgradeTo,
    };
  });

  return NextResponse.json({
    models: modelsWithAccess,
    userTier,
  });
}