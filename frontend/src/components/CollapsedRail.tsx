interface CollapsedRailProps {
  onExpand: () => void;
  onNewChat: () => void;
  onOpenChatSearch: () => void;
}

const railBtn =
  "w-8 h-8 rounded-[9px] border border-line-4 bg-logo text-accent-text font-mono text-[12px] cursor-pointer";

/** Narrow icon rail shown when the sidebar is collapsed. */
export function CollapsedRail({ onExpand, onNewChat, onOpenChatSearch }: CollapsedRailProps) {
  return (
    <div className="flex-none w-[60px] flex flex-col items-center gap-2 py-4 border-r border-line bg-surface-0 transition-colors duration-200 max-phone:hidden">
      <button className={railBtn} title="Show menu" onClick={onExpand}>
        RG
      </button>
      <button
        className={`${railBtn} border-0 bg-accent text-accent-ink text-[14px] mt-[6px]`}
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
        MR
      </div>
    </div>
  );
}
