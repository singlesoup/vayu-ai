// Typed contract between the React UI and the Rust commands (overnight frontend run).
//
// Components must import from this module ONLY for anything that touches the
// filesystem or Ollama — never from `@tauri-apps/api/core` directly, and never
// via `fetch`. Tests mock it (tests may mock this module directly, or mock
// `invoke` through src/test/mocks.ts, as api.test.ts does).
//
// ── CONTRACT FOR THE MORNING RUST WORK ────────────────────────────────────────
// Each command below is described with the exact shape Rust must return.
// Rules that apply to all of them:
//   • Args: JS sends camelCase keys; Tauri maps them onto the Rust function's
//     snake_case parameters by default. Keep that mapping (no `rename_all`).
//   • Errors: return `Err(VayuError)` where `VayuError` is a serde-tagged
//     struct `{ kind: String, message: String }`; `kind` must be one of the
//     ApiError kinds below WITHOUT the "Api" prefix words — literally:
//     InvalidDate, NotADirectory, Io, Busy, NoModel, NotFound, Other.
//     `invoke` then rejects with that JSON; `unwrap on the frontend is a panic
//     in disguise — UI code checks `e.kind`.
//   • Note dates are `YYYY-MM-DD` local dates (src/lib/noteFile.ts builds them).
//     The Rust side must ALSO validate (`YYYY-MM-DD`, real date) and return
//     Err(InvalidDate) for anything else; paths can never escape notes_dir.

import { Channel, invoke } from "@tauri-apps/api/core";
import type { NoteDate } from "./noteFile";

/** Every Rust command name in one place — components never pass raw strings. */
export const COMMANDS = {
  getConfig: "get_config",
  setNotesDir: "set_notes_dir",
  readNote: "read_note",
  ensureNote: "ensure_note",
  writeNote: "write_note",
  listNotes: "list_notes",
  ollamaStatus: "ollama_status",
  listModels: "list_models",
  generate: "generate",
  stopGeneration: "stop_generation",
  /** Task 2.1: hardware check → tier + model + size. */
  hardwareCheck: "hardware_check",
  /** Task 2.4/2.5: resumable model pull via Ollama /api/pull. */
  pullModel: "pull_model",
  /** Task 2.5: cancel an in-flight pull. */
  cancelPull: "cancel_pull",
  /** Task 2.7: post-download verify (one generation + one embedding). */
  verifyInstall: "verify_install",
  /** Task 2.2: persist the tier decision. */
  updateConfig: "update_config",
  /** Task 2.8: per-date done/skipped Morning Intention state. */
  markIntention: "mark_intention",
  /** Task 2.9/2.10: append an intention or task block to a note. */
  appendNote: "append_note",
} as const;

/**
 * Result of `get_config`. `notesDir` is `null` when no valid config exists
 * (no file, or corrupt JSON — Rust renames a corrupt file to `config.bad.json`,
 * see 1.4.1). `defaultNotesDir` is ALWAYS supplied as
 * `<documents dir>\Vayu` (1.4.2 `default_notes_dir`) and is pre-filled on the
 * first-run screen. The config lives in the Tauri app config dir, NEVER inside
 * the notes folder.
 */
export type IntentionRecord = { date: string; status: string };

export type ConfigResult = {
  notesDir: string | null;
  version: number;
  defaultNotesDir: string;
  /** `null` / omitted until the tier screen has been completed. */
  tier?: Tier | null;
  aiEnabled?: boolean | null;
  intention?: IntentionRecord[];
};

/**
 * Result of reading one note: `{ exists: false, content: "" }` when no file
 * exists AND — critically — reading does not create the file. Content is the
 * raw file bytes as UTF-8, byte-for-byte (CRLF preserved, emoji/hindi intact).
 */
export type NoteResult = { exists: boolean; content: string };

/**
 * Ollama reachability (command `ollama_status`, GET `http://127.0.0.1:11434/api/version`):
 * `{ kind: "Running", version: "0.9.1" }` on HTTP 200;
 * `{ kind: "NotFound" }` when refused / non-200 / no reply within 1.5s.
 * Never throws to the UI; never blocks startup.
 */
export type OllamaStatus =
  | { kind: "Running"; version: string }
  | { kind: "NotFound"; reason?: string };

/**
 * Detection of the three PRD models (command `list_models`, GET `/api/tags`).
 * Exact tag matching per plan.md Q6: `gemma3n:e4b`, `gemma3n:e2b`, and
 * `embeddinggemma` (which also matches `embeddinggemma:latest`); quantised
 * variants like `gemma3n:e4b-it-q4_K_M` do NOT count.
 */
