import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";




export const storeCalendarEvent = mutation({
  args: {
    userId: v.id("users"),
    calendarId: v.optional(v.union(v.literal("primary"), v.id('calendar'))), //iCalUID
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
  },
  handler: async (ctx, args) => {
    // Upsert behavior: delete existing then insert
    // const existing = await ctx.db
    //   .query("calendarEvents")
    //   .withIndex("by_userId_eventId", q =>
    //     q
    //       .eq("userId", args.userId!)
    //       .eq("eventId", args.eventId)
    //   )
    //   .unique();

    // if (existing) {
    //   await ctx.db.delete(existing._id);
    // }

    await ctx.db.insert("calendarEvents", {
      ...args,
    });
  },
});

export const bulkInsertCalendarEvent = mutation({
  args: {
    userId: v.id("users"),

    //events: v.any(),

    events: v.array(v.object({
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
    })),
    calendarId: v.optional(v.union(v.literal("primary"), v.id('calendar'))), //iCalUID
  },
  handler: async (ctx, args) => {

    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new ConvexError({
        code: 401,
        message: "User not authenticated",
      });
    }


    const {events} = args;
    for (const event of events) {
      const currentEvent = await ctx.db.query("calendarEvents").withIndex("by_eventId", (q) => q.eq("eventId", event.eventId)).first();
      if (currentEvent) {
       continue
      }
      await ctx.db.insert("calendarEvents", {
        ...event,
        userId: args.userId,
        calendarId: args.calendarId,
      });
    }
  },
});


export const deleteEvent = mutation({
  args: {
    //userId: v.id("users"),
    id: v.optional(v.id('calendarEvents')),
    eventId: v.optional(v.string()), // This should match the Google Calendar event ID you stored
  },
  handler: async (ctx, args) => {
    let event = null;
    if (!args.id) {
      event = await ctx.db
        .query("calendarEvents") 
        .withIndex("by_eventId", (q) =>
          q.eq("eventId", args.eventId!))
        .first();
    } else {
      event = await ctx.db
      .query("calendarEvents") // corrected table name
      // .withIndex("by_userId_eventId", (q) =>
      //   q.eq("userId", args.userId).eq("eventId", args.eventId)
      // )
      .withIndex("by_eventId", (q) =>
        q.eq("eventId", args.id!))
      .first();

    }
  
    if (event) {
      await ctx.db.delete(event._id);
    } else {
      throw new ConvexError({
        code: 404,
        message: "Event not found",
      })
    }
  },
});

export const updateEvent = mutation({
  args: {
    id: v.id('calendarEvents'),
    eventId: v.optional(v.string()), // This should match the Google Calendar event ID you stored
    calendarId: v.optional(v.union(v.literal("primary"), v.id('calendar'))), //iCalUID
    summary: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    start: v.optional(v.object({
      dateTime: v.string(),
    })),
    end: v.optional(v.object({
      dateTime: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (event) {
      await ctx.db.patch(args.id, {
        ...args,
      });
    }
  }
})

export const getEvents = query({
  handler: async (ctx) => {

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called getUser without authentication present");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.subject),
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        code: 401,
        message: "User not authenticated",
      });
    }
    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_userId", (q) =>  q.eq("userId", user._id))
      .collect();
    
  }
})