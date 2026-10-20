// Note: `./mocks` must be imported before `@tauri-apps/api/core` so the
// Tauri invoke mock is registered before the real module resolves.
import { describe, expect, it } from "vitest";
import { getInvokeMock, mockInvoke } from "./mocks";
import { invoke } from "@tauri-apps/api/core";

describe("mockInvoke helper", () => {
  it("resolves registered commands and records calls", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", { notesDir: "C:/notes" });

    await expect(getInvokeMock()("get_config")).resolves.toEqual({
      notesDir: "C:/notes",
    });

    expect(tauri.ran("get_config")).toBe(true);
    expect(tauri.ran("read_note")).toBe(false);
    expect(tauri.callCount("get_config")).toBe(1);
  });

  it("the mocked module serves the same spy", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { content: "hello" });

    // A fresh import through the module system must get the mock, not the real
    // IPC-bound invoke (which would fail without a Tauri backend).
    const core = await import("@tauri-apps/api/core");
    expect(core.invoke).toBe(getInvokeMock());

    await expect(invoke("read_note")).resolves.toEqual({ content: "hello" });
    expect(tauri.args("read_note")).toEqual({});
  });

  it("rejects commands that have no handler", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", null); // arm the mock for a known command

    await expect(getInvokeMock()("read_note")).rejects.toThrow(
      'unexpected command "read_note"',
    );
    expect(tauri.ran("read_note")).toBe(true);
  });

  it("supports rejecting with a given error", async () => {
    const tauri = mockInvoke();
    tauri.givenError("set_notes_dir", new Error("invalid"));

    await expect(getInvokeMock()("set_notes_dir")).rejects.toThrow("invalid");
  });

  it("supports dynamic handlers and records args", async () => {
    const tauri = mockInvoke();
    tauri.on("read_note", (args) => ({
      content: `note for ${String(args["date"])}`,
    }));

    expect(await getInvokeMock()("read_note", { date: "2026-10-21" })).toEqual({
      content: "note for 2026-10-21",
    });
    expect(tauri.args("read_note")).toEqual({ date: "2026-10-21" });
  });
});
