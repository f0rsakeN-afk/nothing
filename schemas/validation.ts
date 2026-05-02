/**
 * Zod Validation Schemas
 * Input validation for all API routes
 */

import { z } from "zod";

// Chat schemas
export const createChatSchema = z.object({
  projectId: z.string().cuid().optional(),
  firstMessage: z.string().max(10000).optional(),
});

export const updateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  archivedAt: z.string().datetime().nullable().optional(),
});

// Message schemas
export const createMessageSchema = z.object({
  content: z.string().min(1).max(100000),
  sender: z.enum(["user", "assistant", "ai"]),
  type: z.string().max(50).default("text"),
});

export const messageFeedbackSchema = z.object({
  reaction: z.enum(["like", "dislike"]),
});

// Project schemas
export const createProjectSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(1000).default(""),
  instruction: z.string().max(5000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(1000).optional(),
  instruction: z.string().max(5000).optional(),
});

// User preferences schemas
export const updatePreferencesSchema = z.object({
  preferredTone: z.enum(["concise", "balanced", "detailed"]).optional(),
  detailLevel: z.enum(["CONCISE", "BALANCED", "DETAILED"]).optional(),
});

// Customize schemas
export const customizeSchema = z.object({
  preferredName: z.string().min(1).max(50),
  responseTone: z.enum(["professional", "witty", "flirty", "gen-z", "sarcastic", "supportive", "emoji-heavy"]),
  detailLevel: z.enum(["concise", "balanced", "detailed"]),
  interests: z.string().max(100),
});

export const updateCustomizeSchema = customizeSchema.partial();

// Settings schemas
export const settingsSchema = z.object({
  mode: z.enum(["light", "dark", "system"]).optional(),
  colorScheme: z.enum(["civic", "studio", "dawn", "dusk", "code", "nebula", "ember", "aura", "pulse", "forge"]).optional(),
  language: z.string().max(10).optional(),
  autoTitle: z.boolean().optional(),
  enterToSend: z.boolean().optional(),
  showSuggestions: z.boolean().optional(),
  compactMode: z.boolean().optional(),
  reducedMotion: z.boolean().optional(),
  streaming: z.boolean().optional(),
  codeHighlight: z.boolean().optional(),
  persistentMemory: z.boolean().optional(),
  emailUpdates: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
  browserNotifs: z.boolean().optional(),
  usageAlerts: z.boolean().optional(),
  analytics: z.boolean().optional(),
  usageData: z.boolean().optional(),
  crashReports: z.boolean().optional(),
  hapticsEnabled: z.boolean().optional(),
  showChips: z.boolean().optional(),
  showTagline: z.boolean().optional(),
  showMemory: z.boolean().optional(),
  showFiles: z.boolean().optional(),
  showApps: z.boolean().optional(),
  showSearch: z.boolean().optional(),
  showNewChat: z.boolean().optional(),
});

export const updateSettingsSchema = settingsSchema.partial();

// Account schemas
export const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plan: z.enum(["free", "basic", "pro", "enterprise"]).optional(),
  credits: z.number().int().min(0).optional(),
  maxChats: z.number().int().min(1).optional(),
  maxProjects: z.number().int().min(1).optional(),
  maxMessages: z.number().int().min(1).optional(),
  features: z.array(z.string()).optional(),
});

// Search schemas
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  webSearch: z.boolean().default(true),
});

// Chat API schemas
export const chatMessageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ).min(1),
  chatId: z.string().cuid().optional(),
  mode: z.enum(["chat", "web"]).default("chat"),
  performWebSearch: z.boolean().default(false),
});

// Generic pagination schema
export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// Type exports
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type MessageFeedbackInput = z.infer<typeof messageFeedbackSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
