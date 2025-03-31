"use node";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { google } from "googleapis";
import { createClerkClient } from '@clerk/backend'
import { internal } from "./_generated/api";

const client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URI,
);

export const getAccessToken = internalAction({
  handler: async (ctx) => {
    const user_id = await ctx.auth.getUserIdentity();
    if (!user_id) {
      return;
    }
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = await clerkClient.users.getUserOauthAccessToken(user_id.subject, "google");
    if (token.data.length === 0 || token.data[0].token == null) {
      return
    }
    return token.data[0].token;
  }
})


export const listGoogleCalendarEvents = action({
    args: { 
      accessToken: v.string(), 
      code: v.string(),
      startDate: v.string(),
      endDate: v.string()
    },
    handler: async (ctx, args) => {    
      const token = await ctx.runAction(internal.google.getAccessToken);
  
      client.setCredentials({
        access_token: token,
      });
  
      const events = await google.calendar("v3").events.list({
        calendarId: "primary",
        eventTypes: ["default"],
        singleEvents: true,
        timeMin: args.startDate,
        timeMax: args.endDate,
        maxResults: 2500,
        orderBy: "startTime",
        auth: client,
      });
    
      return events.data.items || [];
    }
})

export const createGoogleCalendarEvent = action({
  args: {
    event: v.object({
      summary: v.string(),
      description: v.optional(v.string()),
      start: v.object({
        dateTime: v.string(),
      }),
      end: v.object({
        dateTime: v.string(),
      }),
    })
  },
  handler: async (ctx, args) => {

    const token = await ctx.runAction(internal.google.getAccessToken);
    client.setCredentials({
      access_token: token,
      scope: "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",

    });
    
    const response = await google.calendar("v3").events.insert({
      calendarId: "primary",
      requestBody: args.event,
      auth: client,

    });

    return response.data;
    
  }

})