import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

/**
 * Create a new reminder
 */
export const create = mutation({
  args: {
    title: v.string(),
    recurrenceRule: v.object({
      frequency: v.union(
        v.literal("daily"), 
        v.literal("weekly"), 
        v.literal("monthly"),
        v.literal("yearly")
      ),
      time: v.string(),
      dayOfWeek: v.optional(v.number()),
      dayOfMonth: v.optional(v.number()),
      monthOfYear: v.optional(v.number()),
    }),
    recurrenceEnd: v.optional(v.object({
      type: v.union(v.literal("forever"), v.literal("until"), v.literal("count")),
      endDate: v.optional(v.number()),
      occurrences: v.optional(v.number()),
    })),
    showOnCalendar: v.boolean(),
    isShared: v.optional(v.boolean()),
    groupId: v.optional(v.id("groups")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    if (args.isShared && args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You are not a member of this group");
      }
    }

    const reminderId = await ctx.db.insert("reminders", {
      userId: user._id,
      groupId: args.groupId,
      title: args.title,
      recurrenceRule: args.recurrenceRule,
      recurrenceEnd: args.recurrenceEnd,
      showOnCalendar: args.showOnCalendar,
      isShared: args.isShared || false,
      isActive: true,
    });

    return reminderId;
  },
});

/**
 * List all reminders for the current user
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return reminders;
  },
});

/**
 * List all accessible reminders (private + shared from groups)
 */
export const listAllAccessible = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Get private reminders
    const privateReminders = await ctx.db
      .query("reminders")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get shared reminders from groups
    const allGroups = await ctx.db.query("groups").collect();
    const userGroups = allGroups.filter((g) => g.members.includes(user._id));

    const sharedRemindersArrays = await Promise.all(
      userGroups.map((group) =>
        ctx.db
          .query("reminders")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect()
      )
    );

    const sharedReminders = sharedRemindersArrays.flat();
    const allReminders = [...privateReminders.filter((r) => !r.isShared), ...sharedReminders];

    return allReminders;
  },
});

/**
 * Update a reminder
 */
export const update = mutation({
  args: {
    id: v.id("reminders"),
    title: v.optional(v.string()),
    recurrenceRule: v.optional(v.object({
      frequency: v.union(
        v.literal("daily"), 
        v.literal("weekly"), 
        v.literal("monthly"),
        v.literal("yearly")
      ),
      time: v.string(),
      dayOfWeek: v.optional(v.number()),
      dayOfMonth: v.optional(v.number()),
      monthOfYear: v.optional(v.number()),
    })),
    recurrenceEnd: v.optional(v.object({
      type: v.union(v.literal("forever"), v.literal("until"), v.literal("count")),
      endDate: v.optional(v.number()),
      occurrences: v.optional(v.number()),
    })),
    showOnCalendar: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const { id, ...updates } = args;
    const reminder = await ctx.db.get(id);

    if (!reminder) {
      throw new Error("Reminder not found");
    }

    if (reminder.isShared && reminder.groupId) {
      const group = await ctx.db.get(reminder.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You don't have permission to edit this shared reminder");
      }
    } else if (reminder.userId !== user._id) {
      throw new Error("Reminder not found");
    }

    await ctx.db.patch(id, updates);
    return id;
  },
});

/**
 * Delete a reminder
 */
export const remove = mutation({
  args: { id: v.id("reminders") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const reminder = await ctx.db.get(args.id);
    if (!reminder) {
      throw new Error("Reminder not found");
    }

    // Check permissions - allow deletion if user owns it OR is a member of the shared group
    if (reminder.isShared && reminder.groupId) {
      const group = await ctx.db.get(reminder.groupId);
      if (!group || !group.members.includes(user._id)) {
        throw new Error("You don't have permission to delete this shared reminder");
      }
    } else if (reminder.userId !== user._id) {
      throw new Error("You don't have permission to delete this reminder");
    }

    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Internal query to get all active reminders (for cron job)
 */
export const getAllActive = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allReminders = await ctx.db.query("reminders").collect();
    return allReminders.filter((r) => r.isActive);
  },
});

/**
 * Helper queries for the reminder scheduler
 */
export const getActiveReminders = internalQuery({
  args: {},
  handler: async (ctx) => {
    const allReminders = await ctx.db.query("reminders").collect();
    return allReminders.filter((r) => r.isActive);
  },
});

export const getReminderById = internalQuery({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reminderId);
  },
});

export const getGroupById = internalQuery({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.groupId);
  },
});

export const getDeviceTokensForUsers = internalQuery({
  args: { userIds: v.array(v.id("users")) },
  handler: async (ctx, args) => {
    const allTokens = await ctx.db.query("deviceTokens").collect();
    return allTokens.filter((token) => args.userIds.includes(token.userId));
  },
});