import { describe, expect, it } from "vitest";
// IMPORTANT: mocks must be imported before ./api so the Tauri invoke mock is
// registered before the real @tauri-apps/api/core module resolves.
import { getInvokeMock, mockInvoke } from "../test/mocks";
import {
  COMMANDS,
  ensureNote,
  generate,
  getConfig,
  listModels,
  listNotes,
  ollamaStatus,
  readNote,
  setNotesDir,
  stopGeneration,
  writeNote,
} from "./api";

describe("api contract (src/lib/api.ts)", () => {
  it("names exactly the Rust commands now.md depends on", () => {
    expect(Object.values(COMMANDS).sort()).toEqual(
      [
        "get_config",
        "set_notes_dir",
        "read_note",
        "ensure_note",
        "write_note",
        "list_notes",
        "ollama_status",
        "list_models",
        "generate",
        "stop_generation",
      ].sort(),
    );
  });

  it("getConfig calls get_config with no args", async () => {
    const tauri = mockInvoke();
    tauri.given("get_config", { notesDir: "C:/notes", version: 1 });
    await expect(getConfig()).resolves.toEqual({ notesDir: "C:/notes", version: 1 });
    expect(getInvokeMock().mock.calls[0]).toEqual(["get_config"]);
  });

  it("setNotesDir sends the path arg", async () => {
    const tauri = mockInvoke();
    tauri.given("set_notes_dir", null);
    await setNotesDir("C:/Users/samon/notes");
    expect(getInvokeMock().mock.calls[0]).toEqual([
      "set_notes_dir",
      { path: "C:/Users/samon/notes" },
    ]);
  });

  it("readNote / ensureNote / writeNote use the date arg", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { exists: true, content: "hi" });
    tauri.given("ensure_note", null);
    tauri.given("write_note", null);

    await readNote("2026-10-21");
    await ensureNote("2026-10-21");
    await writeNote("2026-10-21", "hello");

    const calls = getInvokeMock().mock.calls;
    expect(calls[0]).toEqual(["read_note", { date: "2026-10-21" }]);
    expect(calls[1]).toEqual(["ensure_note", { date: "2026-10-21" }]);
    expect(calls[2]).toEqual(["write_note", { date: "2026-10-21", content: "hello" }]);
  });

  it("listNotes returns dates", async () => {
    const tauri = mockInvoke();
    tauri.given("list_notes", ["2026-10-20", "2026-10-21"]);
    await expect(listNotes()).resolves.toEqual(["2026-10-20", "2026-10-21"]);
  });

  it("ollamaStatus and listModels are plain invokes", async () => {
    const tauri = mockInvoke();
    tauri.given("ollama_status", { kind: "Running", version: "0.9.0" });
    tauri.given("list_models", {
      present: [],
      missing: [],
      status: { kind: "NotFound" },
      devChatModel: null,
    });
    await expect(ollamaStatus()).resolves.toEqual({ kind: "Running", version: "0.9.0" });
    await expect(listModels()).resolves.toMatchObject({ devChatModel: null });
  });

  it("generate passes a streaming channel arg; stop_generation takes no args", async () => {
    const tauri = mockInvoke();
    tauri.given("generate", { status: "Done" });
    tauri.given("stop_generation", null);

    const events: unknown[] = [];
    const result = await generate("hello", (e) => events.push(e));
    await stopGeneration();

    expect(result).toEqual({ status: "Done" });
    const calls = getInvokeMock().mock.calls;
    expect(calls[0][0]).toBe("generate");
    const args = calls[0][1] as { prompt: string; onEvent: { __mockChannel: boolean } };
    expect(args).toHaveProperty("prompt", "hello");
    // the streaming channel travels as the `onEvent` arg (Rust: snake_case `on_event`)
    expect(args.onEvent.__mockChannel).toBe(true);
    expect(calls[1]).toEqual(["stop_generation"]);
    // no events were emitted by the mock (correct — they come from Rust)
    expect(events.length).toBe(0);
  });
});
