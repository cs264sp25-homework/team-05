import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const getAssistantAccess = query({
    args: {
        assistantId: v.id("assistants"),
    },
    handler: async (ctx, args) => {
        // const assistants = await ctx.db.query("assistant_access")
        const assistants = await ctx.db.query("assistant_access")
        .withIndex("by_assistant_id", q => q.eq("assistantId", args.assistantId))
        .collect();

        console.log("Returned assistants: ", assistants);

        // Gather all the userIds from assistants
        const userIds = assistants.map(assistant => assistant.userId);
        console.log("User IDs: ", userIds);

        // If no userIds, return empty array
        // if (userIds.length === 0) {
        //     return [];
        // }

        // Gather all the emails for these userIds
        let userEmails: string[] = [];
        for (const userId of userIds) {
            const user = await ctx.db.query("users")
                .filter(q => q.eq(q.field("_id"), userId))
                .collect();
            console.log("User returned: ", user);
            if (user) {
                userEmails.push(user[0].email as string);   
            }   
        }

        // console.log("User Emails: ", userEmails);

        return userEmails;
    }
});

export const giveAccess = mutation({
    args: {
        assistantId: v.id("assistants"),
        userEmail: v.string(),
        owner: v.boolean(),
    },
    handler: async(ctx, args) => {

        console.log("This is the assistantId: ", args.assistantId);
        console.log("This is the userEmail: ", args.userEmail);

        // get user row that matches the email
        const user = await ctx.db.query("users")
        .filter(q => q.eq(q.field("email"), args.userEmail))
        .collect();

        console.log("User returned: ", user);

        if (!user || user.length === 0) {
            throw new ConvexError({
                code: 404, 
                message: "User not found",
            })
        }

        await ctx.db.insert("assistant_access", {
            assistantId: args.assistantId,
            userId: user[0]._id,
            isOwner: args.owner,
        });   
    }
});

export const revokeAccess = mutation({
    args: {
        assistantId: v.id("assistants"),
        userEmail: v.string(),
    },
    handler: async(ctx, args) => {
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity) {
        //     throw new ConvexError({
        //         code: 404,
        //         message: "Identity in revokeAccess is null",
        //     });
        // }

        // get user row that matches the email
        const user = await ctx.db.query("users")
        .filter(q => q.eq(q.field("email"), args.userEmail))
        .collect();

        // get row from assistant_access that matches the userId and assistantId
        const assistantAccess = await ctx.db.query("assistant_access")
        .filter(q => q.and(q.eq(q.field("userId"), user[0]._id), q.eq(q.field("assistantId"), args.assistantId)))
        .collect();

        // delete the assistant_access row
        if (assistantAccess.length === 0) {
            throw new ConvexError({
                code: 404,
                message: "Assistant access not found",
            })
        }

        await ctx.db.delete(assistantAccess[0]._id);
        // await ctx.db.delete(user[0]._id);   
    }
});

export const getAssistantsYouHaveAccessTo: ReturnType<typeof query> = query({
    handler: async(ctx) => {

        console.log("Getting assistants you have access to");

        const identity = await ctx.auth.getUserIdentity();

        console.log("THIS IS THE IDENTITY: ", identity);

        if (!identity) {
            throw new ConvexError({
                code: 404,
                message: "identity null"
            });
        }

        console.log("No exceptions yet");

        const userId = await ctx.runQuery(internal.assistants.viewer, {
            userEmail: identity.email!,
        });

        console.log("the user id", userId);

        const assistants = await ctx.db.query("assistant_access")
        .filter(q => q.eq(q.field("userId"), userId))
        .collect();

        const assistantIds = assistants.map(assistant => assistant.assistantId);
        
        // Get the assistant details for these IDs and gather them
        const assistantDetails = [];
        for (const assistantId of assistantIds) {
            const assistant = await ctx.db.get(assistantId);
            assistantDetails.push(assistant);
        }

        return assistantDetails;
    }
});