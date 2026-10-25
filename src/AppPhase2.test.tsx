import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getInvokeMock, mockInvoke } from "./test/mocks";
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
  beforeEach(() => {
    localStorage.clear();
    setNowProvider(() => new Date(2026, 9, 21, 9, 0, 0));
  });
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
    expect(await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Arrive before you begin." })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Evening reflection" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Daily reset" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tasks" }));
    expect(screen.getByRole("heading", { name: "Get it out of your head." })).toBeInTheDocument();
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
      await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Arrive before you begin." })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Evening reflection" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Daily reset" })).not.toBeInTheDocument();
  });

  it("a saved intention for today does not show the morning dialog again", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: true,
      intention: [{ date: "2026-10-21", status: "done" }],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    tauri.given("list_notes", []);
    tauri.given("read_all_notes", []);
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Morning intention" })).not.toBeInTheDocument();
  });

  it("skipping morning closes it, and the evening dialog can still open later", async () => {
    const user = userEvent.setup();
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: true,
      intention: [],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    tauri.given("list_notes", []);
    tauri.given("read_all_notes", []);
    tauri.given("mark_intention", null);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Skip today" }));
    expect(screen.queryByRole("dialog", { name: "Morning intention" })).not.toBeInTheDocument();
    expect(tauri.args("mark_intention")).toEqual({ date: "2026-10-21", status: "skipped" });

    setNowProvider(() => new Date(2026, 9, 21, 18, 0, 0));
    await user.click(screen.getByRole("button", { name: "Tasks" }));
    expect(screen.getByRole("dialog", { name: "Evening reflection" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Morning intention" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("Not tonight keeps the evening dialog closed for that date", async () => {
    const user = userEvent.setup();
    setNowProvider(() => new Date(2026, 9, 21, 18, 0, 0));
    const arm = () => {
      const tauri = mockInvoke();
      tauri.given("get_config", {
        notesDir: "C:/notes",
        version: 1,
        defaultNotesDir: "C:/docs/Vayu",
        tier: "Yellow",
        aiEnabled: true,
        intention: [{ date: "2026-10-21", status: "done" }],
      });
      tauri.given("ensure_note", null);
      tauri.given("read_note", { exists: true, content: "A quiet day." });
      tauri.given("list_notes", ["2026-10-21"]);
      tauri.given("read_all_notes", [{ date: "2026-10-21", content: "A quiet day." }]);
      return tauri;
    };
    arm();
    const first = render(<App />);
    await user.click(await screen.findByRole("button", { name: "Not tonight" }));
    expect(screen.queryByRole("dialog", { name: "Morning intention" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Evening reflection" })).not.toBeInTheDocument();
    expect(localStorage.getItem("vayu-evening-2026-10-21")).toBe("done");
    first.unmount();

    arm();
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Evening reflection" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Morning intention" })).not.toBeInTheDocument();
  });

  it("shows neither ritual in the afternoon", async () => {
    setNowProvider(() => new Date(2026, 9, 21, 14, 0, 0));
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: true,
      intention: [],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    tauri.given("list_notes", []);
    tauri.given("read_all_notes", []);
    render(<App />);
    expect(
      await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps brain dump on Tasks and still checks, adds, and opens a day", async () => {
    const user = userEvent.setup();
    setNowProvider(() => new Date(2026, 9, 21, 14, 0, 0));
    const notes = [
      { date: "2026-10-21", content: "- [ ] Ship layout\n" },
      { date: "2026-10-20", content: "- [ ] Book flights\n" },
    ];
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: true,
      intention: [],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: notes[0].content });
    tauri.given("list_notes", ["2026-10-20", "2026-10-21"]);
    tauri.given("read_all_notes", notes);
    tauri.given("write_note", null);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /^Tasks/ }));
    expect(screen.getByRole("heading", { name: "Get it out of your head." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Daily reset" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ship layout" }));
    expect(screen.queryByRole("textbox", { name: "Add a task for today" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "20th Oct, 2026" }));

    expect(await screen.findByRole("heading", { name: "Tuesday, October 20, 2026" })).toBeInTheDocument();
    const writes = getInvokeMock()
      .mock.calls.filter(([cmd]) => cmd === "write_note")
      .map(([, args]) => args as { date?: string; content?: string });
    expect(writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "2026-10-21", content: expect.stringContaining("- [x] Ship layout") }),
      ]),
    );
  });

  it("groups tasks by note and filters open, all, and done", async () => {
    const user = userEvent.setup();
    setNowProvider(() => new Date(2026, 9, 21, 14, 0, 0));
    const notes = [
      { date: "2026-10-21", content: "- [ ] Ship layout\n- [x] File the notes\n" },
      { date: "2026-10-20", content: "- [ ] Book flights\n" },
    ];
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: true,
      intention: [],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: notes[0].content });
    tauri.given("list_notes", ["2026-10-20", "2026-10-21"]);
    tauri.given("read_all_notes", notes);
    tauri.given("write_note", null);
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /^Tasks/ }));
    expect(screen.getAllByTestId("task-group")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Ship layout" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "File the notes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getAllByTestId("task-group")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "File the notes" }));
    expect(screen.queryByRole("button", { name: "Ship layout" })).not.toBeInTheDocument();
    const writes = getInvokeMock()
      .mock.calls.filter(([cmd]) => cmd === "write_note")
      .map(([, args]) => args as { content?: string });
    expect(writes.some((args) => args.content?.includes("- [ ] File the notes"))).toBe(true);

    await user.click(screen.getByRole("button", { name: "All" }));
    expect(screen.getByRole("button", { name: "Ship layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book flights" })).toBeInTheDocument();
  });

  it("lists recent notes in an empty search and opens the highlighted one", async () => {
    const user = userEvent.setup();
    setNowProvider(() => new Date(2026, 9, 21, 14, 0, 0));
    const notes = [
      { date: "2026-10-21", content: "# Today page\n\nHere." },
      { date: "2026-10-20", content: "# Yesterday page\n\nThere." },
    ];
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: true,
      intention: [],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: notes[0].content });
    tauri.given("list_notes", ["2026-10-20", "2026-10-21"]);
    tauri.given("read_all_notes", notes);
    render(<App />);
    await screen.findByRole("heading", { name: "Wednesday, October 21, 2026" });
    const input = screen.getByTestId("journal-search-input");
    await user.click(input);
    expect(screen.getByRole("option", { name: /Today page/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Yesterday page/ })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(await screen.findByRole("heading", { name: "Tuesday, October 20, 2026" })).toBeInTheDocument();

    await user.click(screen.getByTestId("journal-search-input"));
    await user.type(screen.getByTestId("journal-search-input"), "nope");
    await user.keyboard("{Escape}");
    expect(screen.getByTestId("journal-search-input")).toHaveValue("");
    expect(screen.getByTestId("journal-search-input")).not.toHaveFocus();
  });
});
