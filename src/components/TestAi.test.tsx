// NOTE: `../test/mocks` must be imported before anything that pulls in
// `@tauri-apps/api/core` (mocks.ts installs the invoke/Channel fakes).
import { act, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInvokeMock, mockInvoke } from "../test/mocks";
import { TestAi } from "./TestAi";

type Handler = { onmessage: ((e: unknown) => void) | null };
type Resolvable = (o: unknown) => void;

let resolveRun: Resolvable = () => {};

/**
 * Arms a `generate` handler that streams `tokens` on a timer schedule and
 * resolves with `outcome` when the stream ends. `stop_generation` resolves
 * the same promise with `stopOutcome` (i.e. cuts the run short).
 */
function armStream(
  tokens: Array<{ ms: number; value: string }>,
  outcome: unknown,
  stopOutcome: unknown = outcome,
) {
  const tauri = mockInvoke();
  tauri.on("generate", (args) => {
    const ch = args["onEvent"] as Handler;
    return new Promise((resolve) => {
      resolveRun = resolve;
      let elapsed = 0;
      const schedule = [...tokens, { ms: 0, value: "DONE_MARKER" }];
      for (const { ms, value } of schedule) {
        elapsed += ms;
        const isLast = value === "DONE_MARKER";
        setTimeout(
          () => {
            if (isLast) {
              ch.onmessage?.({ event: "done", value: "" });
              resolve(outcome); // the promise resolves AFTER the stream ended
            } else {
              ch.onmessage?.({ event: "token", value });
            }
          },
          elapsed,
        );
      }
    });
  });
  tauri.on("stop_generation", () => {
    resolveRun(stopOutcome);
    return null;
  });
}

/** Variant whose stream NEVER ends on its own (only Stop resolves it). */
function armEndlessStream() {
  const tauri = mockInvoke();
  tauri.on("generate", (args) => {
    const ch = args["onEvent"] as Handler;
    return new Promise((resolve) => {
      resolveRun = resolve;
      setTimeout(() => {
        ch.onmessage?.({ event: "token", value: "First words. " });
      }, 300);
    });
  });
  tauri.on("stop_generation", () => {
    resolveRun({ status: "Stopped" });
    return null;
  });
}

describe("Test AI UI (task 1.11.3)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resolveRun = () => {};
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function renderPanel() {
    render(<TestAi />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  it("clicking Test AI shows a thinking state until the first token, then tokens append live", async () => {
    armStream(
      [
        { ms: 400, value: "Hello " },
        { ms: 200, value: "from Vayu." },
      ],
      { status: "Done" },
    );
    await renderPanel();

    const button = screen.getByRole("button", { name: "Test AI" });
    expect(button).not.toBeDisabled();
    fireEvent.click(button);

    // before the first token: thinking, button disabled
    expect(screen.getByText(/thinking/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hello /)).toBeNull();

    // first token: the text starts arriving
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    const reply = screen.getByTestId("test-ai-reply");
    expect(reply.textContent).toBe("Hello ");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    // the whole reply is there and the run ended
    expect(reply.textContent).toBe("Hello from Vayu.");
    expect(screen.getByRole("button", { name: "Test AI" })).not.toBeDisabled();
  });

  it("while running the Test AI button is disabled and Stop is offered; Stop ends the run", async () => {
    armEndlessStream();
    await renderPanel();

    const button = screen.getByRole("button", { name: "Test AI" });
    fireEvent.click(button);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(button).toBeDisabled();

    const stop = screen.getByRole("button", { name: "Stop" });
    fireEvent.click(stop);
    expect(getInvokeMock().mock.calls.some(([c]) => c === "stop_generation")).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    // stopped run is over: Test AI is available again
    expect(screen.getByRole("button", { name: "Test AI" })).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Stop" })).toBeNull();
  });

  it("an error gives a calm message and the button is enabled again", async () => {
    mockInvoke().on("generate", () => Promise.reject({ kind: "Io", message: "connection lost" }));
    await renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Test AI" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(
      screen.getByText("Vayu couldn't reach the local AI. Your notes are safe."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test AI" })).not.toBeDisabled();
  });

  it("NoModel gives a plain 'no model installed yet' message", async () => {
    mockInvoke().on("generate", () => Promise.reject({ kind: "NoModel", message: "none" }));
    await renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Test AI" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText(/no model installed yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Test AI" })).not.toBeDisabled();
  });

  it("appears in the Settings Model section (Settings integration)", async () => {
    const { Settings } = await import("./Settings");
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => ({ kind: "Running", version: "0.9.1" }));
    tauri.on("list_models", () => ({
      present: ["gemma3n:e4b"],
      missing: ["gemma3n:e2b", "embeddinggemma"],
      status: { kind: "Running", version: "0.9.1" },
      devChatModel: null,
    }));
    armStream([{ ms: 100, value: "ok." }], { status: "Done" });

    render(<Settings open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const button = screen.getByRole("button", { name: "Test AI" });
    fireEvent.click(button);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(screen.getByTestId("test-ai-reply").textContent).toBe("ok.");
  });

  // Task 1B.4: the catch block logged to the console in production code.
  it("the catch path never calls console.log", () => {
    const src = readFileSync(resolve(__dirname, "TestAi.tsx"), "utf8");
    expect(src).not.toMatch(/console\.log/);
  });
});
