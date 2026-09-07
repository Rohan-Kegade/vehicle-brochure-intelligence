/** Retrieval strategy shown in the header pill. */
export type RetrievalMode = "Balanced" | "Meaning-based" | "Keyword";

/** Props the design exposes for the workspace (mirrors `data-props`). */
export interface RagWorkspaceProps {
  /** Label rendered in the "… search" header pill. */
  retrievalMode?: RetrievalMode;
  /** Simulated assistant think time in milliseconds (300–2500). */
  latencyMs?: number;
}

/** A document in the user's library. */
export interface Doc {
  id: string;
  title: string;
  tag: string;
  pages: number;
  chunks: number;
  /** Whether the file is actively feeding retrieval (toggle switch). */
  on: boolean;
  /** Whether the file has been added to the current chat's context. */
  added: boolean;
}

/** A conversation in the sidebar / search palette. */
export interface Chat {
  id: string;
  title: string;
  when: string;
}

export type MessageRole = "me" | "bot";

/** A chat message. `cites` is only present on assistant answers. */
export interface Message {
  role: MessageRole;
  paras: string[];
  cites?: string[];
}
