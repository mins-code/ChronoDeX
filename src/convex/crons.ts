import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Check for due notifications every 5 minutes
crons.interval(
  "check and send notifications",
  { minutes: 5 },
  internal.fcmScheduler.checkAndSendNotifications,
  {}
);

// Check for due reminders every minute
crons.interval(
  "check and send reminders",
  { minutes: 1 },
  internal.reminderScheduler.checkAndSendReminders,
  {}
);

export default crons;