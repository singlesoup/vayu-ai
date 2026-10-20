// Task 1.6.3: when the user closes the window (X / Alt+F4), pending edits get
// one last chance to save. This tiny module hides the Tauri window API so
// tests can mock `@tauri-apps/api/window` directly.
import { getCurrentWindow } from "@tauri-apps/api/window";

export type UnlistenFn = () => void;

/**
 * Runs `handler` when a close request arrives. The close is never prevented —
 * the handler is only meant to flush pending saves.
 */
export function onWindowClose(handler: () => void): Promise<UnlistenFn> {
  return getCurrentWindow().onCloseRequested((event) => {
    void handler();
    void event; // close proceeds; no isPreventDefault() call
  });
}
