import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getInvokeMock, mockInvoke } from "./test/mocks";
import { setNowProvider, resetNowProvider } from "./lib/appClock";
import App from "./App";

/** 0-based index of a command in the mock's call history, -1 when absent. */
function callIndex(cmd: string): number {
  return getInvokeMock().mock.calls.findIndex(([c]) => c === cmd);
}

describe("Workspace launch (task 1.5.4)", () => {
  const nowRef = { value: new Date(2026, 9, 21, 9, 0, 0) };

  beforeEach(() => {
    nowRef.value = new Date(2026, 9, 21, 9, 0, 0);
    setNowProvider(() => nowRef.value);
  });

  afterEach(() => resetNowProvider());

  function armConfig() {
    const tauri = mockInvoke();
    tauri.given("get_config", {
      notesDir: "C:/notes",
      version: 1,
      defaultNotesDir: "C:/docs/Vayu",
      tier: "Yellow",
      aiEnabled: false,
      intention: [{ date: "2026-10-21", status: "skipped" }],
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "started at 9" });
    tauri.given("list_notes", []);
    tauri.given("read_all_notes", []);
    tauri.on("ollama_status", () => new Promise<never>(() => undefined)); // never resolves
    return tauri;
  }

  it("launch → ensure_note(today) then read_note(today), and the editor shows the content", async () => {
    armConfig();
    render(<App />);
    expect(await screen.findByDisplayValue("started at 9")).toBeInTheDocument();
    const iEnsure = callIndex("ensure_note");
    const iRead = callIndex("read_note");
    expect(iEnsure).toBeGreaterThan(-1);
    expect(iRead).toBe(iEnsure + 1);
  });

  it("the window title is 'Vayu — Today' on today's note", async () => {
    armConfig();
    render(<App />);
    await screen.findByDisplayValue("started at 9");
    expect(document.title).toBe("Vayu — Today");
  });

  it("open over midnight: window refocus switches to the new day and creates that file", async () => {
    const tauri = armConfig();
    tauri.on("read_note", (args) =>
      args["date"] === "2026-10-22"
        ? { exists: false, content: "" }
        : { exists: true, content: "started at 9" },
    );
    render(<App />);
    await screen.findByDisplayValue("started at 9");

    nowRef.value = new Date(2026, 9, 22, 0, 5, 0); // past midnight
    window.dispatchEvent(new Event("focus"));

    expect(
      await screen.findByRole("heading", { name: "Thu, October 22nd, 2026" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Vayu — Today");
    // the last ensure/read pair targets the new day
    const calls = getInvokeMock().mock.calls;
    const lastIndexOf = (cmd: string) => {
      for (let i = calls.length - 1; i >= 0; i--) {
        if (calls[i][0] === cmd) return i;
      }
      return -1;
    };
    expect(calls[lastIndexOf("ensure_note")]?.[1]).toEqual({ date: "2026-10-22" });
    expect(calls[lastIndexOf("read_note")]?.[1]).toEqual({ date: "2026-10-22" });
  });

  it("startup does not wait for Ollama: the note renders even when ollama_status never resolves", async () => {
    armConfig();
    render(<App />);
    await screen.findByDisplayValue("started at 9");
  });

  it("clicking a calendar day opens that day's note (task 1.7.2)", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const tauri = armConfig();
    tauri.on("list_notes", () => ["2026-10-05"]);
    tauri.on("read_note", (args) =>
      args["date"] === "2026-10-05"
        ? { exists: true, content: "pruned the apple tree" }
        : { exists: true, content: "started at 9" },
    );
    render(<App />);
    await screen.findByDisplayValue("started at 9");

    fireEvent.click(await screen.findByRole("button", { name: "5" }));
    expect(await screen.findByDisplayValue("pruned the apple tree")).toBeInTheDocument();
  });

  // Task 1.8.4: guard — the app is for notes, not for stopwatching. Render the
  // whole shell and make sure nothing suggests timers/Pomodoro/countdowns.
  it("no timer UI anywhere in the shell (task 1.8.4)", async () => {
    armConfig();
    const { container } = render(<App />);
    await screen.findByDisplayValue("started at 9");

    const prohibit = /pomodoro|timer|countdown|start focus/i;
    expect(screen.queryByLabelText(/pomodoro|timer|countdown|start focus/i)).toBeNull();
    expect(screen.queryByPlaceholderText(prohibit)).toBeNull();
    expect(container.textContent).not.toMatch(prohibit);
  });
});
