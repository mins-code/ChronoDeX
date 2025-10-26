import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Bell, CheckCircle, Clock, AlertCircle, Send, Trash2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

export default function Notifications() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const upcomingNotifications = useQuery(api.notifications.getUpcoming);
  const pastNotifications = useQuery(api.notifications.getPast);
  const updateRemindBefore = useMutation(api.notifications.updateRemindBefore);
  const sendTestNotification = useMutation(api.notifications.sendTestNotification);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotification = useMutation(api.notifications.remove);
  
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [editingNotifId, setEditingNotifId] = useState<Id<"notifications"> | null>(null);
  const [selectedExactTime, setSelectedExactTime] = useState<string>("");

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

  const handleUpdateExactTime = async (notifId: Id<"notifications">) => {
    if (!selectedExactTime) {
      toast.error("Please select a valid date and time");
      return;
    }

    try {
      const newScheduledTime = new Date(selectedExactTime).getTime();
      const notification = allNotifications.find(n => n._id === notifId);
      
      if (!notification?.task) {
        toast.error("Task not found");
        return;
      }

      if (newScheduledTime >= notification.task.dueDate) {
        toast.error("Reminder time must be before the task due date");
        return;
      }

      const remindBeforeMinutes = Math.floor((notification.task.dueDate - newScheduledTime) / (60 * 1000));
      await updateRemindBefore({ id: notifId, remindBefore: remindBeforeMinutes });
      
      toast.success(`Reminder set for ${new Date(newScheduledTime).toLocaleString()}`);
      setEditingNotifId(null);
    } catch (error) {
      toast.error("Failed to update reminder time");
    }
  };

  const handleSendTest = async (taskId: Id<"tasks">) => {
    try {
      await sendTestNotification({ taskId });
      toast.success("Test notification sent! Check your browser for the push notification.");
    } catch (error) {
      toast.error("Failed to send test notification");
      console.error("Test notification error:", error);
    }
  };

  const handleMarkAsRead = async (id: Id<"notifications">) => {
    try {
      await markAsRead({ id });
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead({});
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleDeleteNotification = async (id: Id<"notifications">) => {
    try {
      await deleteNotification({ id });
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const allNotifications = [
    ...(upcomingNotifications || []).map(n => ({ ...n, section: "upcoming" as const })),
    ...(pastNotifications || []).map(n => ({ ...n, section: "past" as const }))
  ];

  const filteredNotifications = allNotifications.filter((notif) => {
    if (filter === "upcoming") return notif.section === "upcoming";
    if (filter === "past") return notif.section === "past";
    return true;
  });

  const unreadCount = allNotifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "reminder":
        return <Bell className="h-5 w-5" />;
      case "deadline":
        return <Clock className="h-5 w-5" />;
      case "dependency":
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "reminder":
        return "bg-blue-500/20 text-blue-200 border-blue-500/30";
      case "deadline":
        return "bg-red-500/20 text-red-200 border-red-500/30";
      case "dependency":
        return "bg-green-500/20 text-green-200 border-green-500/30";
      default:
        return "bg-gray-500/20 text-gray-200 border-gray-500/30";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-500/20 text-blue-200 border-blue-500/30">Upcoming</Badge>;
      case "sent":
        return <Badge className="bg-green-500/20 text-green-200 border-green-500/30">Sent</Badge>;
      case "missed":
        return <Badge className="bg-red-500/20 text-red-200 border-red-500/30">Missed</Badge>;
      default:
        return null;
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

  const formatScheduledTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
            <div>
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-white/70 mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                Mark All as Read
              </Button>
            )}
          </div>

          <Card className="p-4 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl mb-6">
            <div className="flex gap-2">
              <Button
                variant={filter === "all" ? "secondary" : "ghost"}
                onClick={() => setFilter("all")}
                className={filter === "all" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"}
              >
                All
              </Button>
              <Button
                variant={filter === "upcoming" ? "secondary" : "ghost"}
                onClick={() => setFilter("upcoming")}
                className={filter === "upcoming" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"}
              >
                Upcoming ({upcomingNotifications?.length || 0})
              </Button>
              <Button
                variant={filter === "past" ? "secondary" : "ghost"}
                onClick={() => setFilter("past")}
                className={filter === "past" ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"}
              >
                Past ({pastNotifications?.length || 0})
              </Button>
            </div>
          </Card>

          {filteredNotifications.length === 0 ? (
            <Card className="p-12 backdrop-blur-xl bg-white/10 border-white/20 shadow-xl text-center">
              <Bell className="h-16 w-16 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-lg">No notifications</p>
              <p className="text-white/40 text-sm mt-2">
                {filter === "upcoming" ? "No upcoming reminders" : filter === "past" ? "No past notifications" : "You'll see notifications here"}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification, index) => (
                <motion.div
                  key={notification._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`p-4 backdrop-blur-xl border-white/20 shadow-xl transition-all ${
                      notification.read ? "bg-white/5" : "bg-white/10"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex gap-2 flex-wrap">
                            <Badge className={getNotificationColor(notification.type)}>
                              {notification.type}
                            </Badge>
                            {getStatusBadge(notification.status)}
                            {notification.task && (
                              <Badge className={getPriorityColor(notification.task.priority)}>
                                {notification.task.priority} priority
                              </Badge>
                            )}
                          </div>
                        </div>

                        <h3 className={`text-white font-semibold mb-1 ${notification.read ? "opacity-60" : ""}`}>
                          {notification.task?.title || "Task"}
                        </h3>
                        <p className={`text-white/80 text-sm mb-2 ${notification.read ? "opacity-60" : ""}`}>
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-white/60 mb-3">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatScheduledTime(notification.scheduledTime)}
                          </div>
                          {notification.remindBefore && (
                            <span>• {notification.remindBefore} min before</span>
                          )}
                        </div>

                        {notification.status === "upcoming" && (
                          <div className="mt-3 p-3 rounded-lg bg-white/10 border border-white/20">
                            {editingNotifId === notification._id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-white/80 text-sm mb-2 block font-semibold">⏰ Set Exact Reminder Time:</label>
                                  <Input
                                    type="datetime-local"
                                    value={selectedExactTime}
                                    onChange={(e) => setSelectedExactTime(e.target.value)}
                                    max={notification.task ? new Date(notification.task.dueDate).toISOString().slice(0, 16) : undefined}
                                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                                  />
                                  <p className="text-white/50 text-xs mt-1">
                                    Task due: {notification.task ? new Date(notification.task.dueDate).toLocaleString() : 'N/A'}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateExactTime(notification._id)}
                                    className="bg-green-500/30 hover:bg-green-500/40 text-white border border-green-500/50"
                                  >
                                    ✓ Apply
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingNotifId(null)}
                                    className="text-white/80 hover:bg-white/10"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white/60 text-xs mb-1">Reminder Set For:</p>
                                  <p className="text-white font-semibold">
                                    {formatScheduledTime(notification.scheduledTime)}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingNotifId(notification._id);
                                    setSelectedExactTime(new Date(notification.scheduledTime).toISOString().slice(0, 16));
                                  }}
                                  className="bg-blue-500/20 hover:bg-blue-500/30 text-white border border-blue-500/30"
                                >
                                  ⏱️ Change Time
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {notification.task && notification.status === "upcoming" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white hover:bg-white/10"
                            onClick={() => handleSendTest(notification.task!._id)}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                        )}
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-white/60 hover:text-white hover:bg-white/10"
                            onClick={() => handleMarkAsRead(notification._id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/60 hover:text-red-400 hover:bg-white/10"
                          onClick={() => handleDeleteNotification(notification._id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.main>
    </div>
  );
}