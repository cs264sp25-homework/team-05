import { action, internalAction, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";



export const storeCalendarEvent = internalMutation({
  args: {
    userId: v.id("users"),
    event: v.object({
      calendarId: v.string(),
      eventId: v.string(),
      summary: v.string(),
      description: v.optional(v.string()),
      location: v.optional(v.string()),
      colorId: v.optional(v.string()),
      start: v.any(),
      end: v.any(),
      recurrence: v.optional(v.array(v.string())),
      updated: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    // Upsert behavior: delete existing then insert
    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_userId_eventId", q =>
        q
          .eq("userId", args.userId!)
          .eq("eventId", args.event.eventId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("calendarEvents", {
      userId: args.userId,
      ...args.event,
    });
  },
});


export const del = internalMutation({
  args: {
    userId: v.id("users"),
    eventId: v.string(), // This should match the Google Calendar event ID you stored
  },
  handler: async (ctx, args) => {
    const event = await ctx.db
      .query("calendarEvents") // corrected table name
      .withIndex("by_userId_eventId", (q) =>
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    if (event) {
      await ctx.db.delete(event._id);
    }
  },
});