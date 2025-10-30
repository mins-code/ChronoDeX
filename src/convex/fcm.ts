"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as admin from "firebase-admin";

// Initialize Firebase Admin once at module level
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    
    // Check if service account is properly configured
    if (!serviceAccount.project_id) {
      console.error("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON is not properly configured");
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("✅ Firebase Admin initialized successfully for project:", serviceAccount.project_id);
    }
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
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
    console.log("🔔 Attempting to send push notification to user:", args.userId);
    
    // Check if Firebase Admin is initialized
    if (!admin.apps.length) {
      console.error("❌ Firebase Admin not initialized");
      return { success: false, error: "Firebase Admin not initialized" };
    }

    // Get user's device tokens
    const tokens: Array<{ _id: any; userId: any; token: string; platform?: string; lastUpdated: number }> = await ctx.runQuery(internal.fcmHelpers.internalGetUserTokens, {
      userId: args.userId,
    });

    console.log(`📱 Found ${tokens.length} device token(s) for user`);

    if (tokens.length === 0) {
      console.log("⚠️ No device tokens found for user:", args.userId);
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
      console.log("📤 Sending notification via Firebase...");
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`✅ Successfully sent notifications: ${response.successCount} success, ${response.failureCount} failed`);
      
      // Log any failures
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`❌ Failed to send to token ${idx}:`, resp.error);
          }
        });
      }
      
      return { 
        success: true, 
        successCount: response.successCount,
        failureCount: response.failureCount 
      };
    } catch (error: any) {
      console.error('❌ Error sending notification:', error);
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
    console.log("🔔 Sending task notification for task:", args.taskId);
    
    // Get task details
    const task: any = await ctx.runQuery(internal.fcmHelpers.internalGetTask, {
      taskId: args.taskId,
    });

    if (!task) {
      console.error("❌ Task not found:", args.taskId);
      return { success: false, message: "Task not found" };
    }

    console.log(`📋 Task found: "${task.title}" for user:`, task.userId);

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