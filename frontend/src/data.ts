import type { Chat, Doc } from "./types.ts";

/** The signed-in user. Mock — the app has no real auth yet. */
export const ACCOUNT = {
  name: "Maya Rao",
  initials: "MR",
  email: "maya.rao@example.com",
  plan: "Free plan",
} as const;

/** Seed conversations for the sidebar. */
export const INITIAL_CHATS: Chat[] = [
  { id: "c1", title: "Creta vs Seltos — top variant", when: "Today" },
  { id: "c2", title: "Nexon EV real-world range", when: "Today" },
  { id: "c3", title: "Which variants get 6 airbags?", when: "Yesterday" },
  { id: "c4", title: "Boot space, third row up", when: "Yesterday" },
  { id: "c5", title: "Warranty & service intervals", when: "Last week" },
  { id: "c6", title: "Mileage (ARAI) across variants", when: "Last week" },
];

/** Seed library — brochures that ship with the app. The first two start
 * added to the chat context. */
export const INITIAL_DOCS: Doc[] = [
  {
    id: "d1",
    title: "Maruti_Suzuki_Swift_2026_Brochure.pdf",
    make: "Maruti Suzuki",
    tag: "Hatchback",
    source: "sample",
    pages: 28,
    chunks: 342,
    on: true,
    added: true,
  },
  {
    id: "d2",
    title: "Tata_Nexon_EV_2026_Brochure.pdf",
    make: "Tata",
    tag: "EV",
    source: "sample",
    pages: 44,
    chunks: 561,
    on: true,
    added: true,
  },
  {
    id: "d3",
    title: "Hyundai_Creta_2026_Brochure.pdf",
    make: "Hyundai",
    tag: "SUV",
    source: "sample",
    pages: 52,
    chunks: 640,
    on: true,
    added: false,
  },
  {
    id: "d4",
    title: "Mahindra_Scorpio_N_2026_Brochure.pdf",
    make: "Mahindra",
    tag: "SUV",
    source: "sample",
    pages: 38,
    chunks: 470,
    on: true,
    added: false,
  },
  {
    id: "d5",
    title: "Toyota_Innova_Crysta_2026_Brochure.pdf",
    make: "Toyota",
    tag: "MUV",
    source: "sample",
    pages: 41,
    chunks: 503,
    on: true,
    added: false,
  },
  {
    id: "d6",
    title: "Kia_Seltos_2026_Brochure.pdf",
    make: "Kia",
    tag: "SUV",
    source: "sample",
    pages: 47,
    chunks: 588,
    on: true,
    added: false,
  },
  {
    id: "d7",
    title: "Hyundai_Verna_2026_Brochure.pdf",
    make: "Hyundai",
    tag: "Sedan",
    source: "sample",
    pages: 33,
    chunks: 401,
    on: true,
    added: false,
  },
  {
    id: "d8",
    title: "Tata_Punch_2026_Brochure.pdf",
    make: "Tata",
    tag: "SUV",
    source: "sample",
    pages: 30,
    chunks: 372,
    on: true,
    added: false,
  },
];

/** Filenames cycled through by the Upload button. */
export const UPLOAD_NAMES = [
  "Honda_Elevate_2026_Brochure.pdf",
  "MG_Astor_2026_Brochure.pdf",
  "Skoda_Kushaq_2026_Brochure.pdf",
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

/** Max brochures a user can upload to their library. */
export const MAX_UPLOADS = 10;
