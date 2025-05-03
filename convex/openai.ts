"use node";
import { v } from "convex/values";
import {  internalAction } from "./_generated/server";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText, tool} from "ai";
import { api, internal } from "./_generated/api";
import { z } from "zod";
import { assistantSchema } from "./schema";
import OpenAI from "openai";
import * as googleHelper from "./google";
import {
  Text,
  Message,
  TextDelta,
} from "openai/resources/beta/threads/messages.mjs";


// export const createEventParams = z.object({
//   summary: z.string(),
//   startDate: z.string().date().describe("Has to be formatted as follows: '2025-04-04T11:02:00.000Z'"),
//   endDate: z.string().date().describe("Has to be formatted as follows: '2025-04-04T11:02:00.000Z'")
// })

const DEBUG = true;
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
        openaiThreadId: v.string(),
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
          
         if (args.openaiThreadId) {
          await ctx.scheduler.runAfter(0, internal.openai.createMessage, {
            messageId: args.placeholderMessageId,
            openaiThreadId: args.openaiThreadId,
            content: fullResponse,
            role: "assistant",
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
    },
})


export const createAssistant = internalAction({
  args: {
    assistantId: v.id("assistants"),
    ...assistantSchema,
    alternateInstructions: v.string(),
  },
  handler: async (ctx, args) => {
    try {

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // const functionTool = [{
      //   type: "function",
      //   function: {
      //     name: "get_weather",
      //     description: "Get the current weather in a given location",
      //     parameters: {
      //       type: "object",
      //       properties: {
      //         location: {
      //           type: "string",
      //           description: "The city and state, e.g., San Francisco, CA",
      //         },
      //       },
      //       required: ["location"],
      //     },
      //   },
      // }];

      const assistant = await openai.beta.assistants.create({
        name: args.name,
        description: args.description,
        instructions: args.alternateInstructions,
        model: args.model,
        temperature: args.temperature,
        tools: [
          {
            type: "function",
            function: {
              name: "createGoogleCalendarEvent",
              description: "Creates and adds an event to the user's calendar",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "The title of the event",
                  },
                  description: {
                    type: "string",
                    description: "The description of the event",
                  },
                  location: {
                    type: "string",
                    description: "The location of the event",
                  },
                  start: {
                    type: "object",
                    properties: {
                      dateTime: {
                        type: "string",
                        description:
                          "The start date and time of the event in ISO format",
                      },
                    },
                    required: ["dateTime"],
                  },
                  end: {
                    type: "object",
                    properties: {
                      dateTime: {
                        type: "string",
                        description:
                          "The end date and time of the event in ISO format",
                      },
                    },
                    required: ["dateTime"],
                  },
                },
                required: ["summary", "start", "end"],
              },
            },
          },
        ],
        metadata: args.metadata || {},
      });

      // update DB with this new assistant's ID
      await ctx.runMutation(internal.assistants.updateOpenAIId, {
        assistantId: args.assistantId,
        openaiAssistantId: assistant.id,
      });

      return assistant.id;
    } catch (error) {
      // If there's an error, we should handle it and possibly clean up
      console.error("Error creating assistant in OpenAI:", error);

      // Delete the placeholder assistant from our database
      await ctx.runMutation(internal.assistants.deleteFailedAssistant, {
        assistantId: args.assistantId,
      });

      throw error;
    }
  },
});

