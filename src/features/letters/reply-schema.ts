import { z } from "zod";

export const LetterReplySchema = z.object({
  body: z.string().trim().min(1).max(3000),
});
