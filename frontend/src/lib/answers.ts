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
        "→ The petrol variant makes 113 bhp and 144 Nm from a 1.5L engine, with a choice of 6-speed manual or torque-converter automatic.",
        "→ ARAI-rated mileage is 20.1 kmpl (MT) / 19.2 kmpl (AT); the EV variant claims 465 km on a full charge.",
        "→ Warranty is 3 years / 1,00,000 km as standard, extendable to 5 years; the EV battery is covered 8 years / 1,60,000 km.",
      ],
      cites: cite(2),
    };
  }

  if (/(compar|differ|versus|vs\b|contrast)/.test(q)) {
    return {
      paras: [
        "Comparing what I found in your brochures:",
        "→ Both list 6 airbags and ESC from the mid variant up, but only one offers a 360° camera and ventilated seats, and only on the top trim.",
        "→ Efficiency differs — 20.1 kmpl (ARAI) for the petrol against the diesel's 24.3 kmpl — while the EV skips kmpl and quotes 465 km of range.",
        "→ Ex-showroom pricing spans roughly ₹8.0–14.5 lakh across the range; the exact on-road figure isn't in the brochure.",
      ],
      cites: cite(3),
    };
  }

  if (/(risk|caution|watch out|careful|worry|catch|fine print|limitation)/.test(q)) {
    return {
      paras: [
        "Three things in the fine print worth noting:",
        "→ The headline mileage is ARAI-tested; the brochure notes real-world figures vary with driving conditions, load and AC use.",
        "→ Several features shown in the images (sunroof, connected-car suite, alloy wheels) are top-variant-only or part of an accessory pack.",
        "→ The largest boot figure is quoted with the last row folded — usable space with all seats up is much smaller.",
      ],
      cites: cite(2),
    };
  }

  if (
    /(number|figure|spec|specs|power|bhp|torque|mileage|kmpl|arai|range|0-100|0 to 100|boot|ground clearance|dimension|price)/.test(
      q,
    )
  ) {
    return {
      paras: [
        "The figures I can find, word for word:",
        "→ Engine: 1.5L petrol, 113 bhp @ 6,600 rpm and 144 Nm @ 4,300 rpm.",
        "→ ARAI mileage 20.1 kmpl (MT); 0–100 km/h in about 10.5 s; 45-litre fuel tank.",
        "→ Boot 385 litres (rear seats up), ground clearance 190 mm, kerb weight 1,155 kg.",
      ],
      cites: cite(1),
    };
  }

  if (/(who|make|brand|manufactur|built|assembl|origin|where)/.test(q)) {
    return {
      paras: [
        "The brochure names the model line, the manufacturing plant in India and the variants offered for the 2026 model year.",
        "It doesn't list dealer or on-road pricing — that's on the separate price list, which isn't in your files.",
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
      "→ The relevant detail sits in the powertrain section and lists a 6-speed gearbox with an idle stop-start system.",
      "→ Six airbags, ABS with EBD, electronic stability control and rear parking sensors are standard from the mid variant up.",
      "That's everything the brochures cover on this — nothing else was close enough for me to quote.",
    ],
    cites: cite(2),
  };
}