export type DetectedModels = {
  present: string[];
  missing: string[];
  status: OllamaStatus; // NotFound when Ollama is down — then present = []
  /** VAYU_DEV_CHAT_MODEL override value, debug builds only; null otherwise. */
  devChatModel: string | null;
};

/** Final outcome of a `generate` run (the promise resolves AFTER the stream finished/stopped). */
export type GenerateOutcome =
  | { status: "Done" }
  | { status: "Stopped" }
  | { status: "Error"; message: string };

/** Hardware tier reported by `hardware_check` (PRD §7). */
export type Tier = "Green" | "Yellow" | "Red";

export type HardwareReport = {
  ramGb: number;
  freeDiskGb: number;
  cpu: string;
  os: string;
  tier: Tier;
  /** Recommended model tag for the tier; `null` on Red. */
  model: string | null;
  /** One-time download size in GB for the recommended model. */
  sizeGb: number;
  ollamaPresent: boolean;
};

export type PullProgress = {
  status: string; // "pulling" | "success" | "error" | "connection lost"
  total?: number;
  completed: number;
  percent?: number;
};

export type PullEvent = { event: "progress"; value: PullProgress };

export type VerifyResult = {
  generationOk: boolean;
  embeddingsOk: boolean;
};

/**
 * Streaming events pushed from Rust while `generate` runs, in order:
 *   `{ event: "token", value: "partial text" }` — one per emitted chunk,
 *   `{ event: "done", value: "" }`              — normal end of stream,
 *   `{ event: "error", value: "connection lost" }` — mid-stream failure; Rust
 *     then resolves the command with Err(Io) as well (UI shows the calm error).
 */
export type StreamEvent = { event: "token" | "done" | "error"; value: string };

export type ApiError = {
  kind:
    | "InvalidDate" // read/ensure/write_note got `../secret`, `2026-10-21.md`, `abc`, …
    | "NotADirectory" // set_notes_dir got a path that is a file (1.4.3)
    | "Io" // filesystem or Ollama failure
    | "Busy" // generate called while another generation is running (1.11.2)
    | "NoModel" // no PRD model installed and no dev override (1.11.2)
    | "NotFound" // reserved for Ollama status payloads (not a rejection)
    | "Other"; // anything unexpected
  message: string;
};

/**
 * `get_config` → `ConfigResult`. Creates nothing; missing or corrupt file → null.
 */
export function getConfig(): Promise<ConfigResult> {
  return invoke<ConfigResult>(COMMANDS.getConfig);
}

/**
 * `set_notes_dir(path)`:
 * 1. validates (missing folder is created, existing folder kept as-is,
 *    a file path is Err(NotADirectory), a folder with .md files is fine and
 *    its files are left untouched — 1.4.3),
 * 2. only on success saves `notesDir` into the app config.
 * Resolves void; rejects with ApiError.
 */
export function setNotesDir(path: string): Promise<void> {
  return invoke<void>(COMMANDS.setNotesDir, { path });
}

/**
 * `read_note(date)` — NEVER creates the file (UI must show the empty state
 * instead and only persist on first save; no file may be created by viewing
 * a day). Rejects Err(InvalidDate) without touching the filesystem.
 */
export function readNote(date: NoteDate): Promise<NoteResult> {
  return invoke<NoteResult>(COMMANDS.readNote, { date });
}

/**
 * `ensure_note(date)` creates `notes_dir/YYYY-MM-DD.md` if missing (empty),
 * and leaves an existing file's content untouched, byte-for-byte.
 */
export function ensureNote(date: NoteDate): Promise<void> {
  return invoke<void>(COMMANDS.ensureNote, { date });
}

/**
 * `write_note(date, content)` — atomic (temp file + rename), writes the exact
 * content including line-ending style; no `.tmp` file left behind. Rejects
 * Err(InvalidDate) for bad dates, writing nothing.
 */
export function writeNote(date: NoteDate, content: string): Promise<void> {
  return invoke<void>(COMMANDS.writeNote, { date, content });
}

/**
 * `list_notes()` → the `YYYY-MM-DD` dates of `*.md` files in notes_dir, sorted
 * ascending. Only files matching the date pattern count; sub-directories,
 * `noteName.md.tmp`, `notes.txt` etc. are ignored.
 */
