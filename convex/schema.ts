import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
 
const schema = defineSchema({
  ...authTables,
  // Your other tables...
  chats: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    messageCount: v.number(),
    pageCount: v.number(),
  }),
  messages: defineTable({
    chatId: v.id("chats"),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
  }).index("by_chat_id", ["chatId"]),
});
 
export default schema;