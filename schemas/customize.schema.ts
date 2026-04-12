import { z } from "zod";

export const customizeSchema = z.object({
  firstName: z.string().max(50),
  lastName: z.string().max(50),
  preferredName: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name is too long"),
  responseTone: z.enum(
    ["professional", "witty", "flirty", "gen-z", "sarcastic", "supportive", "emoji-heavy"],
    {
      message: "Please select a response tone",
    }
  ),
  detailLevel: z.enum(["concise", "balanced", "detailed"], {
    message: "Please select a detail level",
  }),
  interests: z.string().max(100, "Too many interests!"),
});

export type CustomizeSchema = z.infer<typeof customizeSchema>;
