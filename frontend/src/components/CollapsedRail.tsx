import { ACCOUNT } from "../data.ts";

interface CollapsedRailProps {
  onExpand: () => void;
  onNewChat: () => void;
  onOpenChatSearch: () => void;
  onOpenSettings: () => void;
}

const railBtn =
  "w-8 h-8 rounded-[9px] border border-line-4 bg-logo text-accent-text font-mono text-[12px] cursor-pointer";

const railIcon =
  "w-8 h-8 grid place-items-center rounded-[9px] border border-line-3 bg-transparent text-text-faint text-[13px] leading-none cursor-pointer hover:text-text hover:border-line-hover";

/** Narrow icon rail shown when the sidebar is collapsed. Mirrors the expanded
 * sidebar: brand + expand up top, chat actions in the middle, account row
 * (settings / log out / avatar) pinned to the bottom. */
export function CollapsedRail({
  onExpand,
  onNewChat,
  onOpenChatSearch,
  onOpenSettings,
}: CollapsedRailProps) {
  return (
    <div className="flex-none w-[60px] flex flex-col items-center gap-2 py-4 border-r border-line bg-surface-0 transition-colors duration-200 max-phone:hidden">
      <div className="w-8 h-8 flex-none rounded-[9px] border border-line-4 bg-logo grid place-items-center font-mono text-[12px] text-accent-text">
        RG
      </div>
      <button
        className={railIcon}
        title="Show menu"
        aria-label="Expand sidebar"
        onClick={onExpand}
      >
        ›
      </button>

      <div className="w-6 h-px bg-line my-1" />

      <button
        className={`${railBtn} border-0 bg-accent text-accent-ink text-[14px]`}
        title="New chat"
        onClick={onNewChat}
      >
        +
      </button>
      <button
        className={`${railBtn} bg-transparent border-line-3 text-accent-text text-[13px]`}
        title="Search chats"
        onClick={onOpenChatSearch}
      >
        ⌕
      </button>

      <div className="flex-1" />

      <div className="w-[30px] h-[30px] flex-none rounded-full border border-line-4 bg-surface-5 grid place-items-center font-mono text-[11px] text-accent-text-soft">
        {ACCOUNT.initials}
      </div>
      <button
        className={railIcon}
        title="Settings"
        aria-label="Open settings"
        onClick={onOpenSettings}
      >
        ⚙
      </button>
      <button className={railIcon} title="Log out" aria-label="Log out">
        ⇥
      </button>
    </div>
  );
}
