import { useCallback, useEffect, useState } from "react";
import { LandingPage } from "./components/LandingPage.tsx";
import { RagWorkspace } from "./RagWorkspace.tsx";

/** The workspace lives at /app; everything else shows the landing page. */
const WORKSPACE_PATH = "/app";

const atWorkspace = () =>
  window.location.pathname.replace(/\/+$/, "") === WORKSPACE_PATH;

export function App() {
  const [workspace, setWorkspace] = useState(atWorkspace);

  useEffect(() => {
    const sync = () => setWorkspace(atWorkspace());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const enterWorkspace = useCallback(() => {
    if (atWorkspace()) return;
    window.history.pushState(null, "", WORKSPACE_PATH);
    setWorkspace(true);
    window.scrollTo(0, 0);
  }, []);

  return workspace ? (
    <RagWorkspace retrievalMode="Balanced" latencyMs={1100} />
  ) : (
    <LandingPage onEnter={enterWorkspace} />
  );
}
