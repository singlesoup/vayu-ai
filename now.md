# NOW — Phase 1B: Visual pass (do this next)

**Day:** Wed 21 Oct 2026
**Current work:** Phase 1B below. Phase 1 behaviour tasks stay as they are; do not reopen them except for the three bugs named in 1B.4.
**Gate:** Screenshot gate (SG-1), then Check-in 1 once Rust exists.
**Goal:** The screens that already exist look like the design board's dark Daily Note. A green test suite is not enough.

Full plan and status: [`plan.md`](plan.md)

**Sources of truth** (if they conflict, the build checklist wins on scope and dates, the PRD wins on product behaviour, the design board wins on visuals):
- Vayu PRD v1 (21 Oct 2026), especially §5.1 Daily Note, §7 Model stack, §8 Design system, §9 Architecture
- Vayu Build Checklist to Oct 24 (the Wed 21 Oct section is this phase)
- Vayu — Design & Architecture Visuals (the design board)

**When stuck** on a UX detail the documents don't cover: check [Focu](https://focu.app/) for AI flows, then [Reflect](https://reflect.app/) for the notes UI. Borrow the feel, never extra scope.

---

## Instructions for the coding agent

### Workflow: test-driven, one task at a time

For **every** task below:

1. **Red:** write the tests listed under *Tests first*. Run them and confirm they fail for the right reason (missing function or behaviour, not a typo or bad import).
2. Commit the failing tests: `test(<id>): <what>`, e.g. `test(1.5.1): note file name from local date`.
3. **Green:** write the smallest code that makes them pass.
4. **Refactor:** clean up with all tests still green.
5. Run `npm run check` (all tests + lint + typecheck). It must be fully green.
6. Commit: `feat(<id>): <what>` (or `fix`/`chore`).
7. Set the task to `review` in the status board below and add one line to the `plan.md` change log.

### Rules

- Work in order. A task can only start when the tasks it depends on are `review` or `verified`.
- Only the verifier sets `verified` or `failed`. A `failed` task goes back to `doing` with the verifier's notes.
- Never weaken, skip, or delete a test to get to green. If a test is wrong, say so in the change log and fix it in its own `test(<id>)` commit.
- Logic that can be pure goes in pure functions with unit tests. Keep UI components thin.
- Filesystem and network access go through Rust commands only. The web UI never calls `fetch` to external hosts.
- Out of scope today: timers or Pomodoro, cloud calls, downloads, tiers, AI features beyond Test AI.
- If blocked or a decision is needed, write it under **Blockers / questions** and move to the next task you can do.

### Definition of Done (applies to every task)

- [ ] Tests were committed before the implementation (`test(<id>)` commit comes before `feat(<id>)`).
- [ ] Every acceptance criterion has an automated test, or is marked **(manual)** with exact steps.
- [ ] `npm run check` is green.
- [ ] No hard-coded colours outside `tokens.css`; no network URLs other than `127.0.0.1:11434`.
- [ ] Status board and `plan.md` change log updated.

---

## Stack (confirmed by owner, 21 Oct)

| Area | Choice |
|---|---|
| Desktop shell | Tauri v2 |
| Web UI | React + TypeScript + Vite |
| Frontend tests | Vitest + React Testing Library (jsdom), with Tauri `invoke` mocked |
| Backend tests | `cargo test` + `tempfile` for filesystem tests, plus a mock HTTP server crate (`wiremock` or `mockito`) for Ollama |
| HTTP to Ollama | Rust (`reqwest`, streaming), sent to the UI through a Tauri channel or events |
| Lint / format | ESLint + Prettier, `cargo fmt` + `cargo clippy` |

Recorded in the `plan.md` Decisions log.

---

## Design reference for Phase 1 (from PRD §8 + design board)

### Colours (the 8 core tokens)

| Token | Hex | Use |
|---|---|---|
| Ink BG | `#0E1116` | App background (dark, default) |
| Surface | `#171B22` | Cards, sidebar |
| Text | `#EDEFF3` | Primary text |
| Muted | `#9BA3AF` | Secondary text, metadata |
| Breeze | `#5EEAD4` | Primary accent, links, everything AI |
| Deep Teal | `#14B8A6` | Pressed / active states, checked checkbox, today in calendar |
| Paper BG | `#FAF9F6` | Light-mode background (light mode is P1, Friday) |
| Warm | `#F5C97A` | Evening Reflection only; must not be used anywhere in Phase 1 |

The design board also uses a few supporting shades, which go in `tokens.css` as named tokens (never inline):
- Border: `#262C36` (dividers), `#2B323E` (card and window borders)
- Unchecked checkbox border: `#4A5261`
- Text on Deep Teal / Breeze: `#06231F`

### Type

| Font | Use | Sizes on the board |
|---|---|---|
| Inter | UI, headings, buttons, task rows | display 34/800, heading 22/700, body 15/400, small 13 (muted) |
| Newsreader | Journal writing (note body); AI prompts in *italic* | ~15.5–21px, line-height 1.5 |
| JetBrains Mono | Dates, `[[links]]`, metadata | 12px |

Font weights to bundle: Inter 400/500/600/700/800 · Newsreader 400/500 + italic 400/500 · JetBrains Mono 400/500.

### Shape and motion

