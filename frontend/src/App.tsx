import { useCallback, useEffect, useState } from "react";
import { LandingPage } from "./components/LandingPage.tsx";
import { AuthPage } from "./components/AuthPage.tsx";
import { RagWorkspace } from "./RagWorkspace.tsx";

type Route = "landing" | "signup" | "login" | "workspace";

const ROUTES: Record<string, Route> = {
  "/app": "workspace",
  "/signup": "signup",
  "/login": "login",
};

const routeFor = (pathname: string): Route =>
  ROUTES[pathname.replace(/\/+$/, "") || "/"] ?? "landing";

export function App() {
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

  switch (route) {
    case "workspace":
      return <RagWorkspace retrievalMode="Balanced" latencyMs={1100} />;
    case "signup":
      return <AuthPage mode="signup" onNavigate={navigate} />;
    case "login":
      return <AuthPage mode="login" onNavigate={navigate} />;
    default:
      return <LandingPage onNavigate={navigate} />;
  }
}
