import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import {createOpenAI, openai } from "@ai-sdk/openai";
import { streamText, tool} from "ai";
import { api, internal } from "./_generated/api";
import { z } from "zod";

export const createEventParams = z.object({
  summary: z.string(),
  description: z.string(),
  location: z.string(),
  startDate: z.string().date(),
  endDate: z.string().date()
})

// export const createTaskParams = z.object({
//   summary: z.string(),
//   description: z.string(),
//   location: z.string().optional(),
//   startDate: z.string().date(),
//   endDate: z.string().date(),
//   priority: z.string()
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
      },
      handler: async(ctx, args) => {


        const instructions = `
        
        You are a helpful assistant tasked with assisting users with scheduling different events and/or tasks.
        
        ### Key Responsibilities 
        
        1. Suggest a way to schedule a user's day based on their preferences
        - If a user asks you a question like "I am not a morning person. How can I organize my chores, studying, and gym?" provide a way to schedule these tasks.
        
        2. Scheduling conflict related questions
        - If a user asks you to offer a suggestion on how to fix a conflict (two events at the same time), use your own judgement to determine which task should be moved
        
        3. Offer good scheduling practices
        - Whenever a user asks you for suggestions, make sure to offer advice on how they can get better at scheduling

        Once again, not all questions will be about scheduling. Use your best judgement to determine whether a question is general or scheduling-related. If you can't answer a question, clearly communicate that to the user.

        `
        
        const openai = createOpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            compatibility: "strict",
          }); 

        
          const { textStream } = streamText({
            model: openai('gpt-4o'),
            tools: {
              addEvent: tool({
                description: 
                "Creates and adds an event to the user's calendar based on the provided details.",
                parameters: createEventParams,
                execute: async({}) => {
                  return  
                }

              })
              // addEvent: tool({
              //   description: "Add an event to the user's calendar",
              //   parameters: z.object({
              //     query: z
              //       .string()
              //       .describe("The query to search the uploaded files for"),
              //     }),
              //     execute: async ({ query, fileIds }) => {
              //       await ctx.runMutation(internal.messages.update, {
              //         messageId: args.placeholderMessageId,
              //         content: `🔍 Searching for information...`,
              //       });
              //       return ctx.runAction(internal.chunks.search, {
              //         query,
              //         fileIds: fileIds?.map((id) => id as Id<"files">),
              //         chatId: args.chatId,
              //       });
              //     },
              // })
            },
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
    },
})


