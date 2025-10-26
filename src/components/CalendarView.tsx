import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskDialog } from "./TaskDialog";

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const tasks = useQuery(api.tasks.listAllAccessible, {
    startDate: startOfMonth.getTime(),
    endDate: endOfMonth.getTime(),
  });

  const reminders = useQuery(api.reminders.listAllAccessible);

  const getDaysInMonth = () => {
    const days = [];
    const firstDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
    }

    return days;
  };

  const getTasksForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toDateString();
    return tasks?.filter((task) => new Date(task.dueDate).toDateString() === dateStr) || [];
  };

  const getRemindersForDate = (date: Date | null) => {
    if (!date || !reminders) return [];
    
    return reminders.filter((reminder) => {
      if (!reminder.showOnCalendar) return false;
      
      const rule = reminder.recurrenceRule;
      if (rule.frequency === "daily") return true;
      if (rule.frequency === "weekly" && rule.dayOfWeek === date.getDay()) return true;
      if (rule.frequency === "monthly" && rule.dayOfMonth === date.getDate()) return true;
      return false;
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <>
      <Card className="p-3 sm:p-4 md:p-6 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousMonth}
              className="text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={nextMonth}
              className="text-white hover:bg-white/10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => {
                setSelectedDate(new Date());
                setShowTaskDialog(true);
              }}
              className="ml-2 sm:ml-4 bg-white/20 hover:bg-white/30 text-white flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Task</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-white/60 font-semibold py-1 sm:py-2 text-xs sm:text-sm">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}

          {getDaysInMonth().map((date, index) => {
            const dayTasks = getTasksForDate(date);
            const dayReminders = getRemindersForDate(date);
            const isToday = date?.toDateString() === new Date().toDateString();

            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.05 }}
                className={`min-h-16 sm:min-h-20 md:min-h-24 p-1 sm:p-2 rounded-lg backdrop-blur-sm cursor-pointer ${
                  date
                    ? isToday
                      ? "bg-white/30 border-2 border-white/50"
                      : "bg-white/10 border border-white/20 hover:bg-white/20"
                    : ""
                }`}
                onClick={() => {
                  if (date) {
                    setSelectedDate(date);
                    setShowTaskDialog(true);
                  }
                }}
              >
                {date && (
                  <>
                    <div className="text-white font-semibold mb-1 text-xs sm:text-sm">{date.getDate()}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <div
                          key={task._id}
                          className={`text-xs p-1 rounded truncate ${
                            task.priority === "high"
                              ? "bg-red-500/30 text-white"
                              : task.priority === "medium"
                              ? "bg-yellow-500/30 text-white"
                              : "bg-green-500/30 text-white"
                          }`}
                        >
                          <span className="hidden sm:inline">{task.title}</span>
                          <span className="sm:hidden">{task.title.substring(0, 8)}...</span>
                        </div>
                      ))}
                      {dayReminders.slice(0, 1).map((reminder) => (
                        <div
                          key={reminder._id}
                          className="text-xs p-1 rounded truncate bg-blue-500/30 text-white"
                        >
                          <span className="hidden sm:inline">⏰ {reminder.title}</span>
                          <span className="sm:hidden">⏰</span>
                        </div>
                      ))}
                      {(dayTasks.length + dayReminders.length) > 3 && (
                        <div className="text-xs text-white/60">
                          +{dayTasks.length + dayReminders.length - 3}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>

      {showTaskDialog && (
        <TaskDialog
          open={showTaskDialog}
          onClose={() => setShowTaskDialog(false)}
          defaultDate={selectedDate || undefined}
        />
      )}
    </>
  );
}