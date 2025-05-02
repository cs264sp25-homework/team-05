import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
 
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
});

// Check if user has Google Calendar access
export const hasCalendarAccess = query({
  handler: async (ctx): Promise<boolean> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    try {
      const token = await ctx.auth.getUserIdentity();
      // Check if the user has Google OAuth configured
      return token?.googleJwt !== undefined;
    } catch (error) {
      console.error("Error checking calendar access:", error);
      return false;
    }
  },
});