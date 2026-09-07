import type { Doc } from "../types.ts";

/**
 * Backend client. All calls go through the Vite dev proxy at `/api`
 * (see vite.config.ts) to the FastAPI server on :8000.
 *
 * `USE_MOCK` gates whether <useRagWorkspace> talks to this client or stays
 * fully mocked. Default: real under `npm run dev`, mocked in a production
 * build (so the standalone demo needs no backend). Set VITE_USE_MOCK
 * ("true"/"false") in `.env.local` to override either way.
 */
export const USE_MOCK =
  import.meta.env.VITE_USE_MOCK != null
    ? import.meta.env.VITE_USE_MOCK !== "false"
    : !import.meta.env.DEV;

const API_BASE = "/api";

export type DocStatus = "uploading" | "parsing" | "embedding" | "ready" | "failed";

export interface ApiDoc {
  id: string;
  title: string;
  tag: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  page_count: number;
  chunk_count: number;
  status: DocStatus;
  created_at: string;
  updated_at: string;
}

export async function listDocuments(): Promise<ApiDoc[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(`list documents failed (${res.status})`);
  return res.json();
}

export async function getDocument(id: string): Promise<ApiDoc> {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error(`get document failed (${res.status})`);
  return res.json();
}

export async function uploadDocument(
  file: File,
  opts: { title?: string; tag?: string } = {},
): Promise<ApiDoc> {
  const form = new FormData();
  form.append("file", file);
  if (opts.title) form.append("title", opts.title);
  if (opts.tag) form.append("tag", opts.tag);

  const res = await fetch(`${API_BASE}/documents`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  return res.json();
}

export interface StreamHandlers {
  onToken: (text: string) => void;
  onCitations: (citations: string[]) => void;
  onDone: () => void;
  onError: (detail: string) => void;
}

/** POST a question and dispatch the SSE `token` / `citations` / `done` / `error` events. */
export async function streamMessage(
  conversationId: string,
  body: { content: string; mode: string; documentIds?: string[] },
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: body.content,
        mode: body.mode,
        document_ids: body.documentIds?.length ? body.documentIds : null,
      }),
      signal,
    },
  );

  if (!res.ok || !res.body) {
    handlers.onError(`chat request failed (${res.status})`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) dispatchFrame(frame, handlers);
  }
  if (buffer.trim()) dispatchFrame(buffer, handlers);
}

function dispatchFrame(frame: string, h: StreamHandlers): void {
  let event = "message";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += line.slice(5).trim();
  }
  if (!data) return;

  let payload: { text?: string; citations?: string[]; detail?: string };
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }

  if (event === "token") h.onToken(payload.text ?? "");
  else if (event === "citations") h.onCitations(payload.citations ?? []);
  else if (event === "done") h.onDone();
  else if (event === "error") h.onError(payload.detail ?? "unknown error");
}

// ---- adapters ---------------------------------------------------------------

/** Backend document -> the frontend `Doc` shape the components already use. */
export function apiDocToDoc(d: ApiDoc): Doc {
  return {
    id: d.id,
    title: d.title,
    tag: d.tag ?? "Untitled",
    pages: d.page_count,
    chunks: d.chunk_count,
    on: true,
    added: false,
  };
}

/** Split streamed answer text into paragraphs for <MessageRow>. */
export function textToParas(text: string): string[] {
  const paras = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paras.length ? paras : [text || "…"];
}
