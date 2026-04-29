import { z } from "zod";

export const reportStatusSchema = z.enum(["pending", "in_progress", "resolved", "dismissed"]);

export const reportReasonSchema = z.enum([
  "spam",
  "harassment",
  "inappropriate_content",
  "copyright",
  "security_threat",
  "other",
]);

export const updateReportStatusSchema = z.object({
  id: z.string().cuid("Invalid report ID"),
  status: reportStatusSchema,
});

export const reportsFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  status: reportStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const feedbackFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const contactTopicSchema = z.enum(["bug", "feature", "general", "sales"]);

export const contactsFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  topic: contactTopicSchema.optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type UpdateReportStatusInput = z.infer<typeof updateReportStatusSchema>;
export type ReportsFiltersInput = z.infer<typeof reportsFiltersSchema>;
export type FeedbackFiltersInput = z.infer<typeof feedbackFiltersSchema>;
export type ContactsFiltersInput = z.infer<typeof contactsFiltersSchema>;