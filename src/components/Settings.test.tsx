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

describe("Settings → Model list (task 1.10.2)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function openWithModels(models: unknown, status: unknown = RUNNING) {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => status);
    tauri.on("list_models", () => models);
    const view = render(<Settings open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    return view;
  }

  it("shows the 3 PRD models with Present/Missing, and NO download button", async () => {
    const { container } = await openWithModels({
      present: ["gemma3n:e4b"],
      missing: ["gemma3n:e2b", "embeddinggemma"],
      status: RUNNING,
      devChatModel: null,
    });

    expect(screen.getByText("gemma3n:e4b")).toBeInTheDocument();
    expect(screen.getByText("gemma3n:e2b")).toBeInTheDocument();
    expect(screen.getByText("embeddinggemma")).toBeInTheDocument();
    // one Present, two Missing
    expect(screen.getByText("Present")).toBeInTheDocument();
    expect(screen.getAllByText("Missing").length).toBe(2);
    // downloads are Phase 2 — no affordance may exist
    expect(screen.queryByRole("button", { name: /download/i })).toBeNull();
    expect(container.textContent).not.toMatch(/download|install|pull/i);
  });

  it("the dev override model shows separately as 'Dev model: …'", async () => {
    await openWithModels({
      present: [],
      missing: ["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"],
      status: RUNNING,
      devChatModel: "gemma4-e4b-fast:latest",
    });
    expect(screen.getByText("Dev model: gemma4-e4b-fast:latest")).toBeInTheDocument();
  });

  it("Ollama down → all three Missing with a calm Not found, no crash", async () => {
    await openWithModels(
      {
        present: [],
        missing: ["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"],
        status: NOT_FOUND,
        devChatModel: null,
      },
      NOT_FOUND,
    );
    expect(screen.getByText("Not found")).toBeInTheDocument();
    expect(screen.getAllByText("Missing").length).toBe(3);
    expect(screen.queryByText("Present")).toBeNull();
  });
});

describe("Settings → Delete model (task 3.8)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function openWithOneModel() {
    const tauri = mockInvoke();
    tauri.on("ollama_status", () => RUNNING);
    tauri.on("list_models", () => ({
      present: ["gemma3n:e4b"],
      missing: ["gemma3n:e2b", "embeddinggemma"],
      status: RUNNING,
      devChatModel: null,
    }));
    tauri.on("delete_model", () => null);
    render(<Settings open onClose={() => {}} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
  }

  it("cancel keeps the model; confirm calls delete_model and refreshes", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    await openWithOneModel();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(confirmSpy).toHaveBeenCalledOnce();
    expect(getInvokeMock().mock.calls.some(([c]) => c === "delete_model")).toBe(false);

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(getInvokeMock().mock.calls.some(([c]) => c === "delete_model")).toBe(true);
    // the list refreshes after the deletion
    expect(getInvokeMock().mock.calls.filter(([c]) => c === "list_models").length).toBeGreaterThanOrEqual(2);
  });
});
