import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { calendar } from "googleapis/build/src/apis/calendar";
 
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

  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    userIdconvex: v.string(),
  }).index("by_clerkId", ["clerkId"]),

  calendar: defineTable({
    userId: v.id("users"),
    calendarId: v.string(), 
    summary: v.string(),
    description: v.optional(v.string()),
    timeZone: v.optional(v.string()),
    accessRole: v.optional(v.string()),
  }).index("by_userId", ["userId"])
    .index("by_calendarId", ["calendarId"]),

  calendarEvents: defineTable({
    userId: v.id("users"),
    calendarId: v.id("calendar"),
    eventId: v.string(),
    summary: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
      colorId: v.optional(v.string()),
      start: v.object({
        dateTime: v.string(),
        timeZone: v.optional(v.string()),
      }),
      end: v.object({
        dateTime: v.string(),
        timeZone: v.optional(v.string()),
      }),
      recurrence: v.optional(v.array(v.string())), 
      reminders: v.optional(v.object({
        useDefault: v.boolean(),
        overrides: v.optional(v.array(v.object({
          method: v.string(),
          minutes: v.number(),
          }))),
        })),
      })
    .index("by_userId", ["userId"])
    .index("by_calendarId", ["calendarId"])
    .index("by_eventId", ["eventId", "calendarId"])
    .index("by_userId_eventId", ["userId", "eventId"]),
});
 
export default schema;