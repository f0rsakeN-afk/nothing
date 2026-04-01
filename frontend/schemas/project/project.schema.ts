import { z } from "zod";

export const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(50, "Project name must be less than 50 characters"),
  description: z.string().max(200, "Description must be less than 200 characters").optional().or(z.literal("")),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
