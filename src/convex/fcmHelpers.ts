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
    console.log('🔐 registerDeviceToken called');
    console.log('📝 Token length:', args.token.length);
    console.log('📝 Platform:', args.platform);
    
    try {
      const user = await getCurrentUser(ctx);
      if (!user) {
        console.error('❌ No user found - unauthorized');
        console.error('❌ getCurrentUser returned:', user);
        throw new Error("Unauthorized - user not authenticated");
      }
      
      console.log('✅ User authenticated:', user._id);
      console.log('📝 Registering token (first 20 chars):', args.token.substring(0, 20) + '...');

      // Check if token already exists for this user
      console.log('🔍 Checking for existing token...');
      const existingToken = await ctx.db
        .query("deviceTokens")
        .withIndex("by_token", (q) => q.eq("token", args.token))
        .first();

      if (existingToken) {
        console.log('🔄 Token already exists, updating...');
        console.log('🔄 Existing token ID:', existingToken._id);
        // Update existing token
        await ctx.db.patch(existingToken._id, {
          lastUpdated: Date.now(),
          platform: args.platform,
        });
        console.log('✅ Token updated successfully:', existingToken._id);
        return existingToken._id;
      }

      // Create new token
      console.log('➕ Creating new token entry...');
      const tokenId = await ctx.db.insert("deviceTokens", {
        userId: user._id,
        token: args.token,
        platform: args.platform,
        lastUpdated: Date.now(),
      });
      console.log('✅ Token created successfully:', tokenId);
      
      // Verify the token was saved
      const savedToken = await ctx.db.get(tokenId);
      console.log('✅ Verified token in database:', savedToken ? 'YES' : 'NO');
      
      return tokenId;
    } catch (error: any) {
      console.error('❌ Error in registerDeviceToken:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
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