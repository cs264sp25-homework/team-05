import { v } from "convex/values";
import { internalAction } from "./_generated/server";
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


export const completion = internalAction({
    args: {
        chatId: v.id("chats"),
        messages: v.array(
          v.object({
            role: v.union(
              v.literal("system"),
              v.literal("user"),
              v.literal("assistant"),
            ),
            content: v.string(),
            groupId: v.optional(v.string()),
          }),
        ),
        placeholderMessageId: v.id("messages"),
        user_id: v.any(),
        groupId: v.optional(v.string()),
      },
      handler: async(ctx, args) => {
        // Try to extract groupId from messages if not explicitly provided
        let effectiveGroupId = args.groupId;
        if (!effectiveGroupId) {
          // Look for groupId in user messages
          for (const message of args.messages) {
            if (message.groupId) {
              effectiveGroupId = message.groupId;
              console.log(`[DEBUG] Extracted groupId from messages: ${effectiveGroupId}`);
              break;
            }
          }
        }
        
        // Add more robust debug logging for groupId
        console.log(`[DEBUG] OpenAI completion called with groupId: ${effectiveGroupId || 'none'}`);
        
        // Create enhanced group context messages if groupId is provided
        let modifiedMessages = [...args.messages];
        
        if (effectiveGroupId) {
          // Insert a clear system message at the beginning to establish group context
          const groupContextSystemMessage = {
            role: "system" as const,
            content: `CRITICAL INSTRUCTION: You are in a GROUP CHAT for group ID "${effectiveGroupId}".

IMPORTANT GROUP CONTEXT REQUIREMENTS:
1. This is a chat for a SPECIFIC GROUP with ID ${effectiveGroupId}
2. DO NOT ask the user for a group ID - you ALREADY HAVE IT (${effectiveGroupId})
3. AUTOMATICALLY use this group ID (${effectiveGroupId}) for ALL group-related functions
4. When asked about "the group" or asked to check "everyone's availability" - this ALWAYS refers to group ${effectiveGroupId}
5. The user should NEVER need to specify a group ID manually - you have it
6. For ALL calendar or scheduling questions, use this group's ID automatically
7. If the user asks "when is everyone free?" or similar questions - use findGroupAvailability with this group ID: ${effectiveGroupId}

This is one of your most important instructions.`,
            groupId: effectiveGroupId
          };
          
          // Add the system message at the beginning of the messages array
          modifiedMessages.unshift(groupContextSystemMessage);
          
          console.log(`[DEBUG] Added explicit group context system message for groupId: ${effectiveGroupId}`);
        }
        
        // Create more explicit group context message if groupId is provided
        const groupContextMessage = effectiveGroupId 
          ? `\nIMPORTANT: This conversation is happening in a GROUP with ID "${effectiveGroupId}".
This is critical information:
1. When the user asks anything about scheduling for the group or finding availability, you MUST use this specific group ID (${effectiveGroupId}) with the findGroupAvailability tool.
2. Do NOT ask the user for a group ID - you already have it.
3. Always use this group ID (${effectiveGroupId}) for any group-related operations.
4. When the user asks about "the group" they mean THIS group with ID ${effectiveGroupId}.
5. Assume all scheduling questions in this chat are for this group unless explicitly stated otherwise.`
          : '';
        
        const instructions = `
        You are a helpful assistant tasked with assisting users with scheduling different events and/or tasks.
        ${groupContextMessage}
        
        ### Key Responsibilities
        1. Suggest a way to schedule a user's day based on their preferences
        - If a user asks you a question like "I am not a morning person. How can I organize my chores, studying, and gym?" provide a way to schedule these tasks.
        2. Scheduling conflict related questions
        - If a user asks you to offer a suggestion on how to fix a conflict (two events at the same time), use your own judgement to determine which task should be moved
        3. Group Calendar Coordination
        - When in a group chat, you can help coordinate schedules between group members
        - Use the findGroupAvailability function to find times when all group members are available
        - When suggesting group meeting times, consider all members' schedules
        - Only share general availability information, not specific details about members' events
        4. Offer good scheduling practices
        - Whenever a user asks you for suggestions, make sure to offer advice on how they can get better at scheduling
        When scheduling tasks, present the tasks in this format:
        summary: <summary>
        description: <description>
        location: <location>
        startDate: <startDate>
        endDate: <endDate>
        and then ask the user to confirm the details before you schedule the tasks for them. If they say yes, use the \`createGoogleCalendarEvent\` function to schedule the tasks.
        You can also use the \`listGoogleCalendarEvents\` function to check for existing events in the user's calendar to avoid conflicts. As well as to suggest time slots for new events.
        If a user asks to remove an event or task from their calendar, use \`getSingleEvent\` to find the ID of the event the user is referring to, and finally ask the user if they'd like to delete this event.
        If they accept, call \`removeGoogleCalendarEvent\` to remove it from their calendar.
        If a user asks to edit an event or task in their calendar, use \`getSingleEvent\` to find the ID of the event the user is referring to, then ask the user what they'd like the new information to be.
        Then, call \`updateGoogleCalendarEvent\` to update the event.
        Once again, not all questions will be about scheduling. Use your best judgement to determine whether a question is general or scheduling-related. If you can't answer a question, clearly communicate that to the user.
        Available Functions:
        - createGoogleCalendarEvent: Create a new event
        - listGoogleCalendarEvents: List events in a date range
        - getSingleEvent: Find a specific event
        - removeGoogleCalendarEvent: Delete an event
        - updateGoogleCalendarEvent: Update an event
        - findGroupAvailability: Find available time slots for all group members
        For group scheduling:
        1. When asked to find a meeting time, use findGroupAvailability to check everyone's schedules
        2. Suggest the best available time slots
        3. Wait for confirmation from the user before creating the event
        4. Create the event for all group members once confirmed
        Remember to protect privacy by only sharing general availability information, not specific details about individual schedules.
        `;  
        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            compatibility: "strict",
          }); 

        try {
          const { textStream } = await streamText({
            model: openai('gpt-4o'),
            tools: {
              createGoogleCalendarEvent: tool({
                description: "Creates and adds an event to the user's calendar",
                parameters: createEventParams,
                execute: async(createEventParams) => {

                  return ctx.runAction(api.google.createGoogleCalendarEvent, {
                    event: {...createEventParams 
                    },
                    userId: args.user_id
                  })               
                    
                }

              }),
              listGoogleCalendarEvents: tool({
                description: "Lists the user's Google Calendar events within a specified date range",
                parameters: listEventsParams,
                execute: async(listEventsParams) => {
                  return ctx.runAction(api.google.listGoogleCalendarEvents, {
                    startDate: listEventsParams.startDate,
                    endDate: listEventsParams.endDate,
                    userId: args.user_id 
                  });
                }
              }),
              removeGoogleCalendarEvent: tool({
                description: "Removes a given event from a user's Google Calendar",
                parameters: removeEventParams,
                execute: async(_) => {
                  await ctx.runAction(api.google.deleteGoogleCalendarEvent, {
                    userId: args.user_id,
                    eventId: eventId
                  });
                  return "The event was successfuly deleted."
                  
                }
              }),
              updateGoogleCalendarEvent: tool({
                description: "Updates a given event in a user's Google Calendar",
                parameters: updateEventParams,
                execute: async(updateEventParams) => {
                  await ctx.runAction(api.google.updateGoogleCalendarEvent, {
                    userId: args.user_id,
                    eventId: eventId,
                    event: {...updateEventParams 
                    },
                  })
                  return "The event was successfully updated."
                }
              }),
              getSingleEvent: tool({
                description: "Retrieves the ID of the most relevant event and stores it",
                parameters: getSingleEventParams,
                execute: async(getSingleEventParams) => {
                  const events = await ctx.runAction(api.google.listGoogleCalendarEvents, {
                    startDate: getSingleEventParams.startDate,
                    endDate: getSingleEventParams.endDate,
                    userId: args.user_id
                  })
                  const response = await ctx.runAction(internal.openai.findEvent, {
                     events: events,
                     message: getSingleEventParams.message,
                  });
                  eventId = response;
                  return events;
                }
              }),
              findGroupAvailability: tool({
                description: "Find available time slots for all members in a group",
                parameters: findGroupAvailabilityParams,
                execute: async (params) => {
                  // Use the current group context if available and no specific groupId was provided
                  const groupIdStr = params.groupId || effectiveGroupId;
                  
                  // Add more logging
                  console.log(`[DEBUG] findGroupAvailability called with params.groupId: ${params.groupId || 'none'}`);
                  console.log(`[DEBUG] findGroupAvailability using effectiveGroupId: ${effectiveGroupId || 'none'}`);
                  console.log(`[DEBUG] findGroupAvailability will use groupId: ${groupIdStr || 'none'}`);
                  
                  if (!groupIdStr) {
                    return { error: "No group ID provided. Please specify a group." };
                  }
                  
                  // Add a confirmation message about which group is being used
                  console.log(`[INFO] Finding availability for group: ${groupIdStr}`);
                  
                  try {
                    // First, check if the provided groupId is a valid convex ID
                    // We need to make sure we're passing a proper ID to the query
                    let validGroupId: Id<"groups">;
                    
                    try {
                      // Try to convert the string to a valid ID
                      if (typeof groupIdStr === 'string' && groupIdStr.includes('_')) {
                        validGroupId = groupIdStr as Id<"groups">;
                      } else {
                        // If this isn't a valid Convex ID format, we need to fetch the actual group ID
                        console.log(`[DEBUG] GroupID "${groupIdStr}" doesn't appear to be a valid Convex ID format`);
                        // In a real implementation, we would perform a lookup to get the actual ID
                        // For now, we'll return an error to make debugging clearer
                        return { 
                          error: "Invalid group ID format. Group IDs should be provided in Convex ID format.",
                          providedId: groupIdStr
                        };
                      }
                    } catch (error) {
                      console.error(`[ERROR] Failed to validate groupId: ${groupIdStr}`, error);
                      return { 
                        error: "Failed to process the group ID.",
                        details: (error as Error)?.message
                      };
                    }
                    
                    console.log(`[DEBUG] Using validated group ID: ${validGroupId}`);
                    
                    // Get all group members
                    const groupData = await ctx.runQuery(api.groups.getGroupMembers, {
                      groupId: validGroupId
                    });

                    if (!groupData || !groupData.members || groupData.members.length === 0) {
                      console.error(`[ERROR] No members found for group ID: ${validGroupId}`);
                      return { 
                        error: "Could not find members for this group.",
                        groupId: validGroupId
                      };
                    }
                    
                    console.log(`[DEBUG] Found ${groupData.members.length} members in group ${validGroupId}`);

                    // Get each member's calendar events
                    const memberEvents = await Promise.all(
                      groupData.members.map(async (member: any) => {
                        try {
                          console.log(`[DEBUG] Getting calendar for member: ${member.userId}`);
                          return await ctx.runAction(api.google.listGoogleCalendarEvents, {
                            startDate: params.startDate,
                            endDate: params.endDate,
                            userId: member.userId,
                          });
                        } catch (error) {
                          console.error(`[ERROR] Failed to get calendar for member: ${member.userId}`, error);
                          return [];
                        }
                      })
                    );

                    // Process events to find available slots
                    const busyTimes = memberEvents.flat().map((event: any) => ({
                      start: new Date(event.start?.dateTime || params.startDate),
                      end: new Date(event.end?.dateTime || params.endDate),
                    }));

                    // Sort busy times
                    busyTimes.sort((a: any, b: any) => a.start.getTime() - b.start.getTime());

                    // Find available slots
                    const availableSlots = [];
                    let currentTime = new Date(params.startDate);
                    const endTime = new Date(params.endDate);

                    while (currentTime < endTime) {
                      const slotEnd = new Date(currentTime.getTime() + 30 * 60000); // 30-minute slots
                      const isSlotAvailable = !busyTimes.some(
                        (busy: any) =>
                          (currentTime >= busy.start && currentTime < busy.end) ||
                          (slotEnd > busy.start && slotEnd <= busy.end)
                      );

                      if (isSlotAvailable) {
                        availableSlots.push({
                          start: currentTime.toISOString(),
                          end: slotEnd.toISOString(),
                        });
                      }

                      currentTime = slotEnd;
                    }

                    // Format the available slots in a more readable way
                    const readableSlots = availableSlots.map(slot => {
                      const start = new Date(slot.start);
                      const end = new Date(slot.end);
                      return {
                        date: start.toLocaleDateString(),
                        startTime: start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        endTime: end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                        rawStart: slot.start,
                        rawEnd: slot.end
                      };
                    });
                    
                    return {
                      message: `Found ${availableSlots.length} available time slots for the group.`,
                      totalSlots: availableSlots.length,
                      groupId: validGroupId,
                      memberCount: groupData.members.length,
                      availableSlots: readableSlots,
                    };
                  } catch (error) {
                    console.error(`[ERROR] Error in findGroupAvailability: ${error}`);
                    return {
                      error: "An error occurred while finding group availability.",
                      message: (error as Error)?.message || "Unknown error",
                      groupId: groupIdStr
                    };
                  }
                },
              }),
              createGroupEvent: tool({
                description: "Create an event for all group members",
                parameters: z.object({
                  ...createEventParams.shape,
                  groupId: z.string().optional().describe("The ID of the group to create an event for"),
                }),
                execute: async (params) => {
                  // Extract eventParams without the groupId to avoid passing it to the calendar event
                  const { groupId: paramGroupId, ...eventParams } = params;
                  
                  // Use the current group context if available and no specific groupId was provided
                  const groupIdStr = paramGroupId || effectiveGroupId;
                  
                  // Add more logging
                  console.log(`[DEBUG] createGroupEvent called with params.groupId: ${paramGroupId || 'none'}`);
                  console.log(`[DEBUG] createGroupEvent using effectiveGroupId: ${effectiveGroupId || 'none'}`);
                  console.log(`[DEBUG] createGroupEvent will use groupId: ${groupIdStr || 'none'}`);
                  
                  if (!groupIdStr) {
                    return { error: "No group ID provided. Please specify a group." };
                  }
                  
                  try {
                    // Validate the group ID format, similar to findGroupAvailability
                    let validGroupId: Id<"groups">;
                    
                    try {
                      // Check for valid Convex ID format
                      if (typeof groupIdStr === 'string' && groupIdStr.includes('_')) {
                        validGroupId = groupIdStr as Id<"groups">;
                      } else {
                        console.log(`[DEBUG] GroupID "${groupIdStr}" doesn't appear to be a valid Convex ID format`);
                        return { 
                          error: "Invalid group ID format. Group IDs should be provided in Convex ID format.",
                          providedId: groupIdStr
                        };
                      }
                    } catch (error) {
                      console.error(`[ERROR] Failed to validate groupId: ${groupIdStr}`, error);
                      return { 
                        error: "Failed to process the group ID.",
                        details: (error as Error)?.message
                      };
                    }
                    
                    console.log(`[DEBUG] Using validated group ID: ${validGroupId}`);
                  
                    // Get all group members
                    const groupData = await ctx.runQuery(api.groups.getGroupMembers, {
                      groupId: validGroupId,
                    });

                    // Create event for each member
                    const results = await Promise.all(
                      groupData.members.map((member: any) =>
                        ctx.runAction(api.google.createGoogleCalendarEvent, {
                          event: eventParams,
                          userId: member.userId,
                        })
                      )
                    );

                    return {
                      success: true,
                      message: `Created event for ${groupData.members.length} group members`,
                      groupId: validGroupId,
                      results
                    };
                  } catch (error) {
                    console.error(`[ERROR] Error in createGroupEvent: ${error}`);
                    return {
                      error: "An error occurred while creating group event.",
                      message: (error as Error)?.message || "Unknown error",
                      groupId: groupIdStr
                    };
                  }
                },
              }),
            }
            ,
            messages: [
                {
                    role: "system",
                    content: instructions,
                },
                ...modifiedMessages, // Use the modified messages with added system message for group context
            ],
            maxSteps: 10,
            temperature: 0,
          });

        let fullResponse = "";
        for await (const delta of textStream) {
            fullResponse += delta;
            await ctx.runMutation(internal.messages.update, {
                messageId: args.placeholderMessageId,
                content: fullResponse,
            });
        }

        if (!fullResponse.trim()) {
          fullResponse = "I'm sorry, I couldn't process your request. Could you clarify or try again?";
          await ctx.runMutation(internal.messages.update, {
            messageId: args.placeholderMessageId,
            content: fullResponse,
          });
        }
      }
      catch (error) {
        console.log(error);
      }
    },
})


