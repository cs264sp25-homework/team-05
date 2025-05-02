import { ConvexError, v } from "convex/values";
import { api, internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { assistantSchema } from "./schema";

export const getAll = query({
    handler: async(ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        
        if (!identity) {
            throw new ConvexError({
                code: 404,
                message: "Identity in getAll is null",
            });
        }

        // get user row that matches the email
        const user = await ctx.db.query("users")
        .filter(q => q.eq(q.field("email"), identity.email))
        .collect();

        const userId = user[0]._id;
        console.log("UserId returned: ", userId);

        // get all the assistantIds from assistant_access where userId and isOwner is true
        const assistantAccess = await ctx.db.query("assistant_access")
        .filter(q => q.and(q.eq(q.field("userId"), userId), q.eq(q.field("isOwner"), true)))
        .collect();

        const assistantIds = assistantAccess.map(assistant => assistant.assistantId);
        
        // get all the assistants where the assistantId is in the assistantAccess
        const assistantDetails = [];
        for (const assistantId of assistantIds) {
            const assistant = await ctx.db.get(assistantId);
            assistantDetails.push(assistant);
        }

        return assistantDetails;


        // return ctx.db.query("assistants").collect();
    }
});

export const getOne = query({
  args: {
    assistantId: v.union(v.id("assistants"), v.literal("default")),
  },
  handler: async (ctx, args) => {
    if (args.assistantId === "default") {
      return {
        id: "default",
        name: "Default Assistant",
        description: "This is the default assistant",
        instructions: "You are a helpful assistant",
        model: "gpt-4o-mini",
      };
    }

    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) {
      throw new ConvexError({
        code: 404,
        message: "Assistant not found",
      });
    }
    return assistant;
  }
})

export const viewer = internalQuery({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {

    console.log("This is the userEmail: ", args.userEmail);

    const correspondingUser = await ctx.db.query("users")
      .filter(q => q.eq(q.field("email"), args.userEmail))
      .collect();

    console.log("This is the corresponding user: ", correspondingUser);

    return correspondingUser[0]._id;
  },
});

// add nextWeeksEvents to args
export const create = mutation({
    args: assistantSchema,
    handler: async (ctx, args) => {

      // Need to create the assistant in both the Convex database and through the OpenAI API (done through createAssistant function)

      console.log("This is the nextweeks events", args.nextWeeksEvents);

      const instructions = `You are a helpful assistant that will view a user's schedule and talk on behalf of that user to help others schedule events/meetings/etc. with them. When speaking on behalf of the user, do not act as if you are them. Speak like you are an assistant working for them. 

      Try to avoid revealing certain details about the user's events such as the title. Discussing the time is totally fine however.
      
      Here are the user's preferences on how you should try to schedule things on their behalf: ${args.instructions}
      Here are the user's next week's events: ${JSON.stringify(args.nextWeeksEvents)} that you will use to help schedule things on their behalf.
      `

        const assistantId = await ctx.db.insert("assistants", {
            name: args.name,
            description: args.description,
            instructions: args.instructions || instructions,
            model: args.model || 'gpt-4o',
            temperature: args.temperature || 1,
            tools: args.tools || [],
            metadata: args.metadata || {},
            openaiAssistantId: "pending",
            numWeeks: args.numWeeks || 1,
        });

        await ctx.scheduler.runAfter(0, internal.openai.createAssistant, {
            assistantId,
            ...args,
            alternateInstructions: instructions,
        });

        // give access to the assistant to the user
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError({
                code: 404,
                message: "Identity in createAssistant is null",
            });
        }

        await ctx.runMutation(api.assistant_access.giveAccess, {
            assistantId,
            userEmail: identity.email as string,
            owner: true,
        });
        
        return assistantId;
    }
});

export const update = mutation({
  args: {
    assistantId: v.id("assistants"),
    ...assistantSchema,
  },
  handler: async (ctx, args) => {
    // Check if the assistant exists
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) {
      throw new ConvexError({
        code: 404,
        message: "Assistant not found",
      });
    }

    if (args.openaiAssistantId) {
      throw new ConvexError({
        code: 400,
        message: "You should not update openaiAssistantId directly",
      });
    }

    // Update the assistant in our database
    await ctx.db.patch(args.assistantId, {
      name: args.name || assistant.name,
      description: args.description || assistant.description,
      instructions: args.instructions || assistant.instructions,
      model: args.model || assistant.model,
      temperature: args.temperature || assistant.temperature,
      tools: args.tools || assistant.tools,
      metadata: args.metadata || assistant.metadata,
    });

    if (assistant.openaiAssistantId) {
      // Schedule an action to update the assistant in OpenAI
      await ctx.scheduler.runAfter(0, internal.openai.updateAssistant, {
        ...args,
        openaiAssistantId: assistant.openaiAssistantId,
      });
    }

    return args.assistantId;  
  }
});

// Delete an assistant
export const remove = mutation({
  args: {
    assistantId: v.id("assistants"),
  },
  handler: async (ctx, args) => {
    // Check if the assistant exists
    const assistant = await ctx.db.get(args.assistantId);
    if (!assistant) {
      throw new ConvexError({
        code: 404,
        message: "Assistant not found",
      });
    }

    // Delete the assistant from our database
    await ctx.db.delete(args.assistantId);

    if (assistant.openaiAssistantId) {
      // Schedule an action to delete the assistant in OpenAI
      await ctx.scheduler.runAfter(0, internal.openai.deleteAssistant, {
        openaiAssistantId: assistant.openaiAssistantId,
      });
    }

    return { success: true };
  },
});


// Internal mutation to update the OpenAI assistant ID
export const updateOpenAIId = internalMutation({
    args: {
      assistantId: v.id("assistants"),
      openaiAssistantId: v.string(),
    },
    handler: async (ctx, args) => {
      await ctx.db.patch(args.assistantId, {
        openaiAssistantId: args.openaiAssistantId,
      });
    },
  });

  export const deleteFailedAssistant = internalMutation({
    args: {
      assistantId: v.id("assistants"),
    },
    handler: async (ctx, args) => {
      await ctx.db.delete(args.assistantId);
    }
  })

