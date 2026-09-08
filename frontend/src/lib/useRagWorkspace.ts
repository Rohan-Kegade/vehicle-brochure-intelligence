import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Chat,
  Doc,
  Message,
  RagWorkspaceProps,
  RetrievalMode,
} from "../types.ts";
import {
  INDEX_STAGES,
  INITIAL_CHATS,
  INITIAL_DOCS,
  MAX_CONTEXT,
  MAX_UPLOADS,
  UPLOAD_NAMES,
} from "../data.ts";
import { composeAnswer } from "./answers.ts";
import {
  type ApiMessage,
  type DocStatus,
  USE_MOCK,
  apiDocToDoc,
  createConversation,
  deleteConversation,
  getDocument,
  getConversation,
  listConversations,
  listDocuments,
  renameConversation,
  streamMessage,
  textToParas,
  uploadDocument,
} from "./api.ts";

const DEFAULT_LATENCY = 1100;
const MOBILE_QUERY = "(max-width: 720px)";

/** Which surface kicked off the current upload — scopes the progress banner and
 * decides whether the new brochure joins the chat context. */
export type UploadOrigin = "library" | "settings";

const matchesMobile = () =>
  typeof window !== "undefined" && !!window.matchMedia?.(MOBILE_QUERY).matches;

/** ISO timestamp -> a coarse "when" label for the sidebar. */
function relativeDay(iso: string): string {
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** A persisted message row -> the <MessageRow> shape. */
function apiMsgToMessage(m: ApiMessage): Message {
  if (m.role === "user") return { role: "me", paras: [m.content] };
  return {
    role: "bot",
    paras: textToParas(m.content),
    md: m.content,
    cites: m.citations ?? [],
  };
}

/** Backend ingest status -> [label, percent] for the indexing banner. */
const REAL_INDEX_STAGES: Record<DocStatus, [string, number]> = {
  uploading: ["Uploading", 15],
  parsing: ["Reading pages", 45],
  embedding: ["Organising text", 78],
  ready: ["Ready", 100],
  failed: ["Failed", 100],
};

/** View model consumed by <RagWorkspace>. */
export interface RagWorkspaceModel {
  // chat
  messages: Message[];
  typing: boolean;
  draft: string;
  setDraft: (v: string) => void;
  submit: () => void;
  /** Send an explicit question (used by the suggestion chips). */
  ask: (q: string) => void;
  reset: () => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** False until at least one brochure is in the chat context — gates the composer. */
  canChat: boolean;

  // header / retrieval
  retrievalMode: RetrievalMode;
  activeChatTitle: string;
  /** Remove a chat by id (no confirmation — see requestDeleteChat). */
  deleteChat: (id: string) => void;
  /** Remove one or more chats at once (Chats manager). */
  deleteChats: (ids: string[]) => void;
  /** Rename a conversation (Chats manager). */
  renameChat: (id: string, title: string) => void;
  /** Chat queued for deletion, driving the confirm modal. */
  pendingDeleteChat: Chat | null;
  requestDeleteChat: (id: string) => void;
  confirmDeleteChat: () => void;
  cancelDeleteChat: () => void;
  shareChat: () => void;
  shareCopied: boolean;

  // library + context
  docs: Doc[];
  contextDocs: Doc[];
  activeCount: number;
  toggleAdd: (id: string) => void;
  toggleOn: (id: string) => void;
  /** Rename an uploaded brochure (Manage brochures). */
  renameDoc: (id: string, title: string) => void;
  /** Delete an uploaded brochure for good (Manage brochures). */
  deleteDoc: (id: string) => void;

  // indexing
  indexing: boolean;
  indexName: string;
  indexStage: string;
  indexPct: number;
  /** Which surface started the in-flight upload (null when idle) — lets each
   * surface show the progress banner only for its own upload. */
  uploadOrigin: UploadOrigin | null;
  /** Start an upload. `origin` defaults to "library"; "settings" uploads land in
   * the library without being added to any chat context. */
  upload: (origin?: UploadOrigin) => void;

  // viewport
  isMobile: boolean;

  // sidebar / nav
  navOpen: boolean;
  toggleNav: () => void;
  chats: Chat[];
  activeChat: string;
  selectChat: (id: string) => void;
  newChat: () => void;

  // settings modal
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // chat search palette
  chatSearchOpen: boolean;
  chatQuery: string;
  setChatQuery: (v: string) => void;
  openChatSearch: () => void;
  closeChatSearch: () => void;
  chatResults: Chat[];

  // library modal
  libOpen: boolean;
  openLib: () => void;
  closeLib: () => void;
  query: string;
  setQuery: (v: string) => void;
  /** How many brochures the user has uploaded (drives the empty state). */
  uploadCount: number;
  /** Upload cap — `uploadCount` can't exceed this. */
  uploadLimit: number;
  /** Every brochure the user has uploaded (Manage brochures). */
  uploads: Doc[];
  libraryShown: Doc[];
}

export function useRagWorkspace({
  retrievalMode = "Balanced",
  latencyMs = DEFAULT_LATENCY,
}: RagWorkspaceProps): RagWorkspaceModel {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [libOpen, setLibOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(matchesMobile);
  const [navOpen, setNavOpen] = useState(() => !matchesMobile());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [activeChat, setActiveChat] = useState(USE_MOCK ? "c1" : "");
  const [chats, setChats] = useState<Chat[]>(USE_MOCK ? INITIAL_CHATS : []);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Doc[]>(USE_MOCK ? INITIAL_DOCS : []);

  const [indexing, setIndexing] = useState(false);
  const [indexName, setIndexName] = useState("");
  const [indexPct, setIndexPct] = useState(0);
  const [indexStage, setIndexStage] = useState("");
  const [uploadOrigin, setUploadOrigin] = useState<UploadOrigin | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadSeq = useRef(0);
  const typingRef = useRef(false);
  typingRef.current = typing;
  const streamingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  // Guards the one-shot mount bootstrap against React StrictMode's double-invoke
  // (which would otherwise create two "New chat" conversations).
  const bootstrappedRef = useRef(false);

  const activeDocs = useCallback(
    () => docs.filter((d) => d.added && d.on),
    [docs],
  );

  /** Queue a bot message after a simulated think delay. */
  const push = useCallback(
    (msg: Omit<Message, "role">, delay?: number) => {
      setTyping(true);
      if (replyTimer.current) clearTimeout(replyTimer.current);
      replyTimer.current = setTimeout(() => {
        setTyping(false);
        setMessages((m) => m.concat([{ role: "bot", ...msg }]));
      }, delay ?? latencyMs);
    },
    [latencyMs],
  );

  // mount: in real mode load the indexed library. The chat opens on an empty
  // state (see <ChatPanel>) rather than a canned welcome message.
  useEffect(() => {
    if (!USE_MOCK && !bootstrappedRef.current) {
      bootstrappedRef.current = true;
      listDocuments()
        .then((list) =>
          setDocs(list.filter((d) => d.status === "ready").map(apiDocToDoc)),
        )
        .catch(() => {
          /* backend offline — leave the library empty */
        });

      // Load the user's conversations; open the most recent, or start one.
      listConversations()
        .then(async (list) => {
          if (list.length === 0) {
            const conv = await createConversation();
            setChats([{ id: conv.id, title: conv.title, when: "Today" }]);
            setActiveChat(conv.id);
            return;
          }
          setChats(
            list.map((c) => ({
              id: c.id,
              title: c.title,
              when: relativeDay(c.updated_at),
            })),
          );
          setActiveChat((cur) => cur || list[0].id);
        })
        .catch(() => {
          /* backend offline — sidebar stays empty */
        });
    }
    return () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
      if (idxTimer.current) clearTimeout(idxTimer.current);
      if (shareTimer.current) clearTimeout(shareTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the transcript pinned to the newest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  // track viewport class; collapse the nav when shrinking to mobile,
  // restore it when growing back to desktop
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = () => {
      setIsMobile(mq.matches);
      setNavOpen(!mq.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** Merge a patch into the last message if it's the assistant's. */
  const patchLastBot = useCallback((patch: Partial<Message>) => {
    setMessages((m) => {
      if (!m.length || m[m.length - 1].role !== "bot") return m;
      const next = m.slice();
      next[next.length - 1] = { ...next[next.length - 1], ...patch };
      return next;
    });
  }, []);

  const send = useCallback(
    (raw: string) => {
      const text = (raw || "").trim();
      if (!text || typingRef.current || streamingRef.current) return;

      setMessages((m) => m.concat([{ role: "me", paras: [text] }]));
      setDraft("");

      // First question in an untitled chat: mirror the backend's auto-title and
      // float the conversation to the top of the list.
      setChats((cs) => {
        const idx = cs.findIndex((c) => c.id === activeChat);
        if (idx === -1) return cs;
        const cur = cs[idx];
        const title =
          cur.title === "New chat"
            ? text.length > 60
              ? `${text.slice(0, 60).trimEnd()}…`
              : text
            : cur.title;
        const next = cs.slice();
        next.splice(idx, 1);
        return [{ ...cur, title, when: "Today" }, ...next];
      });

      const live = activeDocs();
      if (!live.length) {
        push({
          paras: [
            "Every brochure in the chat context is paused — switch one back on and ask again.",
          ],
        });
        return;
      }

      if (USE_MOCK) {
        push(composeAnswer(text, live));
        return;
      }

      // real backend: stream the answer into a growing assistant message
      streamingRef.current = true;
      setTyping(true);
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let acc = "";
      let botAdded = false;
      const ensureBot = () => {
        if (botAdded) return;
        botAdded = true;
        setMessages((m) => m.concat([{ role: "bot", paras: [""], cites: [] }]));
      };
      const finish = () => {
        streamingRef.current = false;
        setTyping(false);
      };

      void streamMessage(
        activeChat,
        {
          content: text,
          mode: retrievalMode,
          documentIds: live.map((d) => d.id),
        },
        {
          onToken: (t) => {
            acc += t;
            setTyping(false);
            ensureBot();
            patchLastBot({ paras: textToParas(acc), md: acc });
          },
          onCitations: (c) => {
            ensureBot();
            patchLastBot({ cites: c });
          },
          onDone: finish,
          onError: (detail) => {
            ensureBot();
            patchLastBot({
              paras: [`Something went wrong: ${detail}`],
              cites: [],
            });
            finish();
          },
        },
        ctrl.signal,
      ).catch((e: unknown) => {
        if (ctrl.signal.aborted) {
          finish();
          return;
        }
        ensureBot();
        patchLastBot({
          paras: [`Something went wrong: ${String(e)}`],
          cites: [],
        });
        finish();
      });
    },
    [activeDocs, push, patchLastBot, retrievalMode, activeChat],
  );

  const submit = useCallback(() => send(draft), [send, draft]);

  const reset = useCallback(() => {
    if (replyTimer.current) clearTimeout(replyTimer.current);
    abortRef.current?.abort();
    streamingRef.current = false;
    setTyping(false);
    setDraft("");
    setMessages([]);
  }, []);

  const uploadReal = useCallback(
    (origin: UploadOrigin) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf,.pdf";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) {
          setUploadOrigin(null);
          return;
        }

        setIndexing(true);
        setIndexName(file.name);
        setIndexStage("Uploading");
        setIndexPct(8);

        const fail = (msg: string) => {
          setIndexing(false);
          setUploadOrigin(null);
          push({ paras: [msg], cites: [] });
        };

        const poll = (id: string) => {
          getDocument(id)
            .then((d) => {
              const [label, pct] = REAL_INDEX_STAGES[d.status] ?? [
                "Working",
                60,
              ];
              setIndexStage(label);
              setIndexPct(pct);
              if (d.status === "ready") {
                setDocs((cur) => [
                  { ...apiDocToDoc(d), on: true, added: origin === "library" },
                  ...cur,
                ]);
                setIndexing(false);
                setUploadOrigin(null);
                if (origin === "library") {
                  push(
                    {
                      paras: [
                        `${d.title.replace(/\.pdf$/, "")} is ready — ${d.page_count} pages. Ask me something about it.`,
                      ],
                      cites: [],
                    },
                    300,
                  );
                }
                return;
              }
              if (d.status === "failed") {
                fail(`Indexing failed for ${d.title}.`);
                return;
              }
              idxTimer.current = setTimeout(() => poll(id), 1200);
            })
            .catch((e: unknown) =>
              fail(`Lost track of the upload: ${String(e)}`),
            );
        };

        uploadDocument(file)
          .then((created) => {
            idxTimer.current = setTimeout(() => poll(created.id), 800);
          })
          .catch((e: unknown) => fail(`Upload failed: ${String(e)}`));
      };
      input.click();
    },
    [push],
  );

  const upload = useCallback(
    (origin: UploadOrigin = "library") => {
      if (indexing) return;
      if (docs.filter((d) => d.source === "upload").length >= MAX_UPLOADS) {
        if (origin === "library") {
          push({
            paras: [
              `You've reached the ${MAX_UPLOADS}-brochure upload limit — delete one to add another.`,
            ],
            cites: [],
          });
        }
        return;
      }
      setUploadOrigin(origin);
      if (!USE_MOCK) {
        uploadReal(origin);
        return;
      }
      const name = UPLOAD_NAMES[uploadSeq.current % UPLOAD_NAMES.length];
      uploadSeq.current += 1;

      setIndexing(true);
      setIndexName(name);
      setIndexPct(6);
      setIndexStage("Uploading");

      let i = 0;
      const step = () => {
        if (i >= INDEX_STAGES.length) {
          const uploaded: Doc = {
            id: `u${Date.now()}`,
            title: name,
            tag: "Unsorted",
            make: "",
            source: "upload",
            pages: 29,
            chunks: 348,
            on: true,
            // Settings uploads land in the library only — never auto-added
            // to a chat's context.
            added: origin === "library",
          };
          setDocs((d) => [uploaded, ...d]);
          setIndexing(false);
          setUploadOrigin(null);
          if (origin === "library") {
            push(
              {
                paras: [
                  `${name.replace(/\.pdf$/, "")} is ready — 29 pages — and I'm now reading it.`,
                  "Ask me something about it.",
                ],
                cites: [],
              },
              600,
            );
          }
          return;
        }
        const [label, pct] = INDEX_STAGES[i];
        setIndexStage(label);
        setIndexPct(pct);
        i += 1;
        idxTimer.current = setTimeout(step, 700);
      };
      idxTimer.current = setTimeout(step, 450);
    },
    [indexing, docs, push, uploadReal],
  );

  const toggleAdd = useCallback((id: string) => {
    setDocs((d) => {
      const target = d.find((x) => x.id === id);
      if (!target) return d;
      // Cap the context at MAX_CONTEXT brochures; removing is always allowed.
      if (!target.added && d.filter((x) => x.added).length >= MAX_CONTEXT)
        return d;
      return d.map((x) =>
        x.id === id ? { ...x, added: !x.added, on: true } : x,
      );
    });
  }, []);

  const toggleOn = useCallback((id: string) => {
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, on: !x.on } : x)));
  }, []);

  const renameDoc = useCallback((id: string, title: string) => {
    const next = title.trim();
    if (!next) return;
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, title: next } : x)));
  }, []);

  const deleteDoc = useCallback((id: string) => {
    setDocs((d) => d.filter((x) => x.id !== id));
  }, []);

  /** On phones the sidebar is a drawer — dismiss it after a nav action. */
  const dismissDrawer = useCallback(() => {
    if (matchesMobile()) setNavOpen(false);
  }, []);

  /** Replace an emptied chat list with a single fresh conversation. */
  const startFreshChat = useCallback(() => {
    if (USE_MOCK) {
      const id = `n${Date.now()}`;
      setChats([{ id, title: "New chat", when: "Just now" }]);
      setActiveChat(id);
      return;
    }
    void createConversation()
      .then((conv) => {
        setChats([{ id: conv.id, title: conv.title, when: "Today" }]);
        setActiveChat(conv.id);
      })
      .catch(() => {});
  }, []);

  const selectChat = useCallback(
    (id: string) => {
      if (id === activeChat) {
        dismissDrawer();
        return;
      }
      reset();
      setActiveChat(id);
      dismissDrawer();
      if (!USE_MOCK) {
        getConversation(id)
          .then((detail) => setMessages(detail.messages.map(apiMsgToMessage)))
          .catch(() => {});
      }
    },
    [activeChat, dismissDrawer, reset],
  );

  const newChat = useCallback(() => {
    reset();
    dismissDrawer();
    if (USE_MOCK) {
      const id = `n${Date.now()}`;
      setChats((c) => [{ id, title: "New chat", when: "Just now" }, ...c]);
      setActiveChat(id);
      return;
    }
    void createConversation()
      .then((conv) => {
        setChats((c) => [
          { id: conv.id, title: conv.title, when: "Today" },
          ...c,
        ]);
        setActiveChat(conv.id);
      })
      .catch(() => {});
  }, [reset, dismissDrawer]);

  const deleteChat = useCallback(
    (id: string) => {
      if (!USE_MOCK) void deleteConversation(id).catch(() => {});
      const rest = chats.filter((c) => c.id !== id);
      const wasActive = id === activeChat;
      if (rest.length) {
        setChats(rest);
        if (wasActive) {
          reset();
          selectChat(rest[0].id);
        }
      } else {
        reset();
        startFreshChat();
      }
    },
    [chats, activeChat, reset, selectChat, startFreshChat],
  );

  const deleteChats = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const kill = new Set(ids);
      if (!USE_MOCK) {
        for (const id of kill) void deleteConversation(id).catch(() => {});
      }
      const rest = chats.filter((c) => !kill.has(c.id));
      const wasActive = kill.has(activeChat);
      if (rest.length) {
        setChats(rest);
        if (wasActive) {
          reset();
          selectChat(rest[0].id);
        }
      } else {
        reset();
        startFreshChat();
      }
    },
    [chats, activeChat, reset, selectChat, startFreshChat],
  );

  const renameChat = useCallback((id: string, title: string) => {
    const next = title.trim();
    if (!next) return;
    setChats((c) => c.map((x) => (x.id === id ? { ...x, title: next } : x)));
    if (!USE_MOCK) void renameConversation(id, next).catch(() => {});
  }, []);

  const requestDeleteChat = useCallback(
    (id: string) => setPendingDeleteId(id),
    [],
  );
  const cancelDeleteChat = useCallback(() => setPendingDeleteId(null), []);
  const confirmDeleteChat = useCallback(() => {
    if (pendingDeleteId) deleteChat(pendingDeleteId);
    setPendingDeleteId(null);
  }, [pendingDeleteId, deleteChat]);

  const shareChat = useCallback(() => {
    const url = `${window.location.origin}/chat/${activeChat}`;
    void window.navigator?.clipboard?.writeText(url).catch(() => {});
    setShareCopied(true);
    if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => setShareCopied(false), 1600);
  }, [activeChat]);

  // ---- derived view data -------------------------------------------------

  const contextDocs = useMemo(() => docs.filter((d) => d.added), [docs]);

  const activeCount = useMemo(
    () => contextDocs.filter((d) => d.on).length,
    [contextDocs],
  );

  const uploads = useMemo(
    () => docs.filter((d) => d.source === "upload"),
    [docs],
  );
  const uploadCount = uploads.length;

  const libraryShown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter(
      (d) =>
        d.source === "upload" &&
        (!q ||
          d.title.toLowerCase().includes(q) ||
          d.tag.toLowerCase().includes(q) ||
          d.make.toLowerCase().includes(q)),
    );
  }, [docs, query]);

  const chatResults = useMemo(() => {
    const cq = chatQuery.trim().toLowerCase();
    return chats.filter((c) => !cq || c.title.toLowerCase().includes(cq));
  }, [chats, chatQuery]);

  const activeChatTitle = useMemo(
    () => chats.find((c) => c.id === activeChat)?.title ?? "New chat",
    [chats, activeChat],
  );

  const pendingDeleteChat = useMemo(
    () => chats.find((c) => c.id === pendingDeleteId) ?? null,
    [chats, pendingDeleteId],
  );

  return {
    messages,
    typing,
    draft,
    setDraft,
    submit,
    ask: send,
    reset,
    scrollRef,
    canChat: contextDocs.length > 0,

    retrievalMode,
    activeChatTitle,
    deleteChat,
    deleteChats,
    renameChat,
    pendingDeleteChat,
    requestDeleteChat,
    confirmDeleteChat,
    cancelDeleteChat,
    shareChat,
    shareCopied,

    docs,
    contextDocs,
    activeCount,
    toggleAdd,
    toggleOn,
    renameDoc,
    deleteDoc,

    indexing,
    indexName,
    indexStage,
    indexPct,
    uploadOrigin,
    upload,

    isMobile,

    navOpen,
    toggleNav: () => setNavOpen((v) => !v),
    chats,
    activeChat,
    selectChat,
    newChat,

    settingsOpen,
    openSettings: () => {
      setSettingsOpen(true);
      setNavOpen((v) => (matchesMobile() ? false : v));
    },
    closeSettings: () => setSettingsOpen(false),

    chatSearchOpen,
    chatQuery,
    setChatQuery,
    openChatSearch: () => {
      setChatSearchOpen(true);
      setNavOpen((v) => (matchesMobile() ? false : v));
    },
    closeChatSearch: () => {
      setChatSearchOpen(false);
      setChatQuery("");
    },
    chatResults,

    libOpen,
    openLib: () => {
      setLibOpen(true);
    },
    closeLib: () => {
      setLibOpen(false);
      setQuery("");
    },
    query,
    setQuery,
    uploadCount,
    uploadLimit: MAX_UPLOADS,
    uploads,
    libraryShown,
  };
}
