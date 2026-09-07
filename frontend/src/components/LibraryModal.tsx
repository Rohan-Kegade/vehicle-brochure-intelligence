import type { Doc } from "../types.ts";
import { LIBRARY_FILTERS } from "../data.ts";
import {
  dialog,
  dialogCloseBase,
  eyebrow,
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
  filter: string;
  shown: Doc[];
  selectedCount: number;
  indexing: boolean;
  indexName: string;
  indexStage: string;
  indexPct: number;
  onUpload: () => void;
  onQuery: (v: string) => void;
  onFilter: (v: string) => void;
  onToggleAdd: (id: string) => void;
  onClose: () => void;
}

/** Full library browser: upload a new file, then search / filter / add existing ones. */
export function LibraryModal({
  query,
  filter,
  shown,
  selectedCount,
  indexing,
  indexName: name,
  indexStage: stage,
  indexPct,
  onUpload,
  onQuery,
  onFilter,
  onToggleAdd,
  onClose,
}: LibraryModalProps) {
  return (
    <div
      className={`${overlay} z-[60] bg-overlay items-center p-6 max-phone:p-3`}
      onClick={onClose}
    >
      <div
        className={`${dialog} w-[min(660px,100%)] max-h-[min(620px,86dvh)]`}
        role="dialog"
        aria-modal="true"
        aria-label="Add vehicle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-none flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-line">
          <div>
            <div className="text-[15px] font-semibold">Add vehicle</div>
            <div className="font-mono text-[10px] text-text-ghost tracking-[0.08em] mt-1">
              Pick the files you want to chat with
            </div>
          </div>
          <button
            className={`${dialogCloseBase} w-[30px] h-[30px] rounded-[9px] text-[15px]`}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-none px-[18px] pt-[15px]">
          <div className={eyebrow}>UPLOAD</div>
          <button
            className="flex items-center gap-[13px] w-full text-left px-3.5 py-[13px] border border-dashed border-line-dash rounded-[12px] bg-surface-1 text-text-dim cursor-pointer transition-all duration-[160ms] enabled:hover:border-accent enabled:hover:text-text-hi enabled:hover:bg-accent-tint-lo disabled:cursor-default disabled:opacity-70"
            onClick={onUpload}
            disabled={indexing}
          >
            <span className="flex-none w-[30px] h-[30px] grid place-items-center border border-accent-line rounded-[9px] bg-accent-tint text-[13px]">
              ↑
            </span>
            <span className="flex flex-col gap-[3px] min-w-0">
              <span className="text-[13px] text-text-soft">
                {indexing ? "Indexing…" : "Upload a PDF"}
              </span>
              <span className="font-mono text-[10px] text-text-ghost tracking-[0.04em]">
                Add a new file to your library and start reading it
              </span>
            </span>
          </button>

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

        <div className="flex-none px-[18px] pt-[15px]">
          <div className={eyebrow}>SEARCH LIBRARY</div>
          <div className="flex items-center gap-[9px] border border-line-input rounded-[11px] bg-surface-1 px-[13px] focus-within:border-line-input-focus">
            <span className="font-mono text-[12px] text-text-ghost">⌕</span>
            <input
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-[14px] py-[11px] max-phone:text-base"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search by file name…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {LIBRARY_FILTERS.map((f) => (
              <button
                key={f}
                className={`whitespace-nowrap px-[11px] py-[5px] rounded-[8px] border font-mono text-[10px] tracking-[0.08em] cursor-pointer ${
                  filter === f
                    ? "border-accent-line bg-accent-tint-2 text-accent-text-soft"
                    : "border-line-3 bg-transparent text-text-faint"
                }`}
                onClick={() => onFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-[120px] flex flex-col gap-2 overflow-y-auto px-[18px] py-3.5">
          {shown.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-3.5 px-3.5 py-[13px] border border-line-card rounded-[12px] bg-surface-3 hover:border-line-4"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] text-text-soft truncate">{d.title}</div>
                <div className="font-mono text-[10px] text-text-ghost mt-[5px] tracking-[0.04em]">
                  {d.tag} · {d.pages} pages
                </div>
              </div>
              <button
                className={`flex-none px-3 py-[7px] rounded-[8px] border font-mono text-[10px] tracking-[0.06em] cursor-pointer ${
                  d.added
                    ? "border-accent-line bg-accent-tint-2 text-accent-text-soft hover:border-line-hover"
                    : "border-line-4 bg-surface-6 text-text-dim hover:border-accent hover:text-text"
                }`}
                title={d.added ? "Remove this file" : undefined}
                onClick={() => onToggleAdd(d.id)}
              >
                {d.added ? "Added ✓" : "Add"}
              </button>
            </div>
          ))}
          {shown.length === 0 && (
            <div className={modalEmpty}>Nothing matches that search.</div>
          )}
        </div>

        <div className="flex-none flex items-center justify-between gap-3 px-[18px] py-[13px] border-t border-line bg-bar-tint">
          <span className="font-mono text-[10.5px] text-text-faint tracking-[0.06em]">
            {selectedCount} files selected
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
