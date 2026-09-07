/**
 * Shared Tailwind class strings for the workspace. These are the handful of
 * element recipes that repeat across components; anything used in one place
 * stays inline in that component.
 */

export const card =
  "flex flex-col min-h-0 border border-line-2 rounded-[18px] bg-card overflow-hidden transition-colors duration-200";

export const cardLabel = "font-mono text-[11px] tracking-[0.12em] text-accent-text";

export const eyebrow =
  "font-mono text-[9.5px] tracking-[0.12em] text-text-muted px-[3px] pb-2";

/** Small square icon-only close button used in every modal / the files sheet. */
export const dialogCloseBase =
  "flex-none border border-line-4 bg-surface-6 text-text-faint leading-none cursor-pointer hover:border-line-hover hover:text-text";

export const modalEmpty = "px-1 py-[26px] text-center text-[13.5px] text-text-ghost";

/** display:none until phone width, where it turns into a centered flex item. */
export const onlyMobile =
  "hidden max-phone:flex max-phone:items-center max-phone:justify-center";

export const overlay = "fixed inset-0 flex justify-center animate-overlay";

export const dialog =
  "flex flex-col border border-line-3 rounded-[18px] bg-surface-2 shadow-dialog overflow-hidden animate-dialog";

/* Indexing progress card + its progress track. */
export const indexCard =
  "px-[11px] py-[9px] border border-amber-line rounded-[10px] bg-amber-tint animate-fadein";
export const indexRow = "flex justify-between gap-2.5 items-baseline";
export const indexName = "text-[12px] text-text-soft truncate";
export const indexStage = "font-mono text-[9.5px] text-amber-text flex-none";
/** Progress track. Add height + top margin (`h-[3px] mt-2`) at the call site. */
export const track = "rounded-[3px] bg-track overflow-hidden";
/** Progress fill. Add a `bg-*` and a `duration-*` at the call site. */
export const trackFill = "h-full transition-[width]";
