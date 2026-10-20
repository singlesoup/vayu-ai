# NOW — Phase 1: Foundation + Walking Skeleton

**Day:** Wed 21 Oct 2026
**Gate:** Check-in 1 (tonight)
**Goal:** Vayu opens to today's note, saves it as a real `.md` file, and can stream a reply from Ollama. The UI only needs the design tokens, not polish.

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

## Status board

| ID | Task | Depends on | Status | Verifier notes |
|---|---|---|---|---|
| 1.1 | Adopt design system | — | review | AC1 done 21 Oct; AC2 checked via 1.3.3 |
| 1.2.1 | Scaffold Tauri app | — | review | UI scaffold done; `cargo check` + window launch pending Rust install |
| 1.2.2 | Test harness + `npm run check` | 1.2.1 | review | `npm run check` green; Rust step prints `SKIPPED: cargo not installed` |
| 1.2.3 | Ink window background | 1.2.2 | review | config test in `src/tauri-config.test.ts`; body bg = `var(--color-ink)` via new `src/styles/tokens.css`; no-white-flash launch is (manual) pending Rust |
| 1.2.4 | CSP / network lockdown | 1.2.2 | review | strict `csp` + `devCsp` in `src/tauri.conf.json` (`devCsp` only adds `'unsafe-inline'` scripts + `ws:` for the Vite/React-refresh preamble). App-loads-in-dev/release is (manual) pending Rust |
| 1.3.1 | Design token file | 1.2.2 | review | all tokens asserted in `src/styles/tokens.test.ts`; only colour definitions in `src/styles/tokens.css` (`--color-warm` defined but its use anywhere outside tokens.css is banned and guarded in 1.3.3) |
| 1.3.2 | Bundle fonts locally | 1.3.1 | review | 11 woff2 (latin subset) + 3 OFL licences in `src/assets/fonts/`, wired via @font-face in `tokens.css`; "correct fonts with Wi-Fi off" is (manual) pending Rust |
| 1.3.3 | Hard-coded colour guard | 1.3.1 | review | guard test `src/styles/colours.test.ts` (+ keyword list file); a temp `#fff` + named colour in a component previously made it fail with file+line; AC2 (verifier) can re-add `color: #fff` anywhere to see `check` go red |
| 1.3.4 | Dev token page | 1.3.1 | review | `src/components/TokenPage.tsx` + `tokenData.ts` + `src/tokenPageGate.ts` (AC3 gate helper tests); opens at `?dev=tokens` in dev — (manual) visual check pending Rust |
| 1.4.1 | Config storage | 1.2.2 | todo | Blocked: Rust not installed |
| 1.4.2 | Default notes folder | 1.4.1 | todo | Blocked: Rust not installed |
| 1.4.3 | Validate folder | 1.4.1 | todo | Blocked: Rust not installed |
| 1.4.4 | First-run folder screen | 1.4.2, 1.4.3 | review | UI only — Rust side pending. Tests in `src/components/FirstRunScreen.test.tsx` + `src/App.test.tsx`; dialog mocked; AC2/AC3 (manual) pending Rust |
| 1.5.1 | Date → file name | 1.2.2 | review | `src/lib/noteFile.ts` (`noteFileName`, `isNoteDate`, plus `noteDateToDate` for parsing validated dates — local-time based) |
| 1.5.2 | Read / create notes | 1.4.1, 1.5.1 | todo | |
| 1.5.3 | Safe note writes | 1.5.2 | todo | |
| 1.5.4 | Open to today + new day | 1.4.4, 1.5.3 | review | UI only — Rust side pending. Launch/ensure/read/title/midnight-refocus/non-blocking tests in `src/AppWorkspace.test.tsx` + `src/components/DailyNote.test.tsx`; AC2 timing is (manual) |
| 1.6.1 | Editor component | 1.5.4 | todo | |
| 1.6.2 | Debounced autosave | 1.6.1 | todo | |
| 1.6.3 | Save on close / day switch | 1.6.2 | todo | |
| 1.7.1 | List notes | 1.5.2 | todo | |
| 1.7.2 | Calendar sidebar | 1.7.1, 1.6.3 | todo | |
| 1.7.3 | Empty-day state | 1.7.2 | todo | |
| 1.8.1 | Parse tasks | 1.2.2 | review | `src/lib/tasks.ts` `parseTasks`; fenced blocks skipped; `line` is 0-based |
| 1.8.2 | Task edits | 1.8.1 | review | `toggleTask` / `addTask` / `editTask` / `deleteTask` pure, other lines byte-identical |
| 1.8.3 | Task UI | 1.8.2, 1.6.2 | todo | |
| 1.8.4 | No-timer guard | 1.8.3 | todo | |
| 1.9.1 | Ollama status | 1.2.2 | todo | |
| 1.9.2 | Settings: status | 1.9.1 | todo | |
| 1.10.1 | Detect models | 1.9.1 | todo | |
| 1.10.2 | Settings: model list | 1.10.1, 1.9.2 | todo | |
| 1.11.1 | Stream parser | 1.2.2 | todo | |
| 1.11.2 | Generate / Stop / busy | 1.11.1, 1.10.1 | todo | |
| 1.11.3 | Test AI UI | 1.11.2 | todo | |
| CI-1 | Check-in 1 | all above | todo | |
| api | Typed command contract (`src/lib/api.ts`) | — | review | All invoke shapes tested in `src/lib/api.test.ts`; mocks.ts also fakes `Channel` for tests |

---

## Session notes (coding agent writes here at the end of each session)

_Newest first: what got done, what's blocked, manual steps waiting for the verifier, what to start next._

---

## Blockers / questions

- **Model tag matching (1.10.1):** confirm whether quantised variants like `gemma3n:e4b-it-q4_K_M` should count as E4B. Default: exact tag match, plus `:latest` for `embeddinggemma`.
- **App name:** PRD §13 says the name may change (the vayu.ai domain isn't owned). Keep the product name in one place (Tauri config + one UI constant) so a rename is a one-line change.
