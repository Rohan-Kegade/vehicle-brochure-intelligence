import { useEffect, useRef, useState } from "react";
import {
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Trash2,
} from "lucide-react";
import type { Chat } from "../types.ts";
import { PLAN_LABEL } from "../data.ts";
import { initialsFrom, useAuth } from "../lib/auth.tsx";

interface SidebarProps {
  chats: Chat[];
  activeChat: string;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onOpenChatSearch: () => void;
  onOpenSettings: () => void;
  onCollapse: () => void;
  /** Ask to delete a chat — opens the confirmation modal. */
  onRequestDeleteChat: (id: string) => void;
}

const iconBtn =
  "flex-none grid place-items-center w-[26px] h-[26px] rounded-[7px] border border-line-3 bg-transparent text-text-faint text-[13px] leading-none cursor-pointer hover:text-text hover:border-line-hover";

const menuItem =
  "flex items-center gap-[9px] w-full text-left px-2.5 py-2 rounded-[9px] bg-transparent text-text-nav text-[12.5px] cursor-pointer hover:bg-surface-4 hover:text-text";

/** One row in the recent-chats list: the chat button plus a ⋯ menu that holds
 * the destructive "Delete chat" action. */
function ChatRow({
  chat,
  active,
  menuOpen,
  onSelect,
  onToggleMenu,
  onRequestDelete,
}: {
  chat: Chat;
  active: boolean;
  menuOpen: boolean;
  onSelect: () => void;
  onToggleMenu: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="group/chat relative flex items-center">
      <button
        className={`flex-1 min-w-0 text-left pl-2.5 pr-8 py-2 border rounded-[9px] text-[12.5px] cursor-pointer truncate ${
          active
            ? "border-accent-line bg-accent-active text-text"
            : "border-transparent bg-transparent text-text-nav hover:bg-surface-4 hover:text-text"
        }`}
        onClick={onSelect}
      >
        {chat.title}
      </button>

      <button
        className={`absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-[7px] text-text-faint text-[13px] leading-none cursor-pointer hover:bg-surface-5 hover:text-text focus-visible:opacity-100 group-hover/chat:opacity-100 max-phone:opacity-100 ${
          menuOpen ? "opacity-100 bg-surface-5 text-text" : "opacity-0"
        }`}
        aria-label="Chat options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          onToggleMenu();
        }}
      >
        <MoreHorizontal size={15} strokeWidth={1.9} aria-hidden />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-1 top-[calc(100%-2px)] z-30 w-[152px] rounded-[10px] border border-line-3 bg-surface-2 shadow-dialog p-1 animate-fadein"
        >
          <button
            role="menuitem"
            className="flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-[7px] text-[12.5px] text-danger cursor-pointer hover:bg-danger/10"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete();
            }}
          >
            <Trash2 size={13} strokeWidth={1.9} aria-hidden />
            <span>Delete chat</span>
          </button>
        </div>
      )}
    </div>
  );
}

/** Expanded left navigation: brand, chat actions, recent chats, account. */
export function Sidebar({
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
  onOpenChatSearch,
  onOpenSettings,
  onCollapse,
  onRequestDeleteChat,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const [menuId, setMenuId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Close the row menu on outside click / Esc.
  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setMenuId(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuId]);

  return (
    <div className="flex-none w-[236px] flex flex-col border-r border-line bg-surface-0 transition-colors duration-200 max-phone:fixed max-phone:inset-y-0 max-phone:left-0 max-phone:w-[min(84vw,300px)] max-phone:z-[80] max-phone:-translate-x-full max-phone:transition-transform max-phone:duration-[250ms] group-data-[nav=open]/shell:max-phone:translate-x-0">
      <div className="flex-none flex items-center gap-[10px] px-[14px] py-4">
        <div className="w-[30px] h-[30px] flex-none rounded-[9px] border border-line-4 bg-logo grid place-items-center font-mono text-[12px] text-accent-text">
          RG
        </div>
        <div className="flex-1 min-w-0 text-sm font-semibold tracking-[-0.2px] truncate">
          Ask My Brochures
        </div>
        <button className={iconBtn} title="Hide menu" onClick={onCollapse}>
          <PanelLeftClose size={15} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <div className="flex-none flex flex-col gap-[7px] px-3 pt-1 pb-[14px]">
        <button
          className="flex items-center gap-[9px] px-[11px] py-[9px] rounded-[10px] bg-accent text-accent-ink text-[13px] font-semibold cursor-pointer hover:bg-accent-bright"
          onClick={onNewChat}
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          <span>New chat</span>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3" ref={listRef}>
        <div className="flex items-center justify-between px-[3px] pb-2">
          <span className="font-mono text-[9.5px] tracking-[0.12em] text-text-muted">
            RECENT CHATS
          </span>
          <button
            className="flex-none grid place-items-center w-[22px] h-[22px] rounded-[6px] text-text-faint cursor-pointer hover:bg-surface-4 hover:text-text"
            title="Search chats"
            aria-label="Search chats"
            onClick={onOpenChatSearch}
          >
            <Search size={13} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <div className="flex flex-col gap-[3px]">
          {chats.map((c) => (
            <ChatRow
              key={c.id}
              chat={c}
              active={c.id === activeChat}
              menuOpen={menuId === c.id}
              onSelect={() => onSelectChat(c.id)}
              onToggleMenu={() => setMenuId((cur) => (cur === c.id ? null : c.id))}
              onRequestDelete={() => {
                setMenuId(null);
                onRequestDeleteChat(c.id);
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex-none border-t border-line p-3">
        <div className="flex items-center gap-[10px] pt-1.5 px-1 pb-3">
          <div className="w-[30px] h-[30px] flex-none rounded-full border border-line-4 bg-surface-5 grid place-items-center font-mono text-[11px] text-accent-text-soft">
            {user ? initialsFrom(user.fullName, user.email) : ""}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] truncate">
              {user?.fullName || user?.email || ""}
            </div>
            <div className="font-mono text-[9.5px] text-text-muted mt-[2px]">{PLAN_LABEL}</div>
          </div>
        </div>
        <div className="flex flex-col gap-[3px]">
          <button className={menuItem} onClick={onOpenSettings}>
            <Settings size={14} strokeWidth={1.7} aria-hidden />
            <span>Settings</span>
          </button>
          <button className={menuItem} onClick={() => void logout()}>
            <LogOut size={14} strokeWidth={1.7} aria-hidden />
            <span>Log out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
