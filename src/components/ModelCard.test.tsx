// Task 3.8: ModelCard tests (tier words, model + size, re-run check,
// re-index, BYOK coming-soon only).
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockInvoke } from "../test/mocks";
import { tierLabel } from "../lib/tiers";
import { ModelCard } from "./ModelCard";

const REPORT = {
  ramGb: 32,
  freeDiskGb: 100,
  cpu: "Test CPU",
  os: "Windows",
  tier: "Green",
  model: "gemma3n:e4b",
  sizeGb: 7.5,
  ollamaPresent: true,
};

function mockAll(tauri: ReturnType<typeof mockInvoke>, extra?: { report?: unknown }) {
  tauri.on("get_config", () => ({
    notesDir: "C:/notes",
    version: 1,
    defaultNotesDir: "C:/default",
    tier: "Green",
    aiEnabled: true,
    intention: [],
  }));
  tauri.on("hardware_check", () => extra?.report ?? REPORT);
  tauri.on("reindex", () => ({ indexed: 2, chunks: 5 }));
}

describe("ModelCard (task 3.8 + 3.4 reindex)", () => {
  it("names every tier in plain words (tierLabel)", () => {
    expect(tierLabel("Green")).toBe("Full (Green)");
    expect(tierLabel("Yellow")).toBe("Lite (Yellow)");
    expect(tierLabel("Red")).toBe("No-AI (Red)");
    expect(tierLabel(null)).toBe("Not chosen yet");
  });

  it("shows the tier in plain words plus the model and its size", async () => {
    const tauri = mockInvoke();
    mockAll(tauri);
    render(<ModelCard />);
    await act(async () => {});
    expect(screen.getByText("Tier: Full (Green)")).toBeInTheDocument();
    expect(screen.getByText(/gemma3n:e4b — about 7.5 GB/)).toBeInTheDocument();
    expect(screen.getByText(/Use your own API key — coming soon/)).toBeInTheDocument();
  });

  it("Re-run check re-runs hardware_check and updates the line", async () => {
    const tauri = mockInvoke();
    mockAll(tauri);
    render(<ModelCard />);
    await act(async () => {});
    expect(screen.getByText(/gemma3n:e4b/)).toBeInTheDocument();

    tauri.on("hardware_check", () => ({ ...REPORT, model: "gemma3n:e2b", sizeGb: 5.6, tier: "Yellow" }));
    fireEvent.click(screen.getByRole("button", { name: "Re-run check" }));
    await act(async () => {});
    expect(screen.getByText(/gemma3n:e2b — about 5.6 GB/)).toBeInTheDocument();
  });

  it("Re-index rebuilds the local index and reports the stats", async () => {
    const tauri = mockInvoke();
    mockAll(tauri);
    render(<ModelCard />);
    await act(async () => {});

    fireEvent.click(screen.getByRole("button", { name: "Re-index" }));
    await act(async () => {});
    expect(tauri.ran("reindex")).toBe(true);
    expect(screen.getByText(/Index rebuilt: 2 day\(s\), 5 chunks/)).toBeInTheDocument();
  });

  it("BYOK is a label only — no input or button is offered", async () => {
    const tauri = mockInvoke();
    mockAll(tauri);
    render(<ModelCard />);
    await act(async () => {});
    expect(screen.getByText(/coming soon/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /api key/i })).toBeNull();
  });
});
