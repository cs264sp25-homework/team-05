import { BASE_URL } from "@/env";
import { logger } from "@nanostores/logger";
import { createRouter } from "@nanostores/router";

const DEBUG = false;

const pages = {
  home: `${BASE_URL}/team-05/`, // Home page
  chats: `${BASE_URL}/team-05/chats`, // Chats page
  addChat: `${BASE_URL}/team-05/chats/add`,
  chat: `${BASE_URL}/team-05/chats/:chatId`, // View a specific chat
  editChat: `${BASE_URL}/team-05/chats/:chatId/edit`, // Edit a specific chat
  messages: `${BASE_URL}/team-05/chats/:chatId/messages`, // View all messages in a specific chat
  groups: `${BASE_URL}/team-05/groups`, // Groups list page
  joinGroup: `${BASE_URL}/team-05/join-group/:inviteCode`, // Join group page
  groupChat: `${BASE_URL}/team-05/groups/:groupId/chat`, // Group chat page
};

export type Page = keyof typeof pages;

export type Params = {
  chatId?: string;
  groupId?: string;
  inviteCode?: string;
};

export const $router = createRouter(pages);

if (DEBUG) {
  logger({ $router });
}
