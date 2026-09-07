import type { KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types.ts";
import { ACCOUNT, SUGGESTIONS } from "../data.ts";
import { card, cardLabel, iconSvgProps, onlyMobile, toolBtn, toolBtnHover } from "./ui.ts";

/** First name of the signed-in user, for the greeting. */
const FIRST_NAME = ACCOUNT.name.trim().split(/\s+/)[0];

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
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-3 px-6 py-8 animate-rise">
      <div className="flex-none w-11 h-11 rounded-[13px] border border-line-bubble bg-surface-5 flex items-center justify-center text-accent-text">
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </div>
      <div className="font-mono text-[10px] tracking-[0.14em] text-text-muted">
        ASK MY BROCHURES
      </div>
      <h2 className="text-[19px] font-semibold tracking-[-0.2px] text-text">
        {greeting()}, {FIRST_NAME}
      </h2>
      <p className="max-w-[380px] text-[13.5px] leading-[1.6] text-text-dim [text-wrap:pretty]">
        {canChat
          ? "Ask anything about the brochures in your chat context. I answer straight from the pages and show you where each answer came from."
          : "Add a brochure to your chat context to get started. I only answer from the brochures you add — and I'll always point to the page each answer came from."}
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
  onSuggest: (q: string) => void;
  /** False until a brochure is in the chat context — locks the composer. */
  canChat: boolean;
  /** Chat-context sheet state — the toggle lives in this strip on mobile. */
  filesOpen: boolean;
  activeCount: number;
  onToggleFiles: () => void;
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

/** The conversation column: header strip, transcript, and composer. */
export function ChatPanel({
  messages,
  typing,
  draft,
  scrollRef,
  onDraft,
  onSubmit,
  onSuggest,
  canChat,
  filesOpen,
  activeCount,
  onToggleFiles,
}: ChatPanelProps) {
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <section
      className={`${card} flex-1 min-w-[280px] max-tablet:flex-[1_1_100%] max-tablet:min-h-[420px] max-tablet:max-w-none max-phone:flex-auto max-phone:min-w-0 max-phone:min-h-0`}
    >
      <div className="flex-none flex items-center justify-between gap-2 px-4 h-[46px] border-b border-line bg-bar-tint">
        <span className={cardLabel}>Chat</span>
        <button
          className={`${toolBtn} ${toolBtnHover} p-[7px] ${onlyMobile}`}
          aria-label="Show chat context"
          aria-pressed={filesOpen}
          onClick={onToggleFiles}
        >
          <svg {...iconSvgProps}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -top-[5px] -right-[5px] min-w-[15px] h-[15px] px-[3px] rounded-full bg-accent text-accent-ink font-mono text-[9px] font-semibold leading-[15px] text-center">
              {activeCount}
            </span>
          )}
        </button>
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
        <div className="flex gap-2 mb-[11px] overflow-x-auto mask-fade-r" data-nobar="1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.label}
              disabled={!canChat}
              className="flex-none whitespace-nowrap px-[13px] py-2 rounded-full border border-line-input bg-surface-4 text-text-dim text-[12.5px] cursor-pointer transition-all duration-[180ms] hover:border-accent hover:text-text hover:bg-surface-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-line-input disabled:hover:text-text-dim disabled:hover:bg-surface-4"
              onClick={() => onSuggest(s.q)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 items-center border border-line-input rounded-[13px] bg-surface-1 py-1.5 pr-1.5 pl-[15px] focus-within:border-line-input-focus">
          <input
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-[14.5px] py-[9px] max-phone:text-base disabled:cursor-not-allowed"
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
