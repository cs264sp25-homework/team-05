import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const getAll = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .collect();
  },
});

export const getOne = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    return ctx.db.get(args.messageId);
  },
});

export const create = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if the chat exists
    const chat = await ctx.db.get(args.chatId);
    if (!chat) {
      throw new ConvexError({
        code: 404,
        message: "Chat not found",
      });
    }

    // Store the user message
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: args.content,
      role: "user",
    });

    // Get all messages in the chat so far
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .collect();

    // Store a placeholder message for the assistant
    const placeholderMessageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: "...",
      role: "assistant",
    });

    // Update the chat message count
    await ctx.db.patch(args.chatId, {
      messageCount: chat.messageCount + 2,
    });

    // Schedule an action that calls ChatGPT and updates the message.
    ctx.scheduler.runAfter(0, internal.openai.completion, {
      chatId: args.chatId as Id<"chats">,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      placeholderMessageId,
    });

    return messageId;
  },
});



export const update = internalMutation({
    args: {
      messageId: v.id("messages"),
      content: v.string(),
    },
    handler: async (ctx, args) => {
      await ctx.db.patch(args.messageId, {
        content: args.content,
      });
    },
  });


  