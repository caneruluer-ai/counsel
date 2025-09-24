import { z } from "zod";

export const chatMsg = z.object({
  speaker: z.string(),
  model: z.string(),
  role: z.enum(["system","agent","user","final"]),
  content_md: z.string(),
  sources: z.array(z.object({
    title: z.string(), domain: z.string(), url: z.string().url()
  })).optional()
});

export const finalAnswer = z.object({
  type: z.literal("FINAL_ANSWER"),
  title: z.string(),
  summary: z.array(z.string()),
  deliverable_md: z.string(),
  sources: z.array(z.object({ title:z.string(), domain:z.string(), url:z.string().url() })),
  next_steps: z.array(z.string()),
  attachments: z.array(z.any()).optional(),
  messages: z.array(chatMsg)
});
export type FinalAnswer = z.infer<typeof finalAnswer>;
