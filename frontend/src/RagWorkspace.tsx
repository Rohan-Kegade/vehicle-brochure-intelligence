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
import { iconSvgProps as svgProps, onlyMobile, toolBtn, toolBtnHover } from "./components/ui.ts";

const scrim =
  "hidden fixed inset-0 border-0 bg-overlay cursor-pointer max-phone:block max-phone:opacity-0 max-phone:pointer-events-none max-phone:transition-opacity max-phone:duration-200";

/**
 * "Ask My Brochures" — a retrieval-augmented chat workspace over vehicle brochures.
 */
export function RagWorkspace(props: RagWorkspaceProps) {
  const w = useRagWorkspace(props);
  const { theme, toggleTheme } = useTheme();

  // Esc closes whichever overlay is open, outermost first
  const { chatSearchOpen, libOpen, filesOpen, closeChatSearch, closeLib, closeFiles } = w;
  useEffect(() => {
    if (!chatSearchOpen && !libOpen && !filesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (chatSearchOpen) closeChatSearch();
      else if (libOpen) closeLib();
      else closeFiles();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chatSearchOpen, libOpen, filesOpen, closeChatSearch, closeLib, closeFiles]);

  return (
    <div
      className="group/shell h-screen [height:100dvh] min-h-[420px] overflow-hidden flex items-stretch bg-shell transition-colors duration-200"
      data-nav={w.navOpen ? "open" : "closed"}
      data-files={w.filesOpen ? "open" : "closed"}
    >
      {w.isMobile || w.navOpen ? (
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

      <button
        type="button"
        className={`${scrim} max-phone:z-[79] group-data-[nav=open]/shell:max-phone:opacity-100 group-data-[nav=open]/shell:max-phone:pointer-events-auto`}
        aria-label="Close menu"
        tabIndex={-1}
        onClick={w.toggleNav}
      />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden px-[clamp(14px,3vw,32px)] pt-4 pb-[18px] max-phone:px-3 max-phone:pt-2.5 max-phone:pb-3">
        <header className="flex-none flex flex-nowrap items-center gap-3.5 pb-3 border-b border-line-2 mb-3 max-phone:gap-2 max-phone:pb-2.5 max-phone:mb-2.5">
          <button
            className={`${toolBtn} ${toolBtnHover} p-[9px] ${onlyMobile}`}
            aria-label="Open menu"
            onClick={w.toggleNav}
          >
            <svg {...svgProps}>
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="flex-1 min-w-0 text-base font-semibold tracking-[-0.2px] truncate max-phone:text-[15px]">
            {w.activeChatTitle}
          </div>

          <div className="flex items-center gap-[9px] max-phone:gap-1.5">
            <button
              className={`${toolBtn} ${toolBtnHover} p-[9px]`}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              aria-label="Toggle colour theme"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <svg {...svgProps}>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg {...svgProps}>
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                </svg>
              )}
            </button>

            <button
              className={`${toolBtn} p-[9px] hover:border-danger hover:text-danger`}
              title="Delete chat"
              aria-label="Delete chat"
              onClick={w.deleteChat}
            >
              <svg {...svgProps}>
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>

            <button
              className={`${toolBtn} ${toolBtnHover} p-[9px]`}
              title={w.shareCopied ? "Link copied" : "Share"}
              aria-label="Share chat"
              onClick={w.shareChat}
            >
              <svg className={w.shareCopied ? "text-accent" : "text-accent-text"} {...svgProps}>
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
              </svg>
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-nowrap gap-[18px] items-stretch max-tablet:flex-wrap max-tablet:overflow-y-auto max-phone:flex-nowrap max-phone:overflow-visible max-phone:gap-0">
          <ChatPanel
            messages={w.messages}
            typing={w.typing}
            draft={w.draft}
            scrollRef={w.scrollRef}
            onDraft={w.setDraft}
            onSubmit={w.submit}
            onSuggest={w.ask}
            filesOpen={w.filesOpen}
            activeCount={w.activeCount}
            onToggleFiles={w.toggleFiles}
          />
          <FilesPanel
            contextDocs={w.contextDocs}
            activeCount={w.activeCount}
            onToggleOn={w.toggleOn}
            onRemove={w.toggleAdd}
            onAdd={w.openLib}
            onClose={w.closeFiles}
          />
        </div>
      </div>

      <button
        type="button"
        className={`${scrim} max-phone:z-[74] group-data-[files=open]/shell:max-phone:opacity-100 group-data-[files=open]/shell:max-phone:pointer-events-auto`}
        aria-label="Hide chat context"
        tabIndex={-1}
        onClick={w.closeFiles}
      />

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
          scope={w.scope}
          scopeCounts={w.scopeCounts}
          filter={w.filter}
          shown={w.libraryShown}
          selectedCount={w.activeCount}
          indexing={w.indexing}
          indexName={w.indexName}
          indexStage={w.indexStage}
          indexPct={w.indexPct}
          onUpload={w.upload}
          onQuery={w.setQuery}
          onScope={w.setScope}
          onFilter={w.setFilter}
          onToggleAdd={w.toggleAdd}
          onClose={w.closeLib}
        />
      )}
    </div>
  );
}
