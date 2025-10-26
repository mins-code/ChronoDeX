import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Register or update a device token for push notifications
 */
export const registerDeviceToken = mutation({
  args: {
    token: v.string(),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Check if token already exists for this user
    const existingToken = await ctx.db
      .query("deviceTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (existingToken) {
      // Update existing token
      await ctx.db.patch(existingToken._id, {
        lastUpdated: Date.now(),
        platform: args.platform,
      });
      return existingToken._id;
    }

    // Create new token
    return await ctx.db.insert("deviceTokens", {
      userId: user._id,
      token: args.token,
      platform: args.platform,
      lastUpdated: Date.now(),
    });
  },
});

/**
 * Get all device tokens for a specific user
 */
export const getUserDeviceTokens = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    // Only allow users to get their own tokens
    if (user._id !== args.userId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("deviceTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Remove a device token
 */
export const removeDeviceToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const tokenDoc = await ctx.db
      .query("deviceTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (tokenDoc && tokenDoc.userId === user._id) {
      await ctx.db.delete(tokenDoc._id);
    }
  },
});

/**
 * Internal mutation to store FCM credentials (called from action)
 */
export const storeCredentials = internalMutation({
  args: {
    credentials: v.string(), // JSON string of service account
  },
  handler: async (ctx, args) => {
    // Store in environment or secure storage
    // Note: In production, you should use Convex environment variables
    // This is a placeholder - actual implementation depends on your setup
    console.log("FCM credentials received and would be stored securely");
    return { success: true };
  },
});

/**
 * Internal query to get user tokens (called from action)
 */
export const internalGetUserTokens = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deviceTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/**
 * Internal query to get task details
 */
export const internalGetTask = internalQuery({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

/**
 * Internal query to get all notifications (for scheduler)
 */
export const internalGetAllNotifications = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("notifications").collect();
  },
});