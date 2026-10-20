import { beforeEach, vi } from "vitest";

/**
 * Shared Tauri `invoke` mock for component tests.
 *
 * Usage in a test file:
 * ```ts
 * import { render, screen } from "@testing-library/react";
 * import { userEvent } from "@testing-library/user-event";
 * import { mockInvoke } from "./test/mocks";
 *
 * const tauri = mockInvoke();
 *
 * it("shows config", async () => {
 *   tauri.on("get_config", () => null);
 *   render(<App />);
 *   expect(await screen.findByText("...")).toBeInTheDocument();
 *   expect(tauri.ran("get_config")).toBe(true);
 * });
 * ```
 *
 * Commands without a handler reject with a clear error, so tests fail loudly
 * on unexpected calls instead of hanging on a real IPC call.
 */
export type InvokeHandler = (args: Record<string, unknown>) => unknown;

const { invokeMock } = vi.hoisted(
  () =>
    ({
      invokeMock:
        vi.fn<
          (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
        >(),
    }) as const,
);

vi.mock("@tauri-apps/api/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tauri-apps/api/core")>();
  return {
    ...actual,
    invoke: invokeMock,
  };
});

type TauriMock = {
  /** Registers the handler for a command. The handler may be async; throwing it rejects the invoke. */
  on(cmd: string, handler: InvokeHandler): void;
  /** Convenience: a command that resolves with a value (or `null`/`undefined`). */
  given(cmd: string, result: unknown): void;
  /** Convenience: a command that rejects with an error. */
  givenError(cmd: string, error: unknown): void;
  /** Arguments recorded by a command call, or `undefined` when it never ran. */
  args(cmd: string): Record<string, unknown> | undefined;
  /** True when the command ran at least once. */
  ran(cmd: string): boolean;
  /** Call count for a command. */
  callCount(cmd: string): number;
};

let handlers = new Map<string, InvokeHandler>();

function armMock() {
  invokeMock.mockReset();
  invokeMock.mockImplementation(
    async (cmd: string, args?: Record<string, unknown>) => {
      const handler = handlers.get(cmd);
      if (!handler) {
        throw new Error(`mockInvoke: unexpected command "${cmd}"`);
      }
      return await handler(args ?? {});
    },
  );
}

export function mockInvoke(): TauriMock {
  handlers = new Map();
  armMock();
  beforeEach(() => {
    handlers = new Map();
    armMock();
  });

  return {
    on(cmd, handler) {
      handlers.set(cmd, handler);
    },
    given(cmd, result) {
      handlers.set(cmd, () => result);
    },
    givenError(cmd, error) {
      handlers.set(cmd, async () => {
        throw error;
      });
    },
    args(cmd) {
      const call = invokeMock.mock.calls.find(([c]) => c === cmd);
      return call ? (call[1] ?? {}) : undefined;
    },
    ran(cmd) {
      return invokeMock.mock.calls.some(([c]) => c === cmd);
    },
    callCount(cmd) {
      return invokeMock.mock.calls.filter(([c]) => c === cmd).length;
    },
  };
}

/** Matcher-friendly accessor for tests that want the raw spy. */
export function getInvokeMock() {
  return invokeMock;
}
