import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

/**
 * Calculate the next due date based on recurrence rule
 */
function calculateNextDueDate(
  completedDate: number,
  rule: {
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek?: number;
    dayOfMonth?: number;
  }
): number {
  const date = new Date(completedDate);

  if (rule.frequency === "daily") {
    date.setDate(date.getDate() + 1);
  } else if (rule.frequency === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (rule.frequency === "monthly") {
    date.setMonth(date.getMonth() + 1);
    // Handle edge case: if original day doesn't exist in next month (e.g., Jan 31 -> Feb 28)
    if (rule.dayOfMonth && date.getDate() !== rule.dayOfMonth) {
      date.setDate(0); // Set to last day of previous month
    }
  }

  return date.getTime();
}

/**
 * Create a recurring task (parent template) and generate multiple future instances
 */
export const create = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    initialDueDate: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    tags: v.optional(v.array(v.string())),
    isShared: v.optional(v.boolean()),
    groupId: v.optional(v.id("groups")),
    recurrenceRule: v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      dayOfWeek: v.optional(v.number()),
      dayOfMonth: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Verify group membership if shared
    if (args.isShared && args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You are not a member of this group");
      }
    }

    // Create the recurring task parent
    const recurringTaskId = await ctx.db.insert("recurringTasks", {
      userId: user._id,
      groupId: args.groupId,
      title: args.title,
      description: args.description,
      priority: args.priority,
      tags: args.tags,
      isShared: args.isShared,
      recurrenceRule: args.recurrenceRule,
      isActive: true,
    });

    // Generate multiple future instances (6 occurrences)
    const instanceCount = 6;
    let currentDueDate = args.initialDueDate;
    const taskIds: Id<"tasks">[] = [];

    for (let i = 0; i < instanceCount; i++) {
      const taskId = await ctx.db.insert("tasks", {
        userId: user._id,
        title: args.title,
        description: args.description,
        dueDate: currentDueDate,
        priority: args.priority,
        status: "pending",
        tags: args.tags,
        isShared: args.isShared,
        groupId: args.groupId,
        recurringTaskId: recurringTaskId,
        isRecurring: true,
        completedAt: undefined,
      });

      taskIds.push(taskId);

      // Create notifications for this instance
      const remindBefore = 30;
      const scheduledTime = currentDueDate - remindBefore * 60 * 1000;
      const now = Date.now();

      if (args.isShared && args.groupId) {
        const group = await ctx.db.get(args.groupId);
        if (group) {
          for (const memberId of group.members) {
            await ctx.db.insert("notifications", {
              userId: memberId,
              taskId: taskId,
              message: `${args.title} is due soon`,
              type: "reminder",
              read: false,
              scheduledTime,
              remindBefore,
              status: scheduledTime > now ? "upcoming" : "sent",
            });
          }
        }
      } else {
        await ctx.db.insert("notifications", {
          userId: user._id,
          taskId: taskId,
          message: `${args.title} is due soon`,
          type: "reminder",
          read: false,
          scheduledTime,
          remindBefore,
          status: scheduledTime > now ? "upcoming" : "sent",
        });
      }

      // Calculate next due date
      currentDueDate = calculateNextDueDate(currentDueDate, args.recurrenceRule);
    }

    return { recurringTaskId, firstTaskId: taskIds[0] };
  },
});

/**
 * Generate the next task instance when current one is completed
 * Also ensures we always have future instances available
 */
