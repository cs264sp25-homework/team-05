import { v } from "convex/values";
import { internalAction, action } from "./_generated/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText, tool } from "ai";
import { api, internal } from "./_generated/api";
import { z } from "zod";
import { Id } from "./_generated/dataModel";

// export const createEventParams = z.object({
//   summary: z.string(),
//   startDate: z.string().date().describe("Has to be formatted as follows: '2025-04-04T11:02:00.000Z'"),
//   endDate: z.string().date().describe("Has to be formatted as follows: '2025-04-04T11:02:00.000Z'")
// })

let eventId = ""; //the event ID of the event found by findEvent

export const createEventParams = z.object({
  summary: z.string().describe("Like the title or name of the event" ),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.object({
    dateTime: z.string().describe("The start date must be in ISO format"),
  }),
  end: z.object({
    dateTime: z.string().describe("The end date must be later than the start date and in ISO format"),
  })
})

export const listEventsParams = z.object({
  startDate: z.string().describe("The start date in ISO format (e.g., '2025-04-04T00:00:00.000Z')"),
  endDate: z.string().describe("The end date in ISO format (e.g., '2025-04-05T00:00:00.000Z')"),
})

export const removeEventParams = z.object({
})

export const updateEventParams = z.object({
  summary: z.string().optional().describe("Like the title or name of the event"),
  description: z.string().optional(),
  location: z.string().optional(),
  start: z.object({
    dateTime: z.string().describe("The start date must be in ISO format"),
  }).optional(),
  end: z.object({
    dateTime: z.string().describe("The end date must be later than the start date and in ISO format"),
  }).optional(),
})

export const getSingleEventParams = z.object({
  startDate: z.string().describe("The start date in ISO format (e.g., '2025-04-04T00:00:00.000Z')"),
  endDate: z.string().describe("The end date in ISO format (e.g., '2025-04-05T00:00:00.000Z')"),
  message: z.string().describe("The user's query, e.g. 'the first event on April 8th'"),
})

export const findGroupAvailabilityParams = z.object({
  groupId: z.string().describe("The ID of the group to find availability for"),
  startDate: z.string().describe("The start date in ISO format (e.g., '2025-04-04T00:00:00.000Z')"),
  endDate: z.string().describe("The end date in ISO format (e.g., '2025-04-05T00:00:00.000Z')"),
});

// type EventIdParams = z.infer<typeof getSingleEventParams>





// export const createTaskParams = z.object({
//   summary: z.string(),
//   description: z.string(),
//   location: z.string().optional(),
//   startDate: z.string().date(),
//   endDate: z.string().date(),
//   priority: z.string()
// })

// export const getUserId = query({
//   args: {

//   },
//   handler: async(ctx, args) => {
//     const user_id = await ctx.auth.getUserIdentity();
//     if (!user_id) {
//       console.log("IN THE NEW FUNCTION IT IS NULL");
//     }

//     return user_id;
//   }
// })

export const findEvent = internalAction({
  args:{
    events: v.array(v.any()),
    message: v.string(),
  },
  handler: async(_, args) => {
    const instructions = `You are an expert at reading JSON objects to find relevant properties. You will be given a list of
    JSON objects corresponding to events from a user's calendar, as well as a query. Based on the query, determine the most
    relevant event, then respond with ONLY the id property of that event.`

    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      compatibility: "strict",
    }); 
    const response = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
            role: "system",
            content: instructions,
        },
        {
            role: "system",
            content: args.message,
        },
        {
            role: "system",
            content: JSON.stringify(args.events),
        }
      ]
    })
    return response.text;
  }
})

// Initialize OpenAI client
        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            compatibility: "strict",
          }); 

// Create a function to safely convert string to Id
function safelyConvertToGroupId(groupIdStr: string | undefined) {
  if (!groupIdStr) return undefined;
  
  try {
    // This is a runtime check to see if the string looks like a valid ID
    if (typeof groupIdStr === 'string' && groupIdStr.length > 8) {
      return groupIdStr as unknown as Id<"groups">;
    }
  } catch (error) {
    console.error(`[ERROR] Failed to convert groupId: ${groupIdStr}`, error);
  }
  return undefined;
}

// First, update the GroupAvailability interface to include startDate and endDate
interface GroupAvailability {
  members: Array<{
    userId: string;
    userName?: string;
    busyTimes: Array<{
      start: string;
      end: string;
      summary: string;
    }>;
    error?: string;
  }>;
  startDate?: string;
  endDate?: string;
}

