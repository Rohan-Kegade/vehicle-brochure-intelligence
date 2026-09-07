import type { Chat, Doc } from "./types.ts";

/** Seed conversations for the sidebar. */
export const INITIAL_CHATS: Chat[] = [
  { id: "c1", title: "Vendor renewal terms", when: "Today" },
  { id: "c2", title: "Q2 spend vs commitment", when: "Today" },
  { id: "c3", title: "Data deletion timelines", when: "Yesterday" },
  { id: "c4", title: "Uptime credits — worth chasing?", when: "Yesterday" },
  { id: "c5", title: "Handbook: leave policy", when: "Last week" },
  { id: "c6", title: "Security review questions", when: "Last week" },
];

/** Seed library. The first two files start added to the chat context. */
export const INITIAL_DOCS: Doc[] = [
  { id: "d1", title: "Vendor_Agreement_Northwind_2026.pdf", tag: "Contracts", pages: 34, chunks: 412, on: true, added: true },
  { id: "d2", title: "Q2_Financial_Statements.pdf", tag: "Finance", pages: 62, chunks: 738, on: true, added: true },
  { id: "d3", title: "Retrieval_Augmented_Generation_Survey.pdf", tag: "Research", pages: 41, chunks: 503, on: true, added: false },
  { id: "d4", title: "Data_Processing_Addendum_v4.pdf", tag: "Contracts", pages: 18, chunks: 221, on: true, added: false },
  { id: "d5", title: "Platform_Security_Whitepaper.pdf", tag: "Product", pages: 27, chunks: 336, on: true, added: false },
  { id: "d6", title: "Employee_Handbook_2026.pdf", tag: "Policy", pages: 88, chunks: 954, on: true, added: false },
  { id: "d7", title: "Model_Eval_Report_Atlas.pdf", tag: "Research", pages: 22, chunks: 268, on: true, added: false },
  { id: "d8", title: "SOC2_Type_II_Report.pdf", tag: "Policy", pages: 51, chunks: 611, on: true, added: false },
];

/** Library filter tabs. */
export const LIBRARY_FILTERS = ["All", "Contracts", "Finance", "Research", "Policy", "Product"] as const;

/** Composer quick prompts. */
export const SUGGESTIONS: { label: string; q: string }[] = [
  { label: "Summarise these files", q: "Summarise these files" },
  { label: "What should I watch out for?", q: "What should I watch out for?" },
  { label: "Pull out the key numbers", q: "Pull out the key numbers" },
  { label: "Compare these files", q: "Compare these files" },
];

/** Filenames cycled through by the Upload button. */
export const UPLOAD_NAMES = [
  "Master_Services_Agreement_2026.pdf",
  "Annual_Risk_Review.pdf",
  "Fine_Tuning_Cost_Analysis.pdf",
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

/** Token budget for the "Space used" meter. */
export const CONTEXT_BUDGET = 600_000;
/** Approx. tokens per retrieved chunk. */
export const TOKENS_PER_CHUNK = 128;
