import { z } from "zod";

export const createChatSchema = z.object({
  title: z.string().min(2).max(50),
  description: z.optional(z.string().min(2).max(200)),
});

export const updateChatSchema = createChatSchema.partial();

export const chatSchema = createChatSchema.extend({
  _id: z.string(),
  _creationTime: z.number(),
  messageCount: z.number(),
  fileCount: z.number(),
});

export type CreateChatType = z.infer<typeof createChatSchema>;
export type UpdateChatType = z.infer<typeof updateChatSchema>;
export type ChatType = z.infer<typeof chatSchema>;
