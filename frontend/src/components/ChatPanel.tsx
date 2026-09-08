import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, MessageSquare, Plus, X } from "lucide-react";
import type { Doc, Message } from "../types.ts";
import { MAX_CONTEXT } from "../data.ts";
import { firstNameFrom, useAuth } from "../lib/auth.tsx";
import { card } from "./ui.ts";

/** How many context chips sit inline before the rest fold into "+N more". */
const CHIPS_SHOWN_MOBILE = 2;
const CHIPS_SHOWN_DESKTOP = 6;

/** Time-of-day greeting. */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Shown before the first message is sent — greets the user and says what the
 * workspace does, adapting to whether a brochure is in the chat context yet.
 */
function ChatEmptyState({ canChat }: { canChat: boolean }) {
  const { user } = useAuth();
  const firstName = user ? firstNameFrom(user.fullName, user.email) : "there";
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-3 px-6 py-8 animate-rise">
      <div className="flex-none w-11 h-11 rounded-[13px] border border-line-bubble bg-surface-5 flex items-center justify-center text-accent-text">
        <MessageSquare size={20} strokeWidth={1.7} aria-hidden />
      </div>
      <div className="font-mono text-[10px] tracking-[0.14em] text-text-muted">
        ASK MY BROCHURES
      </div>
      <h2 className="text-[19px] font-semibold tracking-[-0.2px] text-text">
        {greeting()}, {firstName}
      </h2>
      <p className="max-w-[380px] text-[13.5px] leading-[1.6] text-text-dim [text-wrap:pretty]">
        {canChat
          ? "Ask anything about the brochures in your chat context. I answer straight from the pages and show you where each answer came from."
          : "Add a brochure with the + button to get started. I only answer from the brochures you add — and I'll always point to the page each answer came from."}
      </p>
    </div>
  );
}

/** Themed Tailwind-typography container for a rendered Markdown answer. */
const prose =
  "prose prose-sm prose-chat max-w-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 " +
  "[&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto";

interface ChatPanelProps {
  messages: Message[];
  typing: boolean;
  draft: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onDraft: (v: string) => void;
  onSubmit: () => void;
  /** False until a brochure is in the chat context — locks the composer. */
  canChat: boolean;
  /** Brochures in the chat context, shown as chips in the header bar. */
  contextDocs: Doc[];
  /** Narrow viewport — folds the chip list sooner. */
  isMobile: boolean;
  /** Open the library modal to add / manage brochures. */
  onOpenLibrary: () => void;
  /** Pause / resume a brochure without removing it. */
  onToggleDoc: (id: string) => void;
  /** Drop a brochure from the chat context. */
  onRemoveDoc: (id: string) => void;
}

