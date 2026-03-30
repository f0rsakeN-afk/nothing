import z from "zod";

export const userSchema = z.object({});

export type userInput = z.infer<typeof userSchema>;
