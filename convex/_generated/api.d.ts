/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as assistant_access from "../assistant_access.js";
import type * as assistants from "../assistants.js";
import type * as auth from "../auth.js";
import type * as calendarEvents from "../calendarEvents.js";
import type * as chats from "../chats.js";
import type * as google from "../google.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as openai from "../openai.js";
import type * as user_details from "../user_details.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  assistant_access: typeof assistant_access;
  assistants: typeof assistants;
  auth: typeof auth;
  calendarEvents: typeof calendarEvents;
  chats: typeof chats;
  google: typeof google;
  groups: typeof groups;
  http: typeof http;
  messages: typeof messages;
  openai: typeof openai;
  user_details: typeof user_details;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
