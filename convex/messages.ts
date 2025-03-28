import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

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