// Create a standalone action for finding group availability
export const getGroupAvailability = internalAction({
  args: { 
    groupId: v.optional(v.string()),
    userId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(`[DEBUG] getGroupAvailability: Entering function for groupId: ${args.groupId || 'none'}`);
    
    try {
      // Validate and normalize date parameters
      let startDateObj, endDateObj;
      
      // Set defaults for missing dates - if not provided, use current date for start
      if (!args.startDate) {
        startDateObj = new Date();
        console.log(`[DEBUG] getGroupAvailability: No startDate provided, using current date: ${startDateObj.toISOString()}`);
      } else {
        startDateObj = new Date(args.startDate);
        if (isNaN(startDateObj.getTime())) {
          console.error(`[ERROR] getGroupAvailability: Invalid startDate format: ${args.startDate}`);
          startDateObj = new Date(); // Fall back to current date
        }
      }
      
      // If endDate not provided, use startDate + 1 day to ensure a reasonable time range
      if (!args.endDate) {
        endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + 1); // Add 1 day
        console.log(`[DEBUG] getGroupAvailability: No endDate provided, using startDate + 1 day: ${endDateObj.toISOString()}`);
      } else {
        endDateObj = new Date(args.endDate);
        if (isNaN(endDateObj.getTime())) {
          console.error(`[ERROR] getGroupAvailability: Invalid endDate format: ${args.endDate}`);
          endDateObj = new Date(startDateObj);
          endDateObj.setDate(endDateObj.getDate() + 1); // Fall back to startDate + 1 day
        }
      }
      
      // Ensure the endDate is after the startDate and they're not identical
      if (endDateObj <= startDateObj) {
        console.warn(`[WARN] getGroupAvailability: endDate (${endDateObj.toISOString()}) is not after startDate (${startDateObj.toISOString()})`);
        endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + 1); // Add 1 day to ensure proper range
      }
      
      // Calculate and log the time span for debugging
      const hoursDiff = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60);
      console.log(`[DEBUG] getGroupAvailability: Time span is ${hoursDiff.toFixed(1)} hours (${startDateObj.toISOString()} to ${endDateObj.toISOString()})`);
      
      // Format dates as ISO strings for API calls
      const startDate = startDateObj.toISOString();
      const endDate = endDateObj.toISOString();
      
      // The rest of the function remains the same
      const groupId = safelyConvertToGroupId(args.groupId);
      const userId = args.userId;
      
      // Get group members
      let groupMembersResponse;
      try {
        if (groupId) {
          console.log(`[DEBUG] getGroupAvailability: Fetching members for group ${groupId}`);
          groupMembersResponse = await ctx.runQuery(internal.groups.internalGetGroupMembers, {
            groupId: groupId,
          });
        } else if (userId) {
          console.log(`[DEBUG] getGroupAvailability: No groupId provided, using single user ${userId}`);
          // Just include the single user
          groupMembersResponse = {
            members: [{
              userId: userId,
              userName: userId,
            }]
          };
        } else {
          throw new Error("Either groupId or userId must be provided");
        }
        
        console.log(`[DEBUG] getGroupAvailability: Retrieved ${groupMembersResponse.members.length} members`);
      } catch (error) {
        console.error(`[ERROR] getGroupAvailability: Failed to fetch group members: ${error}`);
        throw new Error(`Failed to fetch group members: ${error}`);
      }
      
      if (!groupMembersResponse || !groupMembersResponse.members || groupMembersResponse.members.length === 0) {
        console.error("[ERROR] getGroupAvailability: No members found in group or invalid response");
        throw new Error("No members found in group");
      }
      
      const result: GroupAvailability = {
        members: []
      };
      
      // Fetch events for each member
      for (const member of groupMembersResponse.members) {
        console.log(`[DEBUG] getGroupAvailability: Fetching events for member ${member.userId}`);
        
        try {
          const events = await ctx.runAction(api.google.listGoogleCalendarEvents, {
            startDate: startDate,
            endDate: endDate,
            userId: member.userId,
          });
          
          if (events && Array.isArray(events)) {
            console.log(`[DEBUG] getGroupAvailability: User ${member.userId} has ${events.length} events in the specified time range`);
            
            // Map events to busy times
            const busyTimes = events.map(event => ({
              start: event?.start?.dateTime || "",
              end: event?.end?.dateTime || "",
              summary: event?.summary || "Busy",
            })).filter(busy => busy.start && busy.end); // Ensure we have valid start/end times
            
            result.members.push({
              userId: member.userId,
              userName: ('name' in member) ? member.name : member.userId,
              busyTimes: busyTimes,
            });
          } else {
            console.warn(`[WARN] getGroupAvailability: No valid events returned for user ${member.userId}`);
            result.members.push({
              userId: member.userId,
              userName: ('name' in member) ? member.name : member.userId,
              busyTimes: [],
              error: "No events found or error retrieving calendar",
            });
          }
        } catch (error) {
          console.error(`[ERROR] getGroupAvailability: Failed to fetch events for member ${member.userId}: ${error}`);
          result.members.push({
            userId: member.userId,
            userName: ('name' in member) ? member.name : member.userId,
            busyTimes: [],
            error: `Failed to fetch calendar: ${error}`,
          });
        }
      }
      
      // Add the date range to the result for context
      result.startDate = startDate;
      result.endDate = endDate;
      
      return result;
    } catch (error) {
      console.error(`[ERROR] getGroupAvailability: Unexpected error: ${error}`);
      throw error;
    }
  }
});

