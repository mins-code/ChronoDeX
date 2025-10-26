import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    type: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    taskId: v.id("tasks"),
    previousState: v.optional(v.any()),
    newState: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db.insert("actions", {
      ...args,
      userId: user._id,
    });
  },
});

export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const actions = await ctx.db
      .query("actions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return args.limit ? actions.slice(0, args.limit) : actions;
  },
});
