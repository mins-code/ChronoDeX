import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, Edit, Trash2, Save, X, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface Task {
  _id: Id<"tasks">;
  title: string;
  description?: string;
  dueDate: number;
  priority: "low" | "medium" | "high";
  status: "pending" | "in-progress" | "completed";
  dependencies?: Array<Id<"tasks">>;
  isShared?: boolean;
  groupId?: Id<"groups">;
  recurringTaskId?: Id<"recurringTasks">;
  instanceNumber?: number;
}

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  onToggleComplete: (taskId: Id<"tasks">, currentStatus: string) => void;
  onDelete: (taskId: Id<"tasks">) => void;
  onEdit: (taskId: Id<"tasks">, updates: any) => void;
  onPostpone?: (taskId: Id<"tasks">) => void;
  emptyMessage?: string;
}

export function TaskSection({
  title,
  tasks,
  onToggleComplete,
  onDelete,
  onEdit,
  onPostpone,
  emptyMessage = "No tasks found",
}: TaskSectionProps) {
  const [editingTaskId, setEditingTaskId] = useState<Id<"tasks"> | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

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

  const handleEditClick = (task: Task) => {
    setEditingTaskId(task._id);
    setEditForm({
      title: task.title,
      description: task.description || "",
      dueDate: new Date(task.dueDate).toISOString().split("T")[0],
      priority: task.priority,
      status: task.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (taskId: Id<"tasks">) => {
    if (!editForm) return;
    
    await onEdit(taskId, {
      title: editForm.title,
      description: editForm.description,
      dueDate: new Date(editForm.dueDate).getTime(),
      priority: editForm.priority,
      status: editForm.status,
    });
    
    setEditingTaskId(null);
    setEditForm(null);
  };

  // Sort tasks: incomplete first, then completed at bottom
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    return 0;
  });

  return (
    <div className="space-y-3">
      <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      
      {tasks.length === 0 ? (
        <Card className="p-8 sm:p-12 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl text-center">
          <p className="text-white/60 text-base sm:text-lg">{emptyMessage}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map((task, index) => (
            <motion.div
              key={task._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-3 sm:p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl hover:bg-white/20 transition-all">
                {editingTaskId === task._id && editForm ? (
                  <div className="space-y-3">
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Task title"
                    />
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Task description"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="date"
                        value={editForm.dueDate}
                        onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                        className="bg-white/10 border-white/20 text-white flex-1 [color-scheme:dark]"
                      />
                      <Select value={editForm.priority} onValueChange={(value) => setEditForm({ ...editForm, priority: value as any })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white flex-1 sm:w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={editForm.status} onValueChange={(value) => setEditForm({ ...editForm, status: value as any })}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white flex-1 sm:w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="text-white/80 hover:bg-white/10"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(task._id)}
                        className="bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mt-1 text-white hover:bg-white/10 flex-shrink-0"
                      onClick={() => onToggleComplete(task._id, task.status)}
                    >
                      {task.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </Button>

                    <div className="flex-1 min-w-0">
                      <h3
                        className={`font-semibold text-white text-base sm:text-lg break-words ${
                          task.status === "completed" ? "line-through opacity-60" : ""
                        }`}
                      >
                        {task.title}
                        {task.recurringTaskId && (
                          <Badge className="ml-2 bg-purple-500/20 text-purple-200 border-purple-500/30 text-xs">
                            Recurring {task.instanceNumber ? `#${task.instanceNumber}` : ""}
                          </Badge>
                        )}
                      </h3>
                      {task.description && (
                        <p className="text-xs sm:text-sm text-white/70 mt-1 break-words">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 sm:mt-3 flex-wrap">
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge className="bg-white/10 text-white/80 border-white/20">
                          {task.status}
                        </Badge>
                        <span className="text-xs text-white/60">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                        {task.isShared && (
                          <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30">
                            Shared
                          </Badge>
                        )}
                        {task.dependencies && task.dependencies.length > 0 && (
                          <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30">
                            {task.dependencies.length} dependencies
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      {onPostpone && task.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white/60 hover:text-orange-400 hover:bg-white/10"
                          onClick={() => onPostpone(task._id)}
                          title="Postpone by 24 hours"
                        >
                          <Clock className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/60 hover:text-blue-400 hover:bg-white/10"
                        onClick={() => handleEditClick(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/60 hover:text-red-400 hover:bg-white/10"
                        onClick={() => onDelete(task._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}