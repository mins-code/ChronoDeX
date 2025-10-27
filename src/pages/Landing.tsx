import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { Calendar, CheckSquare, GitBranch, Bell, Zap, Brain, Clock } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: "Smart Calendar",
      description: "Hash Map powered O(1) event lookup by date",
    },
    {
      icon: Clock,
      title: "Priority Queue",
      description: "Min Heap manages urgent tasks and deadlines",
    },
    {
      icon: GitBranch,
      title: "Task Dependencies",
      description: "Graph structure tracks task relationships",
    },
    {
      icon: Zap,
      title: "Autocomplete Search",
      description: "Trie-based instant search suggestions",
    },
    {
      icon: Brain,
      title: "Undo/Redo",
      description: "Stack-based action history management",
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Queue-based notification history",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-300 to-blue-400 dark:from-gray-900 dark:via-blue-950 dark:to-black overflow-hidden transition-colors duration-500">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-64 h-64 sm:w-96 sm:h-96 bg-purple-500/30 dark:bg-blue-500/20 rounded-full blur-3xl transition-colors duration-500" />
        <div className="absolute top-1/2 -left-40 w-64 h-64 sm:w-96 sm:h-96 bg-pink-500/30 dark:bg-blue-600/20 rounded-full blur-3xl transition-colors duration-500" />
        <div className="absolute -bottom-40 right-1/3 w-64 h-64 sm:w-96 sm:h-96 bg-blue-500/30 dark:bg-blue-400/20 rounded-full blur-3xl transition-colors duration-500" />
      </div>

      <nav className="relative z-10 backdrop-blur-xl bg-white/10 dark:bg-black/30 border-b border-white/20 dark:border-blue-500/30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.svg" alt="ChronoDeX" className="w-8 h-8 sm:w-10 sm:h-10" />
            <span className="text-xl sm:text-2xl font-bold text-white">ChronoDeX</span>
          </div>
          <Button
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/auth")}
            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 dark:bg-blue-500/30 dark:hover:bg-blue-500/40 dark:border-blue-500/40 text-sm sm:text-base px-3 sm:px-4 py-2"
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </Button>
        </div>
      </nav>

      <main className="relative z-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4 sm:mb-6"
          >
            <img src="/logo.svg" alt="ChronoDeX" className="w-16 h-16 sm:w-24 sm:h-24 mx-auto" />
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 tracking-tight px-2">
            Smart Calendar
            <br />
            Powering Your Personal Needs
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            ChronoDeX combines intelligent scheduling with 8 core data structures to deliver
            lightning-fast task management, dependency tracking, and smart notifications.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white text-purple-600 hover:bg-white/90 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
            >
              Start Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const featuresSection = document.querySelector('main section:nth-of-type(2)');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-white/10 text-white border-white/30 hover:bg-white/20 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto"
            >
              Learn More
            </Button>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center mb-8 sm:mb-12 px-2">
            Powered by Computer Science
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  className="p-4 sm:p-6 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-white/20 flex items-center justify-center mb-3 sm:mb-4">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-white/70">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 px-2">Ready to get organized?</h2>
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 sm:mb-8 px-4">
            Join thousands using ChronoDeX to manage their time intelligently.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-purple-600 hover:bg-white/90 text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 w-full sm:w-auto max-w-xs mx-auto"
          >
            Get Started Free
          </Button>
        </motion.section>
      </main>

      <footer className="relative z-10 backdrop-blur-xl bg-white/10 dark:bg-black/30 border-t border-white/20 dark:border-blue-500/30 py-6 sm:py-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-white/60 text-sm sm:text-base">
          <p>© 2024 ChronoDeX. Built with data structures and intelligence.</p>
        </div>
      </footer>
    </div>
  );
}