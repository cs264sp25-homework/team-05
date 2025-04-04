import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getAll = query({
    handler: async (ctx) => {
      console.log("Loading the chats........");
      return ctx.db.query("chats").collect();
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

  export const create = mutation({
    args: {
      title: v.string(),
      description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      const chatId = await ctx.db.insert("chats", {
        title: args.title,
        description: args.description,
        messageCount: 0,
        pageCount: 0,
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