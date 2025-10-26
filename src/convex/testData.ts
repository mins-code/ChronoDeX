import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

export const addTestTasksWithNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized - Please log in first");

    // Create test tasks with notifications
    const task1 = await ctx.db.insert("tasks", {
      userId: user._id,
      title: "Complete Project Report",
      description: "Finish the quarterly project report",
      dueDate: Date.now() + 2 * 60 * 60 * 1000, // 2 hours from now
      priority: "high",
      status: "pending",
    });

    const task2 = await ctx.db.insert("tasks", {
      userId: user._id,
      title: "Team Meeting",
      description: "Weekly team sync meeting",
      dueDate: Date.now() + 24 * 60 * 60 * 1000, // 1 day from now
      priority: "medium",
      status: "pending",
    });

    const task3 = await ctx.db.insert("tasks", {
      userId: user._id,
      title: "Review Code Changes",
      description: "Review pull requests",
      dueDate: Date.now() + 4 * 60 * 60 * 1000, // 4 hours from now
      priority: "low",
      status: "pending",
    });

    // Create notifications for these tasks
    await ctx.db.insert("notifications", {
      userId: user._id,
      taskId: task1,
      message: "Complete Project Report is due soon",
      type: "reminder",
      read: false,
      scheduledTime: Date.now() + 2 * 60 * 60 * 1000 - 30 * 60 * 1000, // 30 min before
      remindBefore: 30,
      status: "upcoming",
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      taskId: task2,
      message: "Team Meeting is coming up",
      type: "reminder",
      read: false,
      scheduledTime: Date.now() + 24 * 60 * 60 * 1000 - 60 * 60 * 1000, // 1 hour before
      remindBefore: 60,
      status: "upcoming",
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      taskId: task3,
      message: "Review Code Changes deadline approaching",
      type: "deadline",
      read: false,
      scheduledTime: Date.now() + 4 * 60 * 60 * 1000 - 10 * 60 * 1000, // 10 min before
      remindBefore: 10,
      status: "upcoming",
    });

    // Create a past notification
    await ctx.db.insert("notifications", {
      userId: user._id,
      taskId: task1,
      message: "Test notification that was already sent",
      type: "reminder",
      read: false,
      scheduledTime: Date.now() - 60 * 60 * 1000, // 1 hour ago
      remindBefore: 30,
      status: "sent",
    });

    return { success: true, message: "Test data created successfully" };
  },
});
