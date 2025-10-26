import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { CalendarView } from "@/components/CalendarView";
import { TaskList } from "@/components/TaskList";
import { ReminderList } from "@/components/ReminderList";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-purple-400 via-pink-300 to-blue-400 dark:from-gray-900 dark:via-blue-950 dark:to-black transition-colors duration-500">
      <Sidebar />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 p-6 overflow-auto"
      >
        <div className="max-w-7xl mx-auto space-y-6">
          <CalendarView />
          <TaskList />
          <ReminderList />
        </div>
      </motion.main>
    </div>
  );
}