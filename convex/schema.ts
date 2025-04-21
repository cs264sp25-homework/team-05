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
  calendarWatchChannels: defineTable({
    channelId: v.string(),       // You generate this
    resourceId: v.string(),      // Google returns this in webhook
    calendarId: v.string(),      // The calendar being watched
    userId: v.optional(v.string()),          // Your app's user ID OPTIONAL FOR NOW
    expiration: v.optional(v.number()),      // Epoch ms
    createdAt: v.number(),
  }).index("by_channel_id", ["channelId"]),
  calendarEventsUpdateSignals: defineTable({
    resourceId: v.string(),
    userId: v.optional(v.id("users")),         // Your app's user ID
    timestamp: v.number(), // Epoch ms
  })
  .index("by_resource_id", ["resourceId"])
  .index("by_user_id", ["userId"]),

  calendarEvents: defineTable({
    userId: v.id("users"), // or however you're identifying users
    calendarId: v.string(),
    eventId: v.string(),
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    start: v.any(), // Store ISO string, timestamp, or object
    end: v.any(),
    updated: v.string(), // ISO date from Google Calendar
  })
    .index("by_userId", ["userId"])
    .index("by_calendarId", ["calendarId"])
    .index("by_eventId", ["eventId", "calendarId"]),
});

 
export default schema;