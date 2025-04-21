import { ConvexError, v } from "convex/values"
import { internalMutation, query } from "./_generated/server"

export const listenForUpdateSignals = query({
    handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
        throw new ConvexError("User not found");
    }
    const user = await ctx.db.query('users').filter(q => q.eq(q.field("email"), userId.email)).first();
    if (!user) {
        throw new ConvexError("User not found");
    }
      return ctx.db
      .query('calendarEventsUpdateSignals')
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(1)
    },
  })

export const getChannel = query({
  args: {
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const channel = await ctx.db.query('calendarWatchChannels').filter(q => q.eq(q.field("resourceId"), args.resourceId)).first();
    if (!channel) {
      throw new ConvexError("Resource not found");
    }
    return channel;
  },
})

export const insertWatchChannel = internalMutation({
    args: {
      channelId: v.string(), // You generate this
      resourceId: v.string(), // Google returns this in webhook
      calendarId: v.string(),
    }, 
    handler: async (ctx, args) => {
        const userId = await ctx.auth.getUserIdentity();
        if (!userId) {
            return
        }
        const user = await ctx.db.query('users').filter(q => q.eq(q.field("email"), userId.email)).first();
        if (!user) {
            throw new ConvexError("User not found");
        }

      const now = Date.now();
      // Store in Convex
      await ctx.db.insert('calendarWatchChannels', {
        channelId: args.channelId,
        resourceId: args.resourceId,
        calendarId: args.calendarId,
        expiration: now + 7 * 24 * 60 * 60 * 1000, // 7 days (max allowed)
        createdAt: now,
        userId: user._id,
      });
    }
  })
  
  
  export const insertCalendarEventUpdateSignal = internalMutation({
    args: {
      resourceId: v.string(),
    },
    
    handler: async (ctx, args) => {

        const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
        throw new ConvexError("User not found");
    }
    const user = await ctx.db.query('users').filter(q => q.eq(q.field("email"), userId.email)).first();
    if (!user) {
        throw new ConvexError("User not found");
    }
    
      await ctx.db.insert('calendarEventsUpdateSignals', {
        resourceId: args.resourceId,
        userId: user._id,
        timestamp: Date.now(),
      });
      const oldSignals = await ctx.db
      .query("calendarEventsUpdateSignals")
      .withIndex("by_resource_id", (q) => q.eq("resourceId", args.resourceId))
      .order("desc")
      .take(10);
    
    if (oldSignals.length > 1) {
      await Promise.all(
        oldSignals.slice(1).map((signal) => ctx.db.delete(signal._id))
      );
    }
    }
  })

  //function to check if user already has a watch channel
    export const checkIfUserHasWatchChannel = query({
       
        handler: async (ctx) => {
            const userId = await ctx.auth.getUserIdentity();
            if (!userId) {
                throw new ConvexError("User not found");
            }
            const user = await ctx.db.query('users').filter(q => q.eq(q.field("email"), userId.email)).first();
            if (!user) {
                throw new ConvexError("User not found");
            }
            const channel = await ctx.db.query('calendarWatchChannels').filter(q => q.eq(q.field("userId"), user._id)).first();
            if (!channel) {
            return false;
            }
            return true;
        },
        })
