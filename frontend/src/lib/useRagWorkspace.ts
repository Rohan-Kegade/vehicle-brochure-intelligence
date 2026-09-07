import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Chat, Doc, Message, RagWorkspaceProps, RetrievalMode } from "../types.ts";
import {
  CONTEXT_BUDGET,
  INDEX_STAGES,
  INITIAL_CHATS,
  INITIAL_DOCS,
  TOKENS_PER_CHUNK,
  UPLOAD_NAMES,
} from "../data.ts";
import { composeAnswer } from "./answers.ts";
import {
  type DocStatus,
  USE_MOCK,
  apiDocToDoc,
  getDocument,
  listDocuments,
  streamMessage,
  textToParas,
  uploadDocument,
} from "./api.ts";

const DEFAULT_LATENCY = 1100;
const MOBILE_QUERY = "(max-width: 720px)";

const matchesMobile = () =>
  typeof window !== "undefined" && !!window.matchMedia?.(MOBILE_QUERY).matches;

const WELCOME_PARAS = USE_MOCK
  ? [
      "Hi — two of your files are ready. Ask me anything about them, and I'll quote the page I got it from.",
      "I only read the files listed on the right. If the answer isn't in them, I'll tell you instead of guessing.",
    ]
  : [
      "Hi — add a brochure with “Add files”, then ask me anything about it and I'll quote the page I read it from.",
      "I only answer from the files you've added. If it's not in them, I'll say so instead of guessing.",
    ];

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

  // header / retrieval
  retrievalMode: RetrievalMode;
  activeChatTitle: string;
  deleteChat: () => void;
  shareChat: () => void;
  shareCopied: boolean;

  // library + context
  docs: Doc[];
  contextDocs: Doc[];
  activeCount: number;
  libCount: number;
  ctxChunks: number;
  ctxPct: string;
  toggleAdd: (id: string) => void;
  toggleOn: (id: string) => void;

  // indexing
  indexing: boolean;
  indexName: string;
  indexStage: string;
  indexPct: number;
  upload: () => void;

  // viewport
  isMobile: boolean;

  // sidebar / nav
  navOpen: boolean;
  toggleNav: () => void;
  chats: Chat[];
  activeChat: string;
  selectChat: (id: string) => void;
  newChat: () => void;

  // files panel (bottom sheet on mobile)
  filesOpen: boolean;
  toggleFiles: () => void;
  closeFiles: () => void;

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
  filter: string;
  setFilter: (v: string) => void;
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
  const [filter, setFilter] = useState("All");
  const [libOpen, setLibOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(matchesMobile);
  const [navOpen, setNavOpen] = useState(() => !matchesMobile());
  const [filesOpen, setFilesOpen] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [activeChat, setActiveChat] = useState("c1");
  const [chats, setChats] = useState<Chat[]>(INITIAL_CHATS);
  const [docs, setDocs] = useState<Doc[]>(USE_MOCK ? INITIAL_DOCS : []);

  const [indexing, setIndexing] = useState(false);
  const [indexName, setIndexName] = useState("");
  const [indexPct, setIndexPct] = useState(0);
  const [indexStage, setIndexStage] = useState("");
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

  const activeDocs = useCallback(() => docs.filter((d) => d.added && d.on), [docs]);

  /** Queue a bot message after a simulated think delay. */
  const push = useCallback(
    (msg: Omit<Message, "role">, delay?: number) => {
      setTyping(true);
      if (replyTimer.current) clearTimeout(replyTimer.current);
      replyTimer.current = setTimeout(
        () => {
          setTyping(false);
          setMessages((m) => m.concat([{ role: "bot", ...msg }]));
        },
        delay ?? latencyMs,
      );
    },
    [latencyMs],
  );

  const greet = useCallback(() => {
    push({ paras: WELCOME_PARAS }, 300);
  }, [push]);

  // mount: welcome message; in real mode also load the indexed library
  useEffect(() => {
    greet();
    if (!USE_MOCK) {
      listDocuments()
        .then((list) =>
          setDocs(list.filter((d) => d.status === "ready").map(apiDocToDoc)),
        )
        .catch(() => {
          /* backend offline — leave the library empty */
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
      if (mq.matches) setFilesOpen(false);
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

      const live = activeDocs();
      if (!live.length) {
        push({
          paras: [
            "No files are in use right now, so there's nothing for me to read.",
            "Use Add files in the top bar to pick one from your library or upload a PDF, then ask me again.",
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
        { content: text, mode: retrievalMode, documentIds: live.map((d) => d.id) },
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
            patchLastBot({ paras: [`Something went wrong: ${detail}`], cites: [] });
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
        patchLastBot({ paras: [`Something went wrong: ${String(e)}`], cites: [] });
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
    greet();
  }, [greet]);

  const uploadReal = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      setIndexing(true);
      setIndexName(file.name);
      setIndexStage("Uploading");
      setIndexPct(8);

      const fail = (msg: string) => {
        setIndexing(false);
        push({ paras: [msg], cites: [] });
      };

      const poll = (id: string) => {
        getDocument(id)
          .then((d) => {
            const [label, pct] = REAL_INDEX_STAGES[d.status] ?? ["Working", 60];
            setIndexStage(label);
            setIndexPct(pct);
            if (d.status === "ready") {
              setDocs((cur) => [{ ...apiDocToDoc(d), on: true, added: true }, ...cur]);
              setIndexing(false);
              push(
                {
                  paras: [
                    `${d.title.replace(/\.pdf$/, "")} is ready — ${d.page_count} pages. Ask me something about it.`,
                  ],
                  cites: [],
                },
                300,
              );
              return;
            }
            if (d.status === "failed") {
              fail(`Indexing failed for ${d.title}.`);
              return;
            }
            idxTimer.current = setTimeout(() => poll(id), 1200);
          })
          .catch((e: unknown) => fail(`Lost track of the upload: ${String(e)}`));
      };

      uploadDocument(file)
        .then((created) => {
          idxTimer.current = setTimeout(() => poll(created.id), 800);
        })
        .catch((e: unknown) => fail(`Upload failed: ${String(e)}`));
    };
    input.click();
  }, [push]);

  const upload = useCallback(() => {
    if (indexing) return;
    if (!USE_MOCK) {
      uploadReal();
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
        const id = `u${Date.now()}`;
        setDocs((d) =>
          [{ id, title: name, tag: "Uploads", pages: 29, chunks: 348, on: true, added: true }].concat(d),
        );
        setIndexing(false);
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
        return;
      }
      const [label, pct] = INDEX_STAGES[i];
      setIndexStage(label);
      setIndexPct(pct);
      i += 1;
      idxTimer.current = setTimeout(step, 700);
    };
    idxTimer.current = setTimeout(step, 450);
  }, [indexing, push, uploadReal]);

  const toggleAdd = useCallback((id: string) => {
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, added: !x.added, on: true } : x)));
  }, []);

  const toggleOn = useCallback((id: string) => {
    setDocs((d) => d.map((x) => (x.id === id ? { ...x, on: !x.on } : x)));
  }, []);

  /** On phones the sidebar is a drawer — dismiss it after a nav action. */
  const dismissDrawer = useCallback(() => {
    if (matchesMobile()) setNavOpen(false);
  }, []);

  const selectChat = useCallback(
    (id: string) => {
      setActiveChat(id);
      dismissDrawer();
    },
    [dismissDrawer],
  );

  const newChat = useCallback(() => {
    const id = `n${Date.now()}`;
    setChats((c) => [{ id, title: "New chat", when: "Just now" }, ...c]);
    setActiveChat(id);
    reset();
    dismissDrawer();
  }, [reset, dismissDrawer]);

  const deleteChat = useCallback(() => {
    const rest = chats.filter((c) => c.id !== activeChat);
    if (rest.length) {
      setChats(rest);
      setActiveChat(rest[0].id);
    } else {
      const id = `n${Date.now()}`;
      setChats([{ id, title: "New chat", when: "Just now" }]);
      setActiveChat(id);
    }
    reset();
  }, [chats, activeChat, reset]);

  const shareChat = useCallback(() => {
    const url = `${window.location.origin}/chat/${activeChat}`;
    void window.navigator?.clipboard?.writeText(url).catch(() => {});
    setShareCopied(true);
    if (shareTimer.current) clearTimeout(shareTimer.current);
    shareTimer.current = setTimeout(() => setShareCopied(false), 1600);
  }, [activeChat]);

  // ---- derived view data -------------------------------------------------

  const contextDocs = useMemo(() => docs.filter((d) => d.added), [docs]);

  const ctxChunks = useMemo(
    () => contextDocs.filter((d) => d.on).reduce((a, d) => a + d.chunks, 0),
    [contextDocs],
  );

  const ctxPct = useMemo(() => {
    const tokens = ctxChunks * TOKENS_PER_CHUNK;
    return `${Math.min(100, (tokens / CONTEXT_BUDGET) * 100).toFixed(1)}%`;
  }, [ctxChunks]);

  const activeCount = useMemo(() => contextDocs.filter((d) => d.on).length, [contextDocs]);

  const libraryShown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter(
      (d) =>
        (filter === "All" || d.tag === filter) &&
        (!q || d.title.toLowerCase().includes(q) || d.tag.toLowerCase().includes(q)),
    );
  }, [docs, query, filter]);

  const chatResults = useMemo(() => {
    const cq = chatQuery.trim().toLowerCase();
    return chats.filter((c) => !cq || c.title.toLowerCase().includes(cq));
  }, [chats, chatQuery]);

  const activeChatTitle = useMemo(
    () => chats.find((c) => c.id === activeChat)?.title ?? "New chat",
    [chats, activeChat],
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

    retrievalMode,
    activeChatTitle,
    deleteChat,
    shareChat,
    shareCopied,

    docs,
    contextDocs,
    activeCount,
    libCount: docs.length,
    ctxChunks,
    ctxPct,
    toggleAdd,
    toggleOn,

    indexing,
    indexName,
    indexStage,
    indexPct,
    upload,

    isMobile,

    navOpen,
    toggleNav: () => setNavOpen((v) => !v),
    chats,
    activeChat,
    selectChat,
    newChat,

    filesOpen,
    toggleFiles: () => setFilesOpen((v) => !v),
    closeFiles: () => setFilesOpen(false),

    chatSearchOpen,
    chatQuery,
    setChatQuery,
    openChatSearch: () => {
      setChatSearchOpen(true);
      setNavOpen((v) => (matchesMobile() ? false : v));
      setFilesOpen(false);
    },
    closeChatSearch: () => {
      setChatSearchOpen(false);
      setChatQuery("");
    },
    chatResults,

    libOpen,
    openLib: () => {
      setLibOpen(true);
      setFilesOpen(false);
    },
    closeLib: () => {
      setLibOpen(false);
      setQuery("");
      setFilter("All");
    },
    query,
    setQuery,
    filter,
    setFilter,
    libraryShown,
  };
}
