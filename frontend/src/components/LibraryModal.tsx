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
      <div
        key={d.id}
        className="flex items-center gap-3.5 px-3.5 py-[13px] border border-line-card rounded-[12px] bg-surface-3 hover:border-line-4"
      >
        <div className="flex-1 min-w-0">
          <div className="text-[13.5px] text-text-soft truncate">{d.title}</div>
          <div className="font-mono text-[10px] text-text-ghost mt-[5px] tracking-[0.04em]">
            {meta}
          </div>
        </div>
        <button
          className={`flex-none px-3 py-[7px] rounded-[8px] border font-mono text-[10px] tracking-[0.06em] cursor-pointer ${
            d.added
              ? "border-accent-line bg-accent-tint-2 text-accent-text-soft hover:border-line-hover"
              : "border-line-4 bg-surface-6 text-text-dim hover:border-accent hover:text-text"
          }`}
          title={d.added ? "Remove this brochure" : undefined}
          onClick={() => onToggleAdd(d.id)}
        >
          {d.added ? "Added ✓" : "Add"}
        </button>
      </div>
    );
  };

  return (
    <div
      className={`${overlay} z-[60] bg-overlay items-center p-6 max-phone:p-3`}
      onClick={onClose}
    >
      <div
        className={`${dialog} w-[min(660px,100%)] max-h-[min(700px,90dvh)]`}
        role="dialog"
        aria-modal="true"
        aria-label="Add vehicle brochure"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-none px-[18px] pt-[15px]">
          <div className="flex items-center justify-between gap-3 pb-2">
            <div className="text-[13px] font-bold tracking-[0.02em] text-text">
              Search library
            </div>
            <button
              className={`${dialogCloseBase} w-[30px] h-[30px] rounded-[9px] text-[15px]`}
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 flex items-center gap-[9px] border border-line-input rounded-[11px] bg-surface-1 px-[13px] focus-within:border-line-input-focus">
              <span className="font-mono text-[12px] text-text-ghost">⌕</span>
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
              <svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 15V3" />
                <path d="m7 8 5-5 5 5" />
                <path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
              </svg>
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
