import { z } from "zod";

export const contactTopicSchema = z.enum(["general", "support", "sales", "partnership", "billing", "other"]);

export const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(255),
  topic: contactTopicSchema,
  message: z.string().min(20).max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;