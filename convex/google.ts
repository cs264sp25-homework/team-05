"use node";
import { v } from "convex/values";
import { action, internalAction} from "./_generated/server";
import { google } from "googleapis";
import { createClerkClient } from '@clerk/backend'
import { api, internal } from "./_generated/api";
import { ConvexError } from "convex/values";

const client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URI,
);

export const getAccessToken = internalAction({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity(); //GetUserIdentity
    if (!identity) {
      throw new ConvexError({
        code: 401,
        message: "User not authenticated",
      });
    }
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = await clerkClient.users.getUserOauthAccessToken(identity.subject, "google");
    if (token.data.length === 0 || token.data[0].token == null) {
      return
    }
    return token.data[0].token;
  }
})

//Can refactor to use this
export const getAccessTokenWithUserId = internalAction({
  args: {
    userId: v.any(), 
  },
  handler: async (_, args) => {
    let param_user_id = '';

    if (typeof args.userId === 'string') {
      param_user_id = args.userId; 
    } else {
      param_user_id = args.userId.subject;
    }

    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = await clerkClient.users.getUserOauthAccessToken(param_user_id, "google");
    
    if (token.data.length === 0 || token.data[0].token == null) {
      return
    }
    return token.data[0].token;

  }
})


export const listGoogleCalendarEvents = action({
    args: { 
      startDate: v.string(),
      endDate: v.string(),
      userId: v.optional(v.any()), // Allow passing in a userId to get enable tool call
    },
    handler: async (ctx, args) => {   
      let token = null; 
      if (args.userId) {
        token = await ctx.runAction(internal.google.getAccessTokenWithUserId, {
          userId: args.userId, // Pass in the userId to get the token for that user
        });
      } else {
        token = await ctx.runAction(internal.google.getAccessToken);
      }
      client.setCredentials({
        access_token: token,
      });
      
      // args.startDate = new Date(args.startDate).toISOString(); // Ensure the start date is in ISO format
      // args.endDate = new Date(args.endDate).toISOString(); // Ensure the end date is in ISO format
  
      const events = await google.calendar("v3").events.list({
        calendarId: "primary",
        eventTypes: ["default"],
        singleEvents: true,
        timeMin: args.startDate, // Ensure the start date is in ISO format
        timeMax: args.endDate,
        maxResults: 50,
        orderBy: "startTime",
        auth: client,
      });

      if (events.status != 200)  {
        throw new ConvexError({
          code: 502,
          message: "Google API error"
        })
      }

      const user = await ctx.runQuery(api.users.getUser, {
      })
      if (!user) {
        throw new ConvexError({
          code: 401,
          message: "User not authenticated",
        });
      }

      await ctx.runMutation(api.calendarEvents.bulkInsertCalendarEvent, {
        userId: user._id,
        calendarId: "primary",
        events: events.data.items?.map((event => ({
          eventId: event.id!,
          created: event.created!,
          updated: event.updated ?? "",
          summary: event.summary!,
          htmlLink: event.htmlLink ?? "",
          description: event.description ?? "",
          location: event.location ?? "",
          colorId: event.colorId ?? "",
          start: {
            date: event.start?.date ?? "",
            dateTime: event.start?.dateTime as string,
            timeZone: event.start?.timeZone ?? "",
          },
          end: {
            date: event.end?.date ?? "",      
            dateTime: event.end?.dateTime as string,
            timeZone: event.end?.timeZone ?? "",
          },
          recurrence: event.recurrence ?? [],
          reminders: {
            useDefault: event.reminders?.useDefault ?? false,
          },
        }))) || [],
      })
    
      return events.data.items || [];
    }
})

export const createGoogleCalendarEvent = action({
  args: {
    event: v.object({
      summary: v.string(),
      description: v.optional(v.string()),
      location: v.optional(v.string()),
      colorId: v.optional(v.string()),
      start: v.object({
        dateTime: v.string(),
        timeZone: v.optional(v.string()),
      }),
      end: v.object({
        dateTime: v.string(),
        timeZone: v.optional(v.string()),
      }),
      recurrence: v.optional(v.array(v.string())), 
      reminders: v.optional(v.object({
        useDefault: v.boolean(),
        overrides: v.optional(v.array(v.object({
          method: v.string(),
          minutes: v.number(),
        }))),
      })),
    }),
    userId: v.any(),
  },
  handler: async (ctx, args) => {
  
    let param_user_id = '';

    if (typeof args.userId === 'string') {
      param_user_id = args.userId; 
    } else {
      param_user_id = args.userId.subject;
    }
    

    // const token = await ctx.runAction(internal.google.getAccessToken);

    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = await clerkClient.users.getUserOauthAccessToken(param_user_id, "google");

    client.setCredentials({
      access_token: token.data[0].token,
    });


    args.event.start.dateTime = new Date(args.event.start.dateTime).toISOString(); // Ensure the start date is in ISO format
    args.event.end.dateTime = new Date(args.event.end.dateTime).toISOString(); // Ensure the end date is in ISO format
    
    
    const response = await google.calendar("v3").events.insert({
      calendarId: "primary",
      requestBody: args.event,
      auth: client,
    });
    if (response.status != 200)  {
      throw new ConvexError({
        code: 502,
        message: "Google API error"
      })
    }

    const user = await ctx.runQuery(api.users.getUser, {
    })
    if (!user) {
      throw new ConvexError({
        code: 401,
        message: "User not authenticated",
      });
    }


    await ctx.runMutation(api.calendarEvents.storeCalendarEvent, {
      userId: user._id,
      calendarId: "primary",
      eventId: response.data.id!,
      created: response.data.created!,
      updated: response.data.updated ?? "",
      summary: response.data.summary!,
      htmlLink: response.data.htmlLink ?? "",
      description: response.data.description ?? "",
      location: response.data.location ?? "",
      colorId: response.data.colorId ?? "",
      start: {
        date: response.data.start?.date ?? "",
        dateTime: response.data.start! as string,
        timeZone: response.data.start?.timeZone ?? "",
      },
      end: {
        date: response.data.end?.date ?? "",
        dateTime: response.data.end! as string,
        timeZone: response.data.end?.timeZone ?? "",
      },
      recurrence: response.data.recurrence ?? [],
      reminders: {
        useDefault: response.data.reminders?.useDefault ?? false,
      },
    });
    


    return response.data;
  }
});