- Radius 12px for cards and windows; no hard square corners (that's TimeBlocks' style).
- 8pt spacing grid: 8, 16, 24, 32, 48.
- Motion: 200ms fade only. Nothing slides, bounces, or spins.

### Daily Note screen layout (dark)

- **Left sidebar** (Surface background, ~168px): the month heading (e.g. "OCTOBER 2026", small caps style), then a Monday-first calendar grid in JetBrains Mono. Today has a Deep Teal background, and days with a note are bold in Text colour. A "Backlinks" section sits below (Phase 3; leave space, don't build it).
- **Main column** (Ink background): the date in JetBrains Mono uppercase (`WED 21 OCT 2026`), the title "Today", the note body in Newsreader, then task rows.
- **Task row:** a 16px checkbox with a 5px radius. Unchecked has a `#4A5261` border. Checked is filled Deep Teal with a ✓, and its text has a line-through at 55% opacity. No timer affordance.
- **AI bar** at the bottom: Phase 3. In Phase 1 the only AI surface is **Test AI** inside Settings → Model.

---

## 1A — Setup and design system

### 1.1 Adopt the design system
- **Owner decision (21 Oct):** use PRD §8 as-is for now; it may be revisited later.
- **Acceptance criteria**
  - AC1: The `plan.md` Decisions log has a row recording PRD §8 as adopted, listing all 8 colours (name + hex), the 3 fonts, the 12px radius, 8pt spacing and 200ms fade. ✅ Done by verifier.
  - AC2: Any later design change touches only `tokens.css` (plus font files) and adds a Decisions log row. No component needs editing to change a colour, font, radius, or spacing value (enforced by 1.3.3).

### 1.2.1 Scaffold the Tauri app
- **Tests first:** none (scaffolding). The test harness comes next in 1.2.2.
- **Do:** create a Tauri v2 + React + TS + Vite app in the repo root. Product name `Vayu`, window title `Vayu`, identifier e.g. `app.vayu.desktop`.
- **Acceptance criteria**
  - AC1: `npm install` then `npm run tauri dev` opens a window titled **Vayu** on Windows. **(manual)**
  - AC2: `cargo check` in `src-tauri` passes.
  - AC3: README "Getting started" lists the install, dev, and test commands.
  - AC4: `.gitignore` covers `node_modules/`, `dist/`, `src-tauri/target/`; `git status` is clean after a build.

### 1.2.2 Test harness and `npm run check`
- **Tests first:** one trivial Vitest test and one trivial `cargo test` test, written before the config. They must fail or not run until the harness is wired.
- **Do:** set up Vitest + Testing Library + jsdom, a shared mock for Tauri `invoke`, ESLint, and Prettier. Add these scripts:
  - `npm test` (Vitest, run once)
  - `npm run test:rust` (`cargo test` in `src-tauri`)
  - `npm run lint`, `npm run typecheck`
  - `npm run check` (runs all of the above and fails if any fails)
- **Acceptance criteria**
  - AC1: `npm run check` exits 0 with both sample tests passing.
  - AC2: Breaking either sample test makes `npm run check` exit non-zero. (Verifier will try it.)
  - AC3: A reusable `mockInvoke` helper exists for component tests.

### 1.2.3 Ink window background (no white flash)
- **Tests first:** a Vitest test that reads `src-tauri/tauri.conf.json` and asserts the main window's `backgroundColor` is `#0E1116`.
- **Acceptance criteria**
  - AC1: The config test passes.
  - AC2: `body` background uses `var(--color-ink)` (or the token's final name).
  - AC3: Launching the app shows no white flash before the UI renders. **(manual)**

### 1.2.4 Lock down network access (CSP)
- **Tests first:** a Vitest test that reads `tauri.conf.json` and asserts:
  - a CSP is set (not `null`)
  - `default-src`, `connect-src`, `font-src`, `img-src`, `script-src` contain no `http(s)://` hosts other than Tauri's own IPC origins
- **Acceptance criteria**
  - AC1: The CSP test passes.
  - AC2: The app still loads in dev and in a release build. **(manual)**

### 1.3.1 Design token file
- **Tests first:** a Vitest test that parses `src/styles/tokens.css` and asserts:
  - the 8 core colour variables exist with these exact values: `--color-ink: #0E1116`, `--color-surface: #171B22`, `--color-text: #EDEFF3`, `--color-muted: #9BA3AF`, `--color-breeze: #5EEAD4`, `--color-deep-teal: #14B8A6`, `--color-paper: #FAF9F6`, `--color-warm: #F5C97A`
  - the supporting shades from the Design reference exist as named tokens
  - font variables: `--font-ui` (Inter), `--font-body` (Newsreader), `--font-mono` (JetBrains Mono)
  - type sizes: `--text-display: 34px`, `--text-heading: 22px`, `--text-body: 15px`, `--text-small: 13px`, `--text-mono: 12px`
  - `--radius: 12px`
  - spacing: `--space-1: 8px`, `--space-2: 16px`, `--space-3: 24px`, `--space-4: 32px`, `--space-6: 48px`
  - `--motion-fade: 200ms`
- **Acceptance criteria**
  - AC1: Token test passes.
  - AC2: `tokens.css` is the only file that defines colours.
  - AC3: Nothing outside `tokens.css` refers to `--color-warm` in Phase 1 (covered by a test).

### 1.3.2 Bundle fonts locally
- **Tests first:** Vitest tests that assert:
  - every `@font-face` `src` points to a local file that exists in the repo
  - no CSS file contains `http://` or `https://`
- **Acceptance criteria**
  - AC1: Tests pass. The `.woff2` files for the weights listed in the Design reference are committed with their licence files (all three fonts are SIL OFL).
  - AC2: With Wi-Fi off, the app shows the correct fonts. **(manual)**

### 1.3.3 Guard against hard-coded colours
- **Tests first:** a Vitest test that scans `src/**/*.{css,ts,tsx}` (except `tokens.css` and test files) for hex colours, `rgb(`, `rgba(`, `hsl(`, and named colours in style props, then fails with the file and line.
- **Acceptance criteria**
  - AC1: The guard passes on the current code.
  - AC2: Adding `color: #fff` to any component makes `npm run check` fail. (Verifier will try it.)

### 1.3.4 Dev-only token test page
- **Tests first:** a component test that renders `<TokenPage />` and asserts one swatch per colour token (showing name + hex), one sample per font, and examples of the radius and spacing tokens.
- **Acceptance criteria**
  - AC1: The test passes.
  - AC2: The page opens in dev (e.g. `?dev=tokens` or a dev menu). **(manual)**
  - AC3: The page isn't reachable in the release build (gated by `import.meta.env.DEV`); a test covers the gate.

### 1.4.1 Config storage (Rust)
- **Tests first:** `cargo test`, using a temp dir as the config dir:
  - `load_config` with no file → `None`
  - `save_config` then `load_config` → same `notes_dir`
  - corrupt JSON → `None` (no panic); the corrupt file is renamed to `config.bad.json` rather than overwritten
- **Do:** a `config.json` in the Tauri app config dir with `{ "notesDir": "...", "version": 1 }`. Expose `get_config` / `set_notes_dir` commands.
- **Acceptance criteria**
  - AC1: All three tests pass.
  - AC2: The config is stored in the app's config dir, never inside the notes folder.

### 1.4.2 Default notes folder
- **Tests first:** `default_notes_dir(documents_dir)` returns `<documents>\Vayu`.
- **Acceptance criteria**
  - AC1: The test passes. The default is shown pre-filled on the first-run screen (1.4.4).

### 1.4.3 Validate the chosen folder (Rust)
- **Tests first:** `cargo test` with temp dirs:
  - a missing folder is created → `Ok`
  - an existing empty folder → `Ok`
  - a path that is a file → `Err(NotADirectory)`
  - a folder that already contains `.md` files → `Ok` and the files are not touched
- **Acceptance criteria**
  - AC1: All tests pass. `set_notes_dir` validates before saving and never saves an invalid path.

### 1.4.4 First-run folder screen
- **Tests first:** component tests with mocked `invoke`:
  - no config → the folder screen shows with the default path
  - config present → the folder screen doesn't show; the app goes to today's note
  - "Choose folder…" uses the Tauri dialog plugin (mocked) and updates the path
  - "Continue" calls `set_notes_dir`; on error, a plain message shows and the screen stays
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: Delete `config.json`, relaunch → the screen shows again. **(manual)**
  - AC3: Choose a folder, restart → the same folder is used. **(manual)**

---

## 1B — Daily note and storage

### 1.5.1 Date → note file name (pure)
- **Tests first:** Vitest for `noteFileName(date: Date): string`:
  - `2026-10-21` local → `"2026-10-21.md"` (zero-padded month and day)
  - local midnight edge: `new Date(2026, 9, 21, 0, 30)` → `"2026-10-21.md"` (uses **local** date, not UTC; matters in IST)
  - year boundary: 31 Dec 23:59 and 1 Jan 00:00
  - `isNoteDate("2026-10-21")` is true; `"2026-13-01"`, `"../x"`, `"2026-1-1"` are false
- **Acceptance criteria**
  - AC1: All tests pass. This function is the only place file names are built in the UI.

### 1.5.2 Read and create notes (Rust)
- **Tests first:** `cargo test` in a temp notes dir:
  - `read_note("2026-10-21")` with no file → `{ exists: false, content: "" }` and **no file is created**
  - `ensure_note("2026-10-21")` creates an empty `2026-10-21.md`; calling it again doesn't change existing content
  - `read_note` returns content byte-for-byte (UTF-8 incl. Hindi text and emoji)
  - invalid dates (`"../secret"`, `"2026-10-21.md"`, `"abc"`) → `Err(InvalidDate)`, no filesystem access
- **Acceptance criteria**
  - AC1: All tests pass. Paths can never escape the notes folder.

### 1.5.3 Write notes safely (Rust)
- **Tests first:** `cargo test`:
  - `write_note(date, content)` then `read_note` → identical content (incl. CRLF/LF exactly as given, Unicode)
  - the write is atomic (temp file + rename): after a successful write, no `.tmp` file is left behind
  - a write with an invalid date → `Err`, nothing written
- **Acceptance criteria**
  - AC1: All tests pass.
  - AC2: Open the `.md` in Notepad after typing → it matches exactly. **(manual)**

### 1.5.4 Open to today on launch, and handle a new day
- **Tests first:** component tests with a mocked clock and mocked `invoke`:
  - on launch → `ensure_note(today)` then `read_note(today)`; the editor shows that content
  - the header shows the date in JetBrains Mono uppercase (`WED 21 OCT 2026`) above the title "Today"; for other days the title is the weekday and date
  - the window title is `Vayu — Today` on today's note
  - the app is open over midnight, then the window regains focus → it switches to the new day and creates that file
  - startup does **not** wait for Ollama: with the Ollama status mock never resolving, the note still renders
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: Cold start to editable note in under 2s on the dev PC. **(manual: time it 3 times)**

### 1.6.1 Editor component
- **Tests first:** component tests:
  - renders the note content and updates on typing
  - uses the body font token (`--font-body`, Newsreader); layout is a single column with a max width from tokens
- **Do:** pick the editor approach (plain textarea, or CodeMirror/TipTap with Markdown output) and record it in the Decisions log. The file on disk must always be plain Markdown.
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: The text the user types is exactly what's written to disk (no added markup or reformatting).

### 1.6.2 Debounced autosave
- **Tests first:** fake timers:
  - typing calls no `write_note` before the debounce delay (e.g. 800ms)
  - one `write_note` after the delay, with the latest content
  - 10 quick keystrokes → exactly one save with the final text
  - a save error shows a calm "Couldn't save — retrying" note and retries; it doesn't lose the text
- **Acceptance criteria**
  - AC1: Tests pass.

### 1.6.3 Save on close and on switching day
- **Tests first:**
  - a pending (unsaved) change is flushed when the window close event fires, before the window closes
  - switching to another day flushes the current day first, and the edit never lands in the wrong file
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: Type, then close the window right away (X or Alt+F4) → relaunch → all text is there. **(manual)**
  - AC3: Type, then kill the process in Task Manager → at most the last debounce window (<1s) of typing is lost. **(manual)**

### 1.7.1 List existing notes (Rust)
- **Tests first:** `list_notes()` in a temp dir:
  - returns the dates of files named `YYYY-MM-DD.md`, sorted
  - ignores other files (`notes.txt`, `2026-10-21.md.tmp`, `random.md`, folders)
- **Acceptance criteria**
  - AC1: Tests pass.

### 1.7.2 Calendar sidebar
- **Tests first:** component tests:
  - shows the current month heading and a **Monday-first** grid (October 2026 starts on Thursday, so 3 blank cells come first)
  - today is highlighted (Deep Teal); days that have a note are marked (bold, Text colour)
  - prev/next month navigation works
  - clicking a day loads that day's note
  - yesterday is reachable in 1 click (PRD §5.1)
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: Clicking 3 different dates opens the matching files. **(manual)**

### 1.7.3 Empty state for days without a note
- **Tests first:**
  - selecting a date with no file shows an empty state ("Nothing written on this day yet") and does **not** create a file
  - typing on that day creates the file on first save
  - future dates work the same way
- **Acceptance criteria**
  - AC1: Tests pass. Browsing the calendar never creates empty files.

### 1.8.1 Parse tasks from Markdown (pure)
- **Tests first:** `parseTasks(md)` returns `{ line, text, done }[]`:
  - `- [ ] a` → not done, `- [x] b` and `- [X] b` → done
  - `* [ ] c` and indented tasks are recognised
  - lines inside fenced code blocks are ignored
  - normal bullets and text are ignored
- **Acceptance criteria**
  - AC1: Tests pass.

### 1.8.2 Task edits (pure)
- **Tests first:** each returns new Markdown and leaves **every other line unchanged byte-for-byte**:
  - `toggleTask(md, line)` flips `[ ]` ↔ `[x]`
  - `addTask(md, text)` adds `- [ ] text` (at the end of the existing task block, or at the end of the note)
  - `editTask(md, line, text)` changes only the text
  - `deleteTask(md, line)` removes only that line
  - an out-of-range line or a non-task line → note unchanged
- **Acceptance criteria**
  - AC1: Tests pass.

### 1.8.3 Task UI
- **Tests first:** component tests:
  - task lines render as checkboxes with their text
  - a checked task has the done style (struck through, reduced opacity) and its checkbox is checked (`aria-checked`)
  - clicking a checkbox calls `toggleTask` and triggers a save
  - add (type + Enter), edit, and delete work and trigger a save
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: Check a box in Vayu → open the `.md` in Notepad → the line shows `- [x]`. **(manual)**
  - AC3: Edit a task line in Notepad → reopen the day in Vayu → the change shows. **(manual)**

### 1.8.4 No-timer guard
- **Tests first:** a test that renders the app shell (with mocks) and asserts there's no element whose text or label matches `/pomodoro|timer|countdown|start focus/i`.
- **Acceptance criteria**
  - AC1: Test passes.

---

## 1C — Ollama handshake

### 1.9.1 Ollama status (Rust)
- **Tests first:** `cargo test` against a mock HTTP server:
  - `200` on `/api/version` → `Running { version }`
  - connection refused → `NotFound`
  - no reply within 1.5s → `NotFound` (timeout respected)
  - `500` → `NotFound` with a reason, no panic
- **Do:** the base URL defaults to `http://127.0.0.1:11434` and can be overridden for tests.
- **Acceptance criteria**
  - AC1: Tests pass. The command never blocks app startup.

### 1.9.2 Settings → Model: status
- **Tests first:** component tests:
  - shows "Running" or "Not found" from the mocked command
  - "Refresh" calls the command again and updates the label
  - while Settings is open, status is re-checked every ~5s (fake timers); polling stops when Settings closes
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: Quit Ollama with Settings open → the label changes to Not found within ~5s or after a Refresh, with no crash. Start Ollama again → back to Running. **(manual)**

### 1.10.1 Detect installed models (Rust)
- **Tests first:** using a captured `/api/tags` JSON fixture:
  - reports `gemma3n:e4b`, `gemma3n:e2b`, `embeddinggemma` as present/missing
  - `embeddinggemma:latest` counts as `embeddinggemma`; `gemma3n:e4b-it-q4_K_M` does **not** count as `gemma3n:e4b` unless the PRD says so (record the decision)
  - Ollama not running → all missing + `NotFound`, no error thrown to the UI
- **Acceptance criteria**
  - AC1: Tests pass.

### 1.10.2 Settings → Model: model list
- **Tests first:** component test: shows the 3 models with Present/Missing, and **no download button** (downloads are Phase 2).
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: The list matches `ollama list` on the dev PC. The dev PC currently has only `gemma4-e4b-fast:latest`, so all three PRD models should show **Missing**, and the dev chat model (see 1.11.2) shows separately as "Dev model: gemma4-e4b-fast:latest". **(manual)**

### 1.11.1 Streaming reply parser (Rust)
- **Tests first:** pure tests for the NDJSON stream parser:
  - several JSON lines in one chunk → several tokens, in order
  - one JSON line split across two chunks → parsed once, correctly
  - a `"done": true` line ends the stream
  - an `{"error": "..."}` line → error event
- **Acceptance criteria**
  - AC1: Tests pass.

### 1.11.2 Generate, Stop, and one-at-a-time (Rust)
- **Tests first:** against a mock server that streams slowly:
  - tokens reach the channel/event as they arrive (not all at the end)
  - `stop_generation` ends the stream within 1s, and the final state is `Stopped`
  - a second `generate` while one is running → `Err(Busy)`
  - the server dropping the connection mid-stream → `Error("connection lost")`, no panic
  - no first token within the timeout (e.g. 60s, configurable for tests) → `Error("timed out")` (PRD §9: every call has a timeout and a visible Stop)
- **Do:** Test AI picks its chat model in this order: `gemma3n:e4b`, then `gemma3n:e2b`, then a **dev-only override** from the `VAYU_DEV_CHAT_MODEL` environment variable (on the owner's PC: `gemma4-e4b-fast:latest`). If none is available → a clear `NoModel` result. The override is ignored in release builds.
- **Extra tests first:** model selection prefers E4B over E2B over the override; the override is used only when set and only in debug builds; nothing installed + no override → `NoModel`.
- **Acceptance criteria**
  - AC1: Tests pass.

### 1.11.3 Test AI UI
- **Tests first:** component tests with a mocked channel:
  - clicking "Test AI" shows a "thinking" state until the first token
  - tokens append live as they arrive
  - the button is disabled while running; "Stop" is shown and calls `stop_generation`
  - error → a calm message (e.g. "Vayu couldn't reach the local AI. Your notes are safe."), and the button is enabled again
  - `NoModel` → a plain message saying no model is installed yet
- **Acceptance criteria**
  - AC1: Tests pass.
  - AC2: On the dev PC the reply visibly streams word by word; Stop halts it within ~1s. **(manual)**
  - AC3: Quit Ollama mid-reply → the calm error shows, the app stays usable. **(manual)**

---

## 1D — Check-in 1 (verifier runs this with the owner)

**Before:** all tasks above are `review` or `verified`, and `npm run check` is green on a clean clone.

**Script:**
1. Fresh clone → `npm install` → `npm run check` (green) → `npm run tauri dev`.
2. Write a real note for today and add 3 tasks; check one.
3. Close the app, reopen → note and tasks are there. Open the `.md` in Notepad → it matches, and the checked task shows `- [x]`.
4. Open 2 other days from the calendar; confirm an empty day creates no file.
5. Settings → Model: Ollama Running, E4B Present.
6. Run Test AI → streams; press Stop → stops.
7. Quit Ollama → status shows Not found, no crash. Start it again → Running.

**Pass:** every step works with no crash.
**On pass:** verifier marks CI-1 `verified`; commit and tag `checkin-1`.
**On fail:** Thursday morning is fix-only until this passes.

---

## Phase 1B — Visual pass

**Reference:** the dark Daily Note on the design board (`Vayu — Design & Architecture Visuals.html`, section "The Daily Note — the home screen", DARK — DEFAULT). Reflect is the feel for spacing and calm. Do not add features. Do not use Warm (`#F5C97A`) anywhere.

**Do not** add a fake backend or a `?preview=` data mode. Style the real components. The verifier will open `npm run dev` and compare screenshots.

### 1B.1 Styles must actually load
- **Tests first:** a test that fails unless `src/main.tsx` (or `App.tsx`) imports `./App.css`.
- **Acceptance**
  - AC1: That import test passes.
  - AC2 **(manual, screenshot):** in the running app, the notes-folder input is not a default white browser box. It uses Surface background, Text colour, and the card border token.

### 1B.2 Fonts must render
- **Fix:** move every `@font-face` block in `tokens.css` to sit **outside** `:root`. Nested `@font-face` is invalid and browsers ignore it.
- **Tests first:** parse `tokens.css` and assert no `@font-face` appears between `:root {` and its matching close. The existing "file contains url()" test is not enough.
- **Acceptance**
  - AC1: The new test passes, and the old font-file tests still pass.
  - AC2 **(manual, screenshot):** the heading renders in Inter and the note body in Newsreader, with Wi-Fi off.

### 1B.3 Match the design board (dark)
Restyle only. Keep the existing behaviour.

**First-run**
- Centered Surface card, 12px radius, Ink page behind it.
- Heading in Inter. Body copy in the muted token. Path field in JetBrains Mono.
- Primary action ("Continue") is a Breeze pill (`#5EEAD4` background, `#06231F` text). "Choose folder…" is a ghost button (border token, no fill).
- No default grey browser buttons.

**Daily Note (the home screen)**
- Two columns: Surface sidebar on the left, Ink main column on the right. At a wide window they sit side by side. Below ~700px the sidebar stacks above the note (that is fine).
- Sidebar heading like `OCTOBER 2026`, small and muted. Monday-first calendar in JetBrains Mono. Today has a Deep Teal background and `#06231F` text. Days with a note are bold in the Text colour. Empty days are Muted.
- Date line above the title: JetBrains Mono, 12px, uppercase, Muted (`WED 21 OCT 2026`). Title "Today" in Inter.
- Note body in Newsreader, about 16px, line-height 1.5, in a single column (max width stays the token).
- Task row: 16px checkbox, 5px radius. Unchecked border is the checkbox token. Checked fill is Deep Teal with a check mark. Done text is struck through at about 55% opacity. No timer control.
- Settings gear is quiet (Muted), top of the window, not a default browser button.
- Settings panel is a Surface card with 12px radius. Text uses the tokens. Test AI's primary button is a Breeze pill.

**Acceptance**
- AC1: No new hard-coded colours (the colour guard stays green). No `var(--color-warm)` outside `tokens.css`.
- AC2 **(manual, screenshot):** verifier opens the app next to the design board and can point at sidebar, today cell, date line, title, body font, and a checked task and say each one matches. Native grey buttons anywhere on these screens = fail.

### 1B.4 Bugs found in verification (fix in the same pass)
- Calendar week rows in `Calendar.tsx` share one React `key`. Use a unique key per week.
- Remove the `console.log` in the `TestAi.tsx` catch.
- **Acceptance:** both are gone, and `npm run check` is green.

### SG-1 — Screenshot gate (verifier)

The coding agent sets 1B.1–1B.4 to `review` and stops. The verifier:

1. Runs `npm run dev` and opens the first-run screen.
2. Opens the Daily Note (after a notes folder is set, or on the dev build once Rust can skip first-run).
3. Opens Settings.
4. Puts each screenshot beside the design board's dark Daily Note.
5. Marks SG-1 `verified` only if AC2 of 1B.3 passes. Otherwise marks the failed task `failed` with the screenshot note.

---

## Status board

| ID | Task | Depends on | Status | Verifier notes |
|---|---|---|---|---|
| 1.1 | Adopt design system | — | verified | Decisions log + colour guard AC2 re-checked by verifier (injected `#fff` → test failed with file:line, then restored) |
| 1.2.1 | Scaffold Tauri app | — | review | Scaffold present (`app.vayu.desktop`, title Vayu). AC1/AC2 blocked on Rust. AC3/AC4 OK |
| 1.2.2 | Test harness + `npm run check` | 1.2.1 | verified | Verifier ran `npm run check`: lint+tsc green, **124/124 tests**, Rust prints `SKIPPED: cargo not installed`. mockInvoke in `src/test/mocks.ts` |
| 1.2.3 | Ink window background | 1.2.2 | verified | Config + body token OK. AC3 (no white flash on launch) still (manual) after Rust |
| 1.2.4 | CSP / network lockdown | 1.2.2 | verified | Strict CSP/devCsp; no remote hosts. AC2 (app loads) still (manual) after Rust |
| 1.3.1 | Design token file | 1.2.2 | verified | All 8 colours + supporting + type/shape/motion match PRD. Gap: AC3 claimed a `--color-warm` *usage* ban test — colour guard only bans hard-coded hex/rgb/named colours, not `var(--color-warm)`. State is OK (nothing uses Warm); add the usage assert later |
| 1.3.2 | Bundle fonts locally | 1.3.1 | failed | Files + licences present (11 woff2, 3 OFL). **Bug:** every `@font-face` is nested inside `:root { }` in `tokens.css` — invalid CSS, browsers ignore nested `@font-face`, so fonts will not load. Fix: move all `@font-face` blocks above/outside `:root`. String-matching tests still pass (they don't parse CSS) |
| 1.3.3 | Hard-coded colour guard | 1.3.1 | verified | Verifier confirmed AC2: temp `color: #fff` in `App.css` → check fails with `App.css: line …: hex colour`; restored clean |
| 1.3.4 | Dev token page | 1.3.1 | verified | Component + DEV gate tests pass. Visual (manual) after Rust/`npm run dev` |
| 1.4.1 | Config storage | 1.2.2 | todo | Blocked: Rust not installed |
| 1.4.2 | Default notes folder | 1.4.1 | todo | Blocked: Rust not installed |
| 1.4.3 | Validate folder | 1.4.1 | todo | Blocked: Rust not installed |
| 1.4.4 | First-run folder screen | 1.4.2, 1.4.3 | review | UI + mocked tests OK. Real dialog + config persistence need Rust (+ `tauri_plugin_dialog`) |
| 1.5.1 | Date → file name | 1.2.2 | verified | Local-date helpers; only builder in the UI |
| 1.5.2 | Read / create notes | 1.4.1, 1.5.1 | todo | Blocked: Rust not installed |
| 1.5.3 | Safe note writes | 1.5.2 | todo | Blocked: Rust not installed |
| 1.5.4 | Open to today + new day | 1.4.4, 1.5.3 | review | UI/mocks OK (`ensure` only when `create`/`isToday`). Real open + <2s timing need Rust |
| 1.6.1 | Editor component | 1.5.4 | review | Plain textarea + Newsreader column OK. Disk byte-fidelity needs Rust |
| 1.6.2 | Debounced autosave | 1.6.1 | review | Autosaver + wiring tests OK. Real disk writes need Rust |
| 1.6.3 | Save on close / day switch | 1.6.2 | review | Flush wiring + degrade-without-runtime OK. Force-close / kill-process ACs need Rust |
| 1.7.1 | List notes | 1.5.2 | todo | Blocked: Rust not installed |
| 1.7.2 | Calendar sidebar | 1.7.1, 1.6.3 | failed | Monday-first math + UI tests OK, but **bug:** in `Calendar.tsx` every week row uses the same React `key={view.year * 12 + view.month}` — duplicate keys across weeks. Fix: `key={i}` (or year-month-week). Then back to review until Rust for AC2 |
| 1.7.3 | Empty-day state | 1.7.2 | review | Placeholder + editable empty day OK in tests. Real "no phantom files" needs Rust |
| 1.8.1 | Parse tasks | 1.2.2 | verified | Fences skipped; `- [ ]`/`- [x]`/`* [ ]` |
| 1.8.2 | Task edits | 1.8.1 | verified | Pure toggle/add/edit/delete; other lines unchanged |
| 1.8.3 | Task UI | 1.8.2, 1.6.2 | review | Panel + save wiring OK. Notepad round-trip ACs need Rust |
| 1.8.4 | No-timer guard | 1.8.3 | verified | Guard-only task; test green on absence of timer UI |
| 1.9.1 | Ollama status | 1.2.2 | todo | Blocked: Rust not installed |
| 1.9.2 | Settings: status | 1.9.1 | review | UI/poll/refresh tests OK. Real Ollama status needs Rust |
| 1.10.1 | Detect models | 1.9.1 | todo | Blocked: Rust not installed |
| 1.10.2 | Settings: model list | 1.10.1, 1.9.2 | review | Present/Missing + dev line, no download UI. Real `ollama list` match needs Rust |
| 1.11.1 | Stream parser | 1.2.2 | todo | Blocked: Rust not installed |
| 1.11.2 | Generate / Stop / busy | 1.11.1, 1.10.1 | todo | Blocked: Rust not installed |
| 1.11.3 | Test AI UI | 1.11.2 | review | UI tests OK. Polish before verify: remove debug `console.log` in `TestAi.tsx` catch. Streaming/Stop/Ollama-kill ACs need Rust |
| CI-1 | Check-in 1 | all above | todo | Blocked until Rust + Phase 1B screenshot gate + manual checklist |
| api | Typed command contract (`src/lib/api.ts`) | — | verified | Contract + tests OK; is the morning Rust spec |
| 1B.1 | Import App.css | — | review | Styles exist but `main.tsx` never imports them |
| 1B.2 | Fonts render | 1.3.2 | review | `@font-face` is nested inside `:root` |
| 1B.3 | Restyle to design board | 1B.1, 1B.2 | doing | First-run, Daily Note, calendar, tasks, Settings |
| 1B.4 | Calendar keys + Test AI log | — | todo | |
| SG-1 | Screenshot gate | 1B.1–1B.4 | todo | Verifier only |

---

## Session notes (coding agent writes here at the end of each session)

_Newest first: what got done, what's blocked, manual steps waiting for the verifier, what to start next._

### Verifier pass — 2026-10-21 midday

**Ran:** `npm run check` → 124/124 tests, lint+tsc green, Rust SKIPPED. Colour guard AC2 re-tested (temp `#fff` fails, restore passes). Git history shows clean TDD for almost every task (`test` commit before `feat`).

**Actually verified:** 1.1, 1.2.2, 1.2.3, 1.2.4, 1.3.1, 1.3.3, 1.3.4, 1.5.1, 1.8.1, 1.8.2, 1.8.4, api.

**Failed (fix before morning Rust / before treating UI as done):**
1. **1.3.2** — move all `@font-face` blocks outside `:root` in `src/styles/tokens.css`.
2. **1.7.2** — unique React keys on calendar week rows (`key={i}`).
3. **1.11.3 polish** — remove `console.log` in `TestAi.tsx` catch.
4. **App.css is never imported** (`main.tsx` imports only `tokens.css`). All layout styles (calendar rail, buttons, inputs, Settings, note column) are dead code; `Editor.test.tsx` reads the file as text, so tests pass anyway. Same failure pattern as the fonts: tests checked file contents, not what renders.

**Not done (cannot claim Check-in 1):** no real window, no real `.md` files, no real Ollama. All of that waits on Rust install + the blocked Rust tasks.

---

### Overnight run — 2026-10-21 (Phase 1 frontend complete)

**Final state:** `npm run check` green — **124 tests across 23 test files** (Vitest + jsdom), ESLint clean, tsc clean, Rust step SKIPPED (scripts/run-rust.mjs: `cargo` not installed). Branch `main`, all work committed locally (no push, no tag); working tree clean. The last commits of the run are these very tracker/notes doc updates — see `git log --oneline -10` for the exact tail.

**Tasks reviewed this session (all TDD: failing tests → `test(<id>)` commit → implementation → `feat(<id>)` → check green → status boards + plan.md change log):**
- 1.6.2 debounced autosave (`createAutosaver`, 800ms, retry keeps text), 1.6.3 save on close/day switch (`onWindowClose` + unmount flush)
- 1.7.2 calendar sidebar (Monday-first grid, today highlight, note marks, day-click), 1.7.3 empty days editable (first save creates the file)
- 1.8.3 task UI (toggle/edit/add/delete rewrite the note and ride the autosave), 1.8.4 no-timer guard test
- 1.9.2 Settings → Model status (Running/Not found, Refresh, 5s poll), 1.10.2 model list (3 PRD models Present/Missing, dev model line, no download UI), 1.11.3 Test AI UI (thinking → streaming tokens, Stop, calm errors, NoModel message)

**Still `todo` / blocked (Rust, ~morning work):** 1.2.1/1.2.2 cargo-check, 1.4.1–1.4.3, 1.5.2/1.5.3, 1.7.1, 1.9.1, 1.10.1, 1.11.1/1.11.2. The UI side of every one of them is already done against the typed contract in `src/lib/api.ts` (header comments = the spec).

**Morning Rust order (sequential):**
1. Install Rust toolchain + tauri-cli prerequisites; run `cargo check` in `src-tauri/` (1.2.1/1.2.2 → review).
2. 1.4.1 config storage → 1.4.2 default folder (`get_config` must return `{ notesDir, version, defaultNotesDir }` = `<documents>\Vayu` — contract decision recorded in Decisions + api.ts) → 1.4.3 validate folder.
3. Add `tauri_plugin_dialog` (`.plugin(tauri_plugin_dialog::init())`) — required by FirstRunScreen's "Choose folder…".
4. 1.5.2 ensure/read notes → 1.5.3 atomic writes (`write_note` creates the file) → 1.7.1 `list_notes`.
5. 1.9.1 `ollama_status` (1.5s timeout) → 1.10.1 `list_models` (exact tag match; see Blockers) → `npm run tauri dev` and smoke-test the full manual checklist below.
6. 1.11.1 stream parser → 1.11.2 generate/stop (model preference e4b → e2b → `VAYU_DEV_CHAT_MODEL` debug-only override).

**Verifier manual checklist (run after Rust works, in this order):**
1. `npm install` → `npm run check` → expect tests 124 passed, `SKIPPED: cargo not installed` line GONE (Rust step runs).
2. `npm run tauri dev` → window "Vayu", Ink background, calendar left, note right. First-run screen shows default folder; install to it (or pick a folder via the dialog).
3. Type in today's note → check the `.md` in Notepad ≤ ~1s later (autosave). It matches exactly what you typed.
4. Type and immediately close the window (Alt+F4) → reopen → text is there (1.6.3 AC2). Kill the process in Task Manager instead → at most the last debounce window (<1s) is lost (AC3).
5. Click 3 different calendar days → the matching `YYYY-MM-DD.md` opens; an empty past/future day shows the placeholder, creates NO file; type there → the file appears on first save.
6. Add a task, tick a checkbox → Notepad shows `- [x]`; the reply streams over ~1s (AC2) and mids-quit survives (AC3).
7. Settings (gear ⚙): Ollama running → "Running — Ollama vX"; the three PRD models Present/Missing as `ollama list` says; NO download buttons.
8. Run Test AI → streams; press Stop → halts ~instantly; quit Ollama → calm error, app still usable; status → Not found within ~5s or on Refresh.
9. Colour guard sanity: add `color: #fff` to any component → `npm run check` goes red with file+line; remove it again.
10. When every step passes, mark CI-1 `verified` (only the verifier may), commit and tag `checkin-1`.

**New decisions logged (see plan.md Decisions/change log):** autosave option named `onSaved`; onWindowClose degrades to a no-op without a Tauri runtime; `--width-calendar-rail: 240px` + `--space-half: 4px` tokens added; calendar rail width and note column width are agent-picked (flagged in Blockers).

---

## Blockers / questions

- **Note column width (1.6.1):** the design board doesn't give a single-column note width. Took `--width-note-column: 680px` in tokens.css (Reflect-like proportions); change it there in one place if the owner disagrees.
- **Model tag matching (1.10.1):** confirm whether quantised variants like `gemma3n:e4b-it-q4_K_M` should count as E4B. Default: exact tag match, plus `:latest` for `embeddinggemma`.
- **App name:** PRD §13 says the name may change (the vayu.ai domain isn't owned). Keep the product name in one place (Tauri config + one UI constant) so a rename is a one-line change.
