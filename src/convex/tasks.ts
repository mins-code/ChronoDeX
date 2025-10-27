import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed")),
    tags: v.optional(v.array(v.string())),
    dependencies: v.optional(v.array(v.id("tasks"))),
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.string()),
    isShared: v.optional(v.boolean()),
    groupId: v.optional(v.id("groups")),
    recurrenceRule: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
      dayOfWeek: v.optional(v.number()),
      dayOfMonth: v.optional(v.number()),
    })),
    recurrenceEnd: v.optional(v.object({
      type: v.union(v.literal("forever"), v.literal("until"), v.literal("count")),
      endDate: v.optional(v.number()),
      occurrences: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args): Promise<Id<"tasks">> => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    if (args.isShared && args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You are not a member of this group");
      }
    }

    if (args.recurrenceRule) {
      const result: { recurringTaskId: Id<"recurringTasks">; firstTaskId: Id<"tasks"> } = await ctx.runMutation(internal.recurringTasks.create, {
        title: args.title,
        description: args.description,
        initialDueDate: args.dueDate,
        priority: args.priority,
        tags: args.tags,
        isShared: args.isShared,
        groupId: args.groupId,
        recurrenceRule: args.recurrenceRule,
        ...(args.recurrenceEnd && { recurrenceEnd: args.recurrenceEnd }),
      });
      return result.firstTaskId;
    }

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      userId: user._id,
      completedAt: undefined,
    });

    const remindBefore = 30;
    const scheduledTime = args.dueDate - remindBefore * 60 * 1000;
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

    return taskId;
  },
});

export const restore = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed"), v.literal("overdue")),
    tags: v.optional(v.array(v.string())),
    dependencies: v.optional(v.array(v.id("tasks"))),
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.string()),
    recurringTaskId: v.optional(v.id("recurringTasks")),
    completedAt: v.optional(v.number()),
    isShared: v.optional(v.boolean()),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const taskId = await ctx.db.insert("tasks", {
      ...args,
      userId: user._id,
    });

    // Recreate notification
    const remindBefore = 30;
    const scheduledTime = args.dueDate - remindBefore * 60 * 1000;
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

    return taskId;
  },
});

export const list = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    let tasksQuery = ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id));

    const tasks = await tasksQuery.collect();

    return tasks.filter((task) => {
      if (args.status && task.status !== args.status) return false;
      if (args.startDate && task.dueDate < args.startDate) return false;
      if (args.endDate && task.dueDate > args.endDate) return false;
      return true;
    });
  },
});

