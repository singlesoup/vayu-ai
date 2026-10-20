import { afterEach, describe, expect, it, vi } from "vitest";
import { onWindowClose } from "./windowClose";

const mockWin = vi.hoisted(() => ({
  handlers: [] as Array<(e: { isPreventDefault: () => boolean }) => Promise<void> | void>,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: async (handler: (e: { isPreventDefault: () => boolean }) => Promise<void> | void) => {
      mockWin.handlers.push(handler);
      return () => {
        const i = mockWin.handlers.indexOf(handler);
        if (i >= 0) mockWin.handlers.splice(i, 1);
      };
    },
  }),
}));

describe("onWindowClose (task 1.6.3)", () => {
  afterEach(() => {
    mockWin.handlers.length = 0;
  });

  it("runs the handler when the close request fires, without preventing the close", async () => {
    const runs: number[] = [];
    const unlisten = await onWindowClose(() => runs.push(1));
    expect(mockWin.handlers.length).toBe(1);

    // the OS-level close request fires
    const event = { isPreventDefault: () => false };
    for (const handler of mockWin.handlers) await handler(event);
    expect(runs).toEqual([1]);

    // and unlisten removes the handler again
    unlisten();
    expect(mockWin.handlers.length).toBe(0);
  });
});
