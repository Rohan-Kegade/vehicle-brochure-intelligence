import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { NavLink } from "./NavLink.tsx";
import { useAuth } from "../lib/auth.tsx";

interface AuthPageProps {
  mode: "signup" | "login";
  onNavigate: (path: string) => void;
}

const PERKS: { title: string; body: string }[] = [
  {
    title: "Every answer cites its page",
    body: "So you can check it against the brochure yourself.",
  },
  {
    title: "Two brochures free, forever",
    body: "Enough to settle most shortlists. Upgrade only if you need more.",
  },
  {
    title: "Your uploads stay yours",
    body: "Private to your account, deleted whenever you say.",
  },
];

const field =
  "rounded-[11px] border border-line-input bg-surface-1 px-3.5 py-3 text-[14.5px] text-text outline-none transition-colors focus:border-accent";
const oauthBtn =
  "flex items-center justify-center gap-2.5 rounded-[11px] border border-line-4 bg-surface-1 px-4 py-3 text-[14px] text-text transition-colors hover:border-line-hover hover:bg-surface-6";

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const signup = mode === "signup";
  const { register, login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Match the design: switching between the two forms clears the password.
  useEffect(() => {
    setPassword("");
    setError(null);
  }, [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (signup) await register(email.trim(), password, name.trim() || undefined);
      else await login(email.trim(), password);
      onNavigate("/app");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const startGoogle = () => {
    window.location.href = "/api/auth/google/start";
  };

  return (
    <div className="flex min-h-screen flex-wrap bg-shell">
      {/* Form column */}
      <div className="flex flex-[1_1_460px] flex-col px-[clamp(20px,5vw,72px)] pb-[34px] pt-[26px] min-w-[320px]">
        <NavLink
          href="/"
          onNavigate={onNavigate}
          className="mb-[clamp(32px,7vh,72px)] flex items-center gap-3 text-text hover:text-text"
        >
          <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border border-line-4 bg-logo font-mono text-[12.5px] text-accent-text">
            RG
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.2px]">
            Ask My Documents
          </span>
        </NavLink>

        <div className="mx-auto flex w-full max-w-[400px] flex-1 animate-rise flex-col justify-center">
          {signup ? (
            <div>
              <h1 className="mb-2.5 text-[clamp(27px,3.2vw,34px)] font-bold leading-[1.14] tracking-[-1.1px]">
                Create your account
              </h1>
              <p className="mb-[30px] text-[14.5px] leading-[1.6] text-text-dim">
                Free to start — two brochures at a time, no card needed.
              </p>
            </div>
          ) : (
            <div>
              <h1 className="mb-2.5 text-[clamp(27px,3.2vw,34px)] font-bold leading-[1.14] tracking-[-1.1px]">
                Welcome back
              </h1>
              <p className="mb-[30px] text-[14.5px] leading-[1.6] text-text-dim">
                Your chats and brochures are where you left them.
              </p>
            </div>
          )}

          <div className="mb-[22px] flex flex-col gap-2.5">
            <button type="button" className={oauthBtn} onClick={startGoogle}>
              <span className="font-mono text-[13px] text-accent-text">G</span>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="mb-[22px] flex items-center gap-3.5">
            <span className="h-px flex-1 bg-line-2" />
            <span className="font-mono text-[10px] tracking-[0.12em] text-text-muted">
              OR WITH EMAIL
            </span>
            <span className="h-px flex-1 bg-line-2" />
          </div>

          <form className="flex flex-col gap-3.5" onSubmit={submit}>
            {signup && (
              <label className="flex flex-col gap-[7px]">
                <span className="text-[12.5px] text-text-dim">Your name</span>
                <input
                  className={field}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maya Rao"
                  autoComplete="name"
                />
              </label>
            )}

            <label className="flex flex-col gap-[7px]">
              <span className="text-[12.5px] text-text-dim">Email</span>
              <input
                className={field}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="flex flex-col gap-[7px]">
              <span className="flex items-baseline justify-between gap-3 text-[12.5px] text-text-dim">
                <span>Password</span>
                {!signup && (
                  <a href="#" className="text-[12px]">
                    Forgot?
                  </a>
                )}
              </span>
              <div className="flex items-center gap-2 rounded-[11px] border border-line-input bg-surface-1 pl-3.5 pr-3 transition-colors focus-within:border-accent">
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[14.5px] text-text outline-none"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={signup ? "Choose a password" : "Your password"}
                  autoComplete={signup ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="flex-none grid place-items-center cursor-pointer border-0 bg-transparent p-1.5 text-text-muted hover:text-text-hi"
                  onClick={() => setShowPw((v) => !v)}
                  aria-pressed={showPw}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <EyeOff size={16} strokeWidth={1.8} aria-hidden />
                  ) : (
                    <Eye size={16} strokeWidth={1.8} aria-hidden />
                  )}
                </button>
              </div>
              {signup && (
                <span className="text-[11.5px] leading-[1.5] text-text-muted">
                  At least 8 characters.
                </span>
              )}
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-[10px] border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12.5px] leading-[1.5] text-danger"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 rounded-[11px] border-0 bg-accent px-[18px] py-[13px] text-[14.5px] font-semibold text-accent-ink transition-colors hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy
                ? signup
                  ? "Creating account…"
                  : "Signing in…"
                : signup
                  ? "Create account"
                  : "Sign in"}
            </button>

            {signup && (
              <p className="mt-0.5 text-[11.5px] leading-[1.6] text-text-muted [text-wrap:pretty]">
                By creating an account you agree to our <a href="#">terms</a> and{" "}
                <a href="#">privacy notice</a>. We never share the brochures you
                upload.
              </p>
            )}
          </form>

          <div className="mt-[26px] border-t border-line-2 pt-5 text-[13.5px] text-text-dim">
            <span>{signup ? "Already have an account?" : "New here?"}</span>
            <NavLink
              href={signup ? "/login" : "/signup"}
              onNavigate={onNavigate}
              className="pl-[5px] text-[13.5px] font-medium"
            >
              {signup ? "Sign in" : "Create an account"}
            </NavLink>
          </div>
        </div>
      </div>

      {/* Testimonial column */}
      <div className="flex flex-[1_1_420px] flex-col justify-center gap-[26px] border-l border-line bg-[linear-gradient(180deg,rgba(123,224,180,0.045),rgba(255,255,255,0.01))] px-[clamp(20px,5vw,64px)] py-[clamp(32px,6vw,72px)] min-w-[300px]">
        <div className="inline-flex items-center gap-2.5 self-start rounded-full border border-accent-line bg-accent-tint-lo py-[7px] pl-[11px] pr-3.5">
          <span className="h-[7px] w-[7px] rounded-full bg-accent animate-pulse-dot" />
          <span className="font-mono text-[11px] tracking-[0.04em] text-accent-text-soft">
            840 BROCHURES · 2026 MODEL YEAR
          </span>
        </div>

        <div className="max-w-[22em] text-[clamp(20px,2.2vw,26px)] font-semibold leading-[1.32] tracking-[-0.6px] [text-wrap:balance]">
          “I had four brochures open in four tabs. Now I just ask which one tows
          more.”
        </div>
        <div className="font-mono text-[11px] tracking-[0.06em] text-text-muted">
          DAN K. · SWAPPING AN ESTATE FOR AN SUV
        </div>

        <div className="flex flex-col gap-[13px] rounded-[16px] border border-line-2 bg-surface-2 p-[18px]">
          {PERKS.map((p) => (
            <div key={p.title} className="flex items-start gap-3">
              <span className="mt-px grid h-5 w-5 flex-none place-items-center rounded-[6px] border border-accent-line bg-accent-tint-2 text-accent-text">
                <Check size={12} strokeWidth={2.4} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] text-text-soft">{p.title}</div>
                <div className="mt-[3px] text-[12.5px] leading-[1.55] text-text-muted">
                  {p.body}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