// Internal action to update an assistant in OpenAI
export const updateAssistant = internalAction({
  args: {
    assistantId: v.id("assistants"),
    ...assistantSchema,
    // override the required assistantId field
    openaiAssistantId: v.string(),
    // override some fields to be optional
    name: v.optional(v.string()),
    instructions: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (_, args) => {
    try {
      // Instantiate the OpenAI API client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      const { assistantId: _, openaiAssistantId, ...rest } = args;

      // Remove or transform the tools property if it exists and is not valid
      const { tools, ...updateParams } = rest;

      // If you want to support updating tools, ensure they match the AssistantTool[] type.
      // Otherwise, just omit tools as shown above.

      // Update the assistant in OpenAI
      await openai.beta.assistants.update(openaiAssistantId, updateParams);

      return { success: true };
    } catch (error) {
      console.error("Error updating assistant in OpenAI:", error);
      throw error;
    }
  },
});

// Internal action to delete an assistant in OpenAI
export const deleteAssistant = internalAction({
  args: {
    openaiAssistantId: v.string(),
  },
  handler: async (_, args) => {
    try {
      // Instantiate the OpenAI API client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Delete the assistant in OpenAI
      await openai.beta.assistants.del(args.openaiAssistantId);

      return { success: true };
    } catch (error) {
      console.error("Error deleting assistant in OpenAI:", error);
      throw error;
    }
  },
});

// Internal action to create a thread in OpenAI
export const createThread = internalAction({
  args: {
    chatId: v.id("chats"),
    metadata: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args) => {
    try {
      // Instantiate the OpenAI API client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create the thread in OpenAI
      const thread = await openai.beta.threads.create({
        metadata: args.metadata,
      });

      

      // Update our database with the OpenAI thread ID
      await ctx.runMutation(internal.chats.updateOpenAIThreadId, {
        chatId: args.chatId,
        openaiThreadId: thread.id,
      });

      return thread.id;
    } catch (error) {
      console.error("Error creating thread in OpenAI:", error);
      throw error;
    }
  },
});

// Internal action to update a thread in OpenAI
export const updateThread = internalAction({
  args: {
    openaiThreadId: v.string(),
    metadata: v.record(v.string(), v.string()),
  },
  handler: async (_, args) => {
    try {
      // Instantiate the OpenAI API client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Update the thread in OpenAI
      const thread = await openai.beta.threads.update(args.openaiThreadId, {
        metadata: args.metadata,
      });

      console.log(thread);

      return { success: true };
    } catch (error) {
      console.error("Error updating thread in OpenAI:", error);
      throw error;
    }
  },
});

// Internal action to delete a thread in OpenAI
export const deleteThread = internalAction({
  args: {
    openaiThreadId: v.string(),
  },
  handler: async (_, args) => {
    try {
      // Instantiate the OpenAI API client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Delete the thread in OpenAI
      await openai.beta.threads.del(args.openaiThreadId);

      return { success: true };
    } catch (error) {
      console.error("Error deleting thread in OpenAI:", error);
      throw error;
    }
  },
});

// Internal action to create a message in OpenAI
export const createMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    openaiThreadId: v.string(),
    content: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
  },
  handler: async (ctx, args) => {
    try {
      // Instantiate the OpenAI API client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create the message in OpenAI
      const message = await openai.beta.threads.messages.create(
        args.openaiThreadId,
        {
          role: args.role,
          content: args.content,
        },
      );

      // Update our database with the OpenAI message ID
      await ctx.runMutation(internal.messages.updateOpenAIMessageId, {
        messageId: args.messageId,
        openaiMessageId: message.id,
      });

      return message.id;
    } catch (error) {
      console.error("Error creating message in OpenAI:", error);
      throw error;
    }
  },
});

// Function to handle tool calls
export async function handleToolCalls(toolCalls: any[], userId: any, ownerId: any) {
  console.log("Handling the following tool calls in handleToolCalls:", toolCalls);
  const results = [];

  for (const toolCall of toolCalls) {
    if (toolCall.type === "function") {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      console.log("The function name", functionName);
      console.log("The function arguments", args);

      if (functionName === "createGoogleCalendarEvent") {
        const googleResponse = await googleHelper.createEventHelper({
                event: args,
                userId: userId,
              });

        console.log("Google Calendar event created in handle:", googleResponse);
        results.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(googleResponse),
        })

        const ownerResponse = await googleHelper.createEventHelper({
          event: args,
          userId: ownerId,
        })
        console.log("Google Calendar event created in handle for owner:", ownerResponse);
        // results.push({
        //   tool_call_id: toolCall.id,
        //   output: JSON.stringify(ownerResponse),
        // })
        // console.log(`🔍 Getting location information for ${args.city}...`);
        // const result = await getLocation(args.city);
        // console.log(`📍 Found location: ${JSON.stringify(result)}`);
        // results.push({
        //   tool_call_id: toolCall.id,
        //   output: JSON.stringify(result),
        // });
      }
    }
  }

  return results;
}


