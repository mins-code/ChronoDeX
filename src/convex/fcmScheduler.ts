import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Cron job to check for due notifications and send push notifications
 */
export const checkAndSendNotifications = internalAction({
  args: {},
  handler: async (ctx): Promise<{ processed: number }> => {
    const now = Date.now();
    
    console.log("⏰ Cron job: Checking for due notifications at", new Date(now).toISOString());
    
    // Get all upcoming notifications that are due
    const notifications: Array<any> = await ctx.runQuery(
      internal.fcmScheduler.getDueNotifications,
      { currentTime: now }
    );

    console.log(`📋 Found ${notifications.length} due notification(s) to send`);

    // Send push notification for each due notification
    for (const notification of notifications) {
      try {
        console.log(`🔔 Processing notification ${notification._id} for task ${notification.taskId}`);
        
        await ctx.runAction(internal.fcm.sendTaskNotification, {
          taskId: notification.taskId,
          notificationId: notification._id,
        });

        // Mark notification as sent
        await ctx.runMutation(internal.fcmScheduler.markNotificationSent, {
          notificationId: notification._id,
        });
        
        console.log(`✅ Notification ${notification._id} sent and marked as sent`);
      } catch (error) {
        console.error(`❌ Error sending notification ${notification._id}:`, error);
      }
    }

    console.log(`✅ Cron job completed: ${notifications.length} notification(s) processed`);
    return { processed: notifications.length };
  },
});

/**
 * Internal query to get due notifications
 */
export const getDueNotifications = internalQuery({
  args: { currentTime: v.number() },
  handler: async (ctx, args) => {
    // Get all upcoming notifications across all users
    const allNotifications: Array<any> = await ctx.runQuery(
      internal.fcmHelpers.internalGetAllNotifications,
      {}
    );
    
    // Filter for upcoming notifications that are due
    return allNotifications.filter(
      n => n.status === "upcoming" && n.scheduledTime <= args.currentTime
    );
  },
});

/**
 * Internal mutation to mark notification as sent
 */
export const markNotificationSent = internalMutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      status: "sent",
    });
  },
});