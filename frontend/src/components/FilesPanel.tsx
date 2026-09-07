import type { Doc } from "../types.ts";

interface FilesPanelProps {
  contextDocs: Doc[];
  activeCount: number;
  libCount: number;
  ctxPct: string;
  indexing: boolean;
  indexName: string;
  indexStage: string;
  indexPct: number;
  onToggleOn: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

/** Right-hand rail: files feeding retrieval, indexing progress, space meter. */
export function FilesPanel({
  contextDocs,
  activeCount,
  libCount,
  ctxPct,
  indexing,
  indexName,
  indexStage,
  indexPct,
  onToggleOn,
  onRemove,
  onAdd,
}: FilesPanelProps) {
  return (
    <aside className="rag-card rag-files">
      <div className="rag-files__head">
        <span className="rag-card__label rag-card__label--soft">Files in use</span>
        <span className="rag-files__count">
          {activeCount} of {libCount}
        </span>
      </div>

      {indexing && (
        <div className="rag-index">
          <div className="rag-index__card">
            <div className="rag-index__row">
              <span className="rag-index__name">{indexName}</span>
              <span className="rag-index__stage">{indexStage}</span>
            </div>
            <div className="rag-track">
              <div className="rag-track__fill" style={{ width: `${indexPct}%` }} />
            </div>
          </div>
        </div>
      )}

      <div className="rag-files__body">
        <div className="rag-files__list">
          {contextDocs.map((d) => (
            <div key={d.id} className="rag-ctx">
              <div className="rag-ctx__title">{d.title}</div>
              <div className="rag-ctx__row">
                <span className="rag-ctx__meta">{d.on ? "In use" : "Paused"}</span>
                <div className="rag-ctx__controls">
                  <button
                    className={`rag-switch${d.on ? " is-on" : ""}`}
                    title="Pause or use this file"
                    aria-pressed={d.on}
                    onClick={() => onToggleOn(d.id)}
                  >
                    <span className="rag-switch__knob" />
                  </button>
                  <button
                    className="rag-remove"
                    title="Remove this file"
                    onClick={() => onRemove(d.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}

          {contextDocs.length === 0 && (
            <div className="rag-empty">
              <div className="rag-empty__title">No files added yet</div>
              <div className="rag-empty__sub">
                Use Add files in the top bar to pick from your library or upload a PDF.
              </div>
            </div>
          )}

          <button className="rag-ctx-add" onClick={onAdd}>
            <span className="glyph">+</span>
            <span>Add another vehicle</span>
          </button>
        </div>

        <div className="rag-files__foot">
          <div className="rag-files__foot-row">
            <span className="rag-files__foot-label">Space used</span>
            <span className="rag-files__foot-val">{ctxPct}</span>
          </div>
          <div className="rag-track rag-track--lg">
            <div className="rag-track__fill" style={{ width: ctxPct }} />
          </div>
        </div>
      </div>
    </aside>
  );
}
