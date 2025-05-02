"use node";
import { v } from "convex/values";
import { action, internalAction} from "./_generated/server";
import { google } from "googleapis";
import { createClerkClient } from '@clerk/backend'
import { api, internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

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
      console.log(`[DEBUG] listGoogleCalendarEvents: Starting for ${typeof args.userId === 'string' ? args.userId : args.userId?.subject || 'unknown user'}`);
      
      // CRITICAL FIX: Ensure the date range is valid and not identical
      let startDate = args.startDate;
      let endDate = args.endDate;
      
      // Check if dates are identical, which causes an empty result
      if (startDate === endDate) {
        console.log(`[CRITICAL WARNING] listGoogleCalendarEvents: Start and end dates are identical. Fixing the range.`);
        // Add 24 hours to end date
        const endDateTime = new Date(endDate);
        endDateTime.setDate(endDateTime.getDate() + 1);
        endDate = endDateTime.toISOString();
        console.log(`[DEBUG] listGoogleCalendarEvents: Adjusted date range to ${startDate} to ${endDate}`);
      }
      
      console.log(`[DEBUG] listGoogleCalendarEvents: Date range ${startDate} to ${endDate}`);
      
      // Validate date ranges
      if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
        console.error(`[ERROR] Invalid date format: start=${startDate}, end=${endDate}`);
        return [];
      }
      
      let token = null; 
      if (args.userId) {
        token = await ctx.runAction(internal.google.getAccessTokenWithUserId, {
          userId: args.userId, // Pass in the userId to get the token for that user
        });
      } else {
        token = await ctx.runAction(internal.google.getAccessToken);
      }
      
      if (!token) {
        console.error(`[ERROR] No Google token found for user`);
        return [];
      }
      
      client.setCredentials({
        access_token: token,
      });
      
      console.log(`[DEBUG] listGoogleCalendarEvents: Successfully set OAuth token, fetching events`);
  
      try {
        // IMPROVED: More comprehensive Google Calendar API call
        const events = await google.calendar("v3").events.list({
          calendarId: "primary",
          eventTypes: ["default", "focusTime", "outOfOffice", "workingLocation"],
          singleEvents: true, // Expand recurring events into instances
          timeMin: startDate, // Start date in ISO format
          timeMax: endDate,   // End date in ISO format
          maxResults: 2500,        // Get a large number of events
          orderBy: "startTime",
          showDeleted: false,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Use client timezone
          auth: client,
        });
        
        // Log raw events for debugging
        console.log(`[DEBUG] Raw Google Calendar response: ${events.data.items?.length || 0} events found`);
        
        if (!events.data.items || events.data.items.length === 0) {
          console.warn(`[WARN] No events found in Google Calendar response for time range ${startDate} to ${endDate}`);
          // Try to get calendar list to check permission/integration issues
          try {
            const calendarList = await google.calendar("v3").calendarList.list({
              auth: client
            });
            
            console.log(`[DEBUG] User has ${calendarList.data.items?.length || 0} calendars`);
            
            if (calendarList.data.items && calendarList.data.items.length > 0) {
              // Try getting events from each calendar
              console.log(`[DEBUG] Attempting to fetch events from all calendars`);
              
              const allEvents: any[] = [];
              for (const calendar of calendarList.data.items) {
                try {
                  if (!calendar.id) {
                    console.warn(`[WARN] Calendar missing ID: ${calendar.summary || 'Unknown'}`);
                    continue;
                  }
                  
                  console.log(`[DEBUG] Checking calendar: ${calendar.summary || 'Unknown'}`);
                  const calEvents = await google.calendar("v3").events.list({
                    calendarId: calendar.id || 'primary',
                    eventTypes: ["default", "focusTime", "outOfOffice", "workingLocation"],
                    singleEvents: true,
                    timeMin: startDate,
                    timeMax: endDate,
                    maxResults: 2500,
                    orderBy: "startTime",
                    showDeleted: false,
                    auth: client,
                  });
                  
                  if (calEvents.data?.items && calEvents.data.items.length > 0) {
                    console.log(`[DEBUG] Found ${calEvents.data.items.length} events in calendar "${calendar.summary || 'Unknown'}"`);
                    allEvents.push(...calEvents.data.items);
                  }
                } catch (err) {
                  console.error(`[ERROR] Failed to fetch events from calendar "${calendar.summary || 'Unknown'}": ${err}`);
                }
              }
              
              if (allEvents.length > 0) {
                console.log(`[DEBUG] Found ${allEvents.length} events across all calendars`);
                events.data.items = allEvents;
              }
            }
          } catch (err) {
            console.error(`[ERROR] Failed to get calendar list: ${err}`);
          }
        }
        
        // Log all events for debugging with more details
        if (events.data.items && events.data.items.length > 0) {
          console.log(`[DEBUG] Retrieved ${events.data.items.length} events from calendar(s):`);
          events.data.items.forEach((evt, idx) => {
            const startTime = evt.start?.dateTime || evt.start?.date || 'unknown';
            const endTime = evt.end?.dateTime || evt.end?.date || 'unknown';
            console.log(`[DEBUG] Event ${idx+1}: "${evt.summary || 'No title'}" from ${startTime} to ${endTime} (status: ${evt.status || 'unknown'})`);
          });
        }
        
        // IMPROVED: More robust event normalization - ensure everything is converted properly
        const normalizedEvents = (events.data.items || []).map(event => {
          // Skip cancelled events
          if (event.status === 'cancelled') {
            console.log(`[DEBUG] Skipping cancelled event: "${event.summary || 'Unnamed'}"`);
            return null;
          }
          
          // Skip events with missing required data
          if (!event.start || !event.end) {
            console.warn(`[WARN] Skipping event "${event.summary || 'Unnamed'}" with missing start/end times`);
            return null;
          }
          
          try {
            // Handle all types of dates that Google Calendar might return
            let startDateTime, endDateTime;
            let isAllDay = false;
            
            // 1. Handle all-day events (events with date but no dateTime)
            if (event.start.date && !event.start.dateTime) {
              isAllDay = true;
              // Convert date-only format to datetime with hours set to beginning and end of day
              const startDate = new Date(event.start.date);
              startDate.setHours(0, 0, 0, 0);
              startDateTime = startDate.toISOString();
              
              // Make sure we have a valid end date
              if (event.end?.date) {
                const endDate = new Date(event.end.date);
                // All-day events in Google end at midnight of the next day
                // Subtract 1 millisecond to get 11:59:59.999 PM of the previous day
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
                endDateTime = endDate.toISOString();
              } else {
                // If no end date, use the same date as start but at end of day
                const endDate = new Date(startDate);
                endDate.setHours(23, 59, 59, 999);
                endDateTime = endDate.toISOString();
              }
              
              console.log(`[DEBUG] Normalized all-day event "${event.summary || 'Unnamed'}": ${startDateTime} to ${endDateTime}`);
            } 
            // 2. Handle regular events with specific times
            else if (event.start.dateTime && event.end.dateTime) {
              startDateTime = event.start.dateTime;
              endDateTime = event.end.dateTime;
              
              // Verify the times are valid
              if (!isValidIsoDate(startDateTime) || !isValidIsoDate(endDateTime)) {
                console.warn(`[WARN] Event "${event.summary || 'Unnamed'}" has invalid date format: start=${startDateTime}, end=${endDateTime}`);
                return null;
              }
            }
            // 3. Handle unusual formats - try to normalize as best we can
            else {
              // Use whatever we can find
              startDateTime = event.start.dateTime || event.start.date || null;
              endDateTime = event.end.dateTime || event.end.date || null;
              
              if (!startDateTime || !endDateTime) {
                console.warn(`[WARN] Event "${event.summary || 'Unnamed'}" has missing date information: start=${startDateTime}, end=${endDateTime}`);
                return null;
              }
              
              // If dates are just YYYY-MM-DD format, convert to datetime
              if (startDateTime.length <= 10) { // Simple date format like "2023-04-22"
                const startDate = new Date(startDateTime);
                startDate.setHours(0, 0, 0, 0);
                startDateTime = startDate.toISOString();
                isAllDay = true;
              }
              
              if (endDateTime.length <= 10) {
                const endDate = new Date(endDateTime);
                endDate.setHours(23, 59, 59, 999);
                endDateTime = endDate.toISOString();
                isAllDay = true;
              }
            }
            
            // Create normalized event with consistent datetime format
            const normalizedEvent = {
              id: event.id,
              summary: event.summary || 'Unnamed event',
              start: {
                dateTime: startDateTime,
                isAllDay
              },
              end: {
                dateTime: endDateTime,
                isAllDay
              },
              status: event.status || 'confirmed',
              _normalized: true
            };
            
            console.log(`[DEBUG] Normalized event: "${event.summary || 'Unnamed'}" from ${new Date(startDateTime).toLocaleString()} to ${new Date(endDateTime).toLocaleString()}`);
            return normalizedEvent;
          } catch (err) {
            console.error(`[ERROR] Failed to normalize event "${event.summary || 'Unnamed'}":`, err);
            return null;
          }
        }).filter(Boolean); // Remove nulls
        
        console.log(`[DEBUG] Retrieved and normalized ${normalizedEvents.length} events total`);
        
        return normalizedEvents;
      } catch (error) {
        console.error(`[ERROR] Failed to fetch Google Calendar events:`, error);
        return [];
      }
    }
})

