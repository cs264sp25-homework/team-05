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

// Create a standalone action for finding group availability
export const getGroupAvailability = action({
  args: {
    groupId: v.id("groups"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    groupId: Id<"groups"> | string;
    startDate: string;
    endDate: string;
    members: Array<{
      userId: string;
      userName: string;
      busyTimes: Array<{
        userId: string;
        userName: string;
        start: string;
        end: string;
        summary: string;
      }>;
    }>;
  }> => {
    try {
      console.log(`[DEBUG] getGroupAvailability: Starting with groupId ${args.groupId}`);
      
      // Get the start and end date for the query (default to next 7 days)
      const now = new Date();
      const oneWeekLater = new Date(now);
      oneWeekLater.setDate(now.getDate() + 7);
      
      const startDate = args.startDate || now.toISOString();
      const endDate = args.endDate || oneWeekLater.toISOString();
      
      console.log(`[DEBUG] getGroupAvailability: Date range ${startDate} to ${endDate}`);
      console.log(`[DEBUG] getGroupAvailability: Fetching members for groupId: ${args.groupId}`);
      
      // Get group members using our internal query that bypasses auth checks
      let groupMembers;
      try {
        groupMembers = await ctx.runQuery(internal.groups.getGroupMembersInternal, {
          groupId: args.groupId
        });
        
        console.log(`[DEBUG] getGroupAvailability: Internal query found ${groupMembers.length} members`);
        
        if (!groupMembers || groupMembers.length === 0) {
          console.error(`[ERROR] getGroupAvailability: No members found for group ${args.groupId}`);
          return {
            groupId: args.groupId,
            startDate,
            endDate,
            members: []
          };
        }
        
        // Collect availability for each member
        const allAvailability: Array<{
          userId: string;
          userName: string;
          busyTimes: Array<{
            userId: string;
            userName: string;
            start: string;
            end: string;
            summary: string;
          }>;
        }> = [];
        
        // Loop through each member of the group
        for (const member of groupMembers) {
          console.log(`[DEBUG] getGroupAvailability: Processing member ${member.userId}`);
          try {
            // Get the member's calendar events
            console.log(`[DEBUG] getGroupAvailability: Fetching calendar for ${member.userId} from ${startDate} to ${endDate}`);
            let events: Array<any> = [];
            try {
              events = await ctx.runAction(api.google.listGoogleCalendarEvents, {
                startDate,
                endDate,
                userId: member.userId
              }) || [];
              console.log(`[DEBUG] getGroupAvailability: Got ${events.length} events for member ${member.userId}`);
            } catch (calendarError) {
              console.error(`[ERROR] getGroupAvailability: Failed to get calendar events for ${member.userId}: ${calendarError}`);
              events = []; // Continue with empty events rather than failing
            }
            
            // Process the events to determine busy times
            const busyTimes = events.map((event: any) => ({
              userId: member.userId,
              userName: member.name || "Group Member",
              start: event.start?.dateTime || event.start?.date || '',
              end: event.end?.dateTime || event.end?.date || '',
              summary: event.summary || "Busy"
            }));
            
            console.log(`[DEBUG] getGroupAvailability: Processed ${busyTimes.length} busy times for ${member.userId}`);
            
            allAvailability.push({
              userId: member.userId,
              userName: member.name || "Group Member",
              busyTimes
            });
          } catch (memberError) {
            console.error(`[ERROR] getGroupAvailability: Error processing member ${member.userId}: ${memberError}`);
            // Continue with other members even if one fails
          }
        }
        
        console.log(`[DEBUG] getGroupAvailability: Final availability has ${allAvailability.length} members`);
        
        // Return the consolidated availability data
        return {
          groupId: args.groupId,
          startDate,
          endDate,
          members: allAvailability
        };
      } catch (error) {
        console.error(`[ERROR] getGroupAvailability: Failed to get group members: ${error}`);
        throw new Error(`Failed to get group members: ${error}`);
      }
    } catch (error) {
      console.error(`[ERROR] getGroupAvailability: Unexpected error: ${error}`);
      // Return a valid object structure even in case of error
      return {
        groupId: args.groupId,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString(),
        members: []
      };
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
      "calendar", "calendars", "when is the group free"
    ];
    
    const eventCreationKeywords = [
      "create event", "schedule meeting", "set up meeting", "arrange meeting",
      "organize meeting", "book a meeting", "plan a meeting", "make a meeting",
      "add to calendar", "put on calendar", "schedule a", "create a", "set up a"
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
    
    // Improved date patterns detection for better recognition
    const datePatterns = [
      /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(next week|this week|coming week|upcoming week)/i,
      /(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{1,2}/i,
      /\d{1,2}(st|nd|rd|th)?(\s*of\s*(january|february|march|april|may|june|july|august|september|october|november|december))/i
    ];

    const hasDateReference = datePatterns.some(pattern => pattern.test(lastMessage.content));

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

    // Stronger detection of availability requests with special handling for "next week"
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
      console.log(`[DEBUG] openai.completion: Date detected: ${hasDateReference || hasNextWeekReference}`);
      
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
      
      // Get availability using the dedicated action with better error handling
      try {
        console.log(`[DEBUG] openai.completion: Calling getGroupAvailability for groupId: ${groupId}`);
        
        const availability = await ctx.runAction(api.openai.getGroupAvailability, {
          groupId,
        });
        
        console.log(`[DEBUG] openai.completion: getGroupAvailability returned with ${availability.members.length} members`);
        
        // Analyze the message for event constraints
        const eventConstraints = await analyzeEventConstraints(lastMessage.content);
        
        // Find suitable times based on availability and constraints
        const suggestedTimes = findSuitableTimes(availability, eventConstraints);
        console.log(`[DEBUG] openai.completion: Found ${suggestedTimes.length} suitable time slots`);
        
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
async function analyzeEventConstraints(message: string) {
  try {
    console.log(`[DEBUG] analyzeEventConstraints: Analyzing message: "${message}"`);
    
    // First check if message contains a date without needing AI
    const datePattern = /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next week|this week|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}(st|nd|rd|th)?( of)?)/i;
    const dateMatch = message.match(datePattern);
    
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
    
    // Create default constraints with 24-hour availability by default
    const defaultConstraints = {
      date: null,
      duration: duration,
      workingHourStart: 0, // Default to all hours (was 9)
      workingHourEnd: 24,  // Default to all hours (was 17)
      description: "Meeting"
    };
    
    // Handle next week specifically
    const nextWeekPattern = /next week/i;
    if (nextWeekPattern.test(message)) {
      const currentDate = new Date();
      // Add 7 days to get to next week
      const nextWeekDate = new Date(currentDate);
      nextWeekDate.setDate(currentDate.getDate() + 7);
      console.log(`[DEBUG] Detected next week, using: ${nextWeekDate.toISOString()}`);
      return {
        ...defaultConstraints,
        date: nextWeekDate.toISOString(),
        description: "Group availability check for next week"
      };
    }
    
    // If we didn't match a simple date pattern, use AI to analyze
    const completion = await generateText({
      model: openai('gpt-3.5-turbo'),
      messages: [
        {
          role: "system" as const,
          content: `Extract event constraints from the message with high precision.
          You must return a valid JSON object with the following fields:
          - date: ISO string of the date mentioned, or null if no specific date. MUST use the CURRENT YEAR (${new Date().getFullYear()}).
          - duration: meeting duration in minutes (default: 60)
          - workingHourStart: start of working hours (default: 0 for all hours)
          - workingHourEnd: end of working hours (default: 24 for all hours)
          - description: brief description of what the meeting is about
          
          Examples:
          "When is everyone free next Monday?" -> { "date": "${new Date().getFullYear()}-04-24T00:00:00.000Z", "duration": 60, "workingHourStart": 0, "workingHourEnd": 24, "description": "General availability check" }
          "Schedule a 30-minute team meeting tomorrow afternoon" -> { "date": "${new Date().getFullYear()}-04-18T00:00:00.000Z", "duration": 30, "workingHourStart": 12, "workingHourEnd": 17, "description": "Team meeting" }
          
          For dates mentioned without a year, use the current year (${new Date().getFullYear()}).
          If a time of day is mentioned (morning/afternoon/evening), adjust workingHours accordingly.
          Return null for any field that can't be determined from the message.`,
        },
        {
          role: "user" as const,
          content: message,
        },
      ],
      temperature: 0,
    });
    
    console.log(`[DEBUG] Event constraints analysis result: ${completion.text}`);

    return JSON.parse(completion.text ?? "{}");
  } catch (error) {
    console.error("Error parsing constraints JSON:", error);
    return {
      date: null,
      duration: 60,
      workingHourStart: 0, // Default to all hours
      workingHourEnd: 24,  // Default to all hours
      description: "Meeting"
    };
  }
}

// Helper function to find suitable times based on availability and constraints
function findSuitableTimes(availability: any, constraints: any) {
  try {
    // Add detailed debugging
    console.log(`[DEBUG] findSuitableTimes: Entering function with availability data:`, JSON.stringify(availability, null, 2).substring(0, 200) + "...");
    
    // Properly check for availability data with improved error handling
    if (!availability) {
      console.log("[DEBUG] findSuitableTimes: No availability data provided");
      return [];
    }
    
    // Check that we have members data
    if (!availability.members || !Array.isArray(availability.members)) {
      console.log("[DEBUG] findSuitableTimes: No members array in availability data");
      return [];
    }
    
    if (availability.members.length === 0) {
      console.log("[DEBUG] findSuitableTimes: Members array is empty");
      return [];
    }
    
    console.log(`[DEBUG] findSuitableTimes: Processing availability for ${availability.members.length} members`);
    
    // Extract date constraints
    const targetDate = constraints.date ? new Date(constraints.date) : null;
    const duration = constraints.duration || 60; // Default to 60 minutes
    
    // Initialize variables
    const startDate = targetDate || new Date(availability.startDate);
    const endDate = new Date(availability.endDate);
    
    // If a specific date was provided, set the end date to the end of that day
    if (targetDate) {
      endDate.setDate(targetDate.getDate());
      endDate.setHours(23, 59, 59);
    }
    
    // Default working hours (all hours unless specified)
    const workingHourStart = constraints.workingHourStart ?? 0;
    const workingHourEnd = constraints.workingHourEnd ?? 24;
    
    console.log(`[DEBUG] findSuitableTimes: Generating slots between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    console.log(`[DEBUG] findSuitableTimes: Working hours ${workingHourStart}:00 to ${workingHourEnd}:00, duration ${duration} minutes`);
    
    // Generate time slots in 30-minute increments
    const timeSlots: Array<{
      start: string;
      end: string;
      available: boolean;
      conflictWith: Array<{
        userId: string;
        userName: string;
        eventSummary: string;
      }>;
    }> = [];
    
    const currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      // Only consider slots during working hours if specified
      if (currentDate.getHours() >= workingHourStart && 
          currentDate.getHours() < workingHourEnd) {
        
        // Create a potential slot
        const slotStart = new Date(currentDate);
        const slotEnd = new Date(currentDate);
        slotEnd.setMinutes(slotEnd.getMinutes() + duration);
        
        // Check if slot is within working hours
        if (slotEnd.getHours() <= workingHourEnd || workingHourEnd === 24) {
          timeSlots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            available: true, // Start by assuming all slots are available
            conflictWith: [] // Initialize the conflictWith array
          });
        }
      }
      
      // Move to the next 30-minute increment
      currentDate.setMinutes(currentDate.getMinutes() + 30);
    }
    
    console.log(`[DEBUG] findSuitableTimes: Generated ${timeSlots.length} potential time slots`);
    
    // Mark slots as unavailable if any member is busy
    for (const slot of timeSlots) {
      const slotStart = new Date(slot.start);
      const slotEnd = new Date(slot.end);
      
      // Check each member's busy times
      for (const member of availability.members) {
        // Skip members with no busy times data
        if (!member.busyTimes || !Array.isArray(member.busyTimes)) {
          console.log(`[DEBUG] findSuitableTimes: Member ${member.userId} has no busyTimes data`);
          continue;
        }
        
        console.log(`[DEBUG] findSuitableTimes: Checking ${member.busyTimes.length} busy times for member ${member.userId}`);
        
        for (const busy of member.busyTimes) {
          // Ensure busy times have valid start and end times
          if (!busy.start || !busy.end) {
            console.log(`[DEBUG] findSuitableTimes: Invalid busy time entry for member ${member.userId}`);
            continue;
          }
          
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          
          // Check if there's an overlap
          if (
            (slotStart >= busyStart && slotStart < busyEnd) || // Slot starts during busy time
            (slotEnd > busyStart && slotEnd <= busyEnd) || // Slot ends during busy time
            (slotStart <= busyStart && slotEnd >= busyEnd) // Busy time is within slot
          ) {
            slot.available = false;
            // No need to check for undefined since we initialized the array
            slot.conflictWith.push({
              userId: member.userId,
              userName: member.userName,
              eventSummary: busy.summary
            });
            break;
          }
        }
        
        // No need to check other busy times if slot is already marked unavailable
        if (!slot.available) break;
      }
    }
    
    // Filter to available slots only
    const availableSlots = timeSlots.filter(slot => slot.available);
    console.log(`[DEBUG] findSuitableTimes: Found ${availableSlots.length} available slots out of ${timeSlots.length}`);
    
    // Format the available slots for display
    return availableSlots.map(slot => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      
      return {
        start: slot.start,
        end: slot.end,
        displayTime: `${formatTime(start)} - ${formatTime(end)} on ${formatDate(start)}`
      };
    });
  } catch (error) {
    console.error("Error finding suitable times:", error);
    return [];
  }
}

// Helper function to format time (e.g., "2:30 PM")
function formatTime(date: Date): string {
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
function formatEventSuggestions(suggestedTimes: any[], constraints?: any) {
  // Handle case with no suggested times
  if (!suggestedTimes || suggestedTimes.length === 0) {
    const specificDate = constraints?.date ? formatDate(new Date(constraints.date)) : "the specified date";
    
    return `I've checked for available times on ${specificDate}, but I couldn't find any times that work for the entire group. 
    
This could be because:
1. All members have conflicting calendar events during this time
2. Some members don't have their calendars connected
3. The group ID might not be properly configured

Would you like me to:
- Check a different date
- Try a shorter meeting duration (currently ${constraints?.duration || 60} minutes)
- Check different working hours (currently ${constraints?.workingHourStart || 9}AM to ${constraints?.workingHourEnd || 5}PM)

Just let me know what you'd prefer!`;
  }

  // Handle case with suggested times
  const date = new Date(suggestedTimes[0].start);
  const formattedDate = formatDate(date);
  
  // Limit to at most 5 suggestions to avoid too much text
  const limitedSuggestions = suggestedTimes.slice(0, 5);
  
  let response = `Great news! I found ${suggestedTimes.length} time${suggestedTimes.length === 1 ? '' : 's'} when everyone in the group is available on ${formattedDate} for a ${constraints?.duration || 60}-minute meeting.\n\n`;
  
  limitedSuggestions.forEach((time, index) => {
    response += `${index + 1}. ${time.displayTime}\n`;
  });
  
  if (suggestedTimes.length > 5) {
    response += `\n(Showing the first 5 options out of ${suggestedTimes.length} available times)\n`;
  }
  
  response += `\nWould you like me to schedule an event at one of these times? Just let me know which option you prefer by number, and I can add it to everyone's calendars.`;
  
  return response;
}

interface TimeSlot {
  start: Date;
  end: Date;
}

export const handleCalendarQuery = internalAction({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        groupId: v.optional(v.id("groups")),
      })
    ),
    chatId: v.id("chats"),
    placeholderMessageId: v.id("messages"),
    user_id: v.any(),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const lastMessage = args.messages[args.messages.length - 1];
    const content = lastMessage.content.toLowerCase();
    
    // Extract time-related information from the message
    const durationMatch = content.match(/(\d+)\s*(minute|min|hour|hr)/);
    const duration = durationMatch 
      ? (durationMatch[2].startsWith('hour') || durationMatch[2].startsWith('hr') 
          ? parseInt(durationMatch[1]) * 60 
          : parseInt(durationMatch[1]))
      : 30; // default to 30 minutes

    // Set default time range to next 7 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    if (!args.groupId) {
      await ctx.runMutation(internal.messages.update, {
        messageId: args.placeholderMessageId,
        content: "I need a group ID to check calendar availability. Please make sure you're in a group chat.",
      });
      return;
    }

    try {
      // Find available times for the group
      const availableTimes = await ctx.runAction(api.google.findGroupAvailability, {
        groupId: args.groupId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        duration: duration
      });

      // Format the response
      let response = `I found ${availableTimes.length} available time slots for a ${duration}-minute meeting:\n\n`;
      
      // Only show the first 5 available slots to keep the message concise
      const slotsToShow = availableTimes.slice(0, 5);
      
      slotsToShow.forEach((slot: TimeSlot, index: number) => {
        const start = new Date(slot.start);
        response += `${index + 1}. ${start.toLocaleDateString()} at ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
      });

      if (availableTimes.length > 5) {
        response += `\n...and ${availableTimes.length - 5} more slots available.`;
      }

      response += "\n\nWould you like me to schedule any of these times for the group?";

      await ctx.runMutation(internal.messages.update, {
        messageId: args.placeholderMessageId,
        content: response,
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      await ctx.runMutation(internal.messages.update, {
        messageId: args.placeholderMessageId,
        content: `I encountered an error while checking calendar availability: ${errorMessage}`,
      });
    }
  },
});


