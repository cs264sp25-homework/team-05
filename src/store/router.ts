import { BASE_URL } from "@/env";
import { logger } from "@nanostores/logger";
import { createRouter } from "@nanostores/router";

const DEBUG = false;

const pages = {
  home: `${BASE_URL}/team-05/`, // Home page
  chats: `${BASE_URL}/team-05/chats`, // Chats page
  addChat: `${BASE_URL}/team-05/addChat`,
  chat: `${BASE_URL}/chats/:chatId`, // View a specific chat
  editChat: `${BASE_URL}/team-05/chats/:chatId/edit`, // Edit a specific chat
  messages: `${BASE_URL}/team-05/chats/:chatId/messages`, // View all messages in a specific chat
  assistants: `${BASE_URL}/team-05/assistants`, // Assistants page
  addAssistant: `${BASE_URL}/team-05/assistants/add`, // Add a new assistant
  assistant: `${BASE_URL}/team-05/assistants/:assistantId`, // View a specific assistant
  editAssistant: `${BASE_URL}/team-05/assistants/:assistantId/edit`, 
};

export type Page = keyof typeof pages;

export type Params = {
  assistantId: string;
  chatId?: string;
};

export const $router = createRouter(pages);

if (DEBUG) {
  logger({ $router });
}
