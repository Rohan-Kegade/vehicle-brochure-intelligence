import { LogOut, PanelLeftOpen, Plus, Search, Settings } from "lucide-react";
import { initialsFrom, useAuth } from "../lib/auth.tsx";

interface CollapsedRailProps {
  onExpand: () => void;
  onNewChat: () => void;
  onOpenChatSearch: () => void;
  onOpenSettings: () => void;
}

const railBtn =
  "grid place-items-center w-8 h-8 rounded-[9px] border border-line-4 bg-logo text-accent-text font-mono text-[12px] cursor-pointer";

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
  const { user, logout } = useAuth();
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
        <PanelLeftOpen size={15} strokeWidth={1.8} aria-hidden />
      </button>

      <div className="w-6 h-px bg-line my-1" />

      <button
        className={`${railBtn} border-0 bg-accent text-accent-ink`}
        title="New chat"
        onClick={onNewChat}
      >
        <Plus size={16} strokeWidth={2} aria-hidden />
      </button>
      <button
        className={`${railBtn} bg-transparent border-line-3 text-accent-text`}
        title="Search chats"
        onClick={onOpenChatSearch}
      >
        <Search size={15} strokeWidth={1.8} aria-hidden />
      </button>

      <div className="flex-1" />

      <div className="w-[30px] h-[30px] flex-none rounded-full border border-line-4 bg-surface-5 grid place-items-center font-mono text-[11px] text-accent-text-soft">
        {user ? initialsFrom(user.fullName, user.email) : ""}
      </div>
      <button
        className={railIcon}
        title="Settings"
        aria-label="Open settings"
        onClick={onOpenSettings}
      >
        <Settings size={15} strokeWidth={1.7} aria-hidden />
      </button>
      <button
        className={railIcon}
        title="Log out"
        aria-label="Log out"
        onClick={() => void logout()}
      >
        <LogOut size={15} strokeWidth={1.7} aria-hidden />
      </button>
    </div>
  );
}
