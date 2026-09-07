import type { Doc } from "../types.ts";
import { LIBRARY_FILTERS } from "../data.ts";

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
  indexName,
  indexStage,
  indexPct,
  onUpload,
  onQuery,
  onFilter,
  onToggleAdd,
  onClose,
}: LibraryModalProps) {
  return (
    <div className="rag-overlay rag-overlay--lib" onClick={onClose}>
      <div
        className="rag-dialog rag-dialog--lib"
        role="dialog"
        aria-modal="true"
        aria-label="Add vehicle"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rag-dialog__head">
          <div>
            <div className="rag-dialog__head-title">Add vehicle</div>
            <div className="rag-dialog__head-sub">Pick the files you want to chat with</div>
          </div>
          <button className="rag-dialog__close rag-dialog__close--lg" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="rag-libupload">
          <div className="rag-eyebrow">UPLOAD</div>
          <button className="rag-libupload__drop" onClick={onUpload} disabled={indexing}>
            <span className="rag-libupload__icon glyph">↑</span>
            <span className="rag-libupload__text">
              <span className="rag-libupload__title">
                {indexing ? "Indexing…" : "Upload a PDF"}
              </span>
              <span className="rag-libupload__sub">
                Add a new file to your library and start reading it
              </span>
            </span>
          </button>

          {indexing && (
            <div className="rag-index__card" style={{ marginTop: 10 }}>
              <div className="rag-index__row">
                <span className="rag-index__name">{indexName}</span>
                <span className="rag-index__stage">{indexStage}</span>
              </div>
              <div className="rag-track">
                <div className="rag-track__fill" style={{ width: `${indexPct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="rag-libsearch">
          <div className="rag-eyebrow">SEARCH LIBRARY</div>
          <div className="rag-libsearch__bar">
            <span className="glyph">⌕</span>
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search by file name…"
            />
          </div>
          <div className="rag-filters">
            {LIBRARY_FILTERS.map((f) => (
              <button
                key={f}
                className={`rag-filter${filter === f ? " is-active" : ""}`}
                onClick={() => onFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="rag-liblist">
          {shown.map((d) => (
            <div key={d.id} className="rag-librow">
              <div className="rag-librow__info">
                <div className="rag-librow__title">{d.title}</div>
                <div className="rag-librow__meta">
                  {d.tag} · {d.pages} pages
                </div>
              </div>
              <button
                className={`rag-librow__btn${d.added ? " is-added" : ""}`}
                title={d.added ? "Remove this file" : undefined}
                onClick={() => onToggleAdd(d.id)}
              >
                {d.added ? "Added ✓" : "Add"}
              </button>
            </div>
          ))}
          {shown.length === 0 && (
            <div className="rag-modal-empty">Nothing matches that search.</div>
          )}
        </div>

        <div className="rag-dialog__foot">
          <span className="rag-dialog__foot-note">{selectedCount} files selected</span>
          <button className="rag-dialog__done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