// Use the new action in the completion handler
export const completion = internalAction({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        groupId: v.optional(v.string()),
      })
    ),
    chatId: v.id("chats"),
    placeholderMessageId: v.id("messages"),
    user_id: v.optional(v.any()),
    groupId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const messages = args.messages;
    const lastMessage = messages[messages.length - 1];
    
    // Add explicit debug logging for group context
    console.log(`[DEBUG] openai.completion: Running with explicit groupId: ${args.groupId || 'none'}`);
    console.log(`[DEBUG] openai.completion: Last message groupId: ${lastMessage.groupId || 'none'}`);
    
    // Try to use the groupId, with special handling to ensure it's a valid ID
    const groupIdStr = args.groupId || lastMessage.groupId;
    const groupId = safelyConvertToGroupId(groupIdStr);

    console.log(`[DEBUG] openai.completion: Final resolved groupId: ${groupId || 'none'}`);

    // Create a system message that includes group context information
    let systemMessage = "You are a helpful AI assistant.";
    if (groupIdStr) {
      console.log(`[DEBUG] openai.completion: Creating group-aware system message for groupId: ${groupIdStr}`);
      // Make the instruction extremely clear and place it first
      systemMessage = `CRITICAL INSTRUCTION: You are an AI assistant inside a specific group chat with ID "${groupIdStr}". DO NOT ask for the group ID under any circumstances. You already have it. Use this ID (${groupIdStr}) implicitly for all group-related tasks like scheduling or checking availability.

      You have access to the calendars and availability of all group members within group "${groupIdStr}".
      - When users ask about availability or scheduling (e.g., "when is everyone free?", "schedule a meeting"), they are referring to this specific group ("${groupIdStr}").
      - Automatically use the group context ("${groupIdStr}") to check schedules and suggest times when all members are free.
      - When asked "what is the groupID?", respond with the exact group ID: "${groupIdStr}".
      - Respond as if you inherently know you are in this group chat.`;
    }

    // Check if the message is about creating an event or checking availability
    const availabilityKeywords = [
      "availability", "available", "free time", "when is everyone free", 
      "when can everyone meet", "when can we meet", "when are people free",
      "common time", "schedule", "find a time", "best time", "good time",
      "time slot", "time slots", "open slots", "free slot", "free slots",
      "calendar", "calendars", "when is the group free", "when can i make", 
      "when can we schedule", "what times", "what time"
    ];
    
    const eventCreationKeywords = [
      "create event", "schedule meeting", "set up meeting", "arrange meeting",
      "organize meeting", "book a meeting", "plan a meeting", "make a meeting",
      "add to calendar", "put on calendar", "schedule a", "create a", "set up a",
      "make a", "add a", "put a"
    ];
    
    // Check if this is specifically asking for the group ID
    const isGroupIdQuestion = /what('s| is) (the |our |this )?(group ?id|group id|groupid|group identity|group number)/i.test(lastMessage.content);
    
    if (isGroupIdQuestion && groupIdStr) {
      console.log(`[DEBUG] Detected direct question about group ID: ${groupIdStr}`);
      
      // Respond with a specific hardcoded response
      const directResponse = `I'm your assistant in group ${groupIdStr}. I can help coordinate schedules and find times when everyone is available. What would you like to know about the group's availability?`;
      
      const assistantResponse = {
        role: "assistant",
        content: directResponse,
        groupId: groupIdStr,
      };
      
      // Update the placeholder message with the assistant's response
      await ctx.runMutation(internal.messages.update, {
        messageId: args.placeholderMessageId,
        content: assistantResponse.content,
      });
      
      return assistantResponse;
    }
    
    // Enhanced date pattern detection for better recognition
    const datePatterns = [
      /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(next week|this week|coming week|upcoming week)/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{1,2}/i,
      /\d{1,2}(st|nd|rd|th)?(\s*of\s*(january|february|march|april|may|june|july|august|september|october|november|december))/i
    ];

    const hasDateReference = datePatterns.some(pattern => pattern.test(lastMessage.content));

    // Specifically check for "tomorrow" which should be handled specially
    const tomorrowPattern = /\b(tomorrow)\b/i;
    const hasTomorrowReference = tomorrowPattern.test(lastMessage.content);

    // Specifically improve detection for "next week" queries which are common
    const nextWeekPattern = /(next week|coming week|upcoming week)/i;
    const hasNextWeekReference = nextWeekPattern.test(lastMessage.content);

    // Check for responses to suggested time slots (accepting a time to create an event)
    const acceptTimePatterns = [
      /option (\d+)/i, 
      /time (\d+)/i, 
      /slot (\d+)/i, 
      /number (\d+)/i,
      /(\d+)(st|nd|rd|th) option/i,
      /(\d+)(st|nd|rd|th) time/i,
      /(\d+)(st|nd|rd|th) slot/i,
      /the (\d+)(st|nd|rd|th)/i,
      /choose (\d+)/i,
      /pick (\d+)/i,
      /select (\d+)/i,
      /use (\d+)/i,
      /^(\d+)$/
    ];

    const isAcceptingTimeSlot = acceptTimePatterns.some(pattern => 
      pattern.test(lastMessage.content.trim())
    ) && messages.length >= 2 && messages[messages.length - 2].role === "assistant" && 
      /would you like me to schedule|suggested time|time slot|available time/i.test(messages[messages.length - 2].content);

    // Stronger detection of availability requests with special handling for dates
    const isAvailabilityRequest = availabilityKeywords.some(keyword => 
      lastMessage.content.toLowerCase().includes(keyword.toLowerCase())
    ) || 
      (hasNextWeekReference && lastMessage.content.toLowerCase().includes("free")) ||
      (hasDateReference && (lastMessage.content.toLowerCase().includes("free") || 
       lastMessage.content.toLowerCase().includes("available") || 
       lastMessage.content.toLowerCase().includes("schedule")));

    // Look for event creation keywords in the message
    const hasEventCreationKeyword = eventCreationKeywords.some(keyword => 
      lastMessage.content.toLowerCase().includes(keyword.toLowerCase())
    );

    const isEventCreationRequest = hasEventCreationKeyword || isAcceptingTimeSlot;

    const isEventRequest = isAvailabilityRequest || isEventCreationRequest;

    // Special handling: if we see a specific date like "april 21" in the message,
    // treat it as an event request even without a valid groupId
    const isSpecificDateRequest = hasDateReference && (isAvailabilityRequest || hasEventCreationKeyword || isAcceptingTimeSlot);

    // More robust handling of event requests
    if ((isEventRequest && groupIdStr) || isSpecificDateRequest) {
      // Get group availability with better logging
      const effectiveGroupId = groupIdStr || "default-group";
      console.log(`[DEBUG] openai.completion: Handling event request with groupId: ${effectiveGroupId}`);
      console.log(`[DEBUG] openai.completion: Date detected: ${hasTomorrowReference ? "tomorrow" : (hasDateReference || hasNextWeekReference ? "yes" : "no")}`);
      
      // Immediately update the placeholder message to show we're working on it
      await ctx.runMutation(internal.messages.update, {
        messageId: args.placeholderMessageId,
        content: "I'm checking everyone's calendars to find when the group is free. This might take a few moments...",
      });
      
      const groupId = safelyConvertToGroupId(effectiveGroupId);
      
      if (!groupId) {
        await ctx.runMutation(internal.messages.update, {
          messageId: args.placeholderMessageId,
          content: "I'm sorry, but I couldn't process the group ID. Please try again or contact support.",
        });
        return {
          role: "assistant",
          content: "I'm sorry, but I couldn't process the group ID. Please try again or contact support.",
          groupId: effectiveGroupId
        };
      }
      
      // Prepare date range for availability check
      const now = new Date();
      let startDate, endDate;
      
      // Handle specifically tomorrow
      if (hasTomorrowReference) {
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        
        console.log(`[DEBUG] openai.completion: Tomorrow detected, setting date range to ${startDate.toISOString()} - ${endDate.toISOString()}`);
      }
      // Default to proper date range
      else {
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 7);
        endDate.setHours(23, 59, 59, 999);
      }
      
      // Get availability using the dedicated action with better error handling
      try {
        console.log(`[DEBUG] openai.completion: Calling getGroupAvailability for groupId: ${groupId}`);
        
        const availability = await ctx.runAction(internal.openai.getGroupAvailability, {
          groupId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
        
        console.log(`[DEBUG] openai.completion: getGroupAvailability returned with ${availability.members.length} members`);
      
      // Analyze the message for event constraints
      const eventConstraints = await analyzeEventConstraints(lastMessage.content);
        
        // Log the constraints
        console.log(`[DEBUG] Event constraints: ${JSON.stringify(eventConstraints)}`);
        
        // Ensure working hours are properly set (9am-5pm by default)
        if (eventConstraints.workingHourStart === undefined) {
          eventConstraints.workingHourStart = 9;
        }
        if (eventConstraints.workingHourEnd === undefined) {
          eventConstraints.workingHourEnd = 17;
        }
        
        // Explicitly handle time range from message if specified
        const timeRangePattern = /between\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:and|to|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
        const timeRangeMatch = lastMessage.content.match(timeRangePattern);
        
        if (timeRangeMatch) {
          // Extract start hour and AM/PM
          let startHour = parseInt(timeRangeMatch[1]);
          const startMinutes = timeRangeMatch[2] ? parseInt(timeRangeMatch[2]) : 0;
          const startAmPm = timeRangeMatch[3]?.toLowerCase();
          
          // Extract end hour and AM/PM
          let endHour = parseInt(timeRangeMatch[4]);
          const endMinutes = timeRangeMatch[5] ? parseInt(timeRangeMatch[5]) : 0;
          const endAmPm = timeRangeMatch[6]?.toLowerCase();
          
          // Convert to 24-hour format if PM
          if (startAmPm === 'pm' && startHour < 12) startHour += 12;
          if (startAmPm === 'am' && startHour === 12) startHour = 0;
          if (endAmPm === 'pm' && endHour < 12) endHour += 12;
          if (endAmPm === 'am' && endHour === 12) endHour = 0;
          
          // Set the working hours explicitly
          eventConstraints.workingHourStart = startHour + (startMinutes / 60);
          eventConstraints.workingHourEnd = endHour + (endMinutes / 60);
          
          console.log(`[DEBUG] Explicit time range detected: ${eventConstraints.workingHourStart} to ${eventConstraints.workingHourEnd}`);
        }
        
        // Log raw availability data for debugging
        console.log(`[DEBUG] Group availability: ${availability.members.length} members found`);
        availability.members.forEach((member: any, idx: number) => {
          console.log(`[DEBUG] Member ${idx+1}: ${member.userName || member.userId} has ${member.busyTimes?.length || 0} busy periods`);
          
          if (member.busyTimes && member.busyTimes.length > 0) {
            member.busyTimes.forEach((busy: any, busyIdx: number) => {
              console.log(`[DEBUG] - Event ${busyIdx+1}: "${busy.summary || 'Unnamed'}" from ${new Date(busy.start).toLocaleString()} to ${new Date(busy.end).toLocaleString()}`);
            });
          } else {
            console.log(`[DEBUG] - No busy periods found for this member`);
          }
        });
      
      // Find suitable times based on availability and constraints
      const suggestedTimes = findSuitableTimes(availability, eventConstraints);
      console.log(`[DEBUG] openai.completion: Found ${suggestedTimes.length} suitable time slots`);
        
        // Double-check that these are really available times
        if (suggestedTimes.length > 0) {
          console.log(`[DEBUG] First suggested time: ${new Date(suggestedTimes[0].start).toLocaleString()} to ${new Date(suggestedTimes[0].end).toLocaleString()}`);
          console.log(`[DEBUG] Last suggested time: ${new Date(suggestedTimes[suggestedTimes.length-1].start).toLocaleString()} to ${new Date(suggestedTimes[suggestedTimes.length-1].end).toLocaleString()}`);
          
          // Verify these times don't overlap with any busy periods
          availability.members.forEach((member: any) => {
            if (member.busyTimes && member.busyTimes.length > 0) {
              for (const time of suggestedTimes.slice(0, 3)) { // Check first few times
                const timeStart = new Date(time.start);
                const timeEnd = new Date(time.end);
                
                for (const busy of member.busyTimes) {
                  const busyStart = new Date(busy.start);
                  const busyEnd = new Date(busy.end);
                  
                  // Check for overlap
                  if (timeStart < busyEnd && timeEnd > busyStart) {
                    console.error(`[ERROR] CONFLICT DETECTED: Suggested time ${timeStart.toLocaleString()} - ${timeEnd.toLocaleString()} overlaps with ${member.userName || member.userId}'s event "${busy.summary || 'Unnamed'}" (${busyStart.toLocaleString()} - ${busyEnd.toLocaleString()})`);
                  }
                }
              }
            }
          });
        }
      
      // Create a response with suggested times
      const response = formatEventSuggestions(suggestedTimes, eventConstraints);
      
      const assistantResponse = {
        role: "assistant",
        content: response,
          groupId: effectiveGroupId,
      };

      // Update the placeholder message with the assistant's response
            await ctx.runMutation(internal.messages.update, {
                messageId: args.placeholderMessageId,
        content: assistantResponse.content,
      });

      return assistantResponse;
      } catch (error) {
        console.error(`[ERROR] openai.completion: Failed to check availability: ${error}`);
        const errorMessage = `I encountered an error while checking the group's availability. This might be because some members haven't connected their calendars or due to a technical issue. Please try again later or contact support if the issue persists.`;
        
        await ctx.runMutation(internal.messages.update, {
          messageId: args.placeholderMessageId,
          content: errorMessage,
        });
        
        return {
          role: "assistant",
          content: errorMessage,
          groupId: effectiveGroupId,
        };
      }
    }

    // If we're looking for availability next week, set up default dates
    if (hasNextWeekReference) {
      console.log("[DEBUG] Detected next week availability query");
      
      // Immediately update the placeholder message to show we're working on it
      await ctx.runMutation(internal.messages.update, {
        messageId: args.placeholderMessageId,
        content: "I'm checking everyone's calendars for next week to find when the group is free. This might take a few moments...",
      });
    }

    // Regular chat completion for non-event messages, but with group context
    const completionMessages = messages.map(({ role, content }) => {
      return {
        role: role as "user" | "assistant" | "system",
        content
      };
    });
    
    // Always insert the system message at the beginning
    completionMessages.unshift({
      role: "system" as const,
      content: systemMessage
    });
    
    // Add an explicit reminder about the group context for the most recent message
    if (groupId && messages.length > 0) {
      // Add a reminder about the group context right before the last message
      completionMessages.splice(completionMessages.length - 1, 0, {
        role: "system" as const,
        content: `Remember: You are in group chat ${groupId}. The following message is from a user in this group.`
      });
    }
    
    console.log(`[DEBUG] Final messages array before non-event completion call: ${JSON.stringify(completionMessages.map(m => ({ role: m.role, content: m.content.substring(0, 100) + (m.content.length > 100 ? '...' : '') })))}`);

    const completion = await generateText({
      model: openai('gpt-3.5-turbo'),
      messages: completionMessages,
      temperature: 0.7,
    });
    
    // Log the response from OpenAI for debugging
    console.log(`[DEBUG] OpenAI response text: ${completion.text.substring(0, 100)}...`);

    const assistantResponse = {
      role: "assistant",
      content: completion.text ?? "",
      groupId,
    };

    // Update the placeholder message with the assistant's response
          await ctx.runMutation(internal.messages.update, {
            messageId: args.placeholderMessageId,
      content: assistantResponse.content,
    });

    return assistantResponse;
  },
});

