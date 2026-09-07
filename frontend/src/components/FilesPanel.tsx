import type { Doc } from "../types.ts";
import { MAX_CONTEXT } from "../data.ts";
import { card, cardLabel, dialogCloseBase, onlyMobile, track, trackFill } from "./ui.ts";

interface FilesPanelProps {
  contextDocs: Doc[];
  activeCount: number;
  onToggleOn: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  /** Dismiss the panel — used when it renders as a bottom sheet on mobile. */
  onClose: () => void;
}

/** Right-hand rail: brochures feeding retrieval and the context-limit meter.
 * Upload progress lives in the library modal, not here. */
export function FilesPanel({
  contextDocs,
  activeCount,
  onToggleOn,
  onRemove,
  onAdd,
  onClose,
}: FilesPanelProps) {
  const used = contextDocs.length;
  const limitPct = `${Math.min(100, (used / MAX_CONTEXT) * 100)}%`;

  return (
    <aside
      className={`${card} flex-[0_1_340px] min-w-[248px] max-w-[380px] max-tablet:flex-[1_1_100%] max-tablet:min-h-[420px] max-tablet:max-w-none max-phone:fixed max-phone:left-0 max-phone:right-0 max-phone:bottom-0 max-phone:top-auto max-phone:w-auto max-phone:min-w-0 max-phone:max-w-none max-phone:max-h-[82dvh] max-phone:z-[75] max-phone:rounded-b-none max-phone:border-b-0 max-phone:shadow-dialog max-phone:translate-y-[101%] max-phone:transition-transform max-phone:duration-[250ms] group-data-[files=open]/shell:max-phone:translate-y-0`}
    >
      <div className="flex-none flex items-center justify-between gap-2.5 px-[15px] py-[13px] border-b border-line bg-bar-tint max-phone:pt-[15px]">
        <span className={`${cardLabel} text-accent-text-soft`}>Brochures in use</span>
        <span className="font-mono text-[10.5px] text-text-muted">
          {activeCount} of {used}
        </span>
        <button
          className={`${dialogCloseBase} w-7 h-7 rounded-[8px] text-[14px] ${onlyMobile}`}
          aria-label="Hide brochures"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col bg-files">
        <div className="flex-1 min-h-0 overflow-y-auto px-[15px] py-3 flex flex-col gap-2">
          {contextDocs.map((d) => (
            <div
              key={d.id}
              className="py-[11px] px-3 border border-line-card rounded-[12px] bg-surface-3 animate-fadein"
            >
              <div className="text-[13px] text-text-soft leading-[1.4] break-words">
                {d.title}
              </div>
              <div className="flex items-center justify-between gap-2.5 mt-[9px]">
                <span className="font-mono text-[9.5px] text-text-muted tracking-[0.04em]">
                  {d.on ? "In use" : "Paused"}
                </span>
                <div className="flex-none flex items-center gap-2">
                  <button
                    className={`w-8 h-[19px] rounded-full border p-0.5 cursor-pointer flex ${
                      d.on
                        ? "border-accent-line bg-accent-tint-hi justify-end"
                        : "border-line-4 bg-track justify-start"
                    }`}
                    title="Pause or use this brochure"
                    aria-pressed={d.on}
                    onClick={() => onToggleOn(d.id)}
                  >
                    <span
                      className={`w-[13px] h-[13px] rounded-full transition-all duration-200 ${
                        d.on ? "bg-accent" : "bg-text-ghost"
                      }`}
                    />
                  </button>
                  <button
                    className="w-6 h-6 rounded-[7px] border border-line-4 bg-surface-6 text-text-faint text-[13px] leading-none cursor-pointer hover:border-line-hover hover:text-text"
                    title="Remove this brochure"
                    onClick={() => onRemove(d.id)}
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}

          {contextDocs.length === 0 && (
            <div className="py-4 px-[13px] border border-dashed border-line-4 rounded-[12px]">
              <div className="text-[13px] text-text-dim">No brochures added yet</div>
              <div className="text-[12px] text-text-ghost mt-[5px] leading-[1.5]">
                Use the Add vehicle button below to pick one from your library or upload a PDF.
              </div>
            </div>
          )}

          <button
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 border border-dashed border-line-4 rounded-[12px] bg-transparent text-text-dim text-[12.5px] cursor-pointer transition-all duration-[160ms] hover:border-accent hover:text-text-hi hover:bg-accent-tint-lo"
            onClick={onAdd}
          >
            <span className="font-mono text-[12px] text-accent-text">+</span>
            <span>Add vehicle</span>
          </button>
        </div>

        <div className="flex-none px-[15px] pt-[11px] pb-[13px] border-t border-line">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="font-mono text-[9.5px] tracking-[0.1em] text-text-muted">
              Limit utilized
            </span>
            <span className="font-mono text-[10px] text-text-soft">
              {used} / {MAX_CONTEXT}
            </span>
          </div>
          <div className={`${track} h-[4px] mt-[9px]`}>
            <div
              className={`${trackFill} bg-accent duration-[400ms]`}
              style={{ width: limitPct }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
