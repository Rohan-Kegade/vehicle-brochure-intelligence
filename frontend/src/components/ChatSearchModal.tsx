import type { Chat } from "../types.ts";

interface ChatSearchModalProps {
  query: string;
  results: Chat[];
  onQuery: (v: string) => void;
  onPick: (id: string) => void;
  onClose: () => void;
}

/** Command-palette style search over recent chats. */
export function ChatSearchModal({ query, results, onQuery, onPick, onClose }: ChatSearchModalProps) {
  return (
    <div className="rag-overlay rag-overlay--search" onClick={onClose}>
      <div
        className="rag-dialog rag-dialog--search"
        role="dialog"
        aria-modal="true"
        aria-label="Search your chats"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rag-dialog__searchhead">
          <span className="glyph">⌕</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search your chats…"
          />
          <button className="rag-dialog__close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="rag-dialog__body">
          {results.map((c) => (
            <button key={c.id} className="rag-result" onClick={() => onPick(c.id)}>
              <div className="rag-result__title">{c.title}</div>
              <div className="rag-result__when">{c.when}</div>
            </button>
          ))}
          {results.length === 0 && <div className="rag-modal-empty">No chats match that.</div>}
        </div>
      </div>
    </div>
  );
}
