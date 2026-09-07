import type { KeyboardEvent } from "react";
import type { Message } from "../types.ts";
import { SUGGESTIONS } from "../data.ts";
import { card, cardLabel } from "./ui.ts";

interface ChatPanelProps {
  messages: Message[];
  typing: boolean;
  draft: string;
  activeCount: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onDraft: (v: string) => void;
  onSubmit: () => void;
  onSuggest: (q: string) => void;
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
        {m.paras.map((p, i) => (
          <div key={i}>{p}</div>
        ))}
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
  activeCount,
  scrollRef,
  onDraft,
  onSubmit,
  onSuggest,
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
      <div className="flex-none flex flex-wrap items-center justify-between gap-x-[14px] gap-y-[10px] px-4 py-[11px] border-b border-line bg-bar-tint">
        <div className="flex items-center gap-3 min-w-0">
          <span className={cardLabel}>Chat</span>
        </div>
        <span className="font-mono text-[10px] tracking-[0.1em] text-text-muted">
          Answering from {activeCount} of your files
        </span>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto pt-4 px-[18px] pb-[6px] flex flex-col gap-4"
        ref={scrollRef}
      >
        {messages.map((m, i) => (
          <MessageRow key={i} m={m} />
        ))}

        {typing && (
          <div className="flex flex-col gap-[7px]">
            <div className="font-mono text-[10px] tracking-[0.14em] text-text-ghost">
              Reading your files
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
              className="flex-none whitespace-nowrap px-[13px] py-2 rounded-full border border-line-input bg-surface-4 text-text-dim text-[12.5px] cursor-pointer transition-all duration-[180ms] hover:border-accent hover:text-text hover:bg-surface-accent"
              onClick={() => onSuggest(s.q)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2.5 items-center border border-line-input rounded-[13px] bg-surface-1 py-1.5 pr-1.5 pl-[15px] focus-within:border-line-input-focus">
          <input
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-[14.5px] py-[9px] max-phone:text-base"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask a question about your files…"
          />
          <button
            className="flex-none px-[18px] py-2.5 border-0 rounded-[9px] bg-accent text-accent-ink text-[13.5px] font-semibold cursor-pointer hover:bg-accent-bright disabled:opacity-55 disabled:cursor-not-allowed"
            onClick={onSubmit}
          >
            Ask
          </button>
        </div>
        <div className="font-mono text-[10px] text-text-muted tracking-[0.04em] mt-[9px]">
          Answers come only from the files you add
        </div>
      </div>
    </section>
  );
}
