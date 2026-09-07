import type { ComponentProps } from "react";
import { NavLink } from "./NavLink.tsx";

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

const QUESTIONS = [
  "Which of these two is cheaper to service over three years?",
  "Does the mid trim come with a reversing camera, or is it an extra?",
  "What's the real boot space once the seats are up?",
  "Can either of them tow a 1,500kg caravan?",
  "How far does the hybrid go on electric alone in town?",
];

const LIBRARY: { name: string; meta: string }[] = [
  { name: "Corsira Estate", meta: "2026 · 52 pages" },
  { name: "Verano SUV", meta: "2026 · 44 pages" },
  { name: "Kestrel Hybrid Hatch", meta: "2026 · 38 pages" },
  { name: "Northwind e-Tourer", meta: "2026 · 61 pages" },
  { name: "Merid 4x4 Pickup", meta: "2025 · 47 pages" },
  { name: "Solane City EV", meta: "2026 · 33 pages" },
];

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Add the cars",
    body: "Upload a brochure PDF from a dealer or manufacturer site, or pick from 840 already in the library — most 2026 models are there.",
  },
  {
    n: "02",
    title: "Ask like you'd ask a friend",
    body: "“Which is cheaper to service?” “Does the mid trim get adaptive cruise?” No spec-sheet vocabulary required.",
  },
  {
    n: "03",
    title: "Check the page",
    body: "Every answer names the brochure and page. If a brochure doesn't say, you're told that — not given a guess.",
  },
];

const eyebrow = "font-mono text-[10.5px] tracking-[0.14em] text-text-muted";
const sectionShell =
  "mx-auto max-w-[1360px] border-t border-line-2 px-[clamp(16px,4vw,56px)] py-[clamp(36px,5vw,56px)]";
const btnPrimary =
  "inline-flex items-center rounded-[12px] bg-accent text-accent-ink font-semibold transition-colors duration-150 hover:bg-accent-bright";
const btnGhost =
  "inline-flex items-center rounded-[12px] border border-line-4 text-text-toolbtn transition-colors duration-150 hover:border-line-hover hover:text-text-hi";

