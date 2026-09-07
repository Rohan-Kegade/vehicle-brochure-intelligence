# Ask My Documents — RAG Workspace (frontend)

A retrieval-augmented chat workspace: ask questions about a set of PDFs and get
answers with page-level citations, drawn only from the files currently in
context.

## Stack

- **React 19** + **TypeScript** (strict)
- **Vite 7** for dev/build
- Plain CSS with design tokens (`src/styles/`) — no UI framework

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle to dist/
npm run preview  # serve the production build
```

## What it does

The chat, uploads, and retrieval are **simulated on the client** — there is no
backend. Assistant replies are canned responses keyed off keywords in the
question (summary / compare / risk / numbers / who / sources).

Interactive pieces:

| Area | Behaviour |
| --- | --- |
| Sidebar | Collapse to an icon rail, switch chats, start a new chat |
| Search chats | Command palette (`⌕`) filtering recent conversations |
| Header | Chat title with dark/light theme toggle, delete-chat, and share (copy link) actions |
| Add vehicle brochure modal | Upload a file (simulated indexing run) or search / tag-filter the library and add/remove files from the chat context |
| Chat context panel | Header with a "Brochures in use" count below it, per-file pause/resume toggle, remove, "space used" meter, and an "Add vehicle brochure" button |
| Composer | Suggestion chips, Enter to send, typing indicator |
| Mobile (≤720px) | Chat fills the screen; sidebar becomes a slide-in drawer (hamburger), the Chat context panel becomes a bottom sheet (panel icon in the Chat bar) |

## Props

`<RagWorkspace />` (wired up in `src/main.tsx`) accepts:

- `retrievalMode`: `"Balanced" | "Meaning-based" | "Keyword"` (default `"Balanced"`)
- `latencyMs`: simulated assistant think time, 300–2500 (default `1100`)

## Layout

```
src/
  main.tsx                 app entry
  RagWorkspace.tsx         top-level layout + modal wiring
  types.ts                 shared types
  data.ts                  seed chats / docs / constants
  lib/
    useRagWorkspace.ts     all state + behaviour
    answers.ts             canned assistant responses + citation builder
  components/
    Sidebar.tsx            expanded left nav
    CollapsedRail.tsx      collapsed icon rail
    ChatPanel.tsx          transcript + composer
    FilesPanel.tsx         files-in-use rail
    ChatSearchModal.tsx    recent-chat search palette
    LibraryModal.tsx       add-vehicle / library browser
  styles/
    global.css             reset, tokens, keyframes
    workspace.css          component styles
```
