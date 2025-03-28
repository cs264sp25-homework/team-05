"use node";
import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ConvexReactClient } from 'convex/react'
import { google } from "googleapis";
import { createClerkClient } from '@clerk/backend'
import { getAuthUserId } from "@convex-dev/auth/server";

export const listGoogleCalendarEvents = action({
    args: { 
      accessToken: v.string(), 
      code: v.string() 
    },
    handler: async (ctx, args) => {    
      console.log("This is the code: ", args.code);


      const user_id = await ctx.auth.getUserIdentity();
      if (!user_id) {
        return;
      }

      console.log("This is the user_id", user_id)
      
      console.log("secret key", process.env.CLERK_SECRET_KEY);

      const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

      console.log("got the client from the backend");

      const token = await clerkClient.users.getUserOauthAccessToken(user_id.subject, "google");

      console.log("After token getoauthtoken");

      if (token.data.length === 0 || token.data[0].token == null) {
        return
      }
  
  
  
      // retrieve the access token from .convex/config.json WRONG
      // const convexAccessToken = "eyJ2MiI6ImM4YzczMTYyMDdiZTRjNTM5Y2NmYjM1M2Q5YmRkMTI0In0=";
  
  
      const client = new google.auth.OAuth2(
        process.env.GOOGLE_OAUTH_CLIENT_ID,
        process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_REDIRECT_URI,
      );
  
      console.log("Instantiated client!");
  
      // const r = await client.getToken(args.code);
  
      console.log("Token data", token.data[0].token);
  
      client.setCredentials({
        access_token: token.data[0].token,
      });
  
      console.log("Set the credentials!");
  
      const start = new Date("March 19, 2025 23:15:30");
      const end = new Date("March 26, 2025 23:15:30");
  
      const events = await google.calendar("v3").events.list({
        calendarId: "primary",
        eventTypes: ["default"],
        singleEvents: true,
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        maxResults: 10,
        auth: client,
      });
      
      console.log("Got events!");
      console.log("Events:", events.data.items);
  
      return events.data.items || [];
    }})