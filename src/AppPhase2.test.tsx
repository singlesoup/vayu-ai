import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockInvoke } from "./test/mocks";
import { resetNowProvider, setNowProvider } from "./lib/appClock";
import App from "./App";

const yellow = {
  ramGb: 16,
  freeDiskGb: 200,
  cpu: "Intel",
  os: "windows",
  tier: "Yellow",
  model: "gemma3n:e2b",
  sizeGb: 5.6,
  ollamaPresent: true,
};

describe("Phase 2 wired into the window", () => {
  beforeEach(() => setNowProvider(() => new Date(2026, 9, 21, 9, 0, 0)));
  afterEach(() => resetNowProvider());

  it("no stored tier shows the tier screen, not today's note", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: null,
      aiEnabled: null,
      intention: [],
    });
    tauri.given("hardware_check", yellow);
    tauri.given("list_models", {
      present: [],
      missing: ["gemma3n:e2b"],
      status: { kind: "Running", version: "0.1" },
      devChatModel: null,
    });
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Your PC: Yellow tier" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download now" })).toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
    expect(tauri.ran("hardware_check")).toBe(true);
  });

  it("a dev chat model skips the download and opens today's note with Morning Intention and Brain Dump", async () => {
    const user = userEvent.setup();
    let tier: string | null = null;
    const tauri = mockInvoke();
    tauri.on("get_config", () => ({
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier,
      aiEnabled: tier === null ? null : true,
      intention: [],
    }));
    tauri.on("update_config", (args) => {
      tier = String(args.tier);
      return null;
    });
    tauri.given("hardware_check", yellow);
    tauri.given("list_models", {
      present: [],
      missing: ["gemma3n:e2b"],
      status: { kind: "Running", version: "0.1" },
      devChatModel: "gemma4-e4b-fast:latest",
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    tauri.given("list_notes", []);
    tauri.given("read_all_notes", []);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Open Vayu" }));
    expect(await screen.findByRole("heading", { name: "Wednesday, October 21" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Daily reset" }));
    expect(screen.getByRole("heading", { name: "Arrive before you begin." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Brain Dump → Tasks" })).toBeInTheDocument();
  });

  it("a skipped intention for today does not show the card again", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: true,
      intention: [{ date: "2026-10-21", status: "skipped" }],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    tauri.given("list_notes", []);
    tauri.given("read_all_notes", []);
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Wednesday, October 21" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Arrive before you begin." })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Daily reset" })).toBeInTheDocument();
  });
});