export function listNotes(): Promise<NoteDate[]> {
  return invoke<NoteDate[]>(COMMANDS.listNotes);
}

/** `ollama_status()` — see OllamaStatus. Cheap, non-blocking, allows re polling. */
export function ollamaStatus(): Promise<OllamaStatus> {
  return invoke<OllamaStatus>(COMMANDS.ollamaStatus);
}

/** `list_models()` — see DetectedModels. Uses the captured `/api/tags` JSON. */
export function listModels(): Promise<DetectedModels> {
  return invoke<DetectedModels>(COMMANDS.listModels);
}

/**
 * `generate(prompt, on_event: Channel<StreamEvent>)`.
 *
 * Rust (1.11.x): opens a streaming POST to `http://127.0.0.1:11434/api/generate`
 * with `"stream": true`, parses NDJSON (multiple lines per chunk supported,
 * split lines re-composed), pushes each token through the channel, ends with
 * `done`. Selects the model in order `gemma3n:e4b` → `gemma3n:e2b` →
 * `VAYU_DEV_CHAT_MODEL` (debug builds only); none available → Err(NoModel).
 *
 *   • rejects Err(Busy) if a second generate runs at the same time,
 *   • server drops mid-stream → `error` event + Err(Io) resolve-with-error sub-handling,
 *   • no first token within timeout → Err(Io, "timed out"),
 *   • every state change is visible in the UI via `StreamEvent`.
 *
 * Resolves with GenerateOutcome once the run is finished/stopped/errored.
 */
export function generate(prompt: string, onEvent: (e: StreamEvent) => void): Promise<GenerateOutcome> {
  const channel = new Channel<StreamEvent>();
  channel.onmessage = onEvent;
  return invoke<GenerateOutcome>(COMMANDS.generate, { prompt, onEvent: channel });
}

/** `stop_generation()` — ends the current generation within ~1s, final state Stopped. */
export function stopGeneration(): Promise<void> {
  return invoke<void>(COMMANDS.stopGeneration);
}

/** `hardware_check(notesDir?)` → HardwareReport (task 2.1). */
export function hardwareCheck(notesDir?: string): Promise<HardwareReport> {
  const args: Record<string, unknown> = {};
  if (notesDir !== undefined) args.notesDir = notesDir;
  return invoke<HardwareReport>(COMMANDS.hardwareCheck, args);
}

/**
 * `pull_model(model, on_event)` → streams `PullEvent` progress while Ollama
 * pulls the model (task 2.4/2.5). Resolves when the pull finishes, fails, or
 * is cancelled.
 */
export function pullModel(
  model: string,
  onEvent: (e: PullEvent) => void,
): Promise<void> {
  const channel = new Channel<PullEvent>();
  channel.onmessage = onEvent;
  return invoke<void>(COMMANDS.pullModel, { model, onEvent: channel });
}

/** `cancel_pull()` — aborts the in-flight pull (task 2.5). */
export function cancelPull(): Promise<void> {
  return invoke<void>(COMMANDS.cancelPull);
}

/**
 * `verify_install(tag)` → VerifyResult (task 2.7): one generation plus one
 * embedding must pass before "You're ready".
 */
export function verifyInstall(tag: string): Promise<VerifyResult> {
  return invoke<VerifyResult>(COMMANDS.verifyInstall, { tag });
}

/**
 * `update_config` — persist a tier decision (task 2.2). Only the fields that
 * changed are sent.
 */
export function updateConfig(patch: {
  tier?: Tier;
  modelTag?: string;
  aiEnabled?: boolean;
}): Promise<void> {
  const args: Record<string, unknown> = {};
  if (patch.tier !== undefined) args.tier = patch.tier;
  if (patch.modelTag !== undefined) args.modelTag = patch.modelTag;
  if (patch.aiEnabled !== undefined) args.aiEnabled = patch.aiEnabled;
  return invoke<void>(COMMANDS.updateConfig, args);
}

/** `mark_intention(date, status)` — done/skipped per date (task 2.8). */
export function markIntention(
  date: NoteDate,
  status: "done" | "skipped",
): Promise<void> {
  return invoke<void>(COMMANDS.markIntention, { date, status });
}

/** `append_note(date, appendix)` — atomic append of an intention/task block (task 2.9/2.10). */
export function appendNote(date: NoteDate, appendix: string): Promise<void> {
  return invoke<void>(COMMANDS.appendNote, { date, appendix });
}
