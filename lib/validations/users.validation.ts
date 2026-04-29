import { z } from "zod";

export const userRoleSchema = z.enum(["USER", "MODERATOR", "ADMIN"]);
export const planTierSchema = z.enum(["FREE", "BASIC", "PRO", "ENTERPRISE"]);

export const updateUserRoleSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
  role: userRoleSchema,
});

export const updateUserStatusSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
  isActive: z.boolean(),
});

export const userFiltersSchema = z.object({
  search: z.string().max(200).optional(),
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UserFiltersInput = z.infer<typeof userFiltersSchema>;