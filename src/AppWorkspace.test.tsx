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
    });
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "started at 9" });
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

    expect(await screen.findByText("THU 22 OCT 2026")).toBeInTheDocument();
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
});
