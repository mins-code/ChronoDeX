import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export function TaskList() {
  const tasks = useQuery(api.tasks.getUpcoming);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);

  const handleToggleComplete = async (taskId: Id<"tasks">, currentStatus: string) => {
    try {
      await updateTask({
        id: taskId,
        status: currentStatus === "completed" ? "pending" : "completed",
      });
      toast.success(currentStatus === "completed" ? "Task reopened" : "Task completed!");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (taskId: Id<"tasks">) => {
    try {
      await deleteTask({ id: taskId });
      toast.success("Task deleted");
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/20 text-red-200 border-red-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-200 border-yellow-500/30";
      default:
        return "bg-green-500/20 text-green-200 border-green-500/30";
    }
  };

  if (!tasks) {
    return null;
  }

  return (
    <Card className="p-6 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-4">Upcoming Tasks</h2>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-white/60 text-center py-8">No upcoming tasks</p>
        ) : (
          tasks.map((task, index) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 rounded-lg backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
            >
              <div className="flex items-start gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-1 text-white hover:bg-white/10"
                  onClick={() => handleToggleComplete(task._id, task.status)}
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </Button>

                <div className="flex-1">
                  <h3
                    className={`font-semibold text-white ${
                      task.status === "completed" ? "line-through opacity-60" : ""
                    }`}
                  >
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-sm text-white/70 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                    <div className="flex items-center gap-1 text-xs text-white/60">
                      <Clock className="h-3 w-3" />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/60 hover:text-red-400 hover:bg-white/10"
                  onClick={() => handleDelete(task._id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </Card>
  );
}
