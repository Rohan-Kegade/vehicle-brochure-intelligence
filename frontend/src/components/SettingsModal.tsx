import { useEffect, useRef, useState } from "react";
import {
  Check as CheckIcon,
  Database,
  Minus,
  MoreVertical,
  Palette,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Theme } from "../lib/useTheme.ts";
import type { Doc } from "../types.ts";
import { ACCOUNT } from "../data.ts";
import {
  dialog,
  dialogCloseBase,
  eyebrow,
  indexCard,
  indexName as indexNameCls,
  indexRow,
  indexStage as indexStageCls,
  modalEmpty,
  overlay,
  track,
  trackFill,
} from "./ui.ts";
import { ConfirmModal } from "./ConfirmModal.tsx";

interface SettingsModalProps {
  theme: Theme;
  onTheme: (t: Theme) => void;
  /** The user's uploaded brochures, for the Manage brochures section. */
  uploads: Doc[];
  onRenameDoc: (id: string, title: string) => void;
  onDeleteDoc: (id: string) => void;
  /** Upload a new brochure + the live indexing state, for the Manage brochures section. */
  onUpload: () => void;
  indexing: boolean;
  indexName: string;
  indexStage: string;
  indexPct: number;
  /** Upload cap for the library. */
  uploadLimit: number;
  onClose: () => void;
}

type Section = "profile" | "appearance" | "data" | "account";

const SECTIONS: { id: Section; label: string; icon: LucideIcon; blurb: string }[] =
  [
    {
      id: "profile",
      label: "Profile",
      icon: User,
      blurb: "Your name and how you appear",
    },
    {
      id: "appearance",
      label: "Appearance",
      icon: Palette,
      blurb: "Theme and display",
    },
    {
      id: "data",
      label: "Brochures Library Manager",
      icon: Database,
      blurb: "Your uploaded brochures",
    },
    {
      id: "account",
      label: "Account",
      icon: ShieldCheck,
      blurb: "Plan, sign-in and data",
    },
  ];

const field =
  "w-full bg-surface-1 border border-line-input rounded-[10px] px-[13px] py-[10px] text-[13.5px] text-text outline-none focus:border-line-input-focus";
