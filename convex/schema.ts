import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { Infer, v } from "convex/values";

const toolType = v.union(
  v.literal("file_search"),
  v.literal("code_interpreter"),
  v.literal("function"),
);

export const toolSchema = v.object({
  type: toolType,
});

export const assistantIdType = v.union(
  v.literal("default"),
  v.id("assistants")
);

export const assistantSchema = {
  name: v.string(),
  description: v.optional(v.string()),
  instructions: v.string(),
  model: v.string(),
  temperature: v.optional(v.number()),
  openaiAssistantId: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), v.string())),
  tools: v.optional(v.array(toolSchema)),
  numWeeks: v.union(v.literal(1), v.literal(2)),
  nextWeeksEvents: v.optional(v.any()),
}

export const assistantAccessSchema = {
  assistantId: v.id("assistants"),
  userId: v.id("users"),
  isOwner: v.boolean(),
}

const assistantSchemaObject = v.object(assistantSchema);
export type Assistant = Infer<typeof assistantSchemaObject>;
 
const schema = defineSchema({
  ...authTables,
  // Your other tables...
  chats: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    messageCount: v.number(),
    pageCount: v.number(),
    openaiThreadId: v.optional(v.string()),
    assistantId: assistantIdType,
  }),
  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    openaiMessageId: v.optional(v.string()),
  }).index("by_chat_id", ["chatId"]),
  assistants: defineTable(assistantSchema).index("by_name", ["name"]),
  assistant_access: defineTable(assistantAccessSchema).index("by_assistant_id", ["assistantId"]),
});
 
export default schema;