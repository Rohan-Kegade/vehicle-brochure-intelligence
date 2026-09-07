interface CollapsedRailProps {
  onExpand: () => void;
  onNewChat: () => void;
  onOpenChatSearch: () => void;
}

/** Narrow icon rail shown when the sidebar is collapsed. */
export function CollapsedRail({ onExpand, onNewChat, onOpenChatSearch }: CollapsedRailProps) {
  return (
    <div className="rag-rail">
      <button className="rag-rail__btn" title="Show menu" onClick={onExpand}>
        RG
      </button>
      <button className="rag-rail__btn rag-rail__btn--primary" title="New chat" onClick={onNewChat}>
        +
      </button>
      <button
        className="rag-rail__btn rag-rail__btn--ghost"
        title="Search chats"
        onClick={onOpenChatSearch}
      >
        ⌕
      </button>
      <div className="rag-rail__spacer" />
      <div className="rag-avatar">MR</div>
    </div>
  );
}
