import { dialog, overlay } from "./ui.ts";

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (red). */
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** A small yes/no dialog for irreversible actions — used to confirm chat
 * deletion from the sidebar row menu. */
export function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <div
      className={`${overlay} z-[70] bg-overlay items-center p-6 max-phone:p-3`}
      onClick={onClose}
    >
      <div
        className={`${dialog} w-[min(400px,100%)]`}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-[18px] pt-[18px] pb-3.5">
          <div className="text-[15px] font-semibold">{title}</div>
          <p className="text-[13px] leading-[1.6] text-text-dim mt-2 [text-wrap:pretty]">
            {message}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-[18px] py-[13px] border-t border-line bg-bar-tint">
          <button
            type="button"
            className="px-3.5 py-2 rounded-[9px] border border-line-3 bg-transparent text-text-dim text-[12.5px] cursor-pointer hover:border-line-hover hover:text-text"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`px-3.5 py-2 rounded-[9px] border-0 text-[12.5px] font-semibold cursor-pointer ${
              destructive
                ? "bg-danger text-white hover:opacity-90"
                : "bg-accent text-accent-ink hover:bg-accent-bright"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
