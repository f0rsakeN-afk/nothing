import { z } from "zod";

export const reportSchema = z.object({
  reason: z.string().min(1, "Please select a reason for reporting."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters long.")
    .max(500, "Description cannot exceed 500 characters."),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  image: z.any().optional(),
});

export type ReportSchema = z.infer<typeof reportSchema>;
