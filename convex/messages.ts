import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const getAll = query({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
      .collect();
    
    // Get the groupId from the first message (if it exists and has a groupId)
    let groupId = undefined;
    for (const message of messages) {
      if (message.groupId) {
        groupId = message.groupId;
        console.log(`[DEBUG] Found messages with groupId: ${groupId}`);
        break;
      }
    }
    
    // Enhance debugging for messages retrieval
    if (groupId) {
      console.log(`[DEBUG] getMessages - Retrieved ${messages.length} messages with groupId: ${groupId}`);
    } else {
      console.log(`[DEBUG] getMessages - Retrieved ${messages.length} messages without groupId`);
    }
    
    // Check if any messages have different groupIds (which would be unexpected)
    const groupIds = messages
      .filter(m => m.groupId)
      .map(m => m.groupId);
    
    if (groupIds.length > 0) {
      const uniqueGroupIds = [...new Set(groupIds)];
      if (uniqueGroupIds.length > 1) {
        console.warn(`[WARN] Multiple groupIds found in messages: ${uniqueGroupIds.join(', ')}`);
      }
    }
    
    // For consistency, ensure all messages have the groupId if at least one has it
    if (groupId) {
      return messages.map(message => ({
        ...message,
        groupId: message.groupId || groupId // Ensure all messages have the group ID
      }));
    }
    
    return messages;
  },
});

// Alias for getAll, used in the group-chat-page component
export const getMessages = getAll;

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
    groupId: v.optional(v.id("groups")),
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

    // More explicit logging for the groupId
    if (args.groupId) {
      console.log(`[DEBUG] Message creation - Received groupId: ${args.groupId}`);
      console.log(`[DEBUG] Message creation - groupId type: ${typeof args.groupId}`);
    } else {
      console.log(`[DEBUG] Message creation - No groupId provided`);
    }

    // Store the user message
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: args.content,
      role: "user",
      openaiMessageId: "pending",
      groupId: args.groupId,
    });
    
    console.log(`[DEBUG] Created user message with ID: ${messageId} and groupId: ${args.groupId || 'none'}`);

    // Get all messages in the chat so far
//     const messages = await ctx.db
//       .query("messages")
//       .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
//       .collect();
      
    // console.log(`[DEBUG] Retrieved ${messages.length} messages, with groupIds: ${JSON.stringify(messages.map(m => m.groupId))}`);

    // Store a placeholder message for the assistant
    const placeholderMessageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      content: "...",
      role: "assistant",
      openaiMessageId: "pending",
      groupId: args.groupId,
    });
    
    console.log(`[DEBUG] Created assistant placeholder with ID: ${placeholderMessageId} and groupId: ${args.groupId || 'none'}`);

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
            ownerId: assistant.owner,
          });
        }
      } else {
        // Get all messages in the chat so far
        const messages = await ctx.db
        .query("messages")
        .withIndex("by_chat_id", (q) => q.eq("chatId", args.chatId))
        .collect();

        const user_id = await ctx.auth.getUserIdentity();

    // Log that we're scheduling OpenAI completion with groupId
    console.log(`[DEBUG] Scheduling OpenAI completion - groupId: ${args.groupId || 'none'}`);
    console.log(`[DEBUG] groupId is of type: ${typeof args.groupId}`);
    
    if (args.groupId) {
      try {
        // Try to parse it as an ID to see if it's a valid format
        console.log(`[DEBUG] groupId value: ${JSON.stringify(args.groupId)}`);
      } catch (e) {
        console.error(`[ERROR] Error stringifying groupId: ${e}`);
      }
    }

    // Schedule an action that calls ChatGPT and updates the message.
    ctx.scheduler.runAfter(0, internal.openai.completion, {
      chatId: args.chatId as Id<"chats">,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })).concat([{
        // Add the current message (which isn't in the DB query results yet)
        role: "user",
        content: args.content,
      }]),
      placeholderMessageId,
      user_id: user_id,
      groupId: args.groupId, // Pass the groupId explicitly
      openaiThreadId: chat.openaiThreadId,
    });
        
      }
    }
    return messageId;
  },
});

// Alias for create, used in the group-chat-page component
export const sendMessage = create;

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


  