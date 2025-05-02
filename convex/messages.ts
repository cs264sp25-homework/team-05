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
      openaiMessageId: "pending",
    });

    // Store a placeholder message for the assistant
    const placeholderMessageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: "...",
      role: "assistant",
      openaiMessageId: "pending",
    });

    // Update the chat message count
    await ctx.db.patch(args.chatId, {
      messageCount: chat.messageCount + 2,
    });

    if (chat.openaiThreadId) {
      await ctx.scheduler.runAfter(0, internal.openai.createMessage, {
        messageId,
        openaiThreadId: chat.openaiThreadId,
        content: args.content,
        role: "user",
      });

      if (chat.assistantId !== "default") {
        // Get the assistant details
        const assistant = await ctx.db.get(chat.assistantId);
        if (!assistant) {
          throw new ConvexError({
            code: 404,
            message: "Assistant not found",
          });
        }

        const user = await ctx.auth.getUserIdentity();
        if (!user) {
          throw new ConvexError({
            code: 404,
            message: "User not found",
          });
        }


        if (assistant.openaiAssistantId) {
          // Start a streaming run with the assistant
          ctx.scheduler.runAfter(0, internal.openai.streamRun, {
            openaiThreadId: chat.openaiThreadId,
            openaiAssistantId: assistant.openaiAssistantId,
            placeholderMessageId,
            userId: user.subject,
          });
        }
      } else {
        // Get all messages in the chat so far
        const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
        .collect();

        const user_id = await ctx.auth.getUserIdentity();

        // Schedule an action that calls ChatGPT and updates the message.
        ctx.scheduler.runAfter(0, internal.openai.completion, {
          chatId: args.chatId as Id<"chats">,
          messages: messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          placeholderMessageId,
          user_id: user_id,
          openaiThreadId: chat.openaiThreadId,
        });
      }
    }
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

// Internal mutation to update the OpenAI message ID
export const updateOpenAIMessageId = internalMutation({
  args: {
    messageId: v.id("messages"),
    openaiMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      openaiMessageId: args.openaiMessageId,
    });
  },
});


  