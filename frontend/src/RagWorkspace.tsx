import { useEffect } from "react";
import type { RagWorkspaceProps } from "./types.ts";
import { useRagWorkspace } from "./lib/useRagWorkspace.ts";
import { useTheme } from "./lib/useTheme.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { CollapsedRail } from "./components/CollapsedRail.tsx";
import { ChatPanel } from "./components/ChatPanel.tsx";
import { FilesPanel } from "./components/FilesPanel.tsx";
import { ChatSearchModal } from "./components/ChatSearchModal.tsx";
import { LibraryModal } from "./components/LibraryModal.tsx";
import "./styles/workspace.css";

/**
 * "Ask My Documents" — a retrieval-augmented chat workspace.
 */
export function RagWorkspace(props: RagWorkspaceProps) {
  const w = useRagWorkspace(props);
  const { theme, toggleTheme } = useTheme();

  // Esc closes whichever overlay is open (chat search sits above the library)
  const { chatSearchOpen, libOpen, closeChatSearch, closeLib } = w;
  useEffect(() => {
    if (!chatSearchOpen && !libOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (chatSearchOpen) closeChatSearch();
      else closeLib();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatSearchOpen, libOpen, closeChatSearch, closeLib]);

  return (
    <div className="rag-shell">
      {w.navOpen ? (
        <Sidebar
          chats={w.chats}
          activeChat={w.activeChat}
          onSelectChat={w.selectChat}
          onNewChat={w.newChat}
          onOpenChatSearch={w.openChatSearch}
          onCollapse={w.toggleNav}
        />
      ) : (
        <CollapsedRail
          onExpand={w.toggleNav}
          onNewChat={w.newChat}
          onOpenChatSearch={w.openChatSearch}
        />
      )}

      <div className="rag-main">
        <header className="rag-header">
          <div className="rag-header__title">{w.activeChatTitle}</div>
          <div className="rag-header__actions">
            <button
              className="rag-toolbtn rag-toolbtn--icon"
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              aria-label="Toggle colour theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>
            <button
              className="rag-toolbtn rag-toolbtn--icon rag-toolbtn--danger"
              title="Delete chat"
              aria-label="Delete chat"
              onClick={w.deleteChat}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
            <button className="rag-toolbtn" onClick={w.shareChat}>
              <svg
                className="glyph"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
              </svg>
              <span>{w.shareCopied ? "Link copied" : "Share"}</span>
            </button>
          </div>
        </header>

        <div className="rag-body">
          <ChatPanel
            messages={w.messages}
            typing={w.typing}
            draft={w.draft}
            activeCount={w.activeCount}
            scrollRef={w.scrollRef}
            onDraft={w.setDraft}
            onSubmit={w.submit}
            onSuggest={w.ask}
          />
          <FilesPanel
            contextDocs={w.contextDocs}
            activeCount={w.activeCount}
            libCount={w.libCount}
            ctxPct={w.ctxPct}
            indexing={w.indexing}
            indexName={w.indexName}
            indexStage={w.indexStage}
            indexPct={w.indexPct}
            onToggleOn={w.toggleOn}
            onRemove={w.toggleAdd}
            onAdd={w.openLib}
          />
        </div>
      </div>

      {w.chatSearchOpen && (
        <ChatSearchModal
          query={w.chatQuery}
          results={w.chatResults}
          onQuery={w.setChatQuery}
          onPick={(id) => {
            w.selectChat(id);
            w.closeChatSearch();
          }}
          onClose={w.closeChatSearch}
        />
      )}

      {w.libOpen && (
        <LibraryModal
          query={w.query}
          filter={w.filter}
          shown={w.libraryShown}
          selectedCount={w.activeCount}
          indexing={w.indexing}
          indexName={w.indexName}
          indexStage={w.indexStage}
          indexPct={w.indexPct}
          onUpload={w.upload}
          onQuery={w.setQuery}
          onFilter={w.setFilter}
          onToggleAdd={w.toggleAdd}
          onClose={w.closeLib}
        />
      )}
    </div>
  );
}
