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
import type * as actions from "../actions.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as fcm from "../fcm.js";
import type * as fcmHelpers from "../fcmHelpers.js";
import type * as fcmScheduler from "../fcmScheduler.js";
import type * as groups from "../groups.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as recurringTasks from "../recurringTasks.js";
import type * as reminderScheduler from "../reminderScheduler.js";
import type * as reminders from "../reminders.js";
import type * as tasks from "../tasks.js";
import type * as testData from "../testData.js";
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
  actions: typeof actions;
  "auth/emailOtp": typeof auth_emailOtp;
  auth: typeof auth;
  crons: typeof crons;
  fcm: typeof fcm;
  fcmHelpers: typeof fcmHelpers;
  fcmScheduler: typeof fcmScheduler;
  groups: typeof groups;
  http: typeof http;
  notifications: typeof notifications;
  recurringTasks: typeof recurringTasks;
  reminderScheduler: typeof reminderScheduler;
  reminders: typeof reminders;
  tasks: typeof tasks;
  testData: typeof testData;
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
