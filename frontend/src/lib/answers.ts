import type { Doc, Message } from "../types.ts";
import { CITE_PAGES } from "../data.ts";

/** Build the "file — page N" citation list from the active documents. */
export function buildCites(activeDocs: Doc[], n: number): string[] {
  return activeDocs.slice(0, n).map((d, i) => {
    const short = d.title.replace(/\.pdf$/, "").replace(/_/g, " ");
    return `${short} — page ${CITE_PAGES[i % CITE_PAGES.length]}`;
  });
}

type Answer = Pick<Message, "paras" | "cites">;

/** Pick a canned assistant answer for a user question, keyed off keywords. */
export function composeAnswer(text: string, activeDocs: Doc[]): Answer {
  const q = text.toLowerCase();
  const cite = (n: number) => buildCites(activeDocs, n);

  if (/(summar|overview|what.*about|gist|tl;?dr)/.test(q)) {
    const n = activeDocs.length;
    return {
      paras: [
        `Across the ${n} brochure${n > 1 ? "s" : ""} you've added, three things stand out:`,
        "→ The GT trim pairs a 2.4L turbo four with an eight-speed automatic, rated at 288 hp and 310 lb-ft.",
        "→ EPA-estimated efficiency is 26 mpg city / 34 highway; the EV variant is quoted at 318 miles of range.",
        "→ The powertrain warranty runs 5 years / 60,000 miles, with 8 years / 100,000 on the hybrid battery.",
      ],
      cites: cite(2),
    };
  }

  if (/(compar|differ|versus|vs\b|contrast)/.test(q)) {
    return {
      paras: [
        "Comparing what I found in your brochures:",
        "→ Both list standard all-wheel drive, but only the SUV quotes a towing figure — 5,000 lb with the tow package.",
        "→ The specs diverge on efficiency — the sedan claims 34 mpg highway against the SUV's 28 — while the EV skips mpg entirely and lists 318 miles of range.",
        "I'd have a person confirm the tow rating — the brochure footnote ties it to an option code.",
      ],
      cites: cite(3),
    };
  }

  if (/(risk|caution|watch out|careful|worry|catch|fine print|limitation)/.test(q)) {
    return {
      paras: [
        "Three things in the fine print worth noting:",
        "→ The headline towing number needs the optional tow package — the base vehicle is rated far lower.",
        "→ Range and mpg figures are 'EPA-estimated'; the brochure notes cold weather and roof loads reduce them.",
        "→ The largest cargo volume is quoted with the second row folded flat, not with all seats up.",
      ],
      cites: cite(2),
    };
  }

  if (/(number|figure|spec|specs|horsepower|hp\b|torque|mpg|range|0-60|0 to 60|weight|capacity|dimension)/.test(q)) {
    return {
      paras: [
        "The figures I can find, word for word:",
        "→ Output: 288 hp @ 5,500 rpm and 310 lb-ft @ 1,800–4,000 rpm.",
        "→ 0–60 mph in 5.9 seconds; top track speed 130 mph (electronically limited).",
        "→ Max cargo volume 64.2 cu ft (rear seats folded); towing 5,000 lb with the tow package.",
      ],
      cites: cite(1),
    };
  }

  if (/(who|make|brand|manufactur|built|assembl|origin|where)/.test(q)) {
    return {
      paras: [
        "The brochure lists the model line and its assembly plant, along with the trims offered for the 2026 model year.",
        "It doesn't name a dealer or pricing contact — that's left to the accompanying price sheet, which isn't in your files.",
      ],
      cites: cite(1),
    };
  }

  if (/(cite|source|where.*(page|say)|which page|prove|evidence)/.test(q)) {
    return {
      paras: [
        "Every answer above lists its sources — the tags under each reply name the brochure and page I read it from.",
        "Open the brochure if you want to read the surrounding spec table.",
      ],
      cites: cite(2),
    };
  }

  return {
    paras: [
      "Here's what your brochures say:",
      "→ The relevant detail sits in the powertrain section and lists an eight-speed automatic with a selectable sport mode.",
      "→ Adaptive cruise, lane-keep assist and automatic emergency braking are standard from the mid trim up.",
      "That's everything the brochures cover on this — nothing else was close enough for me to quote.",
    ],
    cites: cite(2),
  };
}
