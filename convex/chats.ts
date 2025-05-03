import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { assistantIdType } from "./schema";      
import { api, internal } from "./_generated/api";

export const getAll = query({
    args: {
      userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
      console.log("Loading the chats........");
      const identity = await ctx.auth.getUserIdentity();
      console.log("Identity in get all:", identity);
      console.log("User ID in get all args:", args.userId);
      const userId = args.userId || identity?.subject;
      console.log("User ID in get all:", userId);

      if (!userId) {
        throw new ConvexError({
          code: 400,
          message: "User ID is required",
        });
      }


      const userChats = await ctx.db.query("chats").withIndex("by_user_id", (q) => q.eq("userId", userId)).collect();
      const groups: any[] = await ctx.runQuery(api.groups.getUserGroups, { userId });
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
      assistantId: assistantIdType,
    },
    handler: async (ctx, args) => {
      const user_id = await ctx.auth.getUserIdentity();
      const chatId = await ctx.db.insert("chats", {
        title: args.title,
        description: args.description,
        messageCount: 0,
        pageCount: 0,
        openaiThreadId: "pending",
        assistantId: args.assistantId,
        userId: user_id?.subject,
      });

      if (args.assistantId != "default") {
        await ctx.scheduler.runAfter(0, internal.openai.createThread, {
          chatId, 
          metadata: {
            title: args.title,
            description: args.description || "",
          },
        });
      }

      return chatId;
    },
  });
  
  export const update = mutation({
    args: {
      chatId: v.id("chats"),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      assistantId: v.optional(assistantIdType),
    },
    handler: async (ctx, args) => {

      const chat = await ctx.db.get(args.chatId);
      if (!chat) {
        throw new ConvexError({
          code: 404,
          message: "Chat not found",
        });
      }

      await ctx.db.patch(args.chatId, {
        title: args.title || chat.title,
        description: args.description || chat.description,
        assistantId: args.assistantId || chat.assistantId,
      });

      if (chat.openaiThreadId) {
        await ctx.scheduler.runAfter(0, internal.openai.updateThread, {
          openaiThreadId: chat.openaiThreadId,
          metadata: {
            title: args.title || chat.title,
            description: args.description || chat.description || "",
          },
        });
      }
    },
  });
  
  export const remove = mutation({
    args: {
      chatId: v.id("chats"),
    },
    handler: async (ctx, args) => {

      const chat = await ctx.db.get(args.chatId);
      if (!chat) {
        throw new ConvexError({
          code: 404,
          message: "Chat not found",
        });
      }

      await ctx.db.delete(args.chatId);

      if (chat.openaiThreadId) {
        await ctx.scheduler.runAfter(0, internal.openai.deleteThread, {
          openaiThreadId: chat.openaiThreadId,
        });
      }
    },
  });

  // Internal mutation to update the OpenAI thread ID
export const updateOpenAIThreadId = internalMutation({
  args: {
    chatId: v.id("chats"),
    openaiThreadId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      openaiThreadId: args.openaiThreadId,
    });
  },
});