// Internal action to stream a run in OpenAI
export const streamRun = internalAction({
  args: {
    openaiThreadId: v.string(),
    openaiAssistantId: v.string(),
    placeholderMessageId: v.id("messages"),
    userId: v.any(),
    ownerId: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      // Instantiate the OpenAI API client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Create a streaming run
      let run = openai.beta.threads.runs.stream(args.openaiThreadId, {
        assistant_id: args.openaiAssistantId,
      });

      
      
      console.log("Starting stream run");

      const aggregatedText: string[] = [];

      // Debouncing variables
      let lastUpdateTime = 0;
      let lastUpdateLength = 0;
      const MIN_UPDATE_INTERVAL = 500; // ms
      const MIN_CONTENT_CHANGE = 20; // characters
      let fullResponse = "";
      let updatePending = false;

      // let googleResponse = null;
      // let toolCallId = null;
      
      // Flag to track if we've submitted tool outputs
      // let toolOutputsSubmitted = false;
      // let waitingForFinalResponse = false;

      // Function to perform the actual update
      const performUpdate = async (content: string) => {
        if (updatePending) return; // Prevent concurrent updates

        updatePending = true;
        try {
          await ctx.runMutation(internal.messages.update, {
            messageId: args.placeholderMessageId,
            content: content,
          });

          lastUpdateTime = Date.now();
          lastUpdateLength = content.length;

          if (DEBUG) {
            console.log(
              "Database updated with content length:",
              content.length,
            );
          }
        } catch (error) {
          console.error("Error updating message:", error);
        } finally {
          updatePending = false;
        }
      };

      // Helper function to fetch the latest message after tool output submission
      // const checkForFinalResponse = async () => {
      //   try {
      //     console.log("Checking for final response from OpenAI...");
      //     const messages = await openai.beta.threads.messages.list(
      //       args.openaiThreadId,
      //       { order: "desc", limit: 1 }
      //     );
          
      //     if (messages.data.length > 0) {
      //       const latestMessage = messages.data[0];
            
      //       // Only process assistant messages (not user messages)
      //       if (latestMessage.role === "assistant") {
      //         const textContent = latestMessage.content.find(
      //           content => content.type === 'text'
      //         );
              
      //         if (textContent && 'text' in textContent && textContent.text.value) {
      //           console.log("Found final response:", textContent.text.value);
      //           await performUpdate(textContent.text.value);
                
      //           // Update the placeholder message with the ID of the OpenAI message
      //           await ctx.runMutation(internal.messages.updateOpenAIMessageId, {
      //             messageId: args.placeholderMessageId,
      //             openaiMessageId: latestMessage.id,
      //           });
                
      //           // waitingForFinalResponse = false;
      //         }
      //       }
      //     }
      //   } catch (error) {
      //     console.error("Error fetching final response:", error);
      //   }
      // };

      // Set up event handlers for the streaming run
      run
        .on("textDelta", async (textDelta: TextDelta, snapshot: Text) => {
          // Text content is being streamed
          if (DEBUG) {
            console.log("textDelta", textDelta, snapshot);
            aggregatedText.push(snapshot.value);
          }

          // Update fullResponse with the latest snapshot
          fullResponse = snapshot.value;

          // Apply the combined debouncing approach
          const now = Date.now();
          const contentChange = fullResponse.length - lastUpdateLength;

          // Update the database if:
          // 1. It's been at least MIN_UPDATE_INTERVAL ms since the last update AND there's new content
          // 2. OR there's been a significant amount of new content added
          if (
            (now - lastUpdateTime > MIN_UPDATE_INTERVAL && contentChange > 0) ||
            contentChange > MIN_CONTENT_CHANGE
          ) {
            await performUpdate(fullResponse);
          }
        })
        .on("toolCallCreated", async (toolCall) => {
          await ctx.runMutation(internal.messages.update, {
            messageId: args.placeholderMessageId,
            content: "Assistant checking availability and trying to schedule the event... 🔍",
          });
          console.log("Tool Call Created: ", toolCall);
          // toolCallId = toolCall.id;
        })
        .on("toolCallDelta", (toolDelta, snapshot) => {
          console.log("toolDelta", toolDelta, snapshot);
          if (toolDelta.type === "function") {
            console.log("The arguments", toolDelta.function?.arguments);
          }
        })
        .on("toolCallDone", async (toolCall) => {
            console.log("Tool call done:", toolCall);
            if (toolCall.type === "function") {
              console.log("The arguments");
              console.log(toolCall.function?.arguments);

              // console.log("Calling the createGoogleCalendarEvent function");
              
              // googleResponse = await googleHelper.createEventHelper(ctx, {
              //   event: JSON.parse(toolCall.function?.arguments),
              //   userId: args.userId,
              // });

              // console.log("The event was successfully created via the assistant");

              // console.log("Submitting tool outputs to OpenAI");

              // await openai.beta.threads.runs.submitToolOutputs(
              //   args.openaiThreadId,
              //   run.currentRun()!.id,
              //   {
              //     tool_outputs: [
              //       {
              //         tool_call_id: toolCall.id,
              //         output: JSON.stringify(googleResponse),
              //       },
              //     ],
              //   }
              // );
              
              // // Mark that we've submitted tool outputs
              // toolOutputsSubmitted = true;
              // waitingForFinalResponse = true;
              
              // // Reset response tracking variables to capture the new response
              // fullResponse = "";
              // lastUpdateLength = 0;

              console.log("The tool outputs were successfully submitted to OpenAI");
            } else {
              console.log("Tool call is not a function");
              console.log(toolCall.type);
            }
        })
        .on("textDone", async (content: Text, snapshot: Message) => {
          console.log("In the textdone event")
          // The text message is complete
          if (DEBUG) {
            console.log("textDone", content, snapshot);
          }

          // Final update with the complete content
          await performUpdate(content.value);

          // Update the placeholder message with the ID of the OpenAI message
          await ctx.runMutation(internal.messages.updateOpenAIMessageId, {
            messageId: args.placeholderMessageId,
            openaiMessageId: snapshot.id,
          });
        })
        .on("messageDone", (message: Message) => {
          // A message is done being created
          if (DEBUG) {
            console.log("Message done", message);
          }

          // Update the OpenAI message ID in our database
          ctx.runMutation(internal.messages.updateOpenAIMessageId, {
            messageId: args.placeholderMessageId,
            openaiMessageId: message.id,
          });
        })
        .on("runStepDone", async (runStep) => {
          console.log("Run step done:", runStep);


          
          // Check if this is the final step completing after tool outputs were submitted
          // if (toolOutputsSubmitted && waitingForFinalResponse) {
          //   // Check for message creation steps that happened after tool outputs were submitted
          //   if (runStep.type === "message_creation") {
          //     console.log("Message creation step completed after tool outputs - checking for final response");
          //     await checkForFinalResponse();
          //   }
          // }
        })
        
        .on("error", async (error) => {
          // An error occurred in the streaming run
          if (DEBUG) {
            console.error("Error in streaming run:", error);
          }

          // Update the placeholder message with an error message
          await performUpdate("An error occurred while generating a response.");
        });

      // Wait for the run to complete
      console.log("Waiting for the run to complete...");
      const finalRunResult = await run.finalRun();
      let tool_calls = finalRunResult.required_action?.submit_tool_outputs.tool_calls;

      console.log("The tool calls", tool_calls);

      if (!tool_calls) {
        console.log("No tool calls were made");
      }
      
      if (tool_calls) {
        let tool_outputs = await handleToolCalls(tool_calls, args.userId, args.ownerId);
        console.log("The tool outputs", tool_outputs);
        let submittedRun = await openai.beta.threads.runs.submitToolOutputs(
          args.openaiThreadId,
          run.currentRun()!.id,
          { tool_outputs },
        );

        console.log("The tool outputs were successfully submitted to OpenAI");
        console.log("The submitted run", submittedRun);

        // Wait until submittedRun is completed
        console.log("Waiting for the submitted run to complete...");

        await ctx.runMutation(internal.messages.update, {
          messageId: args.placeholderMessageId,
          content: "Crafting message for you... 🛠️",
        });

        while (submittedRun.status !== "completed") {
          console.log("In waiting loop");
          await new Promise(resolve => setTimeout(resolve, 1000));
          submittedRun = await openai.beta.threads.runs.retrieve(args.openaiThreadId, submittedRun.id);
          console.log("The submitted run status so far", submittedRun.status);
        }

        if (submittedRun.status === "completed") {
          // Grab the latest message and update the placeholder message
          const messages = await openai.beta.threads.messages.list(submittedRun.thread_id);
          // Grab the latest message
          const latestMessage = messages.data[0];
          const latestMessageContent = latestMessage.content[0].type === "text" ? latestMessage.content[0].text.value : "";

          console.log("The latest message content", latestMessageContent);


          console.log("The latest message", latestMessage);
          // Update the placeholder message with the ID of the OpenAI message

          await ctx.runMutation(internal.messages.updateOpenAIMessageId, {
            messageId: args.placeholderMessageId,
            openaiMessageId: latestMessage.id,
          });

          await ctx.runMutation(internal.messages.update, {
            messageId: args.placeholderMessageId,
            content: latestMessageContent,
          });


        }

        
        // console.log("The messages", messages);
        // for (const message of messages.data.reverse()) {
        //   console.log(message.content);
        // }
        // Optionally handle submittedRun if needed, but do not assign it to 'run'
      }

      console.log("Run completed with status:", finalRunResult.status);
      
      // // Double-check for final response after run completes
      // if (toolOutputsSubmitted && waitingForFinalResponse) {
      //   console.log("Run completed - final check for response");
      //   // Add a slight delay to ensure OpenAI has processed everything
      //   await new Promise(resolve => setTimeout(resolve, 1000));
      //   await checkForFinalResponse();
      // }

      return { success: true };
    } catch (error) {
      console.error("Error in streaming run:", error);

      // Update the placeholder message with an error message
      await ctx.runMutation(internal.messages.update, {
        messageId: args.placeholderMessageId,
        content: "An error occurred while generating a response.",
      });

      throw error;
    }
  },
});
