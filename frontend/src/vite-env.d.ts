/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "false" wires the UI to the real backend; anything else keeps it mocked. */
  readonly VITE_USE_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
