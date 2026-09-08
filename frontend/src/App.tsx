import { useCallback, useEffect, useState } from "react";
import { LandingPage } from "./components/LandingPage.tsx";
import { AuthPage } from "./components/AuthPage.tsx";
import { RagWorkspace } from "./RagWorkspace.tsx";
import { AuthProvider, useAuth } from "./lib/auth.tsx";
import { USE_MOCK } from "./lib/api.ts";

type Route = "landing" | "signup" | "login" | "workspace";

const ROUTES: Record<string, Route> = {
  "/app": "workspace",
  "/signup": "signup",
  "/login": "login",
};

const routeFor = (pathname: string): Route =>
  ROUTES[pathname.replace(/\/+$/, "") || "/"] ?? "landing";

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-shell text-[13px] text-text-dim">
      Loading…
    </div>
  );
}

function Router() {
  const { user } = useAuth();
  const [route, setRoute] = useState<Route>(() => routeFor(window.location.pathname));

  useEffect(() => {
    const sync = () => setRoute(routeFor(window.location.pathname));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback((path: string) => {
    if (window.location.pathname.replace(/\/+$/, "") !== path.replace(/\/+$/, "")) {
      window.history.pushState(null, "", path);
    }
    setRoute(routeFor(path));
    window.scrollTo(0, 0);
  }, []);

  // Auth-driven redirects (real backend only — the demo build stays open).
  useEffect(() => {
    if (USE_MOCK) return;
    if (route === "workspace" && user === null) navigate("/login");
    else if ((route === "login" || route === "signup") && user) navigate("/app");
  }, [route, user, navigate]);

  switch (route) {
    case "workspace":
      if (!USE_MOCK && user == null) return <Splash />;
      return <RagWorkspace retrievalMode="Balanced" latencyMs={1100} />;
    case "signup":
      return <AuthPage mode="signup" onNavigate={navigate} />;
    case "login":
      return <AuthPage mode="login" onNavigate={navigate} />;
    default:
      return <LandingPage onNavigate={navigate} />;
  }
}

export function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