export const listShared = query({
  args: {
    groupId: v.id("groups"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const group = await ctx.db.get(args.groupId);
    if (!group || !group.members.includes(user._id)) {
      return [];
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    return tasks.filter((task) => {
      if (args.status && task.status !== args.status) return false;
      if (args.startDate && task.dueDate < args.startDate) return false;
      if (args.endDate && task.dueDate > args.endDate) return false;
      return true;
    });
  },
});

export const listAllAccessible = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const privateTasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((g) => g.members.includes(user._id));

    const sharedTasksArrays = await Promise.all(
      userGroups.map((group) =>
        ctx.db
          .query("tasks")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect()
      )
    );

    const sharedTasks = sharedTasksArrays.flat();
    const allTasks = [...privateTasks.filter((t) => !t.isShared), ...sharedTasks];

    return allTasks.filter((task) => {
      if (args.status && task.status !== args.status) return false;
      if (args.startDate && task.dueDate < args.startDate) return false;
      if (args.endDate && task.dueDate > args.endDate) return false;
      return true;
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    status: v.optional(v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed"), v.literal("overdue"))),
    tags: v.optional(v.array(v.string())),
    dependencies: v.optional(v.array(v.id("tasks"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const { id, ...updates } = args;
    const task = await ctx.db.get(id);
    
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.isShared && task.groupId) {
      const group = await ctx.db.get(task.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You don't have permission to edit this shared task");
      }
    } else if (task.userId !== user._id) {
      throw new Error("Task not found");
    }

    if (updates.status === "completed" && task.status !== "completed") {
      await ctx.db.patch(id, { ...updates, completedAt: Date.now() });
      
      if (task.recurringTaskId) {
        await ctx.runMutation(internal.recurringTasks.generateNextInstance, {
          recurringTaskId: task.recurringTaskId,
          completedTaskId: id,
        });
      }
      
      const notifications = await ctx.db.query("notifications").collect();
      const taskNotifications = notifications.filter(n => n.taskId === id);
      await Promise.all(
        taskNotifications.map(n => ctx.db.delete(n._id))
      );
    } else {
      await ctx.db.patch(id, updates);
    }

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.isShared && task.groupId) {
      const group = await ctx.db.get(task.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You don't have permission to delete this shared task");
      }
    } else if (task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const notifications = await ctx.db
      .query("notifications")
      .collect();
    
    const taskNotifications = notifications.filter(n => n.taskId === args.id);
    await Promise.all(
      taskNotifications.map(n => ctx.db.delete(n._id))
    );

    await ctx.db.delete(args.id);
  },
});

export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const searchLower = args.searchTerm.toLowerCase();
    return tasks.filter((task) =>
      task.title.toLowerCase().includes(searchLower) ||
      task.description?.toLowerCase().includes(searchLower)
    );
  },
});

export const getUpcoming = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const now = Date.now();
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const upcomingTasks = tasks
      .filter((task) => task.status !== "completed" && task.dueDate >= now)
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 5);

    // Fetch group information for shared tasks
    const tasksWithGroups = await Promise.all(
      upcomingTasks.map(async (task) => {
        if (task.isShared && task.groupId) {
          const group = await ctx.db.get(task.groupId);
          return { ...task, group };
        }
        return { ...task, group: null };
      })
    );

    return tasksWithGroups;
  },
});

export const addDependency = mutation({
  args: {
    taskId: v.id("tasks"),
    dependsOn: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const dependencyTask = await ctx.db.get(args.dependsOn);
    if (!dependencyTask || dependencyTask.userId !== user._id) {
      throw new Error("Dependency task not found");
    }

    const currentDependencies = task.dependencies || [];
    if (currentDependencies.includes(args.dependsOn)) {
      throw new Error("Dependency already exists");
    }

    await ctx.db.patch(args.taskId, {
      dependencies: [...currentDependencies, args.dependsOn],
    });

    return args.taskId;
  },
});

export const removeDependency = mutation({
  args: {
    taskId: v.id("tasks"),
    dependsOn: v.id("tasks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const currentDependencies = task.dependencies || [];
    const updatedDependencies = currentDependencies.filter(
      (depId) => depId !== args.dependsOn
    );

    await ctx.db.patch(args.taskId, {
      dependencies: updatedDependencies,
    });

    return args.taskId;
  },
});

export const postpone = mutation({
  args: {
    id: v.id("tasks"),
    customDate: v.optional(v.number()), // If provided, use this; otherwise add 24 hours
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const task = await ctx.db.get(args.id);
    if (!task) throw new Error("Task not found");

    if (task.isShared && task.groupId) {
      const group = await ctx.db.get(task.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You don't have permission to postpone this shared task");
      }
    } else if (task.userId !== user._id) {
      throw new Error("Task not found");
    }

    const newDueDate = args.customDate || (task.dueDate + 24 * 60 * 60 * 1000);
    
    await ctx.db.patch(args.id, { dueDate: newDueDate });

    // Update associated notifications
    const notifications = await ctx.db.query("notifications").collect();
    const taskNotifications = notifications.filter(n => n.taskId === args.id);
    
    for (const notif of taskNotifications) {
      const remindBefore = notif.remindBefore || 30;
      const newScheduledTime = newDueDate - remindBefore * 60 * 1000;
      await ctx.db.patch(notif._id, {
        scheduledTime: newScheduledTime,
        status: newScheduledTime > Date.now() ? "upcoming" : "sent",
      });
    }

    return args.id;
  },
});