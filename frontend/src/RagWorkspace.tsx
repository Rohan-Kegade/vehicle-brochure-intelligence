import { useEffect } from "react";
import type { RagWorkspaceProps } from "./types.ts";
import { useRagWorkspace } from "./lib/useRagWorkspace.ts";
import { useTheme } from "./lib/useTheme.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { CollapsedRail } from "./components/CollapsedRail.tsx";
import { ChatPanel } from "./components/ChatPanel.tsx";
import { ChatSearchModal } from "./components/ChatSearchModal.tsx";
import { LibraryModal } from "./components/LibraryModal.tsx";
import { SettingsModal } from "./components/SettingsModal.tsx";
import { ConfirmModal } from "./components/ConfirmModal.tsx";
import { iconSvgProps as svgProps, onlyMobile, toolBtn, toolBtnHover } from "./components/ui.ts";

const scrim =
  "hidden fixed inset-0 border-0 bg-overlay cursor-pointer max-phone:block max-phone:opacity-0 max-phone:pointer-events-none max-phone:transition-opacity max-phone:duration-200";

/**
 * "Ask My Brochures" — a retrieval-augmented chat workspace over vehicle brochures.
 */
export function RagWorkspace(props: RagWorkspaceProps) {
  const w = useRagWorkspace(props);
  const { theme, setTheme } = useTheme();

  // Esc closes whichever overlay is open, outermost first
  const {
    chatSearchOpen,
    settingsOpen,
    libOpen,
    pendingDeleteChat,
    closeChatSearch,
    closeSettings,
    closeLib,
    cancelDeleteChat,
  } = w;
  useEffect(() => {
    if (!chatSearchOpen && !settingsOpen && !libOpen && !pendingDeleteChat) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pendingDeleteChat) cancelDeleteChat();
      else if (chatSearchOpen) closeChatSearch();
      else if (settingsOpen) closeSettings();
      else if (libOpen) closeLib();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    chatSearchOpen,
    settingsOpen,
    libOpen,
    pendingDeleteChat,
    closeChatSearch,
    closeSettings,
    closeLib,
    cancelDeleteChat,
  ]);

  return (
    <div
      className="group/shell h-screen [height:100dvh] min-h-[420px] overflow-hidden flex items-stretch bg-shell transition-colors duration-200"
      data-nav={w.navOpen ? "open" : "closed"}
    >
      {w.isMobile ? (
        <Sidebar
          chats={w.chats}
          activeChat={w.activeChat}
          onSelectChat={w.selectChat}
          onNewChat={w.newChat}
          onOpenChatSearch={w.openChatSearch}
          onOpenSettings={w.openSettings}
          onCollapse={w.toggleNav}
          onRequestDeleteChat={w.requestDeleteChat}
        />
      ) : (
        <div
          className="relative flex-none h-full overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
          style={{ width: w.navOpen ? 236 : 60 }}
        >
          <div
            className={`absolute inset-y-0 left-0 flex transition-opacity duration-200 motion-reduce:transition-none ${
              w.navOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!w.navOpen}
          >
            <Sidebar
              chats={w.chats}
              activeChat={w.activeChat}
              onSelectChat={w.selectChat}
              onNewChat={w.newChat}
              onOpenChatSearch={w.openChatSearch}
              onOpenSettings={w.openSettings}
              onCollapse={w.toggleNav}
              onRequestDeleteChat={w.requestDeleteChat}
            />
          </div>
          <div
            className={`absolute inset-y-0 left-0 flex transition-opacity duration-200 motion-reduce:transition-none ${
              w.navOpen ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}
            aria-hidden={w.navOpen}
          >
            <CollapsedRail
              onExpand={w.toggleNav}
              onNewChat={w.newChat}
              onOpenChatSearch={w.openChatSearch}
              onOpenSettings={w.openSettings}
            />
          </div>
        </div>
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

        <div className="flex-1 min-h-0 flex max-tablet:overflow-y-auto">
          <ChatPanel
            messages={w.messages}
            typing={w.typing}
            draft={w.draft}
            scrollRef={w.scrollRef}
            onDraft={w.setDraft}
            onSubmit={w.submit}
            canChat={w.canChat}
            contextDocs={w.contextDocs}
            isMobile={w.isMobile}
            onOpenLibrary={w.openLib}
            onToggleDoc={w.toggleOn}
            onRemoveDoc={w.toggleAdd}
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

      {w.settingsOpen && (
        <SettingsModal theme={theme} onTheme={setTheme} onClose={w.closeSettings} />
      )}

      {w.pendingDeleteChat && (
        <ConfirmModal
          title="Delete chat?"
          message={`“${w.pendingDeleteChat.title}” and its messages will be permanently removed. This can't be undone.`}
          confirmLabel="Delete chat"
          destructive
          onConfirm={w.confirmDeleteChat}
          onClose={w.cancelDeleteChat}
        />
      )}
    </div>
  );
}
