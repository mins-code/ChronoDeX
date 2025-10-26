import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Plus, Undo2, Search, Bell, Clock } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskSection } from "@/components/TaskSection";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function Tasks() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const allTasks = useQuery(api.tasks.listAllAccessible, {});
  const upcomingTasks = useQuery(api.tasks.getUpcoming);
  const groups = useQuery(api.groups.list);
  const updateTask = useMutation(api.tasks.update);
  const deleteTask = useMutation(api.tasks.remove);
  
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in-progress" | "completed">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "low" | "medium" | "high">("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "title">("dueDate");
  const [deletedTasks, setDeletedTasks] = useState<Array<{ id: Id<"tasks">; timestamp: number }>>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
      setDeletedTasks([...deletedTasks, { id: taskId, timestamp: Date.now() }]);
      toast.success("Task deleted", {
        action: {
          label: "Undo",
          onClick: () => handleUndo(taskId),
        },
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete task");
    }
  };

  const handleUndo = (taskId: Id<"tasks">) => {
    setDeletedTasks(deletedTasks.filter(t => t.id !== taskId));
    toast.info("Undo feature - task would be restored from Stack");
  };

  const handleEdit = async (taskId: Id<"tasks">, updates: any) => {
    try {
      await updateTask({
        id: taskId,
        ...updates,
      });
      toast.success("Task updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update task");
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

  const getPriorityValue = (priority: string) => {
    switch (priority) {
      case "high": return 3;
      case "medium": return 2;
      case "low": return 1;
      default: return 0;
    }
  };

  const now = Date.now();
  const privateTasks = allTasks?.filter((task) => !task.isShared) || [];
  const sharedTasks = allTasks?.filter((task) => task.isShared) || [];

  const filterAndSort = (tasks: any[]) => {
    return tasks
      .filter((task) => {
        if (filterStatus !== "all" && task.status !== filterStatus) return false;
        if (filterPriority !== "all" && task.priority !== filterPriority) return false;
        if (searchTerm && !task.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !task.description?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "dueDate") return a.dueDate - b.dueDate;
        if (sortBy === "priority") return getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return 0;
      });
  };

  const filteredPrivateTasks = filterAndSort(privateTasks);
  const filteredSharedTasks = filterAndSort(sharedTasks);

  // Separate overdue tasks (past due date and not completed)
  const overduePrivateTasks = filteredPrivateTasks.filter(
    (task) => task.dueDate < now && task.status !== "completed"
  );
  const currentPrivateTasks = filteredPrivateTasks.filter(
    (task) => task.dueDate >= now || task.status === "completed"
  );

  const overdueSharedTasks = filteredSharedTasks.filter(
    (task) => task.dueDate < now && task.status !== "completed"
  );
  const currentSharedTasks = filteredSharedTasks.filter(
    (task) => task.dueDate >= now || task.status === "completed"
  );

  const nextNotification = upcomingTasks && upcomingTasks.length > 0 ? upcomingTasks[0] : null;
  const getTimeUntil = (dueDate: number) => {
    const now = Date.now();
    const diff = dueDate - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `in ${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    return "soon";
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-400 via-pink-300 to-blue-400">
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-6 overflow-auto"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">All Tasks</h1>
            <Button
              onClick={() => setShowTaskDialog(true)}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          {nextNotification && (
            <Card className="p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Bell className="h-5 w-5 text-blue-200" />
                </div>
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-semibold">Next Notification</p>
                  <p className="text-white text-lg">
                    {nextNotification.title} — due {getTimeUntil(nextNotification.dueDate)}
                  </p>
                </div>
                <Badge className={getPriorityColor(nextNotification.priority)}>
                  {nextNotification.priority} priority
                </Badge>
                <div className="flex items-center gap-1 text-white/60 text-sm">
                  <Clock className="h-4 w-4" />
                  {new Date(nextNotification.dueDate).toLocaleString()}
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-white/60" />
                <Input
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                  <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/30">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/95 border-white/30 shadow-xl">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPriority} onValueChange={(value) => setFilterPriority(value as any)}>
                  <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/30">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/95 border-white/30 shadow-xl">
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white hover:bg-white/20 focus:ring-white/30">
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/95 border-white/30 shadow-xl">
                    <SelectItem value="dueDate">Sort by Due Date</SelectItem>
                    <SelectItem value="priority">Sort by Priority</SelectItem>
                    <SelectItem value="title">Sort by Title</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {overduePrivateTasks.length > 0 && (
            <div className="mb-8">
              <TaskSection
                title="⚠️ Overdue Private Tasks"
                tasks={overduePrivateTasks}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
                emptyMessage=""
              />
            </div>
          )}

          <TaskSection
            title="My Private Tasks"
            tasks={currentPrivateTasks}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDelete}
            onEdit={handleEdit}
            emptyMessage="No private tasks found. Create one to get started!"
          />

          {groups && groups.length > 0 && (
            <div className="mt-8">
              {overdueSharedTasks.length > 0 && (
                <div className="mb-8">
                  <TaskSection
                    title="⚠️ Overdue Shared Tasks"
                    tasks={overdueSharedTasks}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    emptyMessage=""
                  />
                </div>
              )}

              <TaskSection
                title="Shared Tasks"
                tasks={currentSharedTasks}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
                emptyMessage="No shared tasks yet. Create a task and assign it to a group!"
              />
            </div>
          )}

          {deletedTasks.length > 0 && (
            <Card className="mt-6 p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Undo2 className="h-4 w-4" />
                  <span className="text-sm">
                    {deletedTasks.length} task{deletedTasks.length !== 1 ? 's' : ''} in undo stack
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/80 hover:bg-white/10"
                  onClick={() => setDeletedTasks([])}
                >
                  Clear Stack
                </Button>
              </div>
            </Card>
          )}
        </div>
      </motion.main>

      {showTaskDialog && (
        <TaskDialog
          open={showTaskDialog}
          onClose={() => setShowTaskDialog(false)}
        />
      )}
    </div>
  );
}