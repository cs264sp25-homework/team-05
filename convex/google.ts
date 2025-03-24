'use node';
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { google } from "googleapis";
import { auth } from "./auth";


export const listGoogleCalendarEvents = action({
  args: { accessToken: v.string(), code: v.string() },
  handler: async (ctx, args) => {    
    console.log("Access Token:", args.accessToken);
    const auth = new google.auth.OAuth2();

    auth.setCredentials({ refresh_token: args.accessToken });

    const calendar = google.calendar({ version: "v3", auth: auth });
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });

    return res.data.items || [];
  },
});
