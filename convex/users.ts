"use node";
import { v } from "convex/values";
import { internalAction, mutation, query } from "./_generated/server";
import { createClerkClient } from '@clerk/backend';

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called storeUser without authentication present");
    }

    // Check if we've already stored this identity before.
    // Note: If you don't want to define an index right away, you can use
    // ctx.db.query("users")
    //  .filter(q => q.eq(q.field("tokenIdentifier"), identity.tokenIdentifier))
    //  .unique();
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.subject),
      )
      .unique();
    if (user !== null) {
      // If we've seen this identity before but the name has changed, patch the value.
      if (user.name !== identity.name) {
        await ctx.db.patch(user._id, { name: identity.name });
      }
      return user._id;
    }
    // If it's a new identity, create a new `User`.
    return await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email!,
      image: identity.pictureUrl ?? "",
      phone: identity.phoneNumber ?? "",     
      tokenIdentifier: identity.subject,
    });
  },
});

export const getUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called getUser without authentication present");
    }
    return ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.subject),
      )
      .unique();
  },
})

// Log helper for debugging
const logData = (prefix: string, data: any) => {
  console.log(`[DEBUG] ${prefix}:`, JSON.stringify(data, null, 2));
  return data;
};

// Fetch user details from Clerk using the Admin API
export const getUserDetails = internalAction({
  args: { userId: v.string() },
  handler: async (_, args) => {
    try {
      // Create Clerk client with admin API key
      const clerkClient = createClerkClient({ 
        secretKey: process.env.CLERK_SECRET_KEY 
      });
      
      // Fetch user details with full details
      const user = await clerkClient.users.getUser(args.userId);
      logData("User details from Clerk", user);
      
      // Get primary email address 
      const emails = user.emailAddresses || [];
      const primaryEmailObject = emails.find(
        email => email.id === user.primaryEmailAddressId
      );
      
      const allEmails = emails.map(e => e.emailAddress);
      
      // Grab the first available email if primary is not available
      const bestEmail = primaryEmailObject?.emailAddress || 
                      (emails.length > 0 ? emails[0].emailAddress : null) ||
                      "No email available";
      
      // Return formatted user details
      const result = {
        userId: user.id,
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}`
          : user.username || user.id.substring(0, 8),
        email: bestEmail,
        allEmails: allEmails,
        imageUrl: user.imageUrl
      };
      
      console.log(`[SUCCESS] User ${args.userId} details fetched:`, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("[ERROR] Error fetching user details:", error);
      // Return fallback data if user can't be found
      return {
        userId: args.userId,
        name: args.userId.substring(0, 8),
        email: "No email available",
        allEmails: [],
        imageUrl: null
      };
    }
  }
});

// Fetch multiple user profiles at once
export const getUserProfiles = internalAction({
  args: { 
    userIds: v.array(v.string()) 
  },
  handler: async (_, args) => {
    try {
      console.log(`[DEBUG] Fetching profiles for ${args.userIds.length} users:`, args.userIds);
      
      // Create Clerk client with admin API key
      const clerkClient = createClerkClient({ 
        secretKey: process.env.CLERK_SECRET_KEY 
      });
      
      // Fetch all users at once
      const { data: users } = await clerkClient.users.getUserList({
        userId: args.userIds,
        limit: 100,
      });
      
      logData("Clerk returned users", users);
      
      // Map to a more useful format
      const profiles = users.map(user => {
        // Get all emails
        const emails = user.emailAddresses || [];
        // Get primary email
        const primaryEmailObject = emails.find(
          email => email.id === user.primaryEmailAddressId
        );
        
        // Get the best available email
        const bestEmail = primaryEmailObject?.emailAddress || 
                        (emails.length > 0 ? emails[0].emailAddress : null) ||
                        "No email available";
        
        return {
          userId: user.id,
          name: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}`
            : user.username || user.id.substring(0, 8),
          email: bestEmail,
          imageUrl: user.imageUrl
        };
      });
      
      console.log(`[SUCCESS] Retrieved ${profiles.length} user profiles`);
      return profiles;
    } catch (error) {
      console.error("[ERROR] Error fetching user profiles:", error);
      // Return empty array on error
      return [];
    }
  }
}); 
