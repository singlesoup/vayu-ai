// Task 1.6.2: debounced autosave. Schedules one save per quiet window; a save
// error keeps the text pending and retries on the same cadence. UI shows a
// calm "Couldn't save — retrying" (DailyNote) — the text is never dropped.

export type AutosaverOptions = {
  delayMs: number;
  save: (content: string) => Promise<void>;
  onSaved?: () => void;
  onError?: (error: unknown) => void;
};

export type Autosaver = {
  /** Called on every content change (each keystroke). Debounced. */
  schedule(content: string): void;
  /** Save NOW if there is unsaved content (used on close / day switch). */
  flush(): void;
};

export function createAutosaver(options: AutosaverOptions): Autosaver {
  let latestContent = "";
  let dirty = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function arm() {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void commit();
    }, options.delayMs);
  }

  async function commit(): Promise<void> {
    if (!dirty) return;
    dirty = false;
    const content = latestContent;
    try {
      await options.save(content);
      options.onSaved?.();
    } catch (e) {
      dirty = true; // the text is never lost
      options.onError?.(e);
      arm(); // retry on the same cadence
    }
  }

  return {
    schedule(content) {
      latestContent = content;
      dirty = true;
      arm();
    },
    flush() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      void commit();
    },
  };
}
