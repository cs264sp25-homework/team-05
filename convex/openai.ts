import { v } from "convex/values";
import {  internalAction, } from "./_generated/server";
import {createOpenAI, openai } from "@ai-sdk/openai";
import { streamText, tool} from "ai";
import { api, internal } from "./_generated/api";
import { z } from "zod";

// export const createEventParams = z.object({
//   summary: z.string(),
//   startDate: z.string().date().describe("Has to be formatted as follows: '2025-04-04T11:02:00.000Z'"),
//   endDate: z.string().date().describe("Has to be formatted as follows: '2025-04-04T11:02:00.000Z'")
// })

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
      },
      handler: async(ctx, args) => {
        const instructions = `
        You are a helpful assistant tasked with assisting users with scheduling different events and/or tasks.
        ### Key Responsibilities
        1. Suggest a way to schedule a user’s day based on their preferences
        - If a user asks you a question like “I am not a morning person. How can I organize my chores, studying, and gym?” provide a way to schedule these tasks.
        2. Scheduling conflict related questions
        - If a user asks you to offer a suggestion on how to fix a conflict (two events at the same time), use your own judgement to determine which task should be moved
        3. Offer good scheduling practices
        - Whenever a user asks you for suggestions, make sure to offer advice on how they can get better at scheduling
         When providing a way to schedule tasks, present the tasks in this format:
        summary: <summary>
        description: <description>
        location: <location>
        startDate: <startDate>
        endDate: <endDate>
        and then ask the user if you would like to schedule the tasks for them. If they say yes, use the \`createGoogleCalendarEvent\` function to schedule the tasks.
        You can also use the \`listGoogleCalendarEvents\` function to check for existing events in the user's calendar to avoid conflicts. As well as to suggest time slots for new events.
        Once again, not all questions will be about scheduling. Use your best judgement to determine whether a question is general or scheduling-related. If you can’t answer a question, clearly communicate that to the user.
        `;  
        
        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            compatibility: "strict",
          }); 

        
          const { textStream } = streamText({
            model: openai('gpt-4o'),
            tools: {
              createGoogleCalendarEvent: tool({
                description: "Creates and adds an event to the user's calendar",
                parameters: createEventParams,
                execute: async(createEventParams) => {
                  console.log("Adding an event to your calendar");

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
                  console.log("Listing Google Calendar events");
                  return ctx.runAction(api.google.listGoogleCalendarEvents, {
                    startDate: listEventsParams.startDate,
                    endDate: listEventsParams.endDate,
                    userId: args.user_id 
                  });
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
            onStepFinish: ({ 
              text, 
              toolCalls, 
              toolResults,
              request
            }) => {
              console.log("Text", text);
              console.log("Tool calls:", toolCalls);
              console.log("Tool results:", toolResults);
              console.log("Request", request.body);
            },
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
    },
})


