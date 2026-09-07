import type { Chat } from "../types.ts";

interface SidebarProps {
  chats: Chat[];
  activeChat: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenChatSearch: () => void;
  onCollapse: () => void;
}

/** Expanded left navigation: brand, chat actions, recent chats, account. */
export function Sidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onOpenChatSearch,
  onCollapse,
}: SidebarProps) {
  return (
    <div className="rag-sidebar">
      <div className="rag-sidebar__head">
        <div className="rag-logo">RG</div>
        <div className="rag-sidebar__title">Ask My Documents</div>
        <button className="rag-icon-btn" title="Hide menu" onClick={onCollapse}>
          ‹
        </button>
      </div>

      <div className="rag-sidebar__actions">
        <button className="rag-btn-primary" onClick={onNewChat}>
          <span className="glyph">+</span>
          <span>New chat</span>
        </button>
        <button className="rag-btn-ghost" onClick={onOpenChatSearch}>
          <span className="glyph">⌕</span>
          <span>Search chats</span>
        </button>
      </div>

      <div className="rag-sidebar__chats">
        <div className="rag-eyebrow">RECENT CHATS</div>
        <div className="rag-chat-list">
          {chats.map((c) => (
            <button
              key={c.id}
              className={`rag-chat-item${c.id === activeChat ? " is-active" : ""}`}
              onClick={() => onSelectChat(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="rag-sidebar__foot">
        <div className="rag-user">
          <div className="rag-avatar">MR</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="rag-user__name">Maya Rao</div>
            <div className="rag-user__plan">Free plan</div>
          </div>
        </div>
        <div className="rag-menu">
          <button className="rag-menu__item">
            <span className="glyph">⚙</span>
            <span>Settings</span>
          </button>
          <button className="rag-menu__item">
            <span className="glyph">⇥</span>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
