import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaver } from "./autosave";

describe("createAutosaver (task 1.6.2 — debounced autosave, pure)", () => {
  const DELAY = 800;
  let save: ReturnType<typeof vi.fn<(c: string) => Promise<void>>>;

  beforeEach(() => {
    vi.useFakeTimers();
    save = vi.fn<(c: string) => Promise<void>>(async () => undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls no save before the debounce delay elapses", () => {
    const saver = createAutosaver({ delayMs: DELAY, save });
    saver.schedule("first words");
    vi.advanceTimersByTime(DELAY - 1);
    expect(save).not.toHaveBeenCalled();
  });

  it("saves exactly once after the delay, with the latest content", async () => {
    const saver = createAutosaver({ delayMs: DELAY, save });
    saver.schedule("first words");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith("first words");
  });

  it("collapses rapid keystrokes into ONE save with the final text", async () => {
    const saver = createAutosaver({ delayMs: DELAY, save });
    for (let i = 1; i <= 10; i++) {
      saver.schedule(`text ${i}`);
      await vi.advanceTimersByTimeAsync(50); // quick keystrokes, less than delay
    }
    // only DELAY ms still at the end of typing: wait 800 from the last keystroke
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith("text 10");
  });

  it("flush() saves the latest unsaved content immediately", async () => {
    const saver = createAutosaver({ delayMs: DELAY, save });
    saver.schedule("flush me");
    vi.advanceTimersByTime(100);
    saver.flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith("flush me");
    // the pending timer must not double-save after a flush
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledOnce();
  });

  it("flush() with nothing pending saves nothing", async () => {
    const saver = createAutosaver({ delayMs: DELAY, save });
    saver.flush();
    await vi.advanceTimersByTimeAsync(DELAY * 3);
    expect(save).not.toHaveBeenCalled();
  });

  it("on save error: retries with the same content and reports both states", async () => {
    const onError = vi.fn();
    const onSaved = vi.fn();
    save.mockRejectedValueOnce({ kind: "Io", message: "disk hiccup" });
    const saver = createAutosaver({ delayMs: DELAY, save, onError, onSaved });
    saver.schedule("precious text");
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(onError).toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    // the retry carries the same, still-unsaved text
    await vi.advanceTimersByTimeAsync(DELAY);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith("precious text");
    expect(onSaved).toHaveBeenCalled();
  });

  it("a NEW schedule replaces a scheduled retry and saves the newest content once", async () => {
    const onError = vi.fn();
    save.mockRejectedValueOnce({ kind: "Io", message: "still failing" });
    const saver = createAutosaver({ delayMs: DELAY, save, onError });
    saver.schedule("old");
    await vi.advanceTimersByTimeAsync(DELAY);
    saver.schedule("new");
    await vi.advanceTimersByTimeAsync(DELAY);
    await vi.advanceTimersByTimeAsync(DELAY);
    const contents = save.mock.calls.map(([c]) => c);
    expect(contents[contents.length - 1]).toBe("new");
    expect(contents).not.toContain("old");
  });
});
