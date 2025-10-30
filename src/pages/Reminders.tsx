import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Plus, Bell, Edit, Trash2, Save, X } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function Reminders() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const reminders = useQuery(api.reminders.listAllAccessible);
  const groups = useQuery(api.groups.list);
  const createReminder = useMutation(api.reminders.create);
  const updateReminder = useMutation(api.reminders.update);
  const deleteReminder = useMutation(api.reminders.remove);

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<Id<"reminders"> | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    frequency: "daily" as "daily" | "weekly" | "monthly" | "yearly",
    time: "09:00",
    dayOfWeek: 1,
    dayOfMonth: 1,
    showOnCalendar: false,
    isShared: false,
    groupId: "",
  });

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

  const handleOpenDialog = (reminder?: any) => {
    if (reminder) {
      setEditingId(reminder._id);
      setFormData({
        title: reminder.title,
        frequency: reminder.recurrenceRule.frequency,
        time: reminder.recurrenceRule.time,
        dayOfWeek: reminder.recurrenceRule.dayOfWeek || 1,
        dayOfMonth: reminder.recurrenceRule.dayOfMonth || 1,
        showOnCalendar: reminder.showOnCalendar,
        isShared: reminder.isShared,
        groupId: reminder.groupId || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        title: "",
        frequency: "daily",
        time: "09:00",
        dayOfWeek: 1,
        dayOfMonth: 1,
        showOnCalendar: false,
        isShared: false,
        groupId: "",
      });
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const recurrenceRule: any = {
      frequency: formData.frequency,
      time: formData.time,
    };

    if (formData.frequency === "weekly") {
      recurrenceRule.dayOfWeek = formData.dayOfWeek;
    } else if (formData.frequency === "monthly") {
      recurrenceRule.dayOfMonth = formData.dayOfMonth;
    } else if (formData.frequency === "yearly") {
      recurrenceRule.dayOfWeek = formData.dayOfWeek; // month (0-11)
      recurrenceRule.dayOfMonth = formData.dayOfMonth; // day of month
    }

    try {
      if (editingId) {
        await updateReminder({
          id: editingId,
          title: formData.title,
          recurrenceRule,
          showOnCalendar: formData.showOnCalendar,
        });
        toast.success("Reminder updated!");
      } else {
        await createReminder({
          title: formData.title,
          recurrenceRule,
          showOnCalendar: formData.showOnCalendar,
          isShared: formData.isShared,
          groupId: formData.isShared && formData.groupId ? (formData.groupId as any) : undefined,
        });
        toast.success("Reminder created!");
      }
      setShowDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save reminder");
    }
  };

  const handleDelete = async (id: Id<"reminders">) => {
    try {
      await deleteReminder({ id });
      toast.success("Reminder deleted successfully!");
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error?.message || "Failed to delete reminder. Please try again.");
    }
  };

  const privateReminders = reminders?.filter((r) => !r.isShared) || [];
  const sharedReminders = reminders?.filter((r) => r.isShared) || [];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-400 via-pink-300 to-blue-400 dark:from-gray-900 dark:via-blue-950 dark:to-black transition-colors duration-500">
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-6 overflow-auto"
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-white">Reminders</h1>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Reminder
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-3">My Personal Reminders</h2>
              {privateReminders.length === 0 ? (
                <Card className="p-12 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl text-center">
                  <p className="text-white/60 text-lg">No personal reminders yet. Create one to get started!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {privateReminders.map((reminder, index) => (
                    <motion.div
                      key={reminder._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl hover:bg-white/20 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/20">
                            <Bell className="h-5 w-5 text-blue-200" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white text-lg">{reminder.title}</h3>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className="bg-white/10 text-white/80 border-white/20">
                                {reminder.recurrenceRule.frequency}
                              </Badge>
                              <Badge className="bg-white/10 text-white/80 border-white/20">
                                {reminder.recurrenceRule.time}
                              </Badge>
                              {reminder.showOnCalendar && (
                                <Badge className="bg-green-500/20 text-green-200 border-green-500/30">
                                  On Calendar
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/60 hover:text-blue-400 hover:bg-white/10"
                            onClick={() => handleOpenDialog(reminder)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-white/60 hover:text-red-400 hover:bg-white/10"
                            onClick={() => handleDelete(reminder._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {groups && groups.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">Shared Reminders</h2>
                {sharedReminders.length === 0 ? (
                  <Card className="p-12 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl text-center">
                    <p className="text-white/60 text-lg">No shared reminders yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {sharedReminders.map((reminder, index) => (
                      <motion.div
                        key={reminder._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl hover:bg-white/20 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                              <Bell className="h-5 w-5 text-purple-200" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-lg">{reminder.title}</h3>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Badge className="bg-white/10 text-white/80 border-white/20">
                                  {reminder.recurrenceRule.frequency}
                                </Badge>
                                <Badge className="bg-white/10 text-white/80 border-white/20">
                                  {reminder.recurrenceRule.time}
                                </Badge>
                                <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30">
                                  Shared
                                </Badge>
                                {reminder.showOnCalendar && (
                                  <Badge className="bg-green-500/20 text-green-200 border-green-500/30">
                                    On Calendar
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white/60 hover:text-blue-400 hover:bg-white/10"
                              onClick={() => handleOpenDialog(reminder)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-white/60 hover:text-red-400 hover:bg-white/10"
                              onClick={() => handleDelete(reminder._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.main>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="backdrop-blur-xl bg-white/10 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingId ? "Edit Reminder" : "Create New Reminder"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-white">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                placeholder="e.g., Take medicine, Water time"
              />
            </div>

            <div>
              <Label htmlFor="frequency" className="text-white">Repeat</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value: any) => setFormData({ ...formData, frequency: value })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
              </Select>
            </div>

            {formData.frequency === "weekly" && (
              <div>
                <Label htmlFor="dayOfWeek" className="text-white">Day of Week</Label>
                <Select
                  value={String(formData.dayOfWeek)}
                  onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.frequency === "monthly" && (
              <div>
                <Label htmlFor="dayOfMonth" className="text-white">Day of Month</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            )}

            {formData.frequency === "yearly" && (
              <div>
                <Label htmlFor="yearlyDate" className="text-white">Date (Month & Day)</Label>
                <Input
                  id="yearlyDate"
                  type="date"
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setFormData({ 
                      ...formData, 
                      dayOfMonth: date.getDate(),
                      dayOfWeek: date.getMonth() // Store month in dayOfWeek for yearly
                    });
                  }}
                  className="bg-white/10 border-white/20 text-white [color-scheme:dark]"
                />
                <p className="text-xs text-white/60 mt-1">
                  Reminder will repeat every year on this date
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="time" className="text-white">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                className="bg-white/10 border-white/20 text-white"
              />
            </div>

            {!editingId && (
              <div>
                <Label htmlFor="sharing" className="text-white">Share With</Label>
                <Select
                  value={formData.isShared ? formData.groupId || "shared" : "private"}
                  onValueChange={(value) => {
                    if (value === "private") {
                      setFormData({ ...formData, isShared: false, groupId: "" });
                    } else {
                      setFormData({ ...formData, isShared: true, groupId: value });
                    }
                  }}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-white/95 dark:bg-gray-900 border-white/30 dark:border-blue-500/30">
                    <SelectItem value="private">Just me</SelectItem>
                    {groups && groups.map((group) => (
                      <SelectItem key={group._id} value={group._id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="showOnCalendar" className="text-white">Show on Calendar</Label>
              <Switch
                id="showOnCalendar"
                checked={formData.showOnCalendar}
                onCheckedChange={(checked) => setFormData({ ...formData, showOnCalendar: checked })}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDialog(false)}
                className="text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-white/20 hover:bg-white/30 text-white">
                {editingId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}