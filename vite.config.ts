import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
// @ts-expect-error type error without @types/node package
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;
/** GitHub Pages project site: https://<user>.github.io/vayu-ai/ */
const pagesBase = process.env.VITE_PAGES_BASE;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],
  // Default `/` for Tauri; `/vayu-ai/` when building the static design preview.
  base: pagesBase || "/",

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Vitest frontend test harness (task 1.2.2)
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.test.{ts,tsx}"],
    // Needed so `?raw` CSS imports (1.3.4 TokenPage) return real content.
    css: true,
  },
}));
