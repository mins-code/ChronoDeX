import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Bell, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function ReminderList() {
  const reminders = useQuery(api.reminders.listAllAccessible);

  const activeReminders = reminders?.filter((r) => r.isActive).slice(0, 5) || [];

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "bg-blue-500/20 text-blue-200 border-blue-500/30";
      case "weekly":
        return "bg-purple-500/20 text-purple-200 border-purple-500/30";
      case "monthly":
        return "bg-pink-500/20 text-pink-200 border-pink-500/30";
      default:
        return "bg-gray-500/20 text-gray-200 border-gray-500/30";
    }
  };

  const getDayName = (dayOfWeek?: number) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayOfWeek !== undefined ? days[dayOfWeek] : "";
  };

  if (!reminders) {
    return null;
  }

  return (
    <Card className="p-6 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Active Reminders</h2>
      <div className="space-y-3">
        {activeReminders.length === 0 ? (
          <p className="text-white/60 text-center py-8">No active reminders</p>
        ) : (
          activeReminders.map((reminder, index) => (
            <motion.div
              key={reminder._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20 mt-1">
                  <Bell className="h-5 w-5 text-blue-200" />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-white">
                    {reminder.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className={getFrequencyColor(reminder.recurrenceRule.frequency)}>
                      {reminder.recurrenceRule.frequency}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-white/60">
                      <Clock className="h-3 w-3" />
                      {reminder.recurrenceRule.time}
                    </div>
                    {reminder.recurrenceRule.frequency === "weekly" && reminder.recurrenceRule.dayOfWeek !== undefined && (
                      <span className="text-xs text-white/60">
                        on {getDayName(reminder.recurrenceRule.dayOfWeek)}
                      </span>
                    )}
                    {reminder.recurrenceRule.frequency === "monthly" && reminder.recurrenceRule.dayOfMonth && (
                      <span className="text-xs text-white/60">
                        on day {reminder.recurrenceRule.dayOfMonth}
                      </span>
                    )}
                    {reminder.isShared && (
                      <Badge className="bg-purple-500/20 text-purple-200 border-purple-500/30">
                        Shared
                      </Badge>
                    )}
                    {reminder.showOnCalendar && (
                      <Badge className="bg-green-500/20 text-green-200 border-green-500/30">
                        On Calendar
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}
