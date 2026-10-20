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

  it("degrades to a no-op when no Tauri window runtime exists", async () => {
    vi.resetModules();
    vi.doMock("@tauri-apps/api/window", () => ({
      getCurrentWindow: () => {
        throw new Error("No Tauri runtime");
      },
    }));
    const { onWindowClose: freshOnWindowClose } = await import("./windowClose");

    const runs = vi.fn();
    const unlisten = await freshOnWindowClose(runs);
    expect(runs).not.toHaveBeenCalled();
    expect(() => unlisten()).not.toThrow(); // a valid, safe no-op

    // the runtime can also come up AFTER registration (async failure path)
    vi.doMock("@tauri-apps/api/window", () => ({
      getCurrentWindow: () => ({
        onCloseRequested: async () => {
          throw new Error("runtime died");
        },
      }),
    }));
    const { onWindowClose: lateOnWindowClose } = await import("./windowClose");
    const unlisten2 = await lateOnWindowClose(runs);
    expect(runs).not.toHaveBeenCalled();
    expect(() => unlisten2()).not.toThrow();
  });
});
