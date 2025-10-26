import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, CheckSquare, GitBranch, Bell, Settings, LogOut, Clock } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { motion } from "framer-motion";

export function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Calendar, label: "Calendar", path: "/dashboard" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks" },
    { icon: Bell, label: "Reminders", path: "/reminders" },
    { icon: GitBranch, label: "Dependencies", path: "/dependencies" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 p-4 backdrop-blur-xl bg-white/10 dark:bg-black/40 border-r border-white/20 dark:border-blue-500/30 transition-colors duration-300"
    >
      <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => navigate("/")}>
        <img src="/logo.svg" alt="ChronoDeX" className="w-10 h-10" />
        <h1 className="text-xl font-bold text-white">ChronoDeX</h1>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-3 ${
                isActive
                  ? "bg-white/20 dark:bg-blue-500/30 text-white"
                  : "text-white/80 hover:bg-white/10 dark:hover:bg-blue-500/20 hover:text-white"
              }`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-white/80 hover:bg-white/10 dark:hover:bg-blue-500/20 hover:text-white"
          onClick={() => signOut()}
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </Button>
      </div>
    </motion.aside>
  );
}