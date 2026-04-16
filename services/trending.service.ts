import redis from "@/lib/redis";
import { KEYS, TTL } from "@/lib/redis";

const TRENDING_KEY = "trending:prompts";
const TRENDING_WINDOW = 7 * 24 * 60 * 60; // 7 days

export async function trackPromptUsage(prompt: string): Promise<void> {
  try {
    const key = `prompt:${prompt.toLowerCase().slice(0, 100)}`;
    await redis.zincrby(TRENDING_KEY, 1, key);
    // Set expiry on first track
    await redis.expire(TRENDING_KEY, TRENDING_WINDOW);
  } catch (error) {
    console.error("[trending] track error:", error);
  }
}

export async function getTrendingPrompts(limit = 20): Promise<string[]> {
  try {
    // Get top prompts from sorted set (highest score first)
    const results = await redis.zrevrange(TRENDING_KEY, 0, limit - 1);

    // Decode the prompt keys back to original prompts
    const prompts = results
      .map((key) => key.replace(/^prompt:/, ""))
      .filter(Boolean);

    return prompts.slice(0, limit);
  } catch (error) {
    console.error("[trending] get error:", error);
    return [];
  }
}

export async function getTrendingStats(): Promise<{ prompt: string; count: number }[]> {
  try {
    const results = await redis.zrevrange(TRENDING_KEY, 0, 49, "WITHSCORES");

    const stats: { prompt: string; count: number }[] = [];
    for (let i = 0; i < results.length; i += 2) {
      const prompt = results[i].replace(/^prompt:/, "");
      const count = parseInt(results[i + 1], 10);
      if (prompt) {
        stats.push({ prompt, count });
      }
    }

    return stats;
  } catch (error) {
    console.error("[trending] stats error:", error);
    return [];
  }
}
