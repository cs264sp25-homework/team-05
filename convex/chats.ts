import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";

export const getAll = query({
    handler: async (ctx) => {
      console.log("Loading the chats........");
      const identity = await ctx.auth.getUserIdentity();
      const userId = identity?.subject;
      const userChats = await ctx.db.query("chats").withIndex("by_user_id", (q) => q.eq("userId", userId)).collect();
      const groups: any[] = await ctx.runQuery(api.groups.getUserGroups);
      const groupChats = await Promise.all(
        groups.map((group) => ctx.db.query("chats").withIndex("by_group_id", (q) => q.eq("groupId", group._id)).collect())
      )
      groupChats.push(userChats);
      const allChats = groupChats.flat().sort((a, b) => b._creationTime - a._creationTime);
      return allChats;
    },
  });
  
  export const getOne = query({
    args: {
      chatId: v.id("chats"),
    },
    handler: async (ctx, args) => {
      return ctx.db.get(args.chatId);
    },
  });

  // Properly defined get function instead of an alias
  export const get = query({
    args: {
      chatId: v.id("chats"),
    },
    handler: async (ctx, args) => {
      return ctx.db.get(args.chatId);
    },
  });

  export const create = mutation({
    args: {
      title: v.string(),
      description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const user_id = await ctx.auth.getUserIdentity();
      const chatId = await ctx.db.insert("chats", {
        title: args.title,
        description: args.description,
        messageCount: 0,
        pageCount: 0,
        userId: user_id?.subject,
      });
      return chatId;
    },
  });
  
  export const update = mutation({
    args: {
      chatId: v.id("chats"),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      await ctx.db.patch(args.chatId, {
        title: args.title,
        description: args.description,
      });
    },
  });
  
  export const remove = mutation({
    args: {
      chatId: v.id("chats"),
    },
    handler: async (ctx, args) => {
      await ctx.db.delete(args.chatId);
    },
  });