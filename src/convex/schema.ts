import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // Groups for shared tasks
    groups: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      createdBy: v.id("users"),
      members: v.array(v.id("users")),
    }),

    // Group invitations
    groupInvitations: defineTable({
      groupId: v.id("groups"),
      inviterId: v.id("users"),
      inviteeId: v.id("users"),
      status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    })
      .index("by_invitee", ["inviteeId"])
      .index("by_group_and_invitee", ["groupId", "inviteeId"]),

    // Reminders (separate from tasks - for personal items)
    reminders: defineTable({
      userId: v.id("users"),
      groupId: v.optional(v.id("groups")),
      title: v.string(),
      recurrenceRule: v.object({
        frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
        time: v.string(), // Format: "HH:MM" (24-hour)
        dayOfWeek: v.optional(v.number()), // 0-6 for weekly
        dayOfMonth: v.optional(v.number()), // 1-31 for monthly
      }),
      showOnCalendar: v.boolean(),
      isShared: v.boolean(),
      isActive: v.boolean(),
    })
      .index("by_user", ["userId"])
      .index("by_group", ["groupId"]),

    // Recurring Tasks (Parent/Template)
    recurringTasks: defineTable({
      userId: v.id("users"),
      groupId: v.optional(v.id("groups")),
      title: v.string(),
      description: v.optional(v.string()),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      tags: v.optional(v.array(v.string())),
      isShared: v.optional(v.boolean()),
      recurrenceRule: v.object({
        frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly")),
        dayOfWeek: v.optional(v.number()), // 0-6 for weekly
        dayOfMonth: v.optional(v.number()), // 1-31 for monthly
      }),
      isActive: v.boolean(), // Can be paused/stopped
    })
      .index("by_user", ["userId"])
      .index("by_group", ["groupId"]),

    // FCM Device Tokens table
    deviceTokens: defineTable({
      userId: v.id("users"),
      token: v.string(),
      platform: v.optional(v.string()),
      lastUpdated: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_token", ["token"]),

    tasks: defineTable({
      userId: v.id("users"),
      title: v.string(),
      description: v.optional(v.string()),
      dueDate: v.number(),
      priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
      status: v.union(v.literal("pending"), v.literal("in-progress"), v.literal("completed")),
      tags: v.optional(v.array(v.string())),
      dependencies: v.optional(v.array(v.id("tasks"))),
      isRecurring: v.optional(v.boolean()),
      recurringPattern: v.optional(v.string()),
      recurringTaskId: v.optional(v.id("recurringTasks")), // Link to parent recurring task
      completedAt: v.optional(v.number()),
      // Sharing properties
      isShared: v.optional(v.boolean()),
      groupId: v.optional(v.id("groups")),
    })
      .index("by_user", ["userId"])
      .index("by_user_and_status", ["userId", "status"])
      .index("by_user_and_due_date", ["userId", "dueDate"])
      .index("by_group", ["groupId"])
      .index("by_recurring_task", ["recurringTaskId"]),

    notifications: defineTable({
      userId: v.id("users"),
      taskId: v.id("tasks"),
      message: v.string(),
      type: v.union(v.literal("reminder"), v.literal("deadline"), v.literal("dependency")),
      read: v.boolean(),
      scheduledTime: v.number(),
      remindBefore: v.optional(v.number()),
      status: v.union(v.literal("upcoming"), v.literal("sent"), v.literal("missed")),
    }).index("by_user", ["userId"])
      .index("by_user_and_status", ["userId", "status"]),

    actions: defineTable({
      userId: v.id("users"),
      type: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
      taskId: v.id("tasks"),
      previousState: v.optional(v.any()),
      newState: v.optional(v.any()),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;