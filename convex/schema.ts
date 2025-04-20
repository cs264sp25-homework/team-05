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
  groups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // userId
    inviteCode: v.string(),
    chatId: v.optional(v.id("chats")), // Reference to the group's chat
    createdAt: v.number(), // timestamp
  }).index("by_invite_code", ["inviteCode"]),
  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(), // timestamp
  })
  .index("by_group", ["groupId"])
  .index("by_user", ["userId"])
  .index("by_group_and_user", ["groupId", "userId"]),
});
 
export default schema;