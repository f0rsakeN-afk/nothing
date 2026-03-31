import { z } from "zod";

export const feedbackSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5),
  comment: z
    .string()
    .min(5, "Comment must be at least 5 characters long.")
    .max(500, "Comment cannot exceed 500 characters."),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export type FeedbackSchema = z.infer<typeof feedbackSchema>;
