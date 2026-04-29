import { z } from "zod";

export const changelogChangeSchema = z.object({
  type: z.enum(["feature", "fix", "improvement", "breaking"]),
  text: z.string().min(1, "Change text is required").max(500, "Change text too long"),
});

export const changelogEntrySchema = z.object({
  version: z
    .string()
    .min(1, "Version is required")
    .regex(/^\d+\.\d+\.\d+$/, "Version must be in format X.Y.Z"),
  date: z.string().optional(),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description too long"),
  changes: z
    .array(changelogChangeSchema)
    .min(1, "At least one change is required")
    .max(50, "Too many changes"),
  isPublished: z.boolean(),
});

export type ChangelogEntryInput = z.infer<typeof changelogEntrySchema>;
export type ChangelogChangeInput = z.infer<typeof changelogChangeSchema>;