// Helper function to validate ISO date strings
function isValidIsoDate(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  
  try {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && date.toISOString().startsWith(dateStr.split('T')[0]);
  } catch (e) {
    return false;
  }
}

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
// interface CalendarEvent {
//   start: {
//     dateTime?: string;
//     date?: string;
//   };
//   end: {
//     dateTime?: string;
//     date?: string;
//   };
//   [key: string]: any;
// }


export const findGroupAvailability = action({
  args: {
    groupId: v.optional(v.id("groups")),
    startDate: v.string(),
    endDate: v.string(),
    duration: v.number(), // duration in minutes
  },
  handler: async (ctx, args) => {
    if (!args.groupId) {
      throw Error("Group ID not defined!")
    }
    console.log(`[DEBUG] findGroupAvailability: Starting for group ${args.groupId}, duration ${args.duration} minutes`);
    console.log(`[DEBUG] Date range: ${args.startDate} to ${args.endDate}`);
    
    // Validate input dates
    if (!isValidIsoDate(args.startDate) || !isValidIsoDate(args.endDate)) {
      console.error(`[ERROR] Invalid date format: start=${args.startDate}, end=${args.endDate}`);
      throw new Error("Invalid date format. Please provide dates in ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)");
    }
    
    // Make sure the date range is reasonable (not more than 7 days to avoid performance issues)
    const startDate = new Date(args.startDate);
    const endDate = new Date(args.endDate);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 7) {
      console.warn(`[WARN] Date range too large (${daysDiff.toFixed(1)} days). Limiting to 7 days.`);
      endDate.setTime(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      args.endDate = endDate.toISOString();
    }
    
    // 1. Get all group members
    const groupMembersResponse = await ctx.runQuery(internal.groups.internalGetGroupMembers, {
      groupId: args.groupId
    });

    if (!groupMembersResponse || !groupMembersResponse.members || groupMembersResponse.members.length === 0) {
      console.error(`[ERROR] No members found in group ${args.groupId}`);
      throw new Error("No members found in the group");
    }
    
    console.log(`[DEBUG] Found ${groupMembersResponse.members.length} members in the group`);

    // 2. Get calendar events for each member with improved logging
    const memberEvents = await Promise.all(
      groupMembersResponse.members.map(async (member: GroupMember) => {
        console.log(`[DEBUG] Fetching calendar for member: ${member.userId}`);
        try {
          const events = await ctx.runAction(api.google.listGoogleCalendarEvents, {
            startDate: args.startDate,
            endDate: args.endDate,
            userId: member.userId
          });
          
          const memberName = member.name || member.userId;
          console.log(`[DEBUG] Retrieved ${events?.length || 0} events for member: ${memberName}`);
          
          // Log each event for this member for debugging
          if (events && events.length > 0) {
            events.forEach((event: any, index: number) => {
              const start = event.start?.dateTime || (event.start?.date ? new Date(event.start.date).toISOString() : 'unknown');
              const end = event.end?.dateTime || (event.end?.date ? new Date(event.end.date).toISOString() : 'unknown');
              console.log(`[DEBUG] Member ${memberName} Event ${index+1}: "${event.summary || 'Unnamed'}" from ${new Date(start).toLocaleString()} to ${new Date(end).toLocaleString()}`);
            });
          } else {
            console.log(`[WARN] No events found for member ${memberName} - this might indicate a calendar permission issue`);
          }
          
          return {
            userId: member.userId,
            userName: memberName,
            events: events || []
          };
        } catch (error) {
          console.error(`[ERROR] Failed to fetch events for member ${member.userId}:`, error);
          return {
            userId: member.userId,
            userName: member.name || member.userId,
            events: []
          };
        }
      })
    );

    // 3. Convert events to busy time slots with better logging
    console.log(`[DEBUG] Converting events to busy time slots`);
    const busySlots = memberEvents.flatMap((memberEvent: any) => {
      const events = memberEvent.events || [];
      return events.map((event: any) => {
        // Safely handle potentially undefined or missing properties
        const start = event.start?.dateTime || (event.start?.date ? new Date(event.start.date).toISOString() : '');
        const end = event.end?.dateTime || (event.end?.date ? new Date(event.end.date).toISOString() : '');
        
        if (!start || !end) {
          console.warn(`[WARN] Event for ${memberEvent.userName} has invalid dates: "${event.summary || 'Unnamed'}"`);
          return null;
        }
        
        // Create a busy slot with all relevant info
        return {
          userId: memberEvent.userId,
          userName: memberEvent.userName,
          eventSummary: event.summary || 'Unnamed event',
          start: new Date(start),
          end: new Date(end)
        };
      }).filter(Boolean); // Remove any null entries (events with invalid dates)
    });
    
    // Sort by start time for easier processing
    busySlots.sort((a: { start: Date }, b: { start: Date }) => a.start.getTime() - b.start.getTime());

    console.log(`[DEBUG] Generated ${busySlots.length} busy time slots across all members`);
    
    // Log all busy slots for debugging
    busySlots.forEach((slot: any, index: number) => {
      console.log(`[DEBUG] Busy slot ${index+1}: ${slot.userName} - "${slot.eventSummary}" from ${slot.start.toLocaleString()} to ${slot.end.toLocaleString()}`);
    });

    // 4. Find available time slots with more robust conflict detection
    const availableSlots = [];
    const startTime = new Date(args.startDate);
    const endTime = new Date(args.endDate);
    const durationMs = args.duration * 60 * 1000; // Convert minutes to milliseconds

    console.log(`[DEBUG] Finding available slots from ${startTime.toLocaleString()} to ${endTime.toLocaleString()}`);
    
    // Generate time slots in 30-minute increments
    let currentTime = new Date(startTime);
    let totalSlots = 0;
    let conflictingSlots = 0;

    // Group busy slots by user for easier conflict checking
    const userBusySlots: Record<string, Array<{start: Date, end: Date, eventSummary: string}>> = {};
    
    for (const busy of busySlots) {
      if (!userBusySlots[busy.userId]) {
        userBusySlots[busy.userId] = [];
      }
      userBusySlots[busy.userId].push({
        start: busy.start,
        end: busy.end,
        eventSummary: busy.eventSummary
      });
    }

    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + durationMs);
      totalSlots++;
      
      // Check if this time slot overlaps with ANY busy slots - if so, it's not available
      let hasConflict = false;
      const conflicts: Array<{
        userId: string;
        userName: string;
        eventSummary: string;
        conflictType: string;
      }> = [];
      
      // Check each user's busy slots for conflicts
      for (const userId in userBusySlots) {
        const userName = memberEvents.find((m: any) => m.userId === userId)?.userName || userId;
        
        for (const busy of userBusySlots[userId]) {
          // IMPROVED CONFLICT DETECTION - a slot conflicts if:
          // 1. The slot starts during a busy period
          // 2. The slot ends during a busy period
          // 3. The slot completely contains a busy period
          // 4. The busy period completely contains the slot
          
          const slotStartsDuringBusy = currentTime >= busy.start && currentTime < busy.end;
          const slotEndsDuringBusy = slotEnd > busy.start && slotEnd <= busy.end;
          const slotContainsBusy = currentTime <= busy.start && slotEnd >= busy.end;
          const busyContainsSlot = busy.start <= currentTime && busy.end >= slotEnd;
          
          if (slotStartsDuringBusy || slotEndsDuringBusy || slotContainsBusy || busyContainsSlot) {
            hasConflict = true;
            
            // Determine type of conflict for better debugging
            let conflictType = "unknown";
            if (slotStartsDuringBusy && slotEndsDuringBusy) conflictType = "slot_fully_inside_busy";
            else if (slotStartsDuringBusy) conflictType = "slot_starts_during_busy";
            else if (slotEndsDuringBusy) conflictType = "slot_ends_during_busy";
            else if (slotContainsBusy) conflictType = "slot_contains_busy";
            else if (busyContainsSlot) conflictType = "busy_contains_slot";
            
            conflicts.push({
              userId,
              userName,
              eventSummary: busy.eventSummary,
              conflictType
            });
            
            // For performance, break early once we know there's a conflict for this user
            break;
          }
        }
        
        // If this user has a conflict, we can move on to the next slot
        if (hasConflict && conflicts.length > 0) {
          break;
        }
      }
      
      // Only consider slots during reasonable hours (9 AM to 5 PM by default)
      const isBusinessHours = currentTime.getHours() >= 9 && currentTime.getHours() < 17;
      
      if (hasConflict) {
        conflictingSlots++;
        
        // Log conflicting slot with detailed information
        console.log(`[DEBUG] Slot ${currentTime.toLocaleString()} to ${slotEnd.toLocaleString()} has ${conflicts.length} conflicts:`);
        conflicts.forEach((conflict, idx) => {
          console.log(`  - ${idx+1}. ${conflict.userName}: "${conflict.eventSummary}" (conflict type: ${conflict.conflictType})`);
        });
      } else {
        // Log available slots
        console.log(`[DEBUG] ✓ Available slot: ${currentTime.toLocaleString()} to ${slotEnd.toLocaleString()}`);
        
        // Only include business hours slots unless specifically requested otherwise
        if (isBusinessHours) {
          availableSlots.push({
            start: new Date(currentTime),
            end: new Date(slotEnd)
          });
        } else {
          console.log(`[DEBUG] Slot outside business hours - not including in suggestions`);
        }
      }

      // Move to next 30-minute slot
      currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    console.log(`[DEBUG] Found ${availableSlots.length} available slots out of ${totalSlots} total slots (${conflictingSlots} had conflicts)`);
    
    // Format the available slots for better display
    const formattedSlots = availableSlots.map(slot => ({
      start: slot.start.toDateString(),
      end: slot.end.toDateString(),
      displayTime: `${formatTime(slot.start)} - ${formatTime(slot.end)} on ${formatDay(slot.start)}`
    }));

    return formattedSlots;
  }
});

// Helper function to format time (e.g., "2:30 PM")
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

// Helper function to format day (e.g., "Monday, April 21")
function formatDay(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}
