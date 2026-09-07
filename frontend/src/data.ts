import type { Chat, Doc } from "./types.ts";

/** Seed conversations for the sidebar. */
export const INITIAL_CHATS: Chat[] = [
  { id: "c1", title: "Towing capacity — Aurora GT", when: "Today" },
  { id: "c2", title: "Meridian EV range vs the SUV", when: "Today" },
  { id: "c3", title: "Which trims come with AWD?", when: "Yesterday" },
  { id: "c4", title: "Cargo space, seats folded", when: "Yesterday" },
  { id: "c5", title: "Warranty: what's actually covered", when: "Last week" },
  { id: "c6", title: "Safety ratings & driver aids", when: "Last week" },
];

/** Seed library. The first two brochures start added to the chat context. */
export const INITIAL_DOCS: Doc[] = [
  { id: "d1", title: "Aurora_GT_2026_Brochure.pdf", tag: "Sedan", pages: 34, chunks: 412, on: true, added: true },
  { id: "d2", title: "Meridian_EV_2026_Brochure.pdf", tag: "EV", pages: 62, chunks: 738, on: true, added: true },
  { id: "d3", title: "Terra_X_SUV_2026_Brochure.pdf", tag: "SUV", pages: 41, chunks: 503, on: true, added: false },
  { id: "d4", title: "Frontier_Pickup_2026_Brochure.pdf", tag: "Truck", pages: 18, chunks: 221, on: true, added: false },
  { id: "d5", title: "Vantage_Coupe_2026_Brochure.pdf", tag: "Sedan", pages: 27, chunks: 336, on: true, added: false },
  { id: "d6", title: "Voyager_SUV_2026_Brochure.pdf", tag: "SUV", pages: 88, chunks: 954, on: true, added: false },
  { id: "d7", title: "Catalyst_Hybrid_2026_Brochure.pdf", tag: "Hybrid", pages: 22, chunks: 268, on: true, added: false },
  { id: "d8", title: "Summit_HD_2026_Brochure.pdf", tag: "Truck", pages: 51, chunks: 611, on: true, added: false },
];

/** Library filter tabs (match the brochure `tag` values). */
export const LIBRARY_FILTERS = ["All", "SUV", "Sedan", "Truck", "EV", "Hybrid"] as const;

/** Composer quick prompts. */
export const SUGGESTIONS: { label: string; q: string }[] = [
  { label: "Summarise these brochures", q: "Summarise these brochures" },
  { label: "What should I watch out for?", q: "What should I watch out for?" },
  { label: "Pull out the key specs", q: "Pull out the key specs" },
  { label: "Compare these vehicles", q: "Compare these vehicles" },
];

/** Filenames cycled through by the Upload button. */
export const UPLOAD_NAMES = [
  "Nimbus_Crossover_2026_Brochure.pdf",
  "Torrent_Sport_2026_Brochure.pdf",
  "Haven_SUV_2026_Brochure.pdf",
];

/** Indexing progress stages: [label, percent]. */
export const INDEX_STAGES: [string, number][] = [
  ["Reading pages", 18],
  ["Organising text", 46],
  ["Preparing", 78],
  ["Ready", 100],
];

/** Page numbers cycled through when building citations. */
export const CITE_PAGES = [12, 31, 5, 22, 8];

/** Max brochures that can sit in the chat context at once. */
export const MAX_CONTEXT = 8;
