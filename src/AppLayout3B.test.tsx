import { render, screen, within } from "@testing-library/react";
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

  it("renders three-zone landmarks: nav, note, calendar rail", async () => {
    armYellowAi();
    render(<App />);
    await screen.findByRole("heading", { name: "Wed, October 21st, 2026" });
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Note" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Day tools" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "In this note" })).toBeInTheDocument();
  });

  it("keeps the note title above the AI action row", async () => {
    armYellowAi();
    const { container } = render(<App />);
    const title = await screen.findByRole("heading", { name: "Wed, October 21st, 2026" });
    const toolbar = screen.getByRole("toolbar", { name: "AI for today" });
    const position = title.compareDocumentPosition(toolbar);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".morning-intention")).toBeNull();
  });

  it("opens only one AI panel at a time", async () => {
    const user = userEvent.setup();
    armYellowAi();
    render(<App />);
    await screen.findByRole("heading", { name: "Wed, October 21st, 2026" });
    await user.click(screen.getByRole("button", { name: "Journal" }));
    expect(screen.getByRole("heading", { name: "Journal chat" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Brain dump" }));
    expect(screen.getByRole("heading", { name: "Brain Dump → Tasks" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Journal chat" })).not.toBeInTheDocument();
  });

  it("Ask your notes opens in the centre column", async () => {
    const user = userEvent.setup();
    armYellowAi();
    render(<App />);
    await screen.findByRole("heading", { name: "Wed, October 21st, 2026" });
    await user.click(screen.getByRole("button", { name: "Ask your notes" }));
    const note = screen.getByRole("region", { name: "Note" });
    expect(within(note).getByRole("heading", { name: /Ask/i })).toBeInTheDocument();
  });
});