// Helper function to analyze event constraints from message
async function analyzeEventConstraints(message: string): Promise<{
  date: string | null;
  duration: number;
  workingHourStart: number;
  workingHourEnd: number;
  description: string;
}> {
  try {
    console.log(`[DEBUG] analyzeEventConstraints: Analyzing message: "${message}"`);
    
    // Current date information
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // Enhanced date patterns
    const specificDatePattern = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(st|nd|rd|th)?\b/i;
    const todayPattern = /\b(today)\b/i;
    const tomorrowPattern = /\b(tomorrow)\b/i;
    const weekdayPattern = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const relativePattern = /\b(this|next)\s+(week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    
    // Time range patterns - IMPROVED to catch more variations
    const timeRangePattern = /\b(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?\s*(?:-|to|until|–|and|through|from)\s*(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?\b/i;
    const timeRangeWithBetweenPattern = /between\s+(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?\s*(?:and|to|-)\s*(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?/i;
    const timeOfDayPattern = /\b(morning|afternoon|evening|night)\b/i;
    
    // Improved handling for phrases like "9AM to 5PM"
    const simpleTimeRangePattern = /\b(\d{1,2})\s*(am|pm)\s*(?:to|and|-)\s*(\d{1,2})\s*(am|pm)\b/i;
    
    // Duration pattern
    const durationPattern = /(\d+)[ -]?(min|minute|minutes|hour|hr|hours)/i;
    const durationMatch = message.match(durationPattern);
    let duration = 60; // Default to 60 minutes
    
    if (durationMatch) {
      duration = parseInt(durationMatch[1]);
      // Convert hours to minutes if needed
      if (durationMatch[2].startsWith('hour') || durationMatch[2].startsWith('hr')) {
        duration *= 60;
      }
    }
    
    console.log(`[DEBUG] analyzeEventConstraints: Detected duration: ${duration} minutes`);
    
    // Create default constraints with standard business hours (9am-5pm)
    const defaultConstraints = {
      date: null,
      duration: duration,
      workingHourStart: 9,
      workingHourEnd: 17,
      description: "Meeting"
    };
    
    // Determine date
    let targetDate = null;
    let dateDescription = "Meeting";
    
    // Check for specific dates like "April 21st"
    const specificDateMatch = message.match(specificDatePattern);
    if (specificDateMatch) {
      const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
      const monthIndex = monthNames.findIndex(m => m.toLowerCase() === specificDateMatch[1].toLowerCase());
      const day = parseInt(specificDateMatch[2]);
      
      if (monthIndex !== -1 && day > 0 && day <= 31) {
        targetDate = new Date(currentYear, monthIndex, day);
        
        // If the date is in the past, assume next year
        if (targetDate < now && monthIndex < currentMonth) {
          targetDate.setFullYear(currentYear + 1);
        }
        
        dateDescription = `Meeting on ${monthNames[monthIndex].charAt(0).toUpperCase() + monthNames[monthIndex].slice(1)} ${day}`;
        console.log(`[DEBUG] Detected specific date: ${targetDate.toISOString()}`);
      }
    }
    // Check for "today"
    else if (todayPattern.test(message)) {
      targetDate = new Date(currentYear, currentMonth, currentDay);
      dateDescription = "Meeting today";
      console.log(`[DEBUG] Detected today: ${targetDate.toISOString()}`);
    }
    // Check for "tomorrow"
    else if (tomorrowPattern.test(message)) {
      targetDate = new Date(currentYear, currentMonth, currentDay);
      targetDate.setDate(targetDate.getDate() + 1);
      dateDescription = "Meeting tomorrow";
      console.log(`[DEBUG] Detected tomorrow: ${targetDate.toISOString()}`);
    }
    // Check for "next week"
    else if (/next week/i.test(message)) {
      targetDate = new Date(currentYear, currentMonth, currentDay);
      targetDate.setDate(targetDate.getDate() + 7);
      dateDescription = "Meeting next week";
      console.log(`[DEBUG] Detected next week: ${targetDate.toISOString()}`);
    }
    // Check for "this week"
    else if (/this week/i.test(message)) {
      targetDate = new Date(currentYear, currentMonth, currentDay);
      dateDescription = "Meeting this week";
      console.log(`[DEBUG] Detected this week: ${targetDate.toISOString()}`);
    }
    // Check for specific weekday
    else {
      const weekdayMatch = message.match(weekdayPattern);
      if (weekdayMatch) {
        const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const targetDay = weekdays.findIndex(d => d.toLowerCase() === weekdayMatch[1].toLowerCase());
        
        if (targetDay !== -1) {
          targetDate = new Date(currentYear, currentMonth, currentDay);
          const currentDayOfWeek = targetDate.getDay();
          let daysToAdd = targetDay - currentDayOfWeek;
          
          // If the day is already past this week, go to next week
          if (daysToAdd <= 0) {
            daysToAdd += 7;
          }
          
          // Check if "next" is specified before the weekday
          if (/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(message)) {
            daysToAdd += 7;
          }
          
          targetDate.setDate(targetDate.getDate() + daysToAdd);
          dateDescription = `Meeting on ${weekdayMatch[1].charAt(0).toUpperCase() + weekdayMatch[1].slice(1)}`;
          console.log(`[DEBUG] Detected weekday: ${targetDate.toISOString()}`);
        }
      }
    }
    
    // Determine time range with improved detection
    let workingHourStart = 9; // Default to business hours
    let workingHourEnd = 17;
    
    // Check different time range patterns in order of specificity
    
    // 1. Check for "between X and Y" first (most explicit)
    const betweenTimeMatch = message.match(timeRangeWithBetweenPattern);
    if (betweenTimeMatch) {
      console.log(`[DEBUG] Found 'between X and Y' time pattern: ${betweenTimeMatch[0]}`);
      
      let startHour = parseInt(betweenTimeMatch[1]);
      const startMinute = betweenTimeMatch[2] ? parseInt(betweenTimeMatch[2]) : 0;
      const startAmPm = betweenTimeMatch[3]?.toLowerCase();
      
      let endHour = parseInt(betweenTimeMatch[4]);
      const endMinute = betweenTimeMatch[5] ? parseInt(betweenTimeMatch[5]) : 0;
      const endAmPm = betweenTimeMatch[6]?.toLowerCase();
      
      // Convert to 24-hour format if AM/PM specified
      if (startAmPm === 'pm' && startHour < 12) startHour += 12;
      if (startAmPm === 'am' && startHour === 12) startHour = 0;
      if (endAmPm === 'pm' && endHour < 12) endHour += 12;
      if (endAmPm === 'am' && endHour === 12) endHour = 0;
      
      // If no AM/PM is specified, apply some heuristics
      if (!startAmPm && !endAmPm) {
        // If hours are reasonable business hours like 9-5
        if (startHour < 12 && endHour <= 12) {
          // Assume 9 means 9 AM, 5 means 5 PM
          if (endHour < startHour) {
            endHour += 12;  // e.g., 9 to 5 means 9 AM to 5 PM
          }
        }
      }
      
      workingHourStart = startHour + (startMinute / 60);
      workingHourEnd = endHour + (endMinute / 60);
      
      console.log(`[DEBUG] Resolved time range from 'between' pattern: ${workingHourStart} to ${workingHourEnd}`);
    }
    // 2. Check for simple "X AM to Y PM" pattern
    else if (simpleTimeRangePattern.test(message)) {
      const simpleMatch = message.match(simpleTimeRangePattern);
      console.log(`[DEBUG] Found simple time range: ${simpleMatch?.[0]}`);
      
      if (simpleMatch) {
        let startHour = parseInt(simpleMatch[1]);
        const startAmPm = simpleMatch[2].toLowerCase();
        
        let endHour = parseInt(simpleMatch[3]);
        const endAmPm = simpleMatch[4].toLowerCase();
        
        // Convert to 24-hour format
        if (startAmPm === 'pm' && startHour < 12) startHour += 12;
        if (startAmPm === 'am' && startHour === 12) startHour = 0;
        if (endAmPm === 'pm' && endHour < 12) endHour += 12;
        if (endAmPm === 'am' && endHour === 12) endHour = 0;
        
        workingHourStart = startHour;
        workingHourEnd = endHour;
        
        console.log(`[DEBUG] Resolved simple time range: ${workingHourStart} to ${workingHourEnd}`);
      }
    }
    // 3. Check for regular time range pattern
    else if (timeRangePattern.test(message)) {
      const timeRangeMatch = message.match(timeRangePattern);
      console.log(`[DEBUG] Found time range pattern: ${timeRangeMatch?.[0]}`);
      
      if (timeRangeMatch) {
        let startHour = parseInt(timeRangeMatch[1]);
        const startMinute = timeRangeMatch[2] ? parseInt(timeRangeMatch[2]) : 0;
        const startAmPm = timeRangeMatch[3]?.toLowerCase();
        
        let endHour = parseInt(timeRangeMatch[4]);
        const endMinute = timeRangeMatch[5] ? parseInt(timeRangeMatch[5]) : 0;
        const endAmPm = timeRangeMatch[6]?.toLowerCase();
        
        // Convert to 24-hour format
        if (startAmPm === 'pm' && startHour < 12) startHour += 12;
        if (startAmPm === 'am' && startHour === 12) startHour = 0;
        if (endAmPm === 'pm' && endHour < 12) endHour += 12;
        if (endAmPm === 'am' && endHour === 12) endHour = 0;
        
        // If no AM/PM specified, apply heuristics for business hours
        if (!startAmPm && !endAmPm) {
          if (startHour < 12 && endHour < 12 && endHour <= startHour) {
            endHour += 12; // Assume 9-5 means 9 AM - 5 PM
          }
        }
        
        workingHourStart = startHour + (startMinute / 60);
        workingHourEnd = endHour + (endMinute / 60);
        
        console.log(`[DEBUG] Resolved regular time range: ${workingHourStart} to ${workingHourEnd}`);
      }
    }
    // 4. Check for time of day references as fallback
    else {
      const timeOfDayMatch = message.match(timeOfDayPattern);
      if (timeOfDayMatch) {
        const timeOfDay = timeOfDayMatch[1].toLowerCase();
        
        if (timeOfDay === 'morning') {
          workingHourStart = 8;
          workingHourEnd = 12;
        } else if (timeOfDay === 'afternoon') {
          workingHourStart = 12;
          workingHourEnd = 17;
        } else if (timeOfDay === 'evening') {
          workingHourStart = 17;
          workingHourEnd = 22;
        } else if (timeOfDay === 'night') {
          workingHourStart = 19;
          workingHourEnd = 23;
        }
        
        console.log(`[DEBUG] Detected time of day: ${timeOfDay}, hours ${workingHourStart} to ${workingHourEnd}`);
      }
    }
    
    // Validate time range - make sure end is after start
    if (workingHourEnd <= workingHourStart) {
      console.warn(`[WARN] Invalid time range: ${workingHourStart} to ${workingHourEnd}, resetting to defaults`);
      workingHourStart = 9;
      workingHourEnd = 17;
    }
    
    // Log final constraints
    const result = {
      ...defaultConstraints,
      date: targetDate ? targetDate.toISOString() : null,
      workingHourStart,
      workingHourEnd,
      duration,
      description: dateDescription
    };
    
    console.log(`[DEBUG] Final constraints:`, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("Error analyzing constraints:", error);
    return {
      date: null,
      duration: 60,
      workingHourStart: 9, 
      workingHourEnd: 17,
      description: "Meeting"
    };
  }
}

// Define interfaces for better type safety
interface AvailabilityData {
  members: Array<{
    userId: string;
    userName?: string;
    busyTimes: Array<{
      start: string;
      end: string;
      summary: string;
    }>;
    error?: string;
  }>;
  startDate?: string;
  endDate?: string;
}

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
  conflicts: Array<{
    userId: string;
    userName: string;
    eventSummary: string;
    eventStart: string;
    eventEnd: string;
  }>;
  index: number;
  displayTime?: string;
}

interface EventConstraints {
  date: string | null;
  duration: number;
  workingHourStart: number;
  workingHourEnd: number;
  description: string;
}

// Now update the findSuitableTimes function to handle the date range properly
function findSuitableTimes(availability: AvailabilityData, constraints: EventConstraints): TimeSlot[] {
  console.log(`[DEBUG] findSuitableTimes: Entering function with availability data for ${availability.members?.length || 0} members`);
  
  if (!availability.members || availability.members.length === 0) {
    console.error("[ERROR] findSuitableTimes: No members provided in availability data");
    return [];
  }
  
  console.log(`[DEBUG] findSuitableTimes: Processing availability for ${availability.members.length} members`);
  
  // Ensure we have valid date range - critical bug fix
  if (!availability.startDate || !availability.endDate) {
    console.error("[ERROR] findSuitableTimes: Missing start or end date in availability data");
    return [];
  }
  
  const startDate = new Date(availability.startDate);
  const endDate = new Date(availability.endDate);
  
  // Validate the date range
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.error(`[ERROR] findSuitableTimes: Invalid date format - start: ${availability.startDate}, end: ${availability.endDate}`);
    return [];
  }
  
  // Check if dates are the same - this was the critical bug
  if (startDate.getTime() === endDate.getTime()) {
    console.error(`[ERROR] findSuitableTimes: Start and end dates are identical: ${startDate.toISOString()}`);
    // Fix by extending the end date by 1 day
    endDate.setDate(endDate.getDate() + 1);
    console.log(`[DEBUG] findSuitableTimes: Extended end date to ${endDate.toISOString()}`);
  }
  
  console.log(`[DEBUG] findSuitableTimes: Generating slots between ${startDate.toISOString()} and ${endDate.toISOString()}`);
  console.log(`[DEBUG] findSuitableTimes: Working hours ${constraints.workingHourStart}:00 to ${constraints.workingHourEnd}:00, duration ${constraints.duration} minutes`);
  
  // Create a map of user busy times for easier conflict checking
  const userBusyTimes: Record<string, Array<{start: Date, end: Date, summary: string}>> = {};
  
  // Process each member's busy times
  let totalBusyPeriods = 0;
  
  for (const member of availability.members) {
    console.log(`[DEBUG] Processing events for member: ${member.userId}`);
    
    if (!member.busyTimes || member.busyTimes.length === 0) {
      console.log(`[DEBUG] Member ${member.userId} has no busy periods`);
      continue;
    }
    
    console.log(`[DEBUG] Member ${member.userId} has ${member.busyTimes.length} busy periods`);
    userBusyTimes[member.userId] = [];
    
    for (const busy of member.busyTimes) {
      if (!busy.start || !busy.end) {
        console.warn(`[WARN] Skipping invalid busy period for ${member.userId}: missing start/end time`);
        continue;
      }
      
      try {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        
        if (isNaN(busyStart.getTime()) || isNaN(busyEnd.getTime())) {
          console.warn(`[WARN] Skipping invalid busy period for ${member.userId}: invalid date format`);
          continue;
        }
        
        userBusyTimes[member.userId].push({
          start: busyStart,
          end: busyEnd,
          summary: busy.summary || "Busy"
        });
        
        console.log(`[DEBUG] Added busy period for ${member.userId}: "${busy.summary}" from ${busyStart.toLocaleString()} to ${busyEnd.toLocaleString()}`);
        totalBusyPeriods++;
      } catch (error) {
        console.error(`[ERROR] Error processing busy period for ${member.userId}: ${error}`);
      }
    }
  }
  
  console.log(`[DEBUG] findSuitableTimes: Collected ${totalBusyPeriods} busy periods from all members`);
  
  // Generate time slots to check
  const timeSlots: TimeSlot[] = [];
  const durationMs = constraints.duration * 60 * 1000; // Convert minutes to milliseconds
  const slotIntervalMs = 30 * 60 * 1000; // 30-minute intervals
  
  // Start from the beginning of the day for startDate
  const slotStart = new Date(startDate);
  slotStart.setHours(constraints.workingHourStart, 0, 0, 0);
  
  // If startDate is already past the working hours start, adjust to current time
  if (startDate.getHours() > constraints.workingHourStart || 
      (startDate.getHours() === constraints.workingHourStart && startDate.getMinutes() > 0)) {
    slotStart.setHours(startDate.getHours(), startDate.getMinutes(), 0, 0);
  }
  
  let slotIndex = 0;
  let totalSlotsChecked = 0;
  let conflictingSlotsCount = 0;
  
  // For each day in the range
  let currentDay = new Date(slotStart);
  while (currentDay < endDate) {
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(constraints.workingHourEnd, 0, 0, 0);
    
    // For each slot in the day
    let slotTime = new Date(currentDay);
    while (slotTime < dayEnd && slotTime < endDate) {
      const slotEndTime = new Date(slotTime.getTime() + durationMs);
      totalSlotsChecked++;
      
      // Check if slot is within working hours
      const hour = slotTime.getHours();
      if (hour < constraints.workingHourStart || hour >= constraints.workingHourEnd) {
        console.log(`[DEBUG] Slot ${slotIndex + 1}: ${slotTime.toLocaleString()} - ${slotEndTime.toLocaleString()} is outside working hours (${constraints.workingHourStart}:00-${constraints.workingHourEnd}:00)`);
        slotTime = new Date(slotTime.getTime() + slotIntervalMs);
        continue;
      }
      
      // Check for conflicts with any member's busy times
      const conflicts: Array<{
        userId: string;
        userName: string;
        eventSummary: string;
        eventStart: string;
        eventEnd: string;
      }> = [];
      
      // Check each user's busy times for conflicts
      for (const userId in userBusyTimes) {
        const userName = availability.members.find(m => m.userId === userId)?.userName || userId;
        
        for (const busy of userBusyTimes[userId]) {
          // ENHANCED CONFLICT LOGIC:
          // A slot conflicts if:
          // 1. The slot starts during a busy period
          // 2. The slot ends during a busy period
          // 3. The slot completely contains a busy period
          // 4. The busy period completely contains the slot
          // 5. The slot starts or ends within 15 minutes of a busy period (buffer)
          
          const slotStartsDuringBusy = slotTime >= busy.start && slotTime < busy.end;
          const slotEndsDuringBusy = slotEndTime > busy.start && slotEndTime <= busy.end;
          const slotContainsBusy = slotTime <= busy.start && slotEndTime >= busy.end;
          const busyContainsSlot = busy.start <= slotTime && busy.end >= slotEndTime;
          
          // Add buffer checks - 15 minutes before or after a busy period
          const bufferMs = 15 * 60 * 1000; // 15 minutes in milliseconds
          const slotStartsJustBeforeBusy = slotTime < busy.start && slotEndTime.getTime() > busy.start.getTime() - bufferMs;
          const slotEndsJustAfterBusy = slotEndTime > busy.end && slotTime.getTime() < busy.end.getTime() + bufferMs;
          
          if (slotStartsDuringBusy || slotEndsDuringBusy || slotContainsBusy || busyContainsSlot || 
              slotStartsJustBeforeBusy || slotEndsJustAfterBusy) {
            conflicts.push({
              userId,
              userName,
              eventSummary: busy.summary,
              eventStart: busy.start.toISOString(),
              eventEnd: busy.end.toISOString()
            });
            
            // Record conflict type for better debugging
            let conflictType = "";
            if (slotStartsDuringBusy) conflictType += "start_during_busy ";
            if (slotEndsDuringBusy) conflictType += "end_during_busy ";
            if (slotContainsBusy) conflictType += "contains_busy ";
            if (busyContainsSlot) conflictType += "within_busy ";
            if (slotStartsJustBeforeBusy) conflictType += "starts_just_before_busy ";
            if (slotEndsJustAfterBusy) conflictType += "ends_just_after_busy ";
            
            console.log(`[DEBUG] Conflict for ${userName}: "${busy.summary}" (${conflictType.trim()}) ${busy.start.toLocaleString()} - ${busy.end.toISOString()}`);
            
            // Break early once we find a conflict for this user
            break;
          }
        }
      }
      
      // Create a TimeSlot object and add to our list
      const timeSlot: TimeSlot = {
        start: slotTime.toISOString(),
        end: slotEndTime.toISOString(),
        available: conflicts.length === 0,
        conflicts,
        index: slotIndex++,
        displayTime: `${formatTime(slotTime)} - ${formatTime(slotEndTime)} on ${formatDate(slotTime)}`
      };
      
      if (conflicts.length > 0) {
        conflictingSlotsCount++;
        console.log(`[DEBUG] Slot ${slotIndex}: ${timeSlot.displayTime} has ${conflicts.length} conflicts`);
      } else {
        console.log(`[DEBUG] ✓ Slot ${slotIndex}: ${timeSlot.displayTime} is AVAILABLE`);
      }
      
      timeSlots.push(timeSlot);
      
      // Move to the next slot interval
      slotTime = new Date(slotTime.getTime() + slotIntervalMs);
    }
    
    // Move to the next day
    currentDay.setDate(currentDay.getDate() + 1);
    currentDay.setHours(constraints.workingHourStart, 0, 0, 0);
  }
  
  console.log(`[DEBUG] findSuitableTimes: Found ${timeSlots.filter(s => s.available).length} available slots out of ${timeSlots.length} total slots (${conflictingSlotsCount} had conflicts)`);
  
  // Log busy times for each user
  for (const userId in userBusyTimes) {
    console.log(`[DEBUG] Busy times for user ${userId}:`);
    userBusyTimes[userId].forEach(busy => {
      console.log(`  - ${busy.summary}: ${busy.start.toLocaleString()} to ${busy.end.toLocaleString()}`);
    });
  }

  // Log suggested timeslots
  console.log(`[DEBUG] Suggested timeslots:`);
  timeSlots.forEach(slot => {
    console.log(`  - ${slot.displayTime}: ${slot.available ? 'AVAILABLE' : 'CONFLICTS'}`);
    if (!slot.available) {
      slot.conflicts.forEach(conflict => {
        console.log(`    Conflict with ${conflict.userName}: ${conflict.eventSummary} from ${conflict.eventStart} to ${conflict.eventEnd}`);
      });
    }
  });
  
  // Return available slots first, sorted by start time
  return timeSlots.sort((a, b) => {
    // First sort by availability (available slots first)
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    
    // Then sort by start time
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

// Helper function to format a slot for display
function formatSlot(slot: TimeSlot): TimeSlot {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      
      return {
        start: slot.start,
        end: slot.end,
    available: true, // Explicitly mark as available
    conflicts: [], // Explicitly set empty conflicts array
    index: slot.index,
        displayTime: `${formatTime(start)} - ${formatTime(end)} on ${formatDate(start)}`
      };
}

// Helper function to format time (e.g., "2:30 PM") - improved for consistent formats
function formatTime(date: Date): string {
  // Use the en-US locale for consistent 12-hour AM/PM format
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}

// Helper function to format date (e.g., "Monday, April 21")
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}

// Helper function to format event suggestions into a user-friendly response
function formatEventSuggestions(suggestedTimes: TimeSlot[], constraints?: EventConstraints): string {
  console.log(`[DEBUG] formatEventSuggestions: Received ${suggestedTimes?.length || 0} suggested times`);
  
  // Log the constraints
  console.log(`[DEBUG] formatEventSuggestions: Constraints:`, JSON.stringify(constraints || {}, null, 2));
  
  // CRITICAL: Double-check that none of the suggested times have conflicts
  console.log(`[DEBUG] formatEventSuggestions: Filtering for truly available times...`);
  const trulyAvailableTimes = suggestedTimes.filter(time => {
    const startTime = new Date(time.start);
    const endTime = new Date(time.end);
    
    // Only include times that have been explicitly marked as available with no conflicts
    if (!time.available && time.available !== undefined) {
      console.log(`[DEBUG] Filtering out time ${startTime.toLocaleString()} - ${endTime.toLocaleString()} because it has conflicts`);
      return false;
    }
    
    // Additional safety check for any conflicts field
    if (time.conflicts && time.conflicts.length > 0) {
      console.log(`[DEBUG] Filtering out time ${startTime.toLocaleString()} - ${endTime.toLocaleString()} because it has ${time.conflicts.length} conflicts`);
      return false;
    }
    
    // Additional verification: log all available times for confirmation
    console.log(`[DEBUG] AVAILABLE TIME: ${startTime.toLocaleString()} - ${endTime.toLocaleString()}`);
    
    return true;
  });
  
  // Triple-check: manually examine each suggested time against all conflicts again
  const finalAvailableTimes = [];
  for (const time of trulyAvailableTimes) {
    const timeStart = new Date(time.start);
    const timeEnd = new Date(time.end);
    let hasConflicts = false;
    
    // Log each time we're verifying
    console.log(`[DEBUG] VERIFYING TIME: ${timeStart.toLocaleString()} - ${timeEnd.toLocaleString()}`);
    
    // Look through all suggested times that were marked as having conflicts
    for (const conflictingTime of suggestedTimes.filter(t => !t.available)) {
      if (conflictingTime.conflicts && conflictingTime.conflicts.length > 0) {
        for (const conflict of conflictingTime.conflicts) {
          const conflictStart = new Date(conflict.eventStart);
          const conflictEnd = new Date(conflict.eventEnd);
          
          // Check if our "available" time might overlap with a known conflict period
          if ((timeStart <= conflictEnd && timeEnd >= conflictStart) ||
              (Math.abs(timeStart.getTime() - conflictStart.getTime()) < 60 * 60 * 1000) || // Within an hour
              (Math.abs(timeEnd.getTime() - conflictEnd.getTime()) < 60 * 60 * 1000)) {     // Within an hour
            
            console.log(`[DEBUG] CONFLICT DETECTED: ${timeStart.toLocaleString()} - ${timeEnd.toLocaleString()} conflicts with ${conflict.eventSummary} (${conflictStart.toLocaleString()} - ${conflictEnd.toLocaleString()})`);
            hasConflicts = true;
            break;
          }
        }
        if (hasConflicts) break;
      }
    }
    
    if (!hasConflicts) {
      console.log(`[DEBUG] CONFIRMED AVAILABLE: ${timeStart.toLocaleString()} - ${timeEnd.toLocaleString()}`);
      finalAvailableTimes.push(time);
    }
  }
  
  console.log(`[DEBUG] formatEventSuggestions: After strict filtering, ${trulyAvailableTimes.length} truly available times remain`);
  console.log(`[DEBUG] formatEventSuggestions: After additional verification, ${finalAvailableTimes.length} final available times remain`);
  
  // Handle case with no suggested times
  if (!finalAvailableTimes || finalAvailableTimes.length === 0) {
    const specificDate = constraints?.date ? formatDate(new Date(constraints.date)) : "the specified date";
    
    return `I've checked for available times on ${specificDate}, but I couldn't find any times when everyone in the group is free.

This means at least one person has a calendar conflict during every possible time slot. This could be because:
1. Group members have overlapping commitments throughout the day
2. Some members don't have their calendars connected properly
3. The time range or working hours might be too restrictive (currently ${constraints?.workingHourStart || 9}AM to ${constraints?.workingHourEnd || 5}PM)

Would you like me to:
- Check a different date
- Try a shorter meeting duration (currently ${constraints?.duration || 60} minutes)
- Check a wider range of hours
- Look into which specific members have conflicts during key times

Just let me know what you'd prefer!`;
  }

  // Handle case with suggested times
  const date = new Date(finalAvailableTimes[0].start);
  const formattedDate = formatDate(date);
  
  // Limit to at most 5 suggestions to avoid too much text
  const limitedSuggestions = finalAvailableTimes.slice(0, 5);
  
  // Create a more natural description of the number of times
  let countDescription = "";
  if (finalAvailableTimes.length > 20) {
    countDescription = "many";
  } else {
    countDescription = String(finalAvailableTimes.length);
  }
  
  let response = `I found ${countDescription} available time slots on ${formattedDate} when everyone is free:

${limitedSuggestions.map((slot, i) => 
  `Option ${i+1}: ${slot.displayTime}`
).join('\n')}

${finalAvailableTimes.length > 5 ? `\nI've shown the first 5 options, but there are ${finalAvailableTimes.length} available times in total.` : ''}

These time slots have been carefully checked against everyone's calendars and avoid all busy periods and scheduled events. Would you like me to schedule the meeting at one of these times? Just let me know which option works best.`;

  return response;
}