const fieldLabel = "block text-[11px] font-medium text-text-faint mb-1.5";
const sectionTitle = "text-[14px] font-semibold text-text";
const sectionNote =
  "font-mono text-[10px] text-text-ghost tracking-[0.06em] mt-1";

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
        <div className={sectionNote}>
          This is how you show up across the workspace
        </div>
      </div>

      <div className="w-[52px] h-[52px] flex-none rounded-full border border-line-4 bg-surface-5 grid place-items-center font-mono text-[16px] text-accent-text-soft">
        {ACCOUNT.initials}
      </div>

      <label>
        <span className={fieldLabel}>Full name</span>
        <input
          className={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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
            <div className="text-[12.5px] font-medium text-text">
              Change password
            </div>

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

function Appearance({
  theme,
  onTheme,
}: {
  theme: Theme;
  onTheme: (t: Theme) => void;
}) {
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
                  <span className="text-[12.5px] font-medium text-text">
                    {o.label}
                  </span>
                  {on && (
                    <CheckIcon
                      size={13}
                      strokeWidth={2.4}
                      className="text-accent-text-soft"
                      aria-hidden
                    />
                  )}
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

const rowBtn =
  "flex-none px-2.5 py-[7px] rounded-[8px] border border-line-4 bg-surface-6 text-[12px] text-text-dim cursor-pointer";

/** Trash glyph — shared by the row delete button and the bulk action. */
const TrashIcon = () => <Trash2 size={13} strokeWidth={1.9} aria-hidden />;

/** A checkbox box that fills in when selected. `mixed` renders a dash for a
 * partial (some-but-not-all) selection. On hover (of the enclosing button) an
 * empty box previews a faint check and warms its border. */
function Check({ on, mixed = false }: { on: boolean; mixed?: boolean }) {
  const filled = on || mixed;
  const Glyph = mixed ? Minus : CheckIcon;
  return (
    <span
      className={`grid place-items-center w-[19px] h-[19px] rounded-[6px] border transition-[background-color,border-color,color] duration-[140ms] ${
        filled
          ? "border-accent-line bg-accent text-accent-ink"
          : "border-line-4 bg-surface-6 text-text-ghost group-hover:border-accent group-hover:bg-surface-4"
      }`}
    >
      <Glyph
        size={12}
        strokeWidth={3}
        aria-hidden
        className={`transition-opacity duration-[120ms] ${
          filled ? "opacity-100" : "opacity-0 group-hover:opacity-40"
        }`}
      />
    </span>
  );
}

/** Manage brochures — list every uploaded brochure with multi-select delete and
 * a per-row menu for rename and delete. Deletes go through a confirmation modal. */
function ManageData({
  uploads,
  onRename,
  onDelete,
  onUpload,
  indexing,
  indexNm,
  indexStg,
  indexPct,
  limit,
}: {
  uploads: Doc[];
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onUpload: () => void;
  indexing: boolean;
  indexNm: string;
  indexStg: string;
  indexPct: number;
  limit: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const atLimit = uploads.length >= limit;

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? uploads.filter((d) =>
        [d.title, d.make, d.tag]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(needle)),
      )
    : uploads;

  // Drop selection entries for brochures that no longer exist (post-delete).
  useEffect(() => {
    setSelected((cur) => {
      const live = new Set(uploads.map((d) => d.id));
      const next = new Set([...cur].filter((id) => live.has(id)));
      return next.size === cur.size ? cur : next;
    });
  }, [uploads]);

  // Row menu: dismiss on outside click / Esc.
  useEffect(() => {
    if (!menuId) return;
    const onDown = (e: MouseEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node))
        setMenuId(null);
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

  // While the confirm modal is up, swallow Esc so it doesn't also close Settings.
  useEffect(() => {
    if (!confirmIds) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        setConfirmIds(null);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [confirmIds]);

  const toggleSel = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected =
    shown.length > 0 && shown.every((d) => selected.has(d.id));
  const toggleAll = () =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (allSelected) shown.forEach((d) => next.delete(d.id));
      else shown.forEach((d) => next.add(d.id));
      return next;
    });

  const startEdit = (d: Doc) => {
    setMenuId(null);
    setDraft(d.title);
    setEditId(d.id);
  };
  const commit = () => {
    if (editId && draft.trim()) onRename(editId, draft);
    setEditId(null);
  };

  const runDelete = () => {
    confirmIds?.forEach((id) => onDelete(id));
    setConfirmIds(null);
    setSelected(new Set());
  };

  const bulk = (confirmIds?.length ?? 0) > 1;
  const firstTitle =
    confirmIds && !bulk
      ? (uploads.find((d) => d.id === confirmIds[0])?.title ?? "This brochure")
      : "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className={sectionTitle}>Brochures Library Manager</div>
        <div className={sectionNote}>
          {uploads.length} of {limit} brochures uploaded
          {atLimit && " · limit reached"}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-[9px] border border-line-input rounded-[11px] bg-surface-1 px-[13px] focus-within:border-line-input-focus">
            <Search
              size={14}
              strokeWidth={1.8}
              className="flex-none text-text-ghost"
              aria-hidden
            />
            <input
              className="flex-1 min-w-0 bg-transparent border-0 outline-none text-text text-[13.5px] py-[10px] max-phone:text-base"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, brand or type…"
            />
          </div>
          <button
            type="button"
            className="flex-none grid place-items-center w-[40px] h-[40px] rounded-[10px] border border-line-input bg-surface-1 text-accent-text cursor-pointer transition-colors duration-[160ms] enabled:hover:border-accent enabled:hover:text-text-hi disabled:opacity-60 disabled:cursor-default"
            title={
              atLimit
                ? `Upload limit reached (${limit})`
                : indexing
                  ? "Indexing…"
                  : "Upload a PDF"
            }
            aria-label="Upload a PDF"
            onClick={onUpload}
            disabled={indexing || atLimit}
          >
            <Upload size={14} strokeWidth={1.9} aria-hidden />
          </button>
        </div>

        {indexing && (
          <div className={indexCard}>
            <div className={indexRow}>
              <span className={indexNameCls}>{indexNm}</span>
              <span className={indexStageCls}>{indexStg}</span>
            </div>
            <div className={`${track} h-[3px] mt-2`}>
              <div
                className={`${trackFill} bg-amber duration-500`}
                style={{ width: `${indexPct}%` }}
              />
            </div>
          </div>
        )}

        {atLimit && !indexing && (
          <div className="px-3 py-2 rounded-[9px] border border-line-3 bg-surface-3 font-mono text-[10px] text-text-ghost tracking-[0.04em]">
            You've reached the {limit}-brochure limit — delete one to upload
            another.
          </div>
        )}

        {uploads.length === 0 ? (
          <div className="px-3.5 py-6 text-center text-[13px] text-text-ghost border border-dashed border-line-3 rounded-[12px]">
            You haven't uploaded any brochures yet.
          </div>
        ) : shown.length === 0 ? (
          <div className={modalEmpty}>No brochures match your search.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 px-1 min-h-[28px]">
              <button
                type="button"
                role="checkbox"
                aria-checked={
                  allSelected ? true : selected.size > 0 ? "mixed" : false
                }
                className="group flex items-center gap-2 font-mono text-[10.5px] text-accent-text-soft tracking-[0.06em] cursor-pointer hover:text-text"
                onClick={toggleAll}
              >
                <Check
                  on={allSelected}
                  mixed={!allSelected && selected.size > 0}
                />
                <span>
                  {selected.size > 0
                    ? `${selected.size} selected · ${allSelected ? "clear" : "select all"}`
                    : "select all"}
                </span>
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-[6px] rounded-[8px] border border-danger bg-surface-6 text-[12px] text-danger cursor-pointer hover:bg-danger/10"
                  onClick={() => setConfirmIds([...selected])}
                >
                  <TrashIcon />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2" ref={listRef}>
              {shown.map((d) => {
                const isSel = selected.has(d.id);
                const editing = editId === d.id;
                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3 w-full px-3.5 py-[13px] border rounded-[12px] transition-colors duration-[140ms] ${
                      isSel
                        ? "border-accent-line bg-accent-tint-2"
                        : "border-line-card bg-surface-3 hover:border-line-4"
                    }`}
                  >
                    {editing ? (
                      <>
                        <input
                          autoFocus
                          className={`${field} flex-1 min-w-0`}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commit();
                            if (e.key === "Escape") setEditId(null);
                          }}
                        />
                        <button
                          className={`${rowBtn} hover:border-accent hover:text-text`}
                          type="button"
                          onClick={() => setEditId(null)}
                        >
                          Cancel
                        </button>
                        <button
                          className="flex-none px-2.5 py-[7px] rounded-[8px] bg-accent text-accent-ink text-[12px] font-semibold cursor-pointer hover:bg-accent-bright"
                          type="button"
                          onClick={commit}
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSel}
                          aria-label={
                            isSel ? `Deselect ${d.title}` : `Select ${d.title}`
                          }
                          className="group flex flex-1 min-w-0 items-center gap-3 text-left cursor-pointer"
                          onClick={() => toggleSel(d.id)}
                        >
                          <Check on={isSel} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13.5px] text-text-soft truncate">
                              {d.title}
                            </span>
                            <span className="block font-mono text-[10px] text-text-ghost mt-[5px] tracking-[0.04em]">
                              {[d.make, d.tag, `${d.pages} pages`]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </button>

                        <div className="flex-none relative">
                          <button
                            type="button"
                            className="grid place-items-center w-7 h-7 rounded-[7px] text-text-faint text-[13px] leading-none cursor-pointer hover:bg-surface-6 hover:text-text"
                            title="More"
                            aria-haspopup="menu"
                            aria-expanded={menuId === d.id}
                            onClick={() =>
                              setMenuId((cur) => (cur === d.id ? null : d.id))
                            }
                          >
                            <MoreVertical
                              size={15}
                              strokeWidth={1.9}
                              aria-hidden
                            />
                          </button>
                          {menuId === d.id && (
                            <div
                              role="menu"
                              className="absolute right-0 top-[calc(100%+4px)] z-10 w-[144px] rounded-[10px] border border-line-3 bg-surface-2 shadow-dialog p-1 animate-fadein"
                            >
                              <button
                                role="menuitem"
                                type="button"
                                className="flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-[7px] text-[12.5px] text-text-nav cursor-pointer hover:bg-surface-4 hover:text-text"
                                onClick={() => startEdit(d)}
                              >
                                <Pencil size={13} strokeWidth={1.9} aria-hidden />
                                <span>Rename</span>
                              </button>
                              <button
                                role="menuitem"
                                type="button"
                                className="flex items-center gap-2 w-full text-left px-2.5 py-2 rounded-[7px] text-[12.5px] text-danger cursor-pointer hover:bg-surface-4"
                                onClick={() => {
                                  setMenuId(null);
                                  setConfirmIds([d.id]);
                                }}
                              >
                                <TrashIcon />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {confirmIds && (
        <ConfirmModal
          title={
            bulk ? `Delete ${confirmIds.length} brochures?` : "Delete brochure?"
          }
          message={
            bulk
              ? `${confirmIds.length} brochures will be permanently removed, including from any chat's context. This can't be undone.`
              : `“${firstTitle}” will be permanently removed, including from any chat's context. This can't be undone.`
          }
          confirmLabel={bulk ? `Delete ${confirmIds.length}` : "Delete"}
          destructive
          onConfirm={runDelete}
          onClose={() => setConfirmIds(null)}
        />
      )}
    </div>
  );
}

/** Account settings — a left nav (Profile / Appearance / Manage brochures / Account)
 * beside the matching panel. Mock: nothing here is persisted except the theme. */
export function SettingsModal({
  theme,
  onTheme,
  uploads,
  onRenameDoc,
  onDeleteDoc,
  onUpload,
  indexing,
  indexName,
  indexStage,
  indexPct,
  uploadLimit,
  onClose,
}: SettingsModalProps) {
  const [section, setSection] = useState<Section>("profile");

  return (
    <div
      className={`${overlay} z-[66] bg-overlay items-center p-6 max-phone:p-3`}
      onClick={onClose}
    >
      <div
        className={`${dialog} w-[min(820px,100%)] h-[min(600px,88dvh)]`}
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
            <X size={15} strokeWidth={2} aria-hidden />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-nowrap max-phone:flex-col">
          <nav className="flex-none w-[200px] flex flex-col gap-[3px] p-2.5 border-r border-line overflow-y-auto max-phone:w-full max-phone:flex-row max-phone:overflow-x-auto max-phone:border-r-0 max-phone:border-b">
            {SECTIONS.map((s) => {
              const on = s.id === section;
              const Icon = s.icon;
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
                  <Icon
                    size={15}
                    strokeWidth={1.7}
                    className="flex-none text-accent-text"
                    aria-hidden
                  />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-w-0 overflow-y-auto p-[22px] max-phone:p-4">
            {section === "profile" && <Profile />}
            {section === "appearance" && (
              <Appearance theme={theme} onTheme={onTheme} />
            )}
            {section === "data" && (
              <ManageData
                uploads={uploads}
                onRename={onRenameDoc}
                onDelete={onDeleteDoc}
                onUpload={onUpload}
                indexing={indexing}
                indexNm={indexName}
                indexStg={indexStage}
                indexPct={indexPct}
                limit={uploadLimit}
              />
            )}
            {section === "account" && <Account onClose={onClose} />}
          </div>
        </div>
      </div>
    </div>
  );
}
