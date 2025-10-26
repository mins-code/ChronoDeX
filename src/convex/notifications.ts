import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    message: v.string(),
    type: v.union(v.literal("reminder"), v.literal("deadline"), v.literal("dependency")),
    scheduledTime: v.optional(v.number()),
    remindBefore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const remindBefore = args.remindBefore || 30; // default 30 minutes
    const scheduledTime = args.scheduledTime || (task.dueDate - remindBefore * 60 * 1000);
    const now = Date.now();

    return await ctx.db.insert("notifications", {
      ...args,
      userId: user._id,
      read: false,
      scheduledTime,
      remindBefore,
      status: scheduledTime > now ? "upcoming" : "sent",
    });
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    // Enrich with task data
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notif) => {
        const task = await ctx.db.get(notif.taskId);
        return {
          ...notif,
          task: task || null,
        };
      })
    );

    return args.limit ? enrichedNotifications.slice(0, args.limit) : enrichedNotifications;
  },
});

export const getUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const now = Date.now();
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", user._id).eq("status", "upcoming")
      )
      .collect();

    const enrichedNotifications = await Promise.all(
      notifications.map(async (notif) => {
        const task = await ctx.db.get(notif.taskId);
        return {
          ...notif,
          task: task || null,
        };
      })
    );

    return enrichedNotifications
      .filter((n) => n.scheduledTime >= now)
      .sort((a, b) => a.scheduledTime - b.scheduledTime);
  },
});

export const getPast = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_status", (q) => 
        q.eq("userId", user._id).eq("status", "sent")
      )
      .order("desc")
      .collect();

    const enrichedNotifications = await Promise.all(
      notifications.map(async (notif) => {
        const task = await ctx.db.get(notif.taskId);
        return {
          ...notif,
          task: task || null,
        };
      })
    );

    return enrichedNotifications;
  },
});

export const updateRemindBefore = mutation({
  args: {
    id: v.id("notifications"),
    remindBefore: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    const task = await ctx.db.get(notification.taskId);
    if (!task) throw new Error("Task not found");

    const newScheduledTime = task.dueDate - args.remindBefore * 60 * 1000;
    const now = Date.now();

    await ctx.db.patch(args.id, {
      remindBefore: args.remindBefore,
      scheduledTime: newScheduledTime,
      status: newScheduledTime > now ? "upcoming" : "sent",
    });

    return args.id;
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.id, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    await Promise.all(
      notifications.map((n) => ctx.db.patch(n._id, { read: true }))
    );
  },
});

export const sendTestNotification = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    // Create a test notification in the database
    const notificationId = await ctx.db.insert("notifications", {
      userId: user._id,
      taskId: args.taskId,
      message: `Test notification for: ${task.title}`,
      type: "reminder",
      read: false,
      scheduledTime: Date.now(),
      remindBefore: 0,
      status: "sent",
    });

    // Schedule the push notification to be sent immediately
    await ctx.scheduler.runAfter(0, internal.fcm.sendTaskNotification, {
      taskId: args.taskId,
      notificationId: notificationId,
    });

    return notificationId;
  },
});

export const remove = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const notification = await ctx.db.get(args.id);
    if (!notification || notification.userId !== user._id) {
      throw new Error("Notification not found");
    }

    await ctx.db.delete(args.id);
  },
});