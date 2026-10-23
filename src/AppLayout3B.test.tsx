import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mockInvoke } from "./test/mocks";
import { resetNowProvider, setNowProvider } from "./lib/appClock";
import App from "./App";

function armYellowAi() {
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
  tauri.given("read_note", {
    exists: true,
    content: "Focus on [[Vayu]] today.",
  });
  tauri.given("list_notes", ["2026-10-21"]);
  tauri.given("read_all_notes", [
    { date: "2026-10-21", content: "Focus on [[Vayu]] today." },
  ]);
  return tauri;
}

describe("Phase 3B Reflect-style shell", () => {
  beforeEach(() => setNowProvider(() => new Date(2026, 9, 21, 9, 0, 0)));
  afterEach(() => resetNowProvider());

  it("renders the journal shell: nav, note, and companion", async () => {
    armYellowAi();
    render(<App />);
    await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" });
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Note" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Reflect with Vayu" })).toBeInTheDocument();
    expect(screen.getByText("All notes are local")).toBeInTheDocument();
  });

  it("opens Daily reset with morning, brain dump, and evening together", async () => {
    const user = userEvent.setup();
    armYellowAi();
    render(<App />);
    await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" });
    await user.click(screen.getByRole("button", { name: "Daily reset" }));
    expect(screen.getByRole("heading", { name: "Make room for today." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Arrive before you begin." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Get it out of your head." })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Let the day settle." })).toBeInTheDocument();
  });

  it("does not list Ask your notes in the sidebar", async () => {
    armYellowAi();
    render(<App />);
    await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" });
    expect(screen.queryByRole("button", { name: "Ask your notes" })).not.toBeInTheDocument();
  });
});
