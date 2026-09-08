import { Check, Search, Upload, X } from "lucide-react";
import type { Doc } from "../types.ts";
import {
  dialog,
  dialogCloseBase,
  indexCard,
  indexName,
  indexRow,
  indexStage,
  modalEmpty,
  overlay,
  track,
  trackFill,
} from "./ui.ts";

interface LibraryModalProps {
  query: string;
  /** Total brochures the user has uploaded — drives the empty state. */
  uploadCount: number;
  shown: Doc[];
  selectedCount: number;
  indexing: boolean;
  indexName: string;
  indexStage: string;
  indexPct: number;
  onUpload: () => void;
  onQuery: (v: string) => void;
  onToggleAdd: (id: string) => void;
  onClose: () => void;
}

/** The user's uploaded brochures: upload a new one, then search / add. */
export function LibraryModal({
  query,
  uploadCount,
  shown,
  selectedCount,
  indexing,
  indexName: name,
  indexStage: stage,
  indexPct,
  onUpload,
  onQuery,
  onToggleAdd,
  onClose,
}: LibraryModalProps) {
  const row = (d: Doc) => {
    const meta = [d.make, d.tag, `${d.pages} pages`].filter(Boolean).join(" · ");
    return (
      <button
        key={d.id}
        type="button"
        role="checkbox"
        aria-checked={d.added}
        className={`flex items-center gap-3 w-full text-left px-3.5 py-[13px] border rounded-[12px] cursor-pointer transition-colors duration-[140ms] ${
          d.added
            ? "border-accent-line bg-accent-tint-2"
            : "border-line-card bg-surface-3 hover:border-line-4"
        }`}
        onClick={() => onToggleAdd(d.id)}
      >
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] text-text-soft truncate">{d.title}</span>
          <span className="block font-mono text-[10px] text-text-ghost mt-[5px] tracking-[0.04em]">
            {meta}
          </span>
        </span>
        <span
          className={`flex-none grid place-items-center w-[20px] h-[20px] rounded-[6px] border transition-colors duration-[140ms] ${
            d.added
              ? "border-accent-line bg-accent text-accent-ink"
              : "border-line-4 bg-surface-6 text-transparent"
          }`}
        >
          <Check size={12} strokeWidth={2.4} aria-hidden />
        </span>
      </button>
    );
  };

  return (
    <div
      className={`${overlay} z-[60] bg-overlay items-center p-6 max-phone:p-3`}
      onClick={onClose}
    >
      <div
        className={`${dialog} w-[min(560px,100%)] max-h-[min(600px,85dvh)]`}
        role="dialog"
        aria-modal="true"
        aria-label="Add vehicle brochure"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-none px-[18px] pt-[15px]">
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="text-[13px] font-bold tracking-[0.02em] text-text">
              Brochure Library
            </div>
            <button
              className={`${dialogCloseBase} w-[30px] h-[30px] rounded-[9px] text-[15px]`}
              aria-label="Close"
              onClick={onClose}
            >
              <X size={15} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-[9px] border border-line-input rounded-[11px] bg-surface-1 px-[13px] focus-within:border-line-input-focus">
              <Search
                size={14}
                strokeWidth={1.8}
                className="flex-none text-text-ghost"
                aria-hidden
              />
              <input
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-[14px] py-[11px] max-phone:text-base"
                value={query}
                onChange={(e) => onQuery(e.target.value)}
                placeholder="Search by name, brand or type…"
              />
            </div>
            <button
              type="button"
              className="flex-none grid place-items-center w-[40px] h-[40px] rounded-[10px] border border-line-input bg-surface-1 text-accent-text cursor-pointer transition-colors duration-[160ms] enabled:hover:border-accent enabled:hover:text-text-hi disabled:opacity-60 disabled:cursor-default"
              title={indexing ? "Indexing…" : "Upload a PDF"}
              aria-label="Upload a PDF"
              onClick={onUpload}
              disabled={indexing}
            >
              <Upload size={14} strokeWidth={1.9} aria-hidden />
            </button>
          </div>

          {indexing && (
            <div className={`${indexCard} mt-2.5`}>
              <div className={indexRow}>
                <span className={indexName}>{name}</span>
                <span className={indexStage}>{stage}</span>
              </div>
              <div className={`${track} h-[3px] mt-2`}>
                <div
                  className={`${trackFill} bg-amber duration-500`}
                  style={{ width: `${indexPct}%` }}
                />
              </div>
            </div>
          )}

        </div>

        <div className="flex-1 min-h-[120px] flex flex-col gap-2 overflow-y-auto px-[18px] py-3.5">
          {shown.map(row)}
          {shown.length === 0 && (
            <div className={modalEmpty}>
              {uploadCount === 0
                ? "You haven't uploaded any brochures yet — use the upload button above."
                : "No brochures match your search."}
            </div>
          )}
        </div>

        <div className="flex-none flex items-center justify-between gap-3 px-[18px] py-[13px] border-t border-line bg-bar-tint">
          <span className="font-mono text-[10.5px] text-text-faint tracking-[0.06em]">
            {selectedCount} brochures selected
          </span>
          <button
            className="flex-none px-[18px] py-2.5 border-0 rounded-[10px] bg-accent text-accent-ink text-[13.5px] font-semibold cursor-pointer hover:bg-accent-bright"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
