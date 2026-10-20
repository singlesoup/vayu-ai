// Task 1.6.3: when the user closes the window (X / Alt+F4), pending edits get
// one last chance to save. This tiny module hides the Tauri window API so
// tests can mock `@tauri-apps/api/window` directly.
import { getCurrentWindow } from "@tauri-apps/api/window";

export type UnlistenFn = () => void;

/**
 * Runs `handler` when a close request arrives. The close is never prevented —
 * the handler is only meant to flush pending saves.
 *
 * Without a window runtime (tests, no-Tauri contexts) this degrades to a
 * no-op instead of crashing: close events simply never fire there, and the
 * component's own unmount flush still runs.
 */
export function onWindowClose(handler: () => void): Promise<UnlistenFn> {
  const noop: UnlistenFn = () => {};
  try {
    return getCurrentWindow()
      .onCloseRequested((event) => {
        void handler();
        void event; // close proceeds; no isPreventDefault() call
      })
      .catch(() => noop); // runtime came up but failed (async path)
  } catch {
    return Promise.resolve(noop); // no runtime at all (sync path)
  }
}
