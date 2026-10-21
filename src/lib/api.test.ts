import { describe, expect, it } from "vitest";
// IMPORTANT: mocks must be imported before ./api so the Tauri invoke mock is
// registered before the real @tauri-apps/api/core module resolves.
import { getInvokeMock, mockInvoke } from "../test/mocks";
import {
  COMMANDS,
  appendNote,
  cancelPull,
  ensureNote,
  generate,
  hardwareCheck,
  listModels,
  listNotes,
  ollamaStatus,
  pullModel,
  readNote,
  setNotesDir,
  stopGeneration,
  updateConfig,
  verifyInstall,
  writeNote,
} from "./api";

describe("api contract (src/lib/api.ts)", () => {
  it("names exactly the Rust commands now.md depends on", () => {
    expect(Object.values(COMMANDS).sort()).toEqual(
      [
        "append_note",
        "cancel_pull",
        "get_config",
        "hardware_check",
        "mark_intention",
        "pull_model",
        "read_note",
        "ensure_note",
        "write_note",
        "list_notes",
        "ollama_status",
        "list_models",
        "generate",
        "stop_generation",
        "set_notes_dir",
        "update_config",
        "verify_install",
      ].sort(),
    );
  });

  it("hardwareCheck calls hardware_check with an optional notes dir", async () => {
    const tauri = mockInvoke();
    tauri.given("hardware_check", {
      ramGb: 8, freeDiskGb: 200, cpu: "x", os: "windows_x64",
      tier: "Yellow", model: "gemma3n:e2b", sizeGb: 5.6, ollamaPresent: true,
    });
    await expect(hardwareCheck()).resolves.toMatchObject({ tier: "Yellow" });
    expect(getInvokeMock().mock.calls[0]).toEqual(["hardware_check", {}]);
    await hardwareCheck("C:/notes");
    expect(getInvokeMock().mock.calls[1]).toEqual(["hardware_check", { notesDir: "C:/notes" }]);
  });

  it("pullModel streams progress events through the channel", async () => {
    const tauri = mockInvoke();
    tauri.given("pull_model", null);
    const events: unknown[] = [];
    await pullModel("gemma3n:e2b", (e) => events.push(e));
    expect(getInvokeMock().mock.calls[0]).toEqual([
      "pull_model",
      { model: "gemma3n:e2b", onEvent: expect.anything() },
    ]);
    expect(events.length).toBe(0); // events come from Rust
  });

  it("cancelPull takes no args", async () => {
    const tauri = mockInvoke();
    tauri.given("cancel_pull", null);
    await cancelPull();
    expect(getInvokeMock().mock.calls[0]).toEqual(["cancel_pull"]);
  });

  it("verifyInstall calls verify_install with the tag", async () => {
    const tauri = mockInvoke();
    tauri.given("verify_install", { generationOk: true, embeddingsOk: true });
    await expect(verifyInstall("gemma3n:e2b")).resolves.toEqual({
      generationOk: true,
      embeddingsOk: true,
    });
    expect(getInvokeMock().mock.calls[0]).toEqual([
      "verify_install",
      { tag: "gemma3n:e2b" },
    ]);
  });

  it("updateConfig sends only the fields that changed", async () => {
    const tauri = mockInvoke();
    tauri.given("update_config", null);
    await updateConfig({ tier: "Green" });
    expect(getInvokeMock().mock.calls[0]).toEqual([
      "update_config",
      { tier: "Green" },
    ]);
  });

  it("appendNote sends date + appendix", async () => {
    const tauri = mockInvoke();
    tauri.given("append_note", null);
    await appendNote("2026-10-21", "\n- [ ] new task");
    expect(getInvokeMock().mock.calls[0]).toEqual([
      "append_note",
      { date: "2026-10-21", appendix: "\n- [ ] new task" },
    ]);
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
