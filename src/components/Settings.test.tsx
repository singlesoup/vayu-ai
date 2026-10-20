import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInvokeMock, mockInvoke } from "../test/mocks";
import { Settings } from "./Settings";

const RUNNING = { kind: "Running", version: "0.9.1" } as const;
const NOT_FOUND = { kind: "NotFound", reason: "connection refused" } as const;

describe("Settings → Model status (task 1.9.2)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function openSettings(props?: { onClose?: () => void }) {
    render(<Settings open onClose={props?.onClose ?? (() => {})} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
  }

  it("closed → renders nothing", () => {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => RUNNING);
    render(<Settings open={false} onClose={() => {}} />);
    expect(screen.queryByText("Settings")).toBeNull();
  });

  it("shows the Running label from the mocked command", async () => {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => RUNNING);
    await openSettings();
    expect(screen.getByText("Running — Ollama v0.9.1")).toBeInTheDocument();
  });

  it("shows a calm Not found label with the reason, never a crash", async () => {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => NOT_FOUND);
    await openSettings();
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getByText(/connection refused/)).toBeInTheDocument();
  });

  it("Refresh re-checks the command and updates the label", async () => {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => NOT_FOUND);
    await openSettings();
    expect(screen.getByText("Not found")).toBeInTheDocument();

    tauri.on("ollama_status", () => RUNNING); // user started Ollama
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByText("Running — Ollama v0.9.1")).toBeInTheDocument();
    expect(getInvokeMock().mock.calls.filter(([c]) => c === "ollama_status").length).toBe(2);
  });

  it("while open, the status re-checks every ~5s; polling stops when closed", async () => {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => NOT_FOUND);

    const { unmount } = render(<Settings open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    const before = getInvokeMock().mock.calls.filter(([c]) => c === "ollama_status").length;

    // one poll cycle fires at ~5s and again at ~10s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    const during = getInvokeMock().mock.calls.filter(([c]) => c === "ollama_status").length;
    expect(during).toBeGreaterThanOrEqual(before + 2);

    // closing stops the polling for good
    unmount();
    const afterClose = getInvokeMock().mock.calls.filter(([c]) => c === "ollama_status").length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    const muchLater = getInvokeMock().mock.calls.filter(([c]) => c === "ollama_status").length;
    expect(muchLater).toBe(afterClose);
  });

  it("the close button hands control back to the app", async () => {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => NOT_FOUND);
    const onClose = vi.fn();
    await openSettings({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
