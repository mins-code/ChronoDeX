import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      description: args.description,
      createdBy: user._id,
      members: [user._id],
    });

    return groupId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const allGroups = await ctx.db.query("groups").collect();
    
    return allGroups.filter((group) => group.members.includes(user._id));
  },
});

export const get = query({
  args: { id: v.id("groups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) return null;

    const group = await ctx.db.get(args.id);
    if (!group || !group.members.includes(user._id)) {
      return null;
    }

    return group;
  },
});

export const leave = mutation({
  args: { id: v.id("groups") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const group = await ctx.db.get(args.id);
    if (!group || !group.members.includes(user._id)) {
      throw new Error("Group not found or you're not a member");
    }

    const updatedMembers = group.members.filter((id) => id !== user._id);
    
    if (updatedMembers.length === 0) {
      await ctx.db.delete(args.id);
    } else {
      await ctx.db.patch(args.id, { members: updatedMembers });
    }

    return args.id;
  },
});

export const sendInvitation = mutation({
  args: {
    groupId: v.id("groups"),
    inviteeEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const group = await ctx.db.get(args.groupId);
    if (!group || !group.members.includes(user._id)) {
      throw new Error("Group not found or you're not a member");
    }

    const invitee = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.inviteeEmail))
      .first();

    if (!invitee) {
      throw new Error("User with this email not found");
    }

    if (group.members.includes(invitee._id)) {
      throw new Error("User is already a member of this group");
    }

    const existingInvitation = await ctx.db
      .query("groupInvitations")
      .withIndex("by_group_and_invitee", (q) =>
        q.eq("groupId", args.groupId).eq("inviteeId", invitee._id)
      )
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingInvitation) {
      throw new Error("Invitation already sent to this user");
    }

    const invitationId = await ctx.db.insert("groupInvitations", {
      groupId: args.groupId,
      inviterId: user._id,
      inviteeId: invitee._id,
      status: "pending",
    });

    return invitationId;
  },
});

export const listInvitations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    const invitations = await ctx.db
      .query("groupInvitations")
      .withIndex("by_invitee", (q) => q.eq("inviteeId", user._id))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const enrichedInvitations = await Promise.all(
      invitations.map(async (inv) => {
        const group = await ctx.db.get(inv.groupId);
        const inviter = await ctx.db.get(inv.inviterId);
        return {
          ...inv,
          group,
          inviter,
        };
      })
    );

    return enrichedInvitations;
  },
});

export const acceptInvitation = mutation({
  args: { id: v.id("groupInvitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const invitation = await ctx.db.get(args.id);
    if (!invitation || invitation.inviteeId !== user._id) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation is no longer pending");
    }

    const group = await ctx.db.get(invitation.groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    await ctx.db.patch(invitation.groupId, {
      members: [...group.members, user._id],
    });

    await ctx.db.patch(args.id, { status: "accepted" });

    return invitation.groupId;
  },
});

export const declineInvitation = mutation({
  args: { id: v.id("groupInvitations") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const invitation = await ctx.db.get(args.id);
    if (!invitation || invitation.inviteeId !== user._id) {
      throw new Error("Invitation not found");
    }

    await ctx.db.patch(args.id, { status: "declined" });

    return args.id;
  },
});
