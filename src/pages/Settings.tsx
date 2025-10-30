import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, User, Bell, Palette, Info, Moon, Sun } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/use-notifications";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { GroupsManager } from "@/components/GroupsManager";

export default function Settings() {
  const { isLoading, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const { isSupported, permission, enableNotifications } = useNotifications();
  const [darkMode, setDarkMode] = useState(true); // Default to dark mode

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Initialize dark mode state from localStorage or default to true
  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    // Default to dark mode if no preference is saved
    const isDark = savedDarkMode === null ? true : savedDarkMode === "true";
    setDarkMode(isDark);
    
    // Save default preference if not set
    if (savedDarkMode === null) {
      localStorage.setItem("darkMode", "true");
    }
    
    // Apply dark mode on initial load
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Add debug logging
  useEffect(() => {
    console.log("Notification Debug Info:", {
      isSupported,
      permission,
      userAgent: navigator.userAgent,
      serviceWorkerSupported: 'serviceWorker' in navigator,
    });
  }, [isSupported, permission]);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", String(newDarkMode));
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      toast.success("Dark theme enabled");
    } else {
      document.documentElement.classList.remove("dark");
      toast.success("Light theme enabled");
    }
  };

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Settings</h1>

          <div className="space-y-4">
            <GroupsManager />

            <Card className="p-6 backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 dark:border-blue-500/30 shadow-xl transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/20 dark:bg-blue-500/20">
                  <User className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Account</h2>
              </div>
              <Separator className="my-4 bg-white/20 dark:bg-blue-500/20" />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Authentication Status</p>
                    <p className="text-white/60 text-sm">You are currently signed in</p>
                  </div>
                  <Button
                    onClick={() => signOut()}
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 dark:bg-blue-500/20 dark:border-blue-500/30 dark:hover:bg-blue-500/30"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 dark:border-blue-500/30 shadow-xl transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/20 dark:bg-blue-500/20">
                  <Bell className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Push Notifications</h2>
              </div>
              <Separator className="my-4 bg-white/20 dark:bg-blue-500/20" />
              <div className="space-y-4">
                {!isSupported ? (
                  <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                    <p className="text-white/90 text-sm font-semibold mb-2">
                      ⚠️ Push notifications are not supported
                    </p>
                    <p className="text-white/70 text-xs">
                      Your browser doesn't support push notifications. Try using Chrome, Firefox, or Edge.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">Browser Notifications</p>
                        <p className="text-white/60 text-sm">
                          Receive push notifications for task reminders
                        </p>
                      </div>
                      <Badge className={
                        permission === 'granted' 
                          ? 'bg-green-500/20 text-green-200 border-green-500/30'
                          : permission === 'denied'
                          ? 'bg-red-500/20 text-red-200 border-red-500/30'
                          : 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30'
                      }>
                        {permission === 'granted' ? '✓ Enabled' : permission === 'denied' ? '✗ Blocked' : '⚠ Not Set'}
                      </Badge>
                    </div>
                    
                    {permission === 'denied' && (
                      <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/30">
                        <p className="text-white/90 text-sm font-semibold mb-2">
                          🚫 Notifications are blocked
                        </p>
                        <p className="text-white/70 text-xs mb-2">
                          You've blocked notifications for this site. To enable them:
                        </p>
                        <ol className="text-white/70 text-xs list-decimal list-inside space-y-1">
                          <li>Click the lock icon in your browser's address bar</li>
                          <li>Find "Notifications" and change it to "Allow"</li>
                          <li>Refresh this page</li>
                        </ol>
                      </div>
                    )}
                    
                    {permission !== 'granted' && permission !== 'denied' && (
                      <Button
                        onClick={enableNotifications}
                        className="bg-white/20 hover:bg-white/30 text-white dark:bg-blue-500/30 dark:hover:bg-blue-500/40"
                      >
                        🔔 Enable Push Notifications
                      </Button>
                    )}
                    
                    {permission === 'granted' && (
                      <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30">
                        <p className="text-white/90 text-sm font-semibold mb-2">
                          ✓ Notifications are enabled!
                        </p>
                        <p className="text-white/70 text-xs">
                          You'll receive push notifications for your task reminders. Test it by creating a task and clicking the "Test" button on the Notifications page.
                        </p>
                      </div>
                    )}
                    
                    <p className="text-white/50 text-xs">
                      💡 Tip: Add ChronoDeX to your home screen for the best experience
                    </p>
                  </>
                )}
                
                <Separator className="my-4 bg-white/20 dark:bg-blue-500/20" />
                
                <p className="text-white/70 text-sm">
                  Notification preferences are managed per task. Visit the Notifications page to customize reminder times for each task.
                </p>
                <Button
                  onClick={() => navigate("/notifications")}
                  className="bg-white/20 hover:bg-white/30 text-white dark:bg-blue-500/30 dark:hover:bg-blue-500/40"
                >
                  Manage Notifications
                </Button>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 dark:border-blue-500/30 shadow-xl transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/20 dark:bg-blue-500/20">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Appearance</h2>
              </div>
              <Separator className="my-4 bg-white/20 dark:bg-blue-500/20" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/20 dark:bg-blue-500/20">
                      {darkMode ? <Moon className="h-5 w-5 text-white" /> : <Sun className="h-5 w-5 text-white" />}
                    </div>
                    <div>
                      <p className="text-white font-medium">Dark Theme</p>
                      <p className="text-white/60 text-sm">
                        {darkMode ? "Aesthetic black and blue background" : "Colorful pastel gradients"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={toggleDarkMode}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
                <p className="text-white/50 text-xs">
                  Toggle between light glassmorphism and dark aesthetic themes
                </p>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-xl bg-white/10 dark:bg-black/40 border-white/20 dark:border-blue-500/30 shadow-xl transition-colors duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-white/20 dark:bg-blue-500/20">
                  <Info className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">About ChronoDeX</h2>
              </div>
              <Separator className="my-4 bg-white/20 dark:bg-blue-500/20" />
              <div className="space-y-2">
                <p className="text-white/70 text-sm">
                  ChronoDeX is a smart personal calendar and reminder system built with advanced data structures for efficient task management.
                </p>
                <p className="text-white/60 text-xs mt-4">Version 1.0.0</p>
              </div>
            </Card>
          </div>
        </div>
      </motion.main>
    </div>
  );
}