export function LandingPage({ onNavigate }: LandingPageProps) {
  /** In-app link; defaults to the workspace but takes an explicit `href`. */
  const Go = ({
    href = "/app",
    ...rest
  }: Omit<ComponentProps<typeof NavLink>, "onNavigate" | "href"> & {
    href?: string;
  }) => <NavLink href={href} onNavigate={onNavigate} {...rest} />;

  return (
    <div className="min-h-screen bg-shell">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-line-2 px-[clamp(16px,4vw,56px)] py-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-9 w-9 flex-none place-items-center rounded-[11px] border border-line-4 bg-logo font-mono text-[13px] text-accent-text">
            RG
          </div>
          <span className="text-[15.5px] font-semibold tracking-[-0.2px]">
            Ask My Documents
          </span>
        </div>
        <Go href="/login" className={`${btnGhost} px-4 py-[9px] text-[13.5px]`}>
          Sign in
        </Go>
        <Go href="/signup" className={`${btnPrimary} px-[17px] py-[9px] text-[13.5px]`}>
          Start free
        </Go>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-[1360px] flex-wrap items-center gap-11 px-[clamp(16px,4vw,56px)] pt-[clamp(48px,7vw,88px)] pb-[clamp(40px,5vw,64px)]">
        <div className="min-w-[300px] flex-[1_1_440px] animate-rise">
          <div className="mb-[26px] inline-flex items-center gap-2.5 rounded-full border border-accent-line bg-accent-tint-lo py-[7px] pl-[11px] pr-3.5">
            <span className="h-[7px] w-[7px] rounded-full bg-accent animate-pulse-dot" />
            <span className="font-mono text-[11px] tracking-[0.04em] text-accent-text-soft">
              840 BROCHURES · 2026 MODEL YEAR
            </span>
          </div>

          <h1 className="mb-5 text-[clamp(38px,5.4vw,62px)] font-bold leading-[1.04] tracking-[-1.8px] [text-wrap:balance]">
            Stop reading car brochures. Just ask.
          </h1>

          <p className="mb-8 max-w-[30em] text-[clamp(16px,1.4vw,18.5px)] leading-[1.62] text-text-dim [text-wrap:pretty]">
            Add the brochures for the cars you're weighing up — yours or ours — and
            ask plain questions. Boot space, service intervals, what's standard
            versus an extra. Every answer quotes the page it came from, so you can
            check it.
          </p>

          <div className="mb-[26px] flex flex-wrap gap-3">
            <Go className={`${btnPrimary} px-6 py-3.5 text-[15px]`}>
              Compare two cars free
            </Go>
            <Go className={`${btnGhost} px-6 py-3.5 text-[15px]`}>
              Browse the library
            </Go>
          </div>

          <div className="flex flex-wrap gap-x-[22px] gap-y-2.5 font-mono text-[11px] tracking-[0.04em] text-text-muted">
            <span>No card needed</span>
            <span>·</span>
            <span>Answers cite the page</span>
            <span>·</span>
            <span>Your uploads stay private</span>
          </div>
        </div>

        {/* Chat preview */}
        <div className="min-w-[300px] flex-[1_1_420px] animate-rise [animation-delay:80ms]">
          <div className="overflow-hidden rounded-[18px] border border-line-2 bg-card shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-bar-tint px-4 py-3">
              <span className="font-mono text-[10.5px] tracking-[0.12em] text-accent-text">
                CHAT
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                Answering from 2 of your files
              </span>
            </div>

            <div className="flex flex-col gap-[15px] px-4 py-[18px]">
              <div className="flex flex-col items-end gap-1.5">
                <span className="font-mono text-[9.5px] tracking-[0.14em] text-text-muted">
                  You
                </span>
                <div className="max-w-[88%] rounded-[14px] border border-bubble-me-line bg-bubble-me px-[15px] py-3 text-[14px] leading-[1.6]">
                  Which one has more boot space with the seats up?
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[9.5px] tracking-[0.14em] text-text-muted">
                  Assistant
                </span>
                <div className="flex max-w-[92%] flex-col gap-2 rounded-[14px] border border-line-bubble bg-surface-5 px-[15px] py-[13px] text-[14px] leading-[1.62]">
                  <div>The estate wins, but less than the shape suggests:</div>
                  <div>→ Corsira Estate: 545 litres seats up, 1,630 folded.</div>
                  <div>→ Verano SUV: 505 litres seats up, 1,410 folded.</div>
                  <div>
                    Worth knowing: the SUV's figure includes the underfloor bin, so
                    usable flat space is closer to 470.
                  </div>
                  <div className="mt-[3px] flex flex-col gap-1.5 border-t border-line-bubble pt-[11px]">
                    <span className="font-mono text-[9px] tracking-[0.14em] text-text-muted">
                      WHERE THIS CAME FROM
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {["Corsira Estate 2026 — page 41", "Verano SUV 2026 — page 38"].map(
                        (c) => (
                          <span
                            key={c}
                            className="rounded-[6px] border border-accent-line bg-accent-tint px-2 py-[5px] font-mono text-[9.5px] text-accent-text-soft"
                          >
                            {c}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-start rounded-[14px] border border-line-bubble bg-surface-5 px-4 py-[13px]">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-blip" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-blip [animation-delay:160ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-blip [animation-delay:320ms]" />
              </div>
            </div>

            <div className="border-t border-line bg-bar-tint px-4 pb-4 pt-3">
              <div className="flex items-center gap-2.5 rounded-[12px] border border-line-input bg-surface-1 py-1.5 pl-3.5 pr-1.5">
                <span className="min-w-0 flex-1 py-2 text-[13.5px] text-text-ghost">
                  And the towing weight?
                </span>
                <span className="flex-none rounded-[9px] bg-accent px-4 py-[9px] text-[13px] font-semibold text-accent-ink">
                  Ask
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={sectionShell}>
        <div className={`${eyebrow} mb-[26px]`}>HOW IT WORKS</div>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-[16px] border border-line-2 bg-surface-2 p-[22px]"
            >
              <div className="mb-3.5 font-mono text-[11px] text-accent-text">{s.n}</div>
              <div className="mb-2 text-[16px] font-semibold">{s.title}</div>
              <div className="text-[13.5px] leading-[1.62] text-text-dim">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What people ask */}
      <section className={sectionShell}>
        <div className="flex flex-wrap items-start gap-8">
          <div className="min-w-[280px] flex-[1_1_300px]">
            <div className={`${eyebrow} mb-[18px]`}>WHAT PEOPLE ASK</div>
            <h2 className="mb-3.5 text-[clamp(24px,2.6vw,32px)] font-semibold leading-[1.2] tracking-[-0.8px] [text-wrap:balance]">
              The questions brochures bury on page 40
            </h2>
            <p className="max-w-[30em] text-[15px] leading-[1.65] text-text-dim [text-wrap:pretty]">
              Real running costs, what's actually standard, whether the towbar is
              even an option on the trim you want. Tap one to try it.
            </p>
          </div>
          <div className="flex min-w-[280px] flex-[1_1_380px] flex-col gap-2.5">
            {QUESTIONS.map((q) => (
              <Go
                key={q}
                className="flex items-center gap-3.5 rounded-[12px] border border-line-card bg-surface-3 px-4 py-3.5 text-[14px] text-text-soft transition-colors duration-150 hover:border-accent hover:bg-surface-accent"
              >
                <span className="min-w-0 flex-1 [text-wrap:pretty]">{q}</span>
                <span className="flex-none font-mono text-[12px] text-accent-text">→</span>
              </Go>
            ))}
          </div>
        </div>
      </section>

      {/* In the library */}
      <section className={sectionShell}>
        <div className="mb-[22px] flex flex-wrap items-baseline justify-between gap-3.5">
          <div className={eyebrow}>IN THE LIBRARY</div>
          <Go className="text-[13.5px] text-accent-text hover:text-accent-text-soft">
            See all 840 brochures →
          </Go>
        </div>
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
          {LIBRARY.map((d) => (
            <Go
              key={d.name}
              className="block rounded-[13px] border border-line-card bg-surface-3 p-4 text-text-soft transition-colors duration-150 hover:border-accent hover:bg-surface-accent"
            >
              <div className="text-[14px] font-medium leading-[1.4]">{d.name}</div>
              <div className="mt-2 font-mono text-[10px] tracking-[0.04em] text-text-muted">
                {d.meta}
              </div>
            </Go>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-[1360px] border-t border-line-2 px-[clamp(16px,4vw,56px)] pt-[clamp(44px,6vw,72px)] pb-[clamp(52px,6vw,80px)]">
        <div className="rounded-[20px] border border-accent-line bg-[linear-gradient(180deg,var(--accent-active-bg),var(--surface-0))] p-[clamp(28px,4vw,48px)] text-center">
          <h2 className="mx-auto mb-3.5 max-w-[22em] text-[clamp(26px,3vw,38px)] font-bold leading-[1.14] tracking-[-1px] [text-wrap:balance]">
            Two brochures, five minutes, an honest answer
          </h2>
          <p className="mx-auto mb-7 max-w-[34em] text-[15.5px] leading-[1.6] text-text-dim [text-wrap:pretty]">
            Bring the shortlist you already have. You'll know which car actually
            fits before you book a test drive.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Go className={`${btnPrimary} px-[26px] py-3.5 text-[15px]`}>
              Start comparing free
            </Go>
            <Go className={`${btnGhost} px-[26px] py-3.5 text-[15px]`}>
              See how it answers
            </Go>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-x-7 gap-y-3.5 border-t border-line-2 px-[clamp(16px,4vw,56px)] pb-[34px] pt-[22px]">
        <span className="font-mono text-[10.5px] tracking-[0.06em] text-text-muted">
          ASK MY DOCUMENTS · 2026
        </span>
        <div className="flex flex-wrap gap-[22px] text-[13px]">
          <Go className="text-accent-text hover:text-accent-text-soft">
            Open the workspace
          </Go>
          <a href="#" className="text-accent-text hover:text-accent-text-soft">
            Privacy
          </a>
          <a href="#" className="text-accent-text hover:text-accent-text-soft">
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