export const updateGoogleCalendarEvent = action({
  args: {
    userId: v.any(),
    eventId: v.string(),
    event: v.object({
      summary: v.optional(v.string()),
      description: v.optional(v.string()),
      location: v.optional(v.string()),
      start: v.optional(v.object({
        dateTime: v.string(),
      })),
      end: v.optional(v.object({
        dateTime: v.string(),
      })),
    })
  },
  handler: async (ctx, args) => {
    let param_user_id = '';

    if (typeof args.userId === 'string') {
      param_user_id = args.userId; 
    } else {
      param_user_id = args.userId.subject;
    }
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = await clerkClient.users.getUserOauthAccessToken(param_user_id, "google");

    client.setCredentials({
      access_token: token.data[0].token,
    });
    
    const response = await google.calendar("v3").events.patch({
      calendarId: "primary",
      eventId: args.eventId,
      requestBody: {
        summary: args.event.summary,
        description: args.event.description,
        location: args.event.location,
        start: args.event.start,
        end: args.event.end,
      },
      auth: client,
    });

    const user = await ctx.runQuery(api.users.getUser, {
    })
    if (!user) {
      throw new ConvexError({
        code: 401,
        message: "User not authenticated",
      });
    }

    await ctx.runMutation(api.calendarEvents.storeCalendarEvent, {
      userId: user._id,
      calendarId: "primary",
      eventId: response.data.id!,
      created: response.data.created!,
      updated: response.data.updated ?? "",
      summary: response.data.summary!,
      htmlLink: response.data.htmlLink ?? "",
      description: response.data.description ?? "",
      location: response.data.location ?? "",
      colorId: response.data.colorId ?? "",
      start: {
        date: response.data.start?.date ?? "",
        dateTime: response.data.start! as string,
        timeZone: response.data.start?.timeZone ?? "",
      },
      end: {
        date: response.data.end?.date ?? "",
        dateTime: response.data.end! as string,
        timeZone: response.data.end?.timeZone ?? "",
      },
      recurrence: response.data.recurrence ?? [],
      reminders: {
        useDefault: response.data.reminders?.useDefault ?? false,
      },
    });

    return response.data;
  }
});

export const deleteGoogleCalendarEvent = action({
  args: {
    eventId: v.string(),
    userId: v.any(),
    id: v.optional(v.id("calendarEvents")),
  },
  handler: async (ctx, args) => {
    let param_user_id = '';

    if (typeof args.userId === 'string') {
      param_user_id = args.userId; 
    } else {
      param_user_id = args.userId.subject;
    }
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = await clerkClient.users.getUserOauthAccessToken(param_user_id, "google");

    client.setCredentials({
      access_token: token.data[0].token,
    });
    
    const response = await google.calendar("v3").events.delete({
      calendarId: "primary",
      eventId: args.eventId,
      auth: client,
    });

    const user = await ctx.runQuery(api.users.getUser, {
    })
    if (!user) {
      throw new ConvexError({
        code: 401,
        message: "User not authenticated",
      });
    }

    await ctx.runMutation(api.calendarEvents.deleteEvent, {
      id: args.id,
      eventId: args.eventId,
    });


    return response.data;
    
  }
});


export async function createEventHelper (args: any) {
  let param_user_id = '';

    if (typeof args.userId === 'string') {
      param_user_id = args.userId; 
    } else {
      param_user_id = args.userId.subject;
    }
    

    // const token = await ctx.runAction(internal.google.getAccessToken);

    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
    const token = await clerkClient.users.getUserOauthAccessToken(param_user_id, "google");





    client.setCredentials({
      access_token: token.data[0].token,
    });


    args.event.start.dateTime = new Date(args.event.start.dateTime).toISOString(); // Ensure the start date is in ISO format
    args.event.end.dateTime = new Date(args.event.end.dateTime).toISOString(); // Ensure the end date is in ISO format
    
    
    const response = await google.calendar("v3").events.insert({
      calendarId: "primary",
      requestBody: args.event,
      auth: client,
    });

    console.log("Response was generated. back to you");


    return response.data;
}
