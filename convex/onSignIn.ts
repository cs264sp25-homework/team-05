// convex/auth/onSignIn.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// You can enhance this with Google Calendar API integration
export const onSignIn = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    calendars: v.optional(v.array(v.object({
      calendarId: v.string(),
      summary: v.string(),
      timeZone: v.optional(v.string()),
      accessRole: v.optional(v.string()),
      events: v.optional(v.array(v.object({
        eventId: v.string(),
        summary: v.string(),
        description: v.optional(v.string()),
        location: v.optional(v.string()),
        colorId: v.optional(v.string()),
        start: v.object({ dateTime: v.string(), timeZone: v.optional(v.string()) }),
        end: v.object({ dateTime: v.string(), timeZone: v.optional(v.string()) }),
        recurrence: v.optional(v.array(v.string())),
        reminders: v.optional(v.object({
          useDefault: v.boolean(),
          overrides: v.optional(v.array(v.object({ method: v.string(), minutes: v.number() })))
        })),
      }))
    }))),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        userIdconvex: ""
    });

    if (args.calendars) {
      for (const calendar of args.calendars) {
        const calendarId = await ctx.db.insert("calendar", {
          userId,
          calendarId: calendar.calendarId,
          summary: calendar.summary,
          timeZone: calendar.timeZone,
          accessRole: calendar.accessRole,
        });

        for (const event of calendar.events ?? []) {
          await ctx.db.insert("calendarEvents", {
            userId,
            calendarId: calendar.calendarId,
            eventId: event.eventId,
            summary: event.summary,
            description: event.description,
            location: event.location,
            colorId: event.colorId,
            start: event.start,
            end: event.end,
            recurrence: event.recurrence,
            reminders: event.reminders,
          });
        }
      }
    }

    return { userId };
  }
});