function MessageRow({ m }: { m: Message }) {
  const isBot = m.role === "bot";
  return (
    <div
      className={`flex flex-col gap-[7px] animate-rise ${isBot ? "items-start" : "items-end"}`}
    >
      <div className="font-mono text-[10px] tracking-[0.14em] text-text-muted">
        {isBot ? "Assistant" : "You"}
      </div>
      <div
        className={`max-w-[88%] px-4 py-[13px] rounded-[14px] border text-[14.5px] leading-[1.62] text-text-soft [text-wrap:pretty] flex flex-col gap-2 ${
          isBot ? "bg-surface-5 border-line-bubble" : "bg-bubble-me border-bubble-me-line"
        }`}
      >
        {isBot ? (
          <div className={prose}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {m.md ?? m.paras.join("\n\n")}
            </ReactMarkdown>
          </div>
        ) : (
          m.paras.map((p, i) => <div key={i}>{p}</div>)
        )}
        {m.cites && m.cites.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1 pt-[11px] border-t border-line-bubble">
            <div className="font-mono text-[9.5px] tracking-[0.14em] text-text-ghost">
              Where this came from
            </div>
            <div className="flex flex-wrap gap-1.5">
              {m.cites.map((c, i) => (
                <span
                  key={i}
                  className="font-mono text-[10px] text-accent-text-soft border border-accent-line bg-accent-tint rounded-[6px] px-2 py-[5px]"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** One brochure in the chat context: a pill that pauses on click and removes
 * via its trailing ×. Sits in the strip above the composer. */
function ContextChip({
  doc,
  onToggle,
  onRemove,
}: {
  doc: Doc;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const name = doc.title.replace(/\.pdf$/i, "");
  return (
    <div className="flex-none flex items-center rounded-full border border-line-input bg-surface-4 transition-colors duration-[160ms]">
      <button
        type="button"
        className={`flex items-center gap-1.5 min-w-0 pl-[13px] pr-2 py-2 text-[12.5px] cursor-pointer hover:text-text ${
          doc.on ? "text-text-dim" : "text-text-ghost"
        }`}
        title={doc.on ? "Pause this brochure" : "Use this brochure"}
        aria-pressed={doc.on}
        onClick={() => onToggle(doc.id)}
      >
        <span
          className={`flex-none w-1.5 h-1.5 rounded-full ${
            doc.on ? "bg-accent" : "bg-text-ghost"
          }`}
        />
        <span className={`truncate max-w-[160px] ${doc.on ? "" : "line-through"}`}>
          {name}
        </span>
      </button>
      <button
        type="button"
        className="flex-none grid place-items-center w-7 h-7 mr-1 rounded-full text-text-faint text-[13px] leading-none cursor-pointer hover:bg-surface-6 hover:text-text"
        title="Remove from chat context"
        aria-label={`Remove ${name} from chat context`}
        onClick={() => onRemove(doc.id)}
      >
        <X size={13} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** A brochure row inside the "+N more" popover — scan-and-remove, no scrolling
 * sideways. Same click targets as a chip: body pauses, × removes. */
function MoreRow({
  doc,
  onToggle,
  onRemove,
}: {
  doc: Doc;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const name = doc.title.replace(/\.pdf$/i, "");
  return (
    <div className="flex items-center gap-2 rounded-[8px] px-2 py-1.5 hover:bg-surface-4">
      <button
        type="button"
        className="flex items-center gap-2 min-w-0 flex-1 text-left text-[12.5px] cursor-pointer"
        title={doc.on ? "Pause this brochure" : "Use this brochure"}
        aria-pressed={doc.on}
        onClick={() => onToggle(doc.id)}
      >
        <span
          className={`flex-none w-1.5 h-1.5 rounded-full ${
            doc.on ? "bg-accent" : "bg-text-ghost"
          }`}
        />
        <span
          className={`truncate ${doc.on ? "text-text-dim" : "text-text-ghost line-through"}`}
        >
          {name}
        </span>
      </button>
      <button
        type="button"
        className="flex-none grid place-items-center w-6 h-6 rounded-full text-text-faint text-[13px] leading-none cursor-pointer hover:bg-surface-6 hover:text-text"
        title="Remove from chat context"
        aria-label={`Remove ${name} from chat context`}
        onClick={() => onRemove(doc.id)}
      >
        <X size={13} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** The chat header's context bar: the first few brochures inline, the rest
 * folded behind a "+N" popover, then the "in context / limit" count. */
function ContextBar({
  docs,
  isMobile,
  onToggleDoc,
  onRemoveDoc,
}: {
  docs: Doc[];
  isMobile: boolean;
  onToggleDoc: (id: string) => void;
  onRemoveDoc: (id: string) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const limit = isMobile ? CHIPS_SHOWN_MOBILE : CHIPS_SHOWN_DESKTOP;
  const inline = docs.slice(0, limit);
  const overflow = docs.slice(limit);

  // Close the popover once there's nothing left to overflow.
  useEffect(() => {
    if (overflow.length === 0) setMoreOpen(false);
  }, [overflow.length]);

  // Dismiss on outside click / Esc while it's open.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  return (
    <div className="flex-1 min-w-0 flex items-center gap-2.5">
      <span
        className="flex-none flex items-center text-text-ghost"
        role="img"
        aria-label={
          docs.length === 0 ? "No brochures in this chat" : "Brochures in this chat"
        }
        title={
          docs.length === 0 ? "No brochures in this chat" : "Brochures in this chat"
        }
      >
        <FileText size={15} strokeWidth={1.8} aria-hidden />
      </span>
      <div
        className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto mask-fade-r"
        data-nobar="1"
      >
        {inline.map((d) => (
          <ContextChip
            key={d.id}
            doc={d}
            onToggle={onToggleDoc}
            onRemove={onRemoveDoc}
          />
        ))}
      </div>

      {overflow.length > 0 && (
        <div className="relative flex-none" ref={moreRef}>
          <button
            type="button"
            className="flex items-center h-8 px-2.5 rounded-full border border-line-input bg-surface-4 text-text-dim text-[12px] cursor-pointer transition-colors duration-[160ms] hover:border-accent hover:text-text"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
          >
            +{overflow.length}
          </button>

          {moreOpen && (
            <div
              role="menu"
              className="absolute top-full right-0 mt-2 z-30 w-[264px] max-w-[calc(100vw-40px)] max-h-[260px] overflow-y-auto rounded-[12px] border border-line-3 bg-surface-2 shadow-dialog p-1.5 animate-fadein"
            >
              <div className="font-mono text-[9px] tracking-[0.14em] text-text-ghost px-2 pt-1.5 pb-2">
                {overflow.length} more in context
              </div>
              <div className="flex flex-col">
                {overflow.map((d) => (
                  <MoreRow
                    key={d.id}
                    doc={d}
                    onToggle={onToggleDoc}
                    onRemove={onRemoveDoc}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <span
        className="flex-none font-mono text-[11px] text-text-muted tabular-nums"
        title={`${docs.length} of ${MAX_CONTEXT} brochures in context`}
      >
        {docs.length}/{MAX_CONTEXT}
      </span>
    </div>
  );
}

/** The conversation column: header strip, transcript, and composer. */
export function ChatPanel({
  messages,
  typing,
  draft,
  scrollRef,
  onDraft,
  onSubmit,
  canChat,
  contextDocs,
  isMobile,
  onOpenLibrary,
  onToggleDoc,
  onRemoveDoc,
}: ChatPanelProps) {
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <section
      className={`${card} flex-1 min-w-0 max-tablet:min-h-[420px] max-phone:flex-auto max-phone:min-h-0`}
    >
      <div className="flex-none flex items-center gap-2 px-3 h-[46px] border-b border-line bg-bar-tint">
        <ContextBar
          docs={contextDocs}
          isMobile={isMobile}
          onToggleDoc={onToggleDoc}
          onRemoveDoc={onRemoveDoc}
        />
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto pt-4 px-[18px] pb-[6px] flex flex-col gap-4"
        ref={scrollRef}
      >
        {messages.length === 0 && !typing && <ChatEmptyState canChat={canChat} />}

        {messages.map((m, i) => (
          <MessageRow key={i} m={m} />
        ))}

        {typing && (
          <div className="flex flex-col gap-[7px]">
            <div className="font-mono text-[10px] tracking-[0.14em] text-text-ghost">
              Reading the brochures
            </div>
            <div className="self-start px-[18px] py-[15px] rounded-[14px] border border-line-bubble bg-surface-5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-blip" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-blip [animation-delay:160ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-blip [animation-delay:320ms]" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-none pt-2.5 px-[18px] pb-3 border-t border-line bg-bar-tint">
        <div className="flex gap-2 items-center border border-line-input rounded-[13px] bg-surface-1 py-1.5 pr-1.5 pl-1.5 focus-within:border-line-input-focus">
          <button
            type="button"
            className="flex-none grid place-items-center w-9 h-9 rounded-[9px] border border-line-input bg-surface-4 text-accent-text cursor-pointer transition-colors duration-[160ms] hover:border-accent hover:text-text-hi"
            title="Add a brochure to the chat context"
            aria-label="Add a brochure to the chat context"
            onClick={onOpenLibrary}
          >
            <Plus size={15} strokeWidth={1.8} aria-hidden />
          </button>
          <input
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-[14.5px] py-[9px] px-1 max-phone:text-base disabled:cursor-not-allowed"
            value={draft}
            disabled={!canChat}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={
              canChat
                ? "Ask a question about these brochures…"
                : "Add a brochure to the chat context to start asking…"
            }
          />
          <button
            className="flex-none px-[18px] py-2.5 border-0 rounded-[9px] bg-accent text-accent-ink text-[13.5px] font-semibold cursor-pointer hover:bg-accent-bright disabled:opacity-55 disabled:cursor-not-allowed"
            disabled={!canChat}
            onClick={onSubmit}
          >
            Ask
          </button>
        </div>
      </div>
    </section>
  );
}
