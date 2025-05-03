import { z } from "zod";

const toolSchema = z.object({
  type: z.union([z.literal("file_search"), z.literal("code_interpreter"), z.literal("function")]),
});

export const createAssistantSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.optional(z.string().min(2).max(200)),
  instructions: z.string(),
  model: z.string(),
  temperature: z.optional(z.number()),
  openaiAssistantId: z.optional(z.string()),
  metadata: z.optional(z.record(z.string())),
  tools: z.optional(z.array(toolSchema)),
  numWeeks: z.union([z.literal(1), z.literal(2)]),
  owner: z.optional(z.string()),
});

export const updateAssistantSchema = createAssistantSchema.partial();

export const assistantSchema = createAssistantSchema.extend({
  _id: z.string(),
  _creationTime: z.number(),
});

export type CreateAssistantType = z.infer<typeof createAssistantSchema>;
export type UpdateAssistantType = z.infer<typeof updateAssistantSchema>;
export type AssistantType = z.infer<typeof assistantSchema>;