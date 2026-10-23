import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "./test/mocks";
import { resetNowProvider, setNowProvider } from "./lib/appClock";

const { dialogOpenMock } = vi.hoisted(() => ({ dialogOpenMock: vi.fn() }));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: dialogOpenMock }));

import App from "./App";

describe("First-run flow (task 1.4.4)", () => {
  it("no config → the folder screen shows with the default path", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: null,
      version: 1,
      defaultNotesDir: "C:/Users/samon/Documents/Vayu",
    });
    render(<App />);
    const input = await screen.findByRole("textbox");
    expect(input).toHaveValue("C:/Users/samon/Documents/Vayu");
  });

  it("config present → the folder screen doesn't show; the app goes to today's note", async () => {
    const nowRef = new Date(2026, 9, 21, 9, 0, 0);
    setNowProvider(() => nowRef);
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/Users/samon/Documents/Vayu",
      version: 1,
      defaultNotesDir: "C:/Users/samon/Documents/Vayu",
      tier: "Yellow",
      aiEnabled: false,
      intention: [],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    tauri.given("list_notes", []);
    tauri.given("read_all_notes", []);
    render(<App />);
    // workspace appears (the note date header), folder screen absent
    await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" });
    expect(screen.queryByRole("button", { name: "Continue" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    resetNowProvider();
  });
});
