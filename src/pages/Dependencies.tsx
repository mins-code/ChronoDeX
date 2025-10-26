import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Plus, Trash2, CheckCircle } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function Dependencies() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const tasks = useQuery(api.tasks.list, {});
  const addDependency = useMutation(api.tasks.addDependency);
  const removeDependency = useMutation(api.tasks.removeDependency);
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [selectedDependency, setSelectedDependency] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddDependency = async () => {
    if (!selectedTask || !selectedDependency) {
      toast.error("Please select both task and dependency");
      return;
    }

    if (selectedTask === selectedDependency) {
      toast.error("A task cannot depend on itself");
      return;
    }

    setIsSubmitting(true);
    try {
      await addDependency({
        taskId: selectedTask as Id<"tasks">,
        dependsOn: selectedDependency as Id<"tasks">,
      });
      toast.success("Dependency added successfully");
      setShowAddDialog(false);
      setSelectedTask("");
      setSelectedDependency("");
    } catch (error) {
      toast.error("Failed to add dependency");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveDependency = async (taskId: Id<"tasks">, dependencyId: Id<"tasks">) => {
    try {
      await removeDependency({ taskId, dependsOn: dependencyId });
      toast.success("Dependency removed");
    } catch (error) {
      toast.error("Failed to remove dependency");
    }
  };

  const tasksWithDependencies = tasks?.filter(task => task.dependencies && task.dependencies.length > 0) || [];

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
            <h1 className="text-3xl font-bold text-white">Task Dependencies</h1>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Dependency
            </Button>
          </div>

          <Card className="p-6 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400"></div>
                <span className="text-white/80 text-sm">Task Node</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-white/60"></div>
                <span className="text-white/80 text-sm">Depends On</span>
              </div>
            </div>
            <p className="text-white/70 text-sm">
              Graph structure showing task relationships. Complete prerequisite tasks before dependent ones.
            </p>
          </Card>

          {tasksWithDependencies.length === 0 ? (
            <Card className="p-12 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl text-center">
              <p className="text-white/60 text-lg">No task dependencies yet</p>
              <p className="text-white/40 text-sm mt-2">Add dependencies to track task relationships</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasksWithDependencies.map((task, index) => {
                const dependencyTasks = task.dependencies
                  ?.map(depId => tasks?.find(t => t._id === depId))
                  .filter(Boolean);

                return (
                  <motion.div
                    key={task._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="p-6 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">{task.title}</h3>
                          <p className="text-white/60 text-sm">
                            {task.status === "completed" ? (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle className="h-4 w-4" />
                                Completed
                              </span>
                            ) : (
                              `Status: ${task.status}`
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-white/80 font-semibold text-sm">Depends on:</p>
                        {dependencyTasks?.map((depTask) => (
                          <div
                            key={depTask?._id}
                            className="flex items-center justify-between p-3 rounded-lg bg-white/10 border border-white/20"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                              <div>
                                <p className="text-white font-medium">{depTask?.title}</p>
                                <p className="text-white/60 text-xs">
                                  {depTask?.status === "completed" ? (
                                    <span className="text-green-400">✓ Completed</span>
                                  ) : (
                                    <span className="text-yellow-400">⏳ Pending</span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white/60 hover:text-red-400 hover:bg-white/10"
                              onClick={() => handleRemoveDependency(task._id, depTask!._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.main>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="backdrop-blur-xl bg-white/10 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Add Task Dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Task</Label>
              <Select value={selectedTask} onValueChange={setSelectedTask}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks?.map((task) => (
                    <SelectItem key={task._id} value={task._id}>
                      {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Depends On</Label>
              <Select value={selectedDependency} onValueChange={setSelectedDependency}>
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select dependency" />
                </SelectTrigger>
                <SelectContent>
                  {tasks
                    ?.filter((task) => task._id !== selectedTask)
                    .map((task) => (
                      <SelectItem key={task._id} value={task._id}>
                        {task.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddDialog(false)}
                className="text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddDependency}
                disabled={isSubmitting}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                {isSubmitting ? "Adding..." : "Add Dependency"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
