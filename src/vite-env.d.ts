/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When `"true"`, static UI preview uses dummy notes (GitHub Pages). */
  readonly VITE_UI_PREVIEW?: string;
  /** Optional Vite `base` for project Pages (`/vayu-ai/`). */
  readonly VITE_PAGES_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
