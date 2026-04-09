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
