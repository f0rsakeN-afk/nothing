/**
 * AI Configuration - Centralized env vars for model/token limits
 * All AI-related settings in one place for easy tuning per model
 *
 * Conservative defaults for limited resources.
 * Override via .env when you have more budget.
 */

function parseIntOrDefault(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const aiConfig = {
  // Model settings
  model: process.env.AI_MODEL || "llama-3.1-8b-instant",
  maxTokens: parseIntOrDefault(process.env.AI_MAX_TOKENS, 1024), // Conservative
  temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),

  // Context/token limits
  maxContextTokens: parseIntOrDefault(process.env.MAX_CONTEXT_TOKENS, 2000), // Leave room for system prompt + user message
  maxSystemPromptTokens: parseIntOrDefault(process.env.MAX_SYSTEM_PROMPT_TOKENS, 1500), // Tight for limited budget
  maxRecentMessages: parseIntOrDefault(process.env.MAX_RECENT_MESSAGES, 20), // Conservative - ~10 recent exchanges

  // For context-manager.ts defaults (also conservative)
  maxContextTokensFallback: parseIntOrDefault(process.env.MAX_CONTEXT_TOKENS_FALLBACK, 4000),
  minRecentTokens: parseIntOrDefault(process.env.MIN_RECENT_TOKENS, 1500),
} as const;

export type AIConfig = typeof aiConfig;