import { useState } from "react";
import type { Theme } from "../lib/useTheme.ts";
import { ACCOUNT } from "../data.ts";
import { dialog, dialogCloseBase, eyebrow, overlay } from "./ui.ts";

interface SettingsModalProps {
  theme: Theme;
  onTheme: (t: Theme) => void;
  onClose: () => void;
}

type Section = "profile" | "appearance" | "account";

const SECTIONS: { id: Section; label: string; icon: string; blurb: string }[] = [
  { id: "profile", label: "Profile", icon: "◐", blurb: "Your name and how you appear" },
  { id: "appearance", label: "Appearance", icon: "◑", blurb: "Theme and display" },
  { id: "account", label: "Account", icon: "⛊", blurb: "Plan, sign-in and data" },
];

const field =
  "w-full bg-surface-1 border border-line-input rounded-[10px] px-[13px] py-[10px] text-[13.5px] text-text outline-none focus:border-line-input-focus";
const fieldLabel = "block text-[11px] font-medium text-text-faint mb-1.5";
const sectionTitle = "text-[14px] font-semibold text-text";
const sectionNote = "font-mono text-[10px] text-text-ghost tracking-[0.06em] mt-1";

function Profile() {
  const [name, setName] = useState<string>(ACCOUNT.name);
  const [email, setEmail] = useState<string>(ACCOUNT.email);
  const [pwOpen, setPwOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSave = current.length > 0 && next.length >= 8 && !mismatch;

  const closePw = () => {
    setPwOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className={sectionTitle}>Profile</div>
        <div className={sectionNote}>This is how you show up across the workspace</div>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="w-[52px] h-[52px] flex-none rounded-full border border-line-4 bg-surface-5 grid place-items-center font-mono text-[16px] text-accent-text-soft">
          {ACCOUNT.initials}
        </div>
        <button
          className="px-3 py-[7px] rounded-[8px] border border-line-4 bg-surface-6 text-text-dim text-[12px] cursor-pointer hover:border-accent hover:text-text"
          type="button"
        >
          Change photo
        </button>
      </div>

      <label>
        <span className={fieldLabel}>Full name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label>
        <span className={fieldLabel}>Email</span>
        <input
          className={field}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <div className="border-t border-line pt-4">
        {!pwOpen ? (
          <button
            className="px-3.5 py-2 rounded-[9px] border border-line-4 bg-surface-6 text-text-dim text-[12px] cursor-pointer hover:border-accent hover:text-text"
            type="button"
            onClick={() => setPwOpen(true)}
          >
            Change password
          </button>
        ) : (
          <div className="flex flex-col gap-3.5">
            <div className="text-[12.5px] font-medium text-text">Change password</div>

            <label>
              <span className={fieldLabel}>Current password</span>
              <input
                className={field}
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>

            <label>
              <span className={fieldLabel}>New password</span>
              <input
                className={field}
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <span className="font-mono text-[9.5px] text-text-ghost tracking-[0.04em] mt-1 block">
                At least 8 characters
              </span>
            </label>

            <label>
              <span className={fieldLabel}>Confirm new password</span>
              <input
                className={`${field} ${mismatch ? "border-danger" : ""}`}
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {mismatch && (
                <span className="text-[10px] text-danger mt-1 block">
                  Passwords don't match
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <button
                className="px-3.5 py-2 rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-semibold cursor-pointer enabled:hover:bg-accent-bright disabled:opacity-50 disabled:cursor-default"
                type="button"
                disabled={!canSave}
                onClick={closePw}
              >
                Update password
              </button>
              <button
                className="px-3.5 py-2 rounded-[9px] border border-line-3 bg-transparent text-text-dim text-[12.5px] cursor-pointer hover:border-line-hover hover:text-text"
                type="button"
                onClick={closePw}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Appearance({ theme, onTheme }: { theme: Theme; onTheme: (t: Theme) => void }) {
  const options: { id: Theme; label: string; hint: string }[] = [
    { id: "light", label: "Light", hint: "Bright surfaces" },
    { id: "dark", label: "Dark", hint: "Dim surfaces" },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className={sectionTitle}>Appearance</div>
        <div className={sectionNote}>Pick the theme for this browser</div>
      </div>

      <div>
        <div className={eyebrow}>THEME</div>
        <div className="grid grid-cols-2 gap-2.5">
          {options.map((o) => {
            const on = theme === o.id;
            return (
              <button
                key={o.id}
                type="button"
                className={`flex flex-col items-start gap-2 px-3.5 py-3 rounded-[12px] border text-left cursor-pointer ${
                  on
                    ? "border-accent-line bg-accent-tint-2"
                    : "border-line-3 bg-surface-1 hover:border-line-hover"
                }`}
                onClick={() => onTheme(o.id)}
              >
                <span
                  className={`w-full h-[46px] rounded-[8px] border ${
                    o.id === "light"
                      ? "bg-[#f4f4f5] border-[#d4d4d8]"
                      : "bg-[#1c1c1f] border-[#3f3f46]"
                  }`}
                />
                <span className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-medium text-text">{o.label}</span>
                  {on && <span className="text-accent-text-soft text-[11px]">✓</span>}
                </span>
                <span className="font-mono text-[9.5px] text-text-ghost tracking-[0.04em]">
                  {o.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Account({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className={sectionTitle}>Account</div>
        <div className={sectionNote}>{ACCOUNT.email}</div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-[12px] border border-line-card bg-surface-3">
        <div>
          <div className="text-[13px] text-text-soft">{ACCOUNT.plan}</div>
          <div className="font-mono text-[9.5px] text-text-ghost tracking-[0.04em] mt-1">
            Basic retrieval, 2 brochures in context
          </div>
        </div>
        <button
          className="flex-none px-3.5 py-2 rounded-[9px] bg-accent text-accent-ink text-[12.5px] font-semibold cursor-pointer hover:bg-accent-bright"
          type="button"
        >
          Upgrade
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <button
          className="w-full text-left px-3.5 py-[11px] rounded-[10px] border border-line-3 bg-transparent text-[12.5px] text-text-dim cursor-pointer hover:border-line-hover hover:text-text"
          type="button"
          onClick={onClose}
        >
          Log out
        </button>
        <button
          className="w-full text-left px-3.5 py-[11px] rounded-[10px] border border-line-3 bg-transparent text-[12.5px] text-text-dim cursor-pointer hover:border-danger hover:text-danger"
          type="button"
        >
          Delete account
        </button>
      </div>
    </div>
  );
}

/** Account settings — a left nav (Profile / Appearance / Account) beside the
 * matching panel. Mock: nothing here is persisted except the theme. */
export function SettingsModal({ theme, onTheme, onClose }: SettingsModalProps) {
  const [section, setSection] = useState<Section>("profile");

  return (
    <div
      className={`${overlay} z-[66] bg-overlay items-center p-6 max-phone:p-3`}
      onClick={onClose}
    >
      <div
        className={`${dialog} w-[min(720px,100%)] h-[min(520px,84dvh)]`}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-none flex items-center justify-between gap-3 px-[18px] py-[15px] border-b border-line">
          <div className="text-[15px] font-semibold">Settings</div>
          <button
            className={`${dialogCloseBase} w-[30px] h-[30px] rounded-[9px] text-[15px]`}
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-nowrap max-phone:flex-col">
          <nav className="flex-none w-[200px] flex flex-col gap-[3px] p-2.5 border-r border-line overflow-y-auto max-phone:w-full max-phone:flex-row max-phone:overflow-x-auto max-phone:border-r-0 max-phone:border-b">
            {SECTIONS.map((s) => {
              const on = s.id === section;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`flex items-center gap-2.5 w-full text-left px-2.5 py-2 rounded-[9px] text-[12.5px] cursor-pointer max-phone:flex-none ${
                    on
                      ? "bg-accent-active text-text"
                      : "bg-transparent text-text-nav hover:bg-surface-4 hover:text-text"
                  }`}
                  onClick={() => setSection(s.id)}
                >
                  <span className="font-mono text-[12px] text-accent-text">{s.icon}</span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto p-[22px] max-phone:p-4">
            {section === "profile" && <Profile />}
            {section === "appearance" && <Appearance theme={theme} onTheme={onTheme} />}
            {section === "account" && <Account onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}
