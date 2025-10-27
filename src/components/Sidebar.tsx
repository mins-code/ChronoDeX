import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, CheckSquare, GitBranch, Bell, Settings, LogOut, Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function Sidebar() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { icon: Calendar, label: "Calendar", path: "/dashboard" },
    { icon: CheckSquare, label: "Tasks", path: "/tasks" },
    { icon: Bell, label: "Reminders", path: "/reminders" },
    { icon: GitBranch, label: "Dependencies", path: "/dependencies" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 mb-6 sm:mb-8 cursor-pointer px-2" onClick={() => navigate("/")}>
        <img src="/logo.svg" alt="ChronoDeX" className="w-8 h-8 sm:w-10 sm:h-10" />
        <h1 className="text-lg sm:text-xl font-bold text-white">ChronoDeX</h1>
      </div>

      <nav className="space-y-1 sm:space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start gap-2 sm:gap-3 text-sm sm:text-base ${
                isActive
                  ? "bg-white/20 dark:bg-blue-500/30 text-white"
                  : "text-white/80 hover:bg-white/10 dark:hover:bg-blue-500/20 hover:text-white"
              }`}
              onClick={() => {
                navigate(item.path);
                setIsOpen(false);
              }}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 sm:gap-3 text-white/80 hover:bg-white/10 dark:hover:bg-blue-500/20 hover:text-white text-sm sm:text-base"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          Sign Out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed left-0 top-0 bottom-0 w-64 p-4 backdrop-blur-xl bg-gradient-to-br from-purple-400/10 via-pink-300/10 to-blue-400/10 dark:from-gray-900 dark:via-blue-950 dark:to-black border-r border-white/20 dark:border-blue-500/30 z-40 md:hidden flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex md:flex-col w-64 p-4 backdrop-blur-xl bg-gradient-to-br from-purple-400/10 via-pink-300/10 to-blue-400/10 dark:from-gray-900 dark:via-blue-950 dark:to-black border-r border-white/20 dark:border-blue-500/30 transition-colors duration-300"
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}