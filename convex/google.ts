'use node';
import { v } from "convex/values";
import { action } from "./_generated/server";
import { google } from "googleapis";
import { loadAuth2, loadAuth2WithProps, loadClientAuth2, gapi } from 'gapi-script';



export const listGoogleCalendarEvents = action({
  args: { accessToken: v.string(), code: v.string() },
  handler: async (ctx, args) => {    
    console.log("Access Token:", args.accessToken);
    const auth = new google.auth.OAuth2({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      
    });

    let gapiClient = loadClientAuth2(gapi, process.env.AUTH_GOOGLE_SECRET as string, "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid");
    gapiClient.then((client) => {
      
    }

    // auth.setCredentials({ 
    //   refresh_token: args.accessToken,
    //   access_token: args.accessToken,
    //  });
    // const auth = new google.auth.OAuth2({
    //   clientOptions: {
    //     clientId: process.env.AUTH_GOOGLE_ID,
    //     clientSecret: process.env.AUTH_GOOGLE_SECRET,

    //   },
    //   scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile", "openid"],
      
    // });

    google.options({auth: auth});

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
