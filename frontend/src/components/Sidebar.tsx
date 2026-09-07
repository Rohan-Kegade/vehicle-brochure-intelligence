import type { Chat } from "../types.ts";

interface SidebarProps {
  chats: Chat[];
  activeChat: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenChatSearch: () => void;
  onCollapse: () => void;
}

const iconBtn =
  "flex-none w-[26px] h-[26px] rounded-[7px] border border-line-3 bg-transparent text-text-faint text-[13px] leading-none cursor-pointer hover:text-text hover:border-line-hover";

const menuItem =
  "flex items-center gap-[9px] w-full text-left px-2.5 py-2 rounded-[9px] bg-transparent text-text-nav text-[12.5px] cursor-pointer hover:bg-surface-4 hover:text-text";

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
    <div className="flex-none w-[236px] flex flex-col border-r border-line bg-surface-0 transition-colors duration-200 max-phone:fixed max-phone:inset-y-0 max-phone:left-0 max-phone:w-[min(84vw,300px)] max-phone:z-[80] max-phone:-translate-x-full max-phone:transition-transform max-phone:duration-[250ms] group-data-[nav=open]/shell:max-phone:translate-x-0">
      <div className="flex-none flex items-center gap-[10px] px-[14px] py-4">
        <div className="w-[30px] h-[30px] flex-none rounded-[9px] border border-line-4 bg-logo grid place-items-center font-mono text-[12px] text-accent-text">
          RG
        </div>
        <div className="flex-1 min-w-0 text-sm font-semibold tracking-[-0.2px] truncate">
          Ask My Documents
        </div>
        <button className={iconBtn} title="Hide menu" onClick={onCollapse}>
          ‹
        </button>
      </div>

      <div className="flex-none flex flex-col gap-[7px] px-3 pt-1 pb-[14px]">
        <button
          className="flex items-center gap-[9px] px-[11px] py-[9px] rounded-[10px] bg-accent text-accent-ink text-[13px] font-semibold cursor-pointer hover:bg-accent-bright"
          onClick={onNewChat}
        >
          <span className="font-mono text-[13px]">+</span>
          <span>New chat</span>
        </button>
        <button
          className="flex items-center gap-[9px] px-[11px] py-[9px] border border-line-3 rounded-[10px] bg-transparent text-text-dim text-[13px] cursor-pointer hover:border-line-hover hover:text-text"
          onClick={onOpenChatSearch}
        >
          <span className="font-mono text-[12px] text-accent-text">⌕</span>
          <span>Search chats</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3">
        <div className="font-mono text-[9.5px] tracking-[0.12em] text-text-muted px-[3px] pb-2">
          RECENT CHATS
        </div>
        <div className="flex flex-col gap-[3px]">
          {chats.map((c) => (
            <button
              key={c.id}
              className={`block w-full text-left px-2.5 py-2 border rounded-[9px] text-[12.5px] cursor-pointer truncate ${
                c.id === activeChat
                  ? "border-accent-line bg-accent-active text-text"
                  : "border-transparent bg-transparent text-text-nav hover:bg-surface-4 hover:text-text"
              }`}
              onClick={() => onSelectChat(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-none border-t border-line p-3">
        <div className="flex items-center gap-[10px] pt-1.5 px-1 pb-3">
          <div className="w-[30px] h-[30px] flex-none rounded-full border border-line-4 bg-surface-5 grid place-items-center font-mono text-[11px] text-accent-text-soft">
            MR
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] truncate">Maya Rao</div>
            <div className="font-mono text-[9.5px] text-text-muted mt-[2px]">Free plan</div>
          </div>
        </div>
        <div className="flex flex-col gap-[3px]">
          <button className={menuItem}>
            <span className="font-mono text-[11px]">⚙</span>
            <span>Settings</span>
          </button>
          <button className={menuItem}>
            <span className="font-mono text-[11px]">⇥</span>
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
