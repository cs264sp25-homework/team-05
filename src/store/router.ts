import { BASE_URL } from "@/env";
import { logger } from "@nanostores/logger";
import { createRouter } from "@nanostores/router";

const DEBUG = false;

// const pages = {
//   home: `${BASE_URL}/team-05/`, // Home page
//   chats: `${BASE_URL}/team-05/chats`, // Chats page
//   addChat: `${BASE_URL}/team-05/chats/add`,
//   chat: `${BASE_URL}/team-05/chats/:chatId`, // View a specific chat
//   editChat: `${BASE_URL}/team-05/chats/:chatId/edit`, // Edit a specific chat
//   messages: `${BASE_URL}/team-05/chats/:chatId/messages`, // View all messages in a specific chat
//   assistants: `${BASE_URL}/team-05/assistants`, // Assistants page
//   addAssistant: `${BASE_URL}/team-05/assistants/add`, // Add a new assistant
//   assistant: `${BASE_URL}/team-05/assistants/:assistantId`, // View a specific assistant
//   editAssistant: `${BASE_URL}/team-05/assistants/:assistantId/edit`, 
//   groups: `${BASE_URL}/team-05/groups`, // Groups list page
//   joinGroup: `${BASE_URL}/team-05/join-group/:inviteCode`, // Join group page
//   groupChat: `${BASE_URL}/team-05/groups/:groupId/chat`, // Group chat page
// };

const pages = {
  home: `${BASE_URL}`, // Home page
  chats: `${BASE_URL}chats`, // Chats page
  addChat: `${BASE_URL}chats/add`,
  chat: `${BASE_URL}chats/:chatId`, // View a specific chat
  editChat: `${BASE_URL}chats/:chatId/edit`, // Edit a specific chat
  messages: `${BASE_URL}chats/:chatId/messages`, // View all messages in a specific chat
  assistants: `${BASE_URL}assistants`, // Assistants page
  addAssistant: `${BASE_URL}assistants/add`, // Add a new assistant
  assistant: `${BASE_URL}assistants/:assistantId`, // View a specific assistant
  editAssistant: `${BASE_URL}assistants/:assistantId/edit`, 
  groups: `${BASE_URL}groups`, // Groups list page
  joinGroup: `${BASE_URL}join-group/:inviteCode`, // Join group page
  groupChat: `${BASE_URL}groups/:groupId/chat`, // Group chat page
};

export type Page = keyof typeof pages;

export type Params = {
  assistantId: string;
  chatId?: string;
  groupId?: string;
  inviteCode?: string;
};

export const $router = createRouter(pages);

if (DEBUG) {
  logger({ $router });
}
