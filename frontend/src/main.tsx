import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RagWorkspace } from "./RagWorkspace.tsx";
import "./styles/app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RagWorkspace retrievalMode="Balanced" latencyMs={1100} />
  </StrictMode>,
);
