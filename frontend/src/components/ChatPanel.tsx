import type { KeyboardEvent } from "react";
import type { Message } from "../types.ts";
import { SUGGESTIONS } from "../data.ts";

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
    <div className={`rag-msg rag-msg--${isBot ? "bot" : "me"}`}>
      <div className="rag-msg__tag">{isBot ? "Assistant" : "You"}</div>
      <div className={`rag-bubble rag-bubble--${isBot ? "bot" : "me"}`}>
        {m.paras.map((p, i) => (
          <div key={i}>{p}</div>
        ))}
        {m.cites && m.cites.length > 0 && (
          <div className="rag-cites">
            <div className="rag-cites__label">Where this came from</div>
            <div className="rag-cites__row">
              {m.cites.map((c, i) => (
                <span key={i} className="rag-cites__chip">
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
    <section className="rag-card rag-chat">
      <div className="rag-card__bar">
        <div className="rag-card__bar-left">
          <span className="rag-card__label">Chat</span>
        </div>
        <span className="rag-card__note">Answering from {activeCount} of your files</span>
      </div>

      <div className="rag-scroll" ref={scrollRef}>
        {messages.map((m, i) => (
          <MessageRow key={i} m={m} />
        ))}

        {typing && (
          <div className="rag-typing">
            <div className="rag-typing__label">Reading your files</div>
            <div className="rag-typing__bubble">
              <span className="rag-typing__dot" />
              <span className="rag-typing__dot" />
              <span className="rag-typing__dot" />
            </div>
          </div>
        )}
      </div>

      <div className="rag-composer">
        <div className="rag-suggests" data-nobar="1">
          {SUGGESTIONS.map((s) => (
            <button key={s.label} className="rag-suggest" onClick={() => onSuggest(s.q)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="rag-inputbar">
          <input
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask a question about your files…"
          />
          <button className="rag-send" onClick={onSubmit}>
            Ask
          </button>
        </div>
        <div className="rag-composer__hint">Answers come only from the files you add</div>
      </div>
    </section>
  );
}
