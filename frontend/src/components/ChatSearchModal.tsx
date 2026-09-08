import { Search, X } from "lucide-react";
import type { Chat } from "../types.ts";
import { dialog, dialogCloseBase, modalEmpty, overlay } from "./ui.ts";

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
    <div
      className={`${overlay} z-[70] bg-overlay items-start pt-[60px] px-6 pb-6 max-phone:px-3 max-phone:pt-4 max-phone:pb-3`}
      onClick={onClose}
    >
      <div
        className={`${dialog} w-[min(600px,100%)] max-h-[min(560px,80dvh)]`}
        role="dialog"
        aria-modal="true"
        aria-label="Search your chats"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-none flex items-center gap-2.5 px-3.5 py-1 border-b border-line">
          <Search
            size={15}
            strokeWidth={1.8}
            className="flex-none text-text-ghost"
            aria-hidden
          />
          <input
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-[15px] py-[15px] max-phone:text-base"
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search your chats…"
          />
          <button
            className={`${dialogCloseBase} w-7 h-7 rounded-[8px] text-[14px]`}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div className="flex-1 min-h-[100px] overflow-y-auto p-2.5">
          {results.map((c) => (
            <button
              key={c.id}
              className="block w-full text-left px-[13px] py-[11px] border-0 rounded-[11px] bg-transparent text-text-soft cursor-pointer hover:bg-surface-5"
              onClick={() => onPick(c.id)}
            >
              <div className="text-[13.5px] truncate">{c.title}</div>
              <div className="font-mono text-[9.5px] text-text-muted mt-1 tracking-[0.04em]">
                {c.when}
              </div>
            </button>
          ))}
          {results.length === 0 && <div className={modalEmpty}>No chats match that.</div>}
        </div>
      </div>
    </div>
  );
}
