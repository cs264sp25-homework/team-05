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

  users: defineTable({
    email: v.string(),
    tokenIdentifier: v.string(), //from getUserIdentity
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"])
    .index("email", ["email"])
    .index("phone", ["phone"]),

  calendar: defineTable({
    userId: v.id("users"),
    calendarId: v.string(), 
    summary: v.string(),
    description: v.optional(v.string()),
    timeZone: v.optional(v.string()),
  }).index("by_userId", ["userId"])
    .index("by_calendarId", ["calendarId"]),

  calendarEvents: defineTable({
    userId: v.id("users"),
    calendarId: v.optional(v.union(v.literal("primary"), v.id('calendar'))), //iCalUID //v.id(calendar)
    eventId: v.string(), //id (google)
    created: v.string(),
    updated: v.optional(v.string()),
    summary: v.string(),
    htmlLink: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    colorId: v.optional(v.string()),
    start: v.object({
      date: v.optional(v.string()),
      dateTime: v.string(),
      timeZone: v.optional(v.string()),
    }),
    end: v.object({
      date: v.optional(v.string()),
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
  .index("by_eventId", ["eventId"])
  .index("by_userId_eventId", ["userId", "eventId"]),
});
 
export default schema;
