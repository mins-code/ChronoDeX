import { Toaster } from "@/components/ui/sonner";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation } from "react-router";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Tasks from "./pages/Tasks.tsx";
import Dependencies from "./pages/Dependencies.tsx";
import Notifications from "./pages/Notifications.tsx";
import Settings from "./pages/Settings.tsx";
import Reminders from "./pages/Reminders.tsx";
import "./types/global.d.ts";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

// Initialize dark mode from localStorage on app load
if (localStorage.getItem("darkMode") === "true") {
  document.documentElement.classList.add("dark");
}

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/dependencies" element={<Dependencies />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/auth" element={<AuthPage redirectAfterAuth="/dashboard" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);