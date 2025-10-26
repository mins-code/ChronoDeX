"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as admin from "firebase-admin";

// Initialize Firebase Admin once at module level
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } catch (error) {
    console.error("Failed to initialize Firebase Admin:", error);
  }
}

/**
 * Send push notification to a specific user
 * This action uses the Firebase Admin SDK to send notifications
 */
export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string; tokenCount?: number; successCount?: number; failureCount?: number; error?: string }> => {
    // Get user's device tokens
    const tokens: Array<{ _id: any; userId: any; token: string; platform?: string; lastUpdated: number }> = await ctx.runQuery(internal.fcmHelpers.internalGetUserTokens, {
      userId: args.userId,
    });

    if (tokens.length === 0) {
      console.log("No device tokens found for user:", args.userId);
      return { success: false, message: "No device tokens registered" };
    }

    const message = {
      notification: {
        title: args.title,
        body: args.body,
      },
      data: args.data || {},
      tokens: tokens.map(t => t.token),
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Successfully sent notifications:', response.successCount);
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount 
      };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Send notification for a specific task reminder
 */
export const sendTaskNotification = internalAction({
  args: {
    taskId: v.id("tasks"),
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message?: string; tokenCount?: number }> => {
    // Get task details
    const task: any = await ctx.runQuery(internal.fcmHelpers.internalGetTask, {
      taskId: args.taskId,
    });

    if (!task) {
      return { success: false, message: "Task not found" };
    }

    // Send push notification
    return await ctx.runAction(internal.fcm.sendPushNotification, {
      userId: task.userId,
      title: `Task Reminder: ${task.title}`,
      body: `Your task "${task.title}" is due soon!`,
      data: {
        taskId: args.taskId,
        notificationId: args.notificationId,
        type: "task_reminder",
      },
    });
  },
});