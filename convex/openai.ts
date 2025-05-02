import { v } from "convex/values";
import {  internalAction, } from "./_generated/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText, tool} from "ai";
import { api, internal } from "./_generated/api";
import { z } from "zod";


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

export const listUserEventsParams = z.object({
  startDate: z.string().describe("The start date in ISO format (e.g., '2025-04-04T00:00:00.000Z')"),
  endDate: z.string().describe("The end date in ISO format (e.g., '2025-04-05T00:00:00.000Z')"),
  userId: z.string().describe("The user ID of the user to find events for")
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
  startDate: z.string().describe("The start date in ISO format (e.g., '2025-04-04T00:00:00.000Z')"),
  endDate: z.string().describe("The end date in ISO format (e.g., '2025-04-05T00:00:00.000Z')"),
  duration: z.number().describe("The duration of the event in minutes")
})

export const getGroupEventsParams = z.object({
  startDate: z.string().describe("The start date in ISO format (e.g., '2025-04-04T00:00:00.000Z')"),
  endDate: z.string().describe("The end date in ISO format (e.g., '2025-04-05T00:00:00.000Z')"),
})

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
          }),
        ),
        placeholderMessageId: v.id("messages"),
        user_id: v.any(),
        groupId: v.optional(v.id("groups")),
      },
      handler: async(ctx, args) => {
        const currentTime = new Date()
        if (!args.groupId) {
          const instructions = `
          You are a helpful assistant tasked with assisting users with scheduling different events and/or tasks.
          ### Key Responsibilities
          1. Suggest a way to schedule a user's day based on their preferences
          - If a user asks you a question like "I am not a morning person. How can I organize my chores, studying, and gym?" provide a way to schedule these tasks.
          2. Scheduling conflict related questions
          - If a user asks you to offer a suggestion on how to fix a conflict (two events at the same time), use your own judgement to determine which task should be moved
          3. Offer good scheduling practices
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
          You can only delete or change events for the current user, not other users in the group.
          Once again, not all questions will be about scheduling. Use your best judgement to determine whether a question is general or scheduling-related. If you can't answer a question, clearly communicate that to the user.
          
          For context, the current date is ${currentTime.toDateString()}.`;
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
              }
              ,
              messages: [
                  {
                      role: "system",
                      content: instructions,
                  },
                  ...args.messages,
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
        }
        else{
          const instructions = `
          You are a helpful assistant tasked with scheduling tasks for a group of users.
          1. Suggest open times for group events based on group availability and preferences
          - If a user asks to schedule a time to meet in the afternoon, look for afternoon times where the fewest group members have events already scheduled and suggest them
          2. Scheduling conflict related questions
          - If a user asks if a time could be made to work, look at users who have events at that time and see if you can find times the event could be moved to on their specific schedule
          When scheduling tasks, present the tasks in this format:
          summary: <summary>
          description: <description>
          location: <location>
          startDate: <startDate>
          endDate: <endDate>
          and then ask the user to confirm the details before you schedule the tasks for them. If they say yes, use the \`createGroupEvent\` function to schedule the task for each member of the group.
          You can use the \`findGroupAvailability\` function to check for available time slots in a given period among the group.
          You can use the \'getGroupEvents\' function to get a list of all events among group members for a given period.
          You can use \'listGoogleCalendarEvents\' function to check events in a single user's calendar.
          If a user asks to remove an event or task from their calendar, use \`getSingleEvent\` to find the ID of the event the user is referring to, and finally ask the user if they'd like to delete this event.
          If they accept, call \`removeGoogleCalendarEvent\` to remove it from their calendar.
          If a user asks to edit an event or task in their calendar, use \`getSingleEvent\` to find the ID of the event the user is referring to, then ask the user what they'd like the new information to be.
          Then, call \`updateGoogleCalendarEvent\` to update the event.
          Make sure that when scheduling an event, if the time does not work for all members, you explain the conflicts and ask for confirmation first.
          
          For context, the current date is ${currentTime.toDateString()}.`;

          const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            compatibility: "strict",
          }); 

          try {
            console.log("Calling group chat function ")
            const { textStream } = await streamText({
              model: openai('gpt-4o'),
              tools: {
                createGroupEvent: tool({
                  description: "Creates and adds an event to the calendar of every user in the group.",
                  parameters: createEventParams,
                  execute: async(createEventParams) => {

                    return ctx.runAction(api.groups.createGroupEvent, {
                      event: {...createEventParams 
                      },
                      groupId: args.groupId
                    })               
                  }
                }),
                findGroupAvailability: tool({
                  description: "Finds available time slots for an event of a specified duration between two dates",
                  parameters: findGroupAvailabilityParams,
                  execute: async(findGroupAvailabilityParams) => {
                    return ctx.runAction(api.google.findGroupAvailability, {
                      startDate: findGroupAvailabilityParams.startDate,
                      endDate: findGroupAvailabilityParams.endDate,
                      duration: findGroupAvailabilityParams.duration,
                      groupId: args.groupId,
                    });
                  }
                }),
                getGroupEvents: tool({
                  description: "Retrieves all events among group members between two dates",
                  parameters: getGroupEventsParams,
                  execute: async(getGroupEventsParams) => {
                    return ctx.runAction(api.groups.getGroupEvents, {
                      startDate: getGroupEventsParams.startDate,
                      endDate: getGroupEventsParams.endDate,
                      groupId: args.groupId,
                    });
                  }
                }),
                listGoogleCalendarEvents: tool({
                  description: "Lists the current user's Google Calendar events within a specified date range",
                  parameters: listUserEventsParams,
                  execute: async(listUserEventsParams) => {
                    return ctx.runAction(api.google.listGoogleCalendarEvents, {
                      startDate: listUserEventsParams.startDate,
                      endDate: listUserEventsParams.endDate,
                      userId: listUserEventsParams.userId
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
              }
              ,
              messages: [
                  {
                      role: "system",
                      content: instructions,
                  },
                  ...args.messages,
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
          console.log(fullResponse)
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
        }
    },
})