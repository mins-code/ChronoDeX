"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

/**
 * Cron job to check for due reminders and send push notifications
 */
export const checkAndSendReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number }> => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0-6
    const currentDate = now.getDate(); // 1-31
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Get all active reminders
    const reminders: Array<any> = await ctx.runQuery(
      internal.reminders.getActiveReminders,
      {}
    );

    console.log(`Checking ${reminders.length} active reminders at ${currentTime}`);

    let processed = 0;

    for (const reminder of reminders) {
      const rule = reminder.recurrenceRule;
      let shouldSend = false;

      // Check if time matches
      if (rule.time === currentTime) {
        if (rule.frequency === "daily") {
          shouldSend = true;
        } else if (rule.frequency === "weekly" && rule.dayOfWeek === currentDay) {
          shouldSend = true;
        } else if (rule.frequency === "monthly" && rule.dayOfMonth === currentDate) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        try {
          await ctx.runAction(internal.reminderScheduler.sendReminderNotification, {
            reminderId: reminder._id,
          });
          processed++;
        } catch (error) {
          console.error(`Error sending reminder ${reminder._id}:`, error);
        }
      }
    }

    console.log(`Processed ${processed} reminders`);
    return { processed };
  },
});

/**
 * Send push notification for a reminder
 */
export const sendReminderNotification = internalAction({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const reminder: any = await ctx.runQuery(
      internal.reminders.getReminderById,
      { reminderId: args.reminderId }
    );

    if (!reminder) {
      console.log(`Reminder ${args.reminderId} not found`);
      return;
    }

    // Determine recipients
    let recipientIds = [reminder.userId];
    if (reminder.isShared && reminder.groupId) {
      const group: any = await ctx.runQuery(
        internal.reminders.getGroupById,
        { groupId: reminder.groupId }
      );
      if (group) {
        recipientIds = group.members;
      }
    }

    // Get device tokens for all recipients
    const allTokens: Array<any> = await ctx.runQuery(
      internal.reminders.getDeviceTokensForUsers,
      { userIds: recipientIds }
    );

    if (allTokens.length === 0) {
      console.log(`No device tokens found for reminder ${args.reminderId}`);
      return;
    }

    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "{}");
      initializeApp({
        credential: cert(serviceAccount),
      });
    }

    const messaging = getMessaging();

    // Send notifications
    for (const tokenDoc of allTokens) {
      try {
        await messaging.send({
          token: tokenDoc.token,
          notification: {
            title: "⏰ Reminder",
            body: reminder.title,
          },
          data: {
            type: "reminder",
            reminderId: args.reminderId,
          },
        });
        console.log(`Sent reminder notification to token ${tokenDoc.token}`);
      } catch (error) {
        console.error(`Failed to send to token ${tokenDoc.token}:`, error);
      }
    }
  },
});