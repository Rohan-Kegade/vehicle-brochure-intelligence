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

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * `fetch` for the API: sends cookies, echoes the CSRF token on unsafe methods,
 * and transparently retries once through `/auth/refresh` on a 401 so an expired
 * access token doesn't surface to callers.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
  _retried = false,
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!SAFE_METHODS.has(method)) {
    const token = csrfToken();
    if (token) headers.set("x-csrf-token", token);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: "include",
  });

  if (
    res.status === 401 &&
    !_retried &&
    path !== "/auth/refresh" &&
    path !== "/auth/me"
  ) {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: csrfToken() ? { "x-csrf-token": csrfToken()! } : undefined,
    });
    if (refreshed.ok) return apiFetch(path, init, true);
  }

  return res;
}

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
  const res = await apiFetch("/documents");
  if (!res.ok) throw new Error(`list documents failed (${res.status})`);
  return res.json();
}

export async function getDocument(id: string): Promise<ApiDoc> {
  const res = await apiFetch(`/documents/${id}`);
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

  const res = await apiFetch("/documents", { method: "POST", body: form });
  if (!res.ok) throw new Error(`upload failed (${res.status})`);
  return res.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await apiFetch(`/documents/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete document failed (${res.status})`);
  }
}

// ---- conversations --------------------------------------------------------

export interface ApiConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ApiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: string[] | null;
  mode: string | null;
  created_at: string;
}

export interface ApiConversationDetail extends ApiConversation {
  messages: ApiMessage[];
}

export async function listConversations(): Promise<ApiConversation[]> {
  const res = await apiFetch("/conversations");
  if (!res.ok) throw new Error(`list conversations failed (${res.status})`);
  return res.json();
}

export async function createConversation(
  title?: string,
): Promise<ApiConversation> {
  const res = await apiFetch("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title ?? null }),
  });
  if (!res.ok) throw new Error(`create conversation failed (${res.status})`);
  return res.json();
}

export async function getConversation(
  id: string,
): Promise<ApiConversationDetail> {
  const res = await apiFetch(`/conversations/${id}`);
  if (!res.ok) throw new Error(`get conversation failed (${res.status})`);
  return res.json();
}

export async function renameConversation(
  id: string,
  title: string,
): Promise<ApiConversation> {
  const res = await apiFetch(`/conversations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`rename conversation failed (${res.status})`);
  return res.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const res = await apiFetch(`/conversations/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete conversation failed (${res.status})`);
  }
}

export interface StreamHandlers {
  onToken: (text: string) => void;
  onCitations: (citations: string[]) => void;
  onDone: () => void;
  onError: (detail: string) => void;
  /** New-conversation stream only: the row was just created server-side. */
  onConversation?: (id: string, title: string) => void;
  /** New-conversation stream only: the LLM-generated title is ready. */
  onTitle?: (id: string, title: string) => void;
}

/**
 * POST a question and dispatch the SSE `conversation` / `token` / `citations` /
 * `title` / `done` / `error` events.
 *
 * Pass `null` for `conversationId` to start a brand-new conversation — the row
 * is created server-side on this first message and its id arrives via the
 * `conversation` event.
 */
export async function streamMessage(
  conversationId: string | null,
  body: { content: string; mode: string; documentIds?: string[] },
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = csrfToken();
  if (token) headers["x-csrf-token"] = token;

  const path = conversationId
    ? `/conversations/${encodeURIComponent(conversationId)}/messages`
    : "/conversations/messages";

  const res = await fetch(
    `${API_BASE}${path}`,
    {
      method: "POST",
      headers,
      credentials: "include",
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

  let payload: {
    text?: string;
    citations?: string[];
    detail?: string;
    id?: string;
    title?: string;
  };
  try {
    payload = JSON.parse(data);
  } catch {
    return;
  }

  if (event === "token") h.onToken(payload.text ?? "");
  else if (event === "citations") h.onCitations(payload.citations ?? []);
  else if (event === "conversation")
    h.onConversation?.(payload.id ?? "", payload.title ?? "");
  else if (event === "title") h.onTitle?.(payload.id ?? "", payload.title ?? "");
  else if (event === "done") h.onDone();
  else if (event === "error") h.onError(payload.detail ?? "unknown error");
}

// ---- adapters ---------------------------------------------------------------

/** Backend document -> the frontend `Doc` shape the components already use. */
export function apiDocToDoc(d: ApiDoc): Doc {
  return {
    id: d.id,
    title: d.title,
    tag: d.tag ?? "Unsorted",
    make: d.make ?? "",
    // Everything the backend stores was uploaded through the app.
    source: "upload",
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