export const generateNextInstance = internalMutation({
  args: {
    recurringTaskId: v.id("recurringTasks"),
    completedTaskId: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const recurringTask = await ctx.db.get(args.recurringTaskId);
    if (!recurringTask || !recurringTask.isActive) {
      throw new Error("Recurring task not found or inactive");
    }

    const completedTask = await ctx.db.get(args.completedTaskId);
    if (!completedTask) {
      throw new Error("Completed task not found");
    }

    // Check how many pending instances exist for this recurring task
    const existingInstances = await ctx.db
      .query("tasks")
      .withIndex("by_recurring_task", (q) => q.eq("recurringTaskId", args.recurringTaskId))
      .filter((q) => q.neq(q.field("status"), "completed"))
      .collect();

    // If we have fewer than 6 pending instances, create more
    const targetInstanceCount = 6;
    const instancesToCreate = targetInstanceCount - existingInstances.length;

    if (instancesToCreate > 0) {
      // Find the latest due date among existing instances
      let latestDueDate = completedTask.dueDate;
      for (const instance of existingInstances) {
        if (instance.dueDate > latestDueDate) {
          latestDueDate = instance.dueDate;
        }
      }

      // Generate new instances starting from after the latest due date
      let currentDueDate = calculateNextDueDate(latestDueDate, recurringTask.recurrenceRule);

      for (let i = 0; i < instancesToCreate; i++) {
        const nextTaskId = await ctx.db.insert("tasks", {
          userId: recurringTask.userId,
          title: recurringTask.title,
          description: recurringTask.description,
          dueDate: currentDueDate,
          priority: recurringTask.priority,
          status: "pending",
          tags: recurringTask.tags,
          isShared: recurringTask.isShared,
          groupId: recurringTask.groupId,
          recurringTaskId: args.recurringTaskId,
          isRecurring: true,
          completedAt: undefined,
        });

        // Create notifications for this instance
        const remindBefore = 30;
        const scheduledTime = currentDueDate - remindBefore * 60 * 1000;
        const now = Date.now();

        if (recurringTask.isShared && recurringTask.groupId) {
          const group = await ctx.db.get(recurringTask.groupId);
          if (group) {
            for (const memberId of group.members) {
              await ctx.db.insert("notifications", {
                userId: memberId,
                taskId: nextTaskId,
                message: `${recurringTask.title} is due soon`,
                type: "reminder",
                read: false,
                scheduledTime,
                remindBefore,
                status: scheduledTime > now ? "upcoming" : "sent",
              });
            }
          }
        } else {
          await ctx.db.insert("notifications", {
            userId: recurringTask.userId,
            taskId: nextTaskId,
            message: `${recurringTask.title} is due soon`,
            type: "reminder",
            read: false,
            scheduledTime,
            remindBefore,
            status: scheduledTime > now ? "upcoming" : "sent",
          });
        }

        // Calculate next due date for the next iteration
        currentDueDate = calculateNextDueDate(currentDueDate, recurringTask.recurrenceRule);
      }
    }

    return args.completedTaskId;
  },
});

/**
 * List all recurring tasks for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const recurringTasks = await ctx.db
      .query("recurringTasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return recurringTasks;
  },
});

/**
 * Stop/pause a recurring task
 */
export const toggleActive = mutation({
  args: {
    id: v.id("recurringTasks"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const recurringTask = await ctx.db.get(args.id);
    if (!recurringTask || recurringTask.userId !== user._id) {
      throw new Error("Recurring task not found");
    }

    await ctx.db.patch(args.id, { isActive: args.isActive });
    return args.id;
  },
});

/**
 * Delete a recurring task and all its instances
 */
export const remove = mutation({
  args: { id: v.id("recurringTasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const recurringTask = await ctx.db.get(args.id);
    if (!recurringTask || recurringTask.userId !== user._id) {
      throw new Error("Recurring task not found");
    }

    // Find all task instances
    const taskInstances = await ctx.db
      .query("tasks")
      .withIndex("by_recurring_task", (q) => q.eq("recurringTaskId", args.id))
      .collect();

    // Delete all task instances and their notifications
    for (const task of taskInstances) {
      const notifications = await ctx.db.query("notifications").collect();
      const taskNotifications = notifications.filter((n) => n.taskId === task._id);
      await Promise.all(taskNotifications.map((n) => ctx.db.delete(n._id)));
      await ctx.db.delete(task._id);
    }

    // Delete the recurring task parent
    await ctx.db.delete(args.id);
  },
});
