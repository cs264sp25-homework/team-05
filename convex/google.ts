"use node";
import { v } from "convex/values";
import { action, internalAction, query } from "./_generated/server";
import { google } from "googleapis";
import { createClerkClient } from '@clerk/backend'
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URI,
);

export const getAccessToken = internalAction({
  handler: async (ctx) => {
    const user_id = await ctx.auth.getUserIdentity();
    if (!user_id) {
      console.log("User id is null :(")
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
  handler: async (_, args) => {
  

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
  handler: async (_, args) => {
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

    return response.data;
  }
});

export const deleteGoogleCalendarEvent = action({
  args: {
    eventId: v.string(),
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

    client.setCredentials({
      access_token: token.data[0].token,
    });
    
    const response = await google.calendar("v3").events.delete({
      calendarId: "primary",
      eventId: args.eventId,
      auth: client,
    });
    return response.data;
  }
});

// Define interface for group member
interface GroupMember {
  userId: string;
  groupId: Id<"groups">;
  role: string;
  joinedAt: number;
  name?: string;
  email?: string;
  pictureUrl?: string | null;
  isCurrentUser?: boolean;
}

// Define interface for calendar event
interface CalendarEvent {
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  [key: string]: any;
}

// Define interface for member events
interface MemberEvents {
  userId: string;
  events: CalendarEvent[];
}

export const findGroupAvailability = action({
  args: {
    groupId: v.id("groups"),
    startDate: v.string(),
    endDate: v.string(),
    duration: v.number(), // duration in minutes
  },
  handler: async (ctx, args) => {
    // 1. Get all group members
    const groupMembersResponse = await ctx.runQuery(api.groups.getGroupMembers, {
      groupId: args.groupId
    });

    if (!groupMembersResponse || !groupMembersResponse.members || groupMembersResponse.members.length === 0) {
      throw new Error("No members found in the group");
    }

    // 2. Get calendar events for each member
    const memberEvents = await Promise.all(
      groupMembersResponse.members.map(async (member: GroupMember) => {
        const events = await ctx.runAction(api.google.listGoogleCalendarEvents, {
          startDate: args.startDate,
          endDate: args.endDate,
          userId: member.userId
        });
        return {
          userId: member.userId,
          events: events || []
        };
      })
    );

    // 3. Convert events to busy time slots
    const busySlots = memberEvents.flatMap((memberEvent: any) => {
      const events = memberEvent.events || [];
      return events.map((event: any) => {
        // Safely handle potentially undefined or missing properties
        const start = event.start?.dateTime || event.start?.date || '';
        const end = event.end?.dateTime || event.end?.date || '';
        return {
          start: new Date(start),
          end: new Date(end)
        };
      });
    }).sort((a: { start: Date }, b: { start: Date }) => a.start.getTime() - b.start.getTime());

    // 4. Find available time slots
    const availableSlots = [];
    const startTime = new Date(args.startDate);
    const endTime = new Date(args.endDate);
    const durationMs = args.duration * 60 * 1000; // Convert minutes to milliseconds

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + durationMs);
      
      // Check if this time slot overlaps with any busy slots
      const isAvailable = !busySlots.some((busy: { start: Date; end: Date }) => 
        (currentTime < busy.end && slotEnd > busy.start)
      );

      if (isAvailable) {
        // Only include slots during reasonable hours (e.g., 9 AM to 5 PM)
        if (currentTime.getHours() >= 9 && currentTime.getHours() < 17) {
          availableSlots.push({
            start: new Date(currentTime),
            end: new Date(slotEnd)
          });
        }
      }

      // Move to next 30-minute slot
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    return availableSlots;
  }
});