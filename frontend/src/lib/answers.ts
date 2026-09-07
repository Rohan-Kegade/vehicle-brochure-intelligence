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
        `Across the ${n} file${n > 1 ? "s" : ""} you've added, three things stand out:`,
        "→ The agreement runs 24 months with auto-renewal unless either party gives 60 days' notice.",
        "→ Committed spend is tiered, and the second tier unlocks a 12% discount above €400k annual volume.",
        "→ Liability is capped at 12 months of fees, with the usual carve-outs for confidentiality and IP.",
      ],
      cites: cite(2),
    };
  }

  if (/(compar|differ|versus|vs\b|contrast)/.test(q)) {
    return {
      paras: [
        "Comparing what I found in your files:",
        "→ Both documents agree on the notice period, but only the addendum defines sub-processor approval.",
        "→ The figures diverge on one point — the statement reports €412k realised spend against a €400k threshold, so the discount tier applies retroactively.",
        "I'd have a person double-check that second point — the wording in the file is unclear.",
      ],
      cites: cite(3),
    };
  }

  if (/(risk|liabilit|obligat|penalt|terminat|indemn|watch out|careful|worry)/.test(q)) {
    return {
      paras: [
        "Three things here could cost you:",
        "→ 60-day written notice before renewal — miss it and the term extends automatically.",
        "→ Uptime credits are capped at 10% of monthly fees, which is below the internal standard.",
        "→ Data deletion must complete within 30 days of termination, and that clock is not pausable.",
      ],
      cites: cite(2),
    };
  }

  if (/(number|figure|total|revenue|cost|price|spend|amount|metric)/.test(q)) {
    return {
      paras: [
        "The numbers I can find, word for word:",
        "→ Annual committed spend: €400,000, with realised spend of €412,300 in the period.",
        "→ Blended effective rate after the tier discount: €0.0091 per request.",
        "→ Anything beyond those two tables isn't in your files, so I won't guess at it.",
      ],
      cites: cite(1),
    };
  }

  if (/(who|contact|signator|party|parties|author)/.test(q)) {
    return {
      paras: [
        "The two companies named are Northwind Systems GmbH as the customer and the vendor as the supplier, each signed by an authorised representative.",
        "The individual signatures are blacked out in the copy you uploaded, so I can't give you those names.",
      ],
      cites: cite(1),
    };
  }

  if (/(cite|source|where|which page|prove|evidence)/.test(q)) {
    return {
      paras: [
        "Every answer above lists its sources — the tags under each reply name the file and page I read it from.",
        "Open the file if you want to read the paragraph around it.",
      ],
      cites: cite(2),
    };
  }

  return {
    paras: [
      "Here's what your files say:",
      "→ The relevant clause sits in the agreement's service section and sets a 99.5% monthly availability target.",
      "→ Remedies are service credits only; there is no termination right for a single breach.",
      "That's everything your files cover on this — nothing else was close enough for me to quote.",
    ],
    cites: cite(2),
  };
}
