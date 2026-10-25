# NOW — Check-in 3 FAILED → Phase 3B (bug fixes + Reflect-style layout)

**Day:** Thu 22 Oct 2026
**Current work:** Journal UI revamp in progress (sage palette, sidebar, Daily reset, companion), ported from `vayu-frontend-source` onto the existing note API. Not merged.
**Gate:** Merge layout after bugs land → owner re-smoke + SG-3 → 3.9/3.10 → commit + tag `checkin-3` → Phase 4.
**Pages:** https://singlesoup.github.io/vayu-ai/ (see `docs/design/PAGES.md`)
**Goal:** Every Phase 3 feature works in the real window, and the app reads like a calm notes app (Reflect-style), not a stack of cards.

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

**Partial (21 Oct):** first-run passed in the browser. Daily Note + Settings still need `npm run tauri dev`.

After Phase 1C: verifier opens Daily Note + Settings, compares to the design board, then marks SG-1.

---

## Phase 1C — Rust backend (current)

**Status (21 Oct):** 1C.0–1C.4 implemented and `review`. 43 Rust + 140 frontend tests green; no commits (working tree only). Smoke-test steps in the session notes.

**Contract:** implement exactly what `src/lib/api.ts` documents (command names, shapes, error kinds). Do not invent a second API.

**No commits.** Leave all changes unstaged/uncommitted for the owner and verifier. Update status boards and the change log in the working tree only.

### 1C.0 Toolchain
- Install Rust (stable-msvc) + MSVC C++ build tools if missing. Prefer user approval for winget/admin prompts.
- Set `CARGO_TARGET_DIR` to `%LOCALAPPDATA%\vayu-target` so OneDrive does not sync build output.
- **Done when:** `cargo --version` works; `cargo check` in `src-tauri/` passes; `npm run check` no longer prints `SKIPPED: cargo not installed`.

### 1C.1 Config + notes folder (1.4.1 → 1.4.3)
- `get_config` / `set_notes_dir` per api.ts: `{ notesDir, version, defaultNotesDir }` with `defaultNotesDir` = `<Documents>\Vayu`.
- Corrupt config → rename to `config.bad.json`, return null notesDir; no panic.
- Validate folder (create missing dir; reject file paths; leave existing `.md` files alone).
- Register `tauri_plugin_dialog` so "Choose folder…" works.
- **Tests first:** `cargo test` with tempfile (see original 1.4.1–1.4.3 criteria earlier in this file).
- **Done when:** those tests pass; first-run Continue can set a folder and relaunch keeps it.

### 1C.2 Notes read/write/list (1.5.2, 1.5.3, 1.7.1)
- `read_note` never creates a file; `ensure_note` creates empty today; `write_note` atomic (temp + rename); `list_notes` date files only.
- Invalid dates → `Err(InvalidDate)`, no path escape.
- **Done when:** cargo tests pass; Notepad round-trip matches typed text.

### 1C.3 Ollama status + models (1.9.1, 1.10.1)
- `ollama_status` against `127.0.0.1:11434`, 1.5s timeout, never blocks startup.
- `list_models`: exact tags `gemma3n:e4b`, `gemma3n:e2b`, `embeddinggemma` (+ `:latest` for embeddinggemma); report `devChatModel` from `VAYU_DEV_CHAT_MODEL` in debug only.
- **Done when:** cargo tests with mock HTTP; Settings matches `ollama list` on the machine.

### 1C.4 Generate / Stop (1.11.1, 1.11.2)
- NDJSON stream parser; token events; Stop within ~1s; Busy if double-fire; model order e4b → e2b → debug `VAYU_DEV_CHAT_MODEL`.
- **Done when:** cargo tests with slow mock stream; Test AI streams in the real window.

### Order
1C.0 → 1C.1 → 1C.2 → 1C.3 → 1C.4. After each block: set those IDs to `review` in the status board (no git commit). When all are `review`, write a Session note listing what to smoke-test.

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
| 1.3.2 | Bundle fonts locally | 1.3.1 | verified | Fixed in 1B.2; fonts load on first-run |
| 1.3.3 | Hard-coded colour guard | 1.3.1 | verified | Verifier confirmed AC2: temp `color: #fff` in `App.css` → check fails with `App.css: line …: hex colour`; restored clean |
| 1.3.4 | Dev token page | 1.3.1 | verified | Component + DEV gate tests pass. Visual (manual) after Rust/`npm run dev` |
| 1.4.1 | Config storage | 1.2.2 | verified | cargo tests: load/save, corrupt → config.bad.json |
| 1.4.2 | Default notes folder | 1.4.1 | verified | `<Documents>\Vayu` |
| 1.4.3 | Validate folder | 1.4.1 | verified | create/missing/file/existing.md cases |
| 1.4.4 | First-run folder screen | 1.4.2, 1.4.3 | review | UI + mocked tests OK. Real dialog + config persistence need Rust (+ `tauri_plugin_dialog`) |
| 1.5.1 | Date → file name | 1.2.2 | verified | Local-date helpers; only builder in the UI |
| 1.5.2 | Read / create notes | 1.4.1, 1.5.1 | verified | read never creates; ensure empty; InvalidDate |
| 1.5.3 | Safe note writes | 1.5.2 | verified | atomic write; UTF-8/CRLF round-trip |
| 1.5.4 | Open to today + new day | 1.4.4, 1.5.3 | review | UI/mocks OK (`ensure` only when `create`/`isToday`). Real open + <2s timing need Rust |
| 1.6.1 | Editor component | 1.5.4 | review | Plain textarea + Newsreader column OK. Disk byte-fidelity needs Rust |
| 1.6.2 | Debounced autosave | 1.6.1 | review | Autosaver + wiring tests OK. Real disk writes need Rust |
| 1.6.3 | Save on close / day switch | 1.6.2 | review | Flush wiring + degrade-without-runtime OK. Force-close / kill-process ACs need Rust |
| 1.7.1 | List notes | 1.5.2 | verified | sorted date files only |
| 1.7.2 | Calendar sidebar | 1.7.1, 1.6.3 | review | Week keys fixed in 1B.4; AC2 (real files) waits on 1.7.1 |
| 1.7.3 | Empty-day state | 1.7.2 | review | Placeholder + editable empty day OK in tests. Real "no phantom files" needs Rust |
| 1.8.1 | Parse tasks | 1.2.2 | verified | Fences skipped; `- [ ]`/`- [x]`/`* [ ]` |
| 1.8.2 | Task edits | 1.8.1 | verified | Pure toggle/add/edit/delete; other lines unchanged |
| 1.8.3 | Task UI | 1.8.2, 1.6.2 | review | Panel + save wiring OK. Notepad round-trip ACs need Rust |
| 1.8.4 | No-timer guard | 1.8.3 | verified | Guard-only task; test green on absence of timer UI |
| 1.9.1 | Ollama status | 1.2.2 | verified | mock HTTP: Running / NotFound / timeout |
| 1.9.2 | Settings: status | 1.9.1 | review | UI OK; confirm live Ollama in smoke |
| 1.10.1 | Detect models | 1.9.1 | verified | exact tags + embedding:latest; quantised excluded |
| 1.10.2 | Settings: model list | 1.10.1, 1.9.2 | review | UI OK; confirm vs `ollama list` in smoke |
| 1.11.1 | Stream parser | 1.2.2 | verified | NDJSON split lines / done / error |
| 1.11.2 | Generate / Stop / busy | 1.11.1, 1.10.1 | verified | stream timing, Stop &lt;1s, Busy, timeout, drop |
| 1.11.3 | Test AI UI | 1.11.2 | review | confirm live stream in smoke |
| CI-1 | Check-in 1 | all above | verified | Live Settings (Ollama Running + Dev model) + Daily Note/tasks/calendar screenshots; commit `802554e`; tag `checkin-1` |
| api | Typed command contract (`src/lib/api.ts`) | — | verified | Contract + tests OK; is the morning Rust spec |
| 1B.1 | Import App.css | — | verified | Running page uses the stylesheet: input is Surface, not a white browser box |
| 1B.2 | Fonts render | 1.3.2 | review | `@font-face` is outside `:root`. Inter + JetBrains Mono confirmed on first-run. Newsreader still unseen (it only appears on the note body) |
| 1B.3 | Restyle to design board | 1B.1, 1B.2 | review | First-run matches. Daily Note, calendar, tasks, and Settings were not on screen — no Rust, so the app cannot leave first-run |
| 1B.4 | Calendar keys + Test AI log | — | review | Code fixes are in git. Not visible in the browser yet |
| SG-1 | Screenshot gate | 1B.1–1B.4 | verified | Owner screenshots 21 Oct: Daily Note (Today + tasks + calendar) + Settings (Ollama + Dev model + Test AI) |
| 1C.0 | Rust toolchain + cargo check | — | verified | Rust 1.99.1; `npm run check` runs 44 cargo tests (no SKIPPED); `vayu.exe` launched |
| 1C.1 | Config + dialog plugin | 1C.0 | verified | automated ACs; dialog click is manual smoke |
| 1C.2 | Notes read/write/list | 1C.1 | verified | automated ACs; Notepad round-trip is manual smoke |
| 1C.3 | Ollama status + models | 1C.0 | verified | automated ACs; live Settings is manual smoke |
| 1C.4 | Generate / Stop stream | 1C.2, 1C.3 | verified | automated ACs; live Test AI is manual smoke |
| 1D.1 | Daily Note layout + no double tasks | — | verified | `proseOf`/`withProse` + CSS stack; 151 FE tests. Live screenshot = 1D.4 |
| 1D.2 | Calendar no clip | — | verified | Rail 240px; token ≥220px test. Live check = 1D.4 |
| 1D.3 | Dev model line + Test AI copy | — | verified | NoModel copy mentions override; Dev model line already tested. Live stream = 1D.4 |
| 1D.4 | Owner re-smoke | 1D.1–1D.3 | verified | Live window: clean Today, task rows, calendar, Dev model line; close permission fixed |
| 2.1 | Hardware check: RAM, free disk, CPU, OS (<5s) | — | review | tier + model + size + Ollama presence; sysinfo; boundary tests at 8/16 GB and 8/10 GB disk |
| 2.2 | Tier logic: Green ≥16GB & ≥10GB → E4B; Yellow 8–15GB & ≥8GB → E2B; Red → no chat; dev override; boundary tests at 8/16GB | — | review | `tier_for()` pure + unit tests; `VAYU_DEV_TIER` debug override; `hardware_check` command |
| 2.3 | Tier result screen: plain words, specs under "details", one primary action | 2.1, 2.2 | todo | PRD first-run copy; "Download now" / "I already have Ollama" / Red "Continue without AI" |
| 2.4 | Download screen: model name, exact size, free/no-account copy, progress + % + cancel | 2.2 | review | pull streams Ollama /api/pull NDJSON as progress events; UI shows bar + % |
| 2.5 | Resumable pull via Ollama; survives re-launch mid-download; low disk → plain error, app usable | 2.4 | review | one pull at a time (Busy otherwise); cancel aborts the task; client re-POSTs after a kill (Ollama resumes server-side) |
| 2.6 | Skip download when Ollama + model already present (zero bytes on dev PC) | 2.2 | review | `list_models` gates the pull |
| 2.7 | Post-download check: one generation + one embedding pass before "You're ready" | 2.5 | review | embeddings via `embeddinggemma` |
| 2.8 | Morning Intention: optional 3 questions, one-tap Skip, ≤90s, no re-nag same day | 2.2 | review | component + parseIntention + per-date state; 4 tests |
| 2.9 | Intention output: 1 intention line + Top 3 checkbox tasks; no silent duplicates | 2.8 | review | saved once per day via append_note + mark_intention |
| 2.10 | Brain Dump → Tasks: streamed extraction → preview/edit → insert; nothing written unconfirmed | 2.2 | review | component + extractor prompt + insert-only-after-confirm; 4 tests |
| 2.11 | Extractor guardrails: no invented tasks; "no tasks found" for feelings-only dumps; 20-item dump → 20 tasks | 2.10 | review | extractor prompt preserves wording, NO_TASKS rule; preview fidelity tests |
| CI-2 | Check-in 2 (new-user test): fresh profile → tier → download → intention → dump → tag `checkin-2` | 2.1–2.11 | verified | Owner smoke + wiring commit; tag `checkin-2` |

---

## Phase 1D — Smoke-test bugfix (current)

**Owner screenshots (21 Oct):** Daily Note has overlapping text; calendar days clip; Settings looks “dummy” but is not.

**Settings is real, not dummy:**
- `Running — Ollama v0.32.14` proves `ollama_status` hit the live server.
- The three PRD tags show **Missing** because this PC has `gemma4-e4b-fast:latest`, not `gemma3n:e4b` / `e2b` / `embeddinggemma`. Exact-tag matching is intentional (plan Q6).
- Test AI says “No model installed yet” because neither PRD chat model nor a debug `VAYU_DEV_CHAT_MODEL` override is available to the running process.

**No commits.** Leave the working tree dirty (same rule as 1C).

### 1D.1 Daily Note layout — no overlaps
**Bug:** “Today” collides with Newsreader text that looks like `11 [] Testing the task!` (raw markdown from the editor). Tasks also appear again in the TaskList below → double display feels broken.
**Do:**
1. Layout: header (date + title) stacks cleanly above the editor; nothing from the editor paints through the title. Give the editor a clear block (min-height, margin-top from tokens, no absolute positioning that can collide).
2. Product fix (match the design board): the note body editor shows **journal prose only**. Checkbox task lines (`- [ ]` / `- [x]` / `* [ ]`) are edited only via the TaskList UI. Markdown on disk stays the single source of truth (TaskList still rewrites the full file via the pure helpers). When the user types in the editor, task lines already in the file must not be deleted.
**Acceptance**
- AC1: automated layout/regression tests where practical (e.g. DailyNote render: title and editor are separate; task lines are not duplicated as visible raw `- [ ]` in the editor value shown to the user).
- AC2 **(manual):** screenshot — “Today” is clean; one checkbox row for “Testing the task!”; no serif ghost text over the title.

### 1D.2 Calendar rail — no clipping
**Bug:** Sat/Sun (and day numbers) clip at the rail edge; 168px is too tight for the mono grid + padding.
**Do:** widen `--width-calendar-rail` enough that all 7 weekday labels and day cells are fully visible (try ~200–220px; keep it a token). Cells must not overflow the Surface rail.
**Acceptance:** AC1 token + CSS; AC2 **(manual)** full week labels visible.

### 1D.3 Settings + Test AI on this PC
**Do:**
1. Always show the three PRD model rows (Present/Missing) — keep exact matching.
2. When `list_models` returns a non-null `devChatModel`, show a clear line: `Dev model: <tag>` (debug builds).
3. Ensure `generate` already prefers e4b → e2b → debug override (1C.4). For local smoke without a PRD pull: document that the owner must launch with  
   `$env:VAYU_DEV_CHAT_MODEL="gemma4-e4b-fast:latest"; npm run tauri dev`  
   and that Settings then shows the Dev model line and Test AI streams.
4. Optional UX polish: if Ollama is Running but all PRD models are Missing and there is no dev override, the Test AI message should mention the override (one calm sentence), not only “No model installed yet.”
**Acceptance:** AC1 tests for the Dev model line + NoModel copy; AC2 **(manual)** with the env var set — Refresh stays live, Test AI streams, Stop works.

### 1D.4 Re-smoke checklist (verifier / owner)
After 1D.1–1D.3 are `review`: kill the old app, relaunch with the env var above, walk folder → note → tasks → Settings → Test AI. Then SG-1 Daily Note screenshot.

---

## Phase 2 — First run, tiers, model download, Morning Intention, Brain Dump (Thu 22)

**Goal:** a new user installs Vayu, gets a hardware-based tier in plain words, downloads exactly one model (E2B first; E4B only on Green), and can run Morning Intention and Brain Dump → Tasks.

**Rules that apply (PRD §6–7, plan.md Phase 2):**
- **E2B first.** Promote to E4B only on ≥16 GB RAM and ≥10 GB disk machines, after the first-run check. **Never download both chat models by default.** Design and test Yellow first (the typical Indian laptop: 8GB/512GB SSD).
- Model sizes (PRD §7): gemma3n:e4b ≈ 7.5 GB download (~3 GB RAM); gemma3n:e2b ≈ 5.6 GB download (~2 GB RAM); embeddinggemma is the small search/embedding model.
- First-run buttons: "Download now" / "I already have Ollama" / (Red tier) "Continue without AI".
- Ollama states (PRD §9): absent → offer install; present but model missing → offer download; present → skip straight to the app.
- Download manager: resumable, size before start, progress + % during, verifies on completion; handles interrupted download, disk filling mid-download, and user cancelling — the app stays usable in No-AI mode.
- AI replies are short (~120–180 tokens) and streamed.
- Zero outbound calls from Rust except `127.0.0.1:11434`. Ollama itself fetches the model from its registry; Vayu never calls out directly.
- **Cut trigger (plan.md):** if the download manager fails Check-in 2 twice, v1 ships "detect existing Ollama + guided install link" and bundled download moves to v1.1.

### 2.1 Hardware check (RAM, disk, CPU, OS) — P0
**Depends on:** —
**Tests first:**
- `cargo test` in `src-tauri/src/hardware.rs`:
  - `tier_for(ram_gb, disk_gb)`: (16, 10) → Green; exactly (16.0, 10.0) → Green; (15.9, 10) → Yellow; exactly (8.0, 8.0) → Yellow; (7.9, 8) → Red; (8, 7.9) → Red; (4, 500) → Red.
  - dev override `VAYU_DEV_TIER=Green|Yellow|Red` forces the tier in debug builds; ignored in release.
  - `hardware_report()`: total RAM via `sysinfo`, free disk via `fs::space` of the notes drive, CPU brand, OS string — all plausible on the dev PC.
**Do:** add the `sysinfo` dependency; pure `tier_for` + `hardware_report`; command `hardware_check` that also reports Ollama presence (`ollama_status` logic), the recommended model tag, and its download size. <5s.
**Acceptance:**
- AC1: all tier boundary unit tests pass (8 GB / 16 GB RAM; 8 GB / 10 GB disk edges).
- AC2: `hardware_check` returns tier/model/size/Ollama presence without blocking startup; completes in <5s on the dev PC. **(manual)**

### 2.2 Tier logic wired into config — P0
**Depends on:** 2.1
**Tests first:**
- `cargo test`: `update_config` partial merge (tier / model_tag / ai_enabled) round-trips through `config.json`; old config without the new fields still loads.
- component test: tier screen is not shown again once a tier is stored (subsequent launches go straight to the app).
**Do:** extend `StoredConfig` with optional `tier`, `model_tag`, `ai_enabled`; command `update_config` merges and saves atomically.
**Acceptance:** AC1: tests pass; AC2: relaunch keeps the tier and skips the hardware/tier screens. **(manual)**

### 2.3 Tier result screen — P0
**Depends on:** 2.1, 2.2
**Tests first:** component tests with mocked `invoke`:
- Green: "Your PC: Green tier — Gemma E4B (full)", primary action "Download now"; details show RAM/disk/CPU/OS.
- Yellow: "Your PC: Yellow tier — Gemma E2B (lite)", same layout; details under "Details".
- Red: plain line "Your PC can't run AI chat locally — Vayu still works as notes + tasks", primary action "Continue without AI".
- "I already have Ollama" re-runs the hardware check when Ollama is absent.
**Do:** `TierResultScreen` with PRD §6 first-run copy, one primary action, details block in JetBrains Mono.
**Acceptance:** AC1: tests pass. AC2 **(manual):** screenshot next to the design board tier card.

### 2.4 Download screen — P0
**Depends on:** 2.2
**Tests first:** component tests with mocked `invoke`:
- shows model name + exact size (e.g. "gemma3n:e2b — ≈ 5.6 GB, one-time, free, no account"); PRD copy "Vayu thinks on your PC, not in the cloud…".
- progress events update a bar + percent; "Cancel" calls `cancel_pull`.
- low disk → plain calm error; the app stays usable.
**Do:** `DownloadScreen` driven by `pull_model` progress events; size shown before start (PRD planning size for the chat model; Ollama `total` once streaming).
**Acceptance:** AC1: tests pass.

### 2.5 Resumable pull — P0
**Depends on:** 2.4
**Tests first:** `cargo test` against a mock Ollama server streaming NDJSON pull progress:
- a pull that the server cuts mid-stream errors to the UI with a calm message; re-calling `pull_model` on the same model completes (resume).
- `cancel_pull` aborts the in-flight pull within ~1s and the screen can restart.
- pre-pull disk check: free space below the model size → `Err(Io)` with a plain message before any bytes flow.
**Do:** `pull_model` streams Ollama `/api/pull` NDJSON as `PullEvent::progress`; one pull at a time (slot + abort handle in `AppState`); cancel aborts the task.
**Acceptance:** AC1: tests pass; AC2 **(manual):** kill the app mid-download, relaunch, resume → completes.

### 2.6 Skip download when model present — P0
**Depends on:** 2.2
**Tests first:** component test: when `list_models` reports the tier's model present, the tier screen skips straight to "Open Vayu" — `pull_model` never runs (zero bytes).
**Do:** in the tier/download flow, check `list_models` before offering the download.
**Acceptance:** AC1: test passes; AC2 **(manual):** on the dev PC with Ollama + model present, first-run downloads nothing.

### 2.7 Post-download verification — P0
**Depends on:** 2.5
**Tests first:** `cargo test` against mock servers:
- `verify_install(tag)` runs one generation (stream to `Done`) + one embedding call (`/api/embeddings` with `embeddinggemma`); resolves `{ generation_ok, embeddings_ok }`.
- generation that never yields a first token → error; embeddings model missing → `embeddings_ok: false` (calm, not a crash).
**Do:** command `verify_install` reuses `run_generate` with a short prompt + a new `run_embeddings` POST to `/api/embeddings`.
**Acceptance:** AC1: tests pass; AC2 **(manual):** after download, "You're ready" shows only when both checks pass.

### 2.8 Morning Intention — P0
**Depends on:** 2.2
**Tests first:** component tests:
- on today's date (intention not done/skipped): shows 3 questions (energy, one thing that matters, anything blocking) and a one-tap "Skip today".
- skipping marks the date skipped and the card never re-nags that day.
- after the 3 answers, Gemma streams an intention line + Top 3 tasks; preview → "Save to today's note" → inserted into the note; state = done; card hides.
- on a past/future day: no intention card.
**Do:** `MorningIntention` card at the bottom of today's Daily Note; per-date done/skipped state stored in config (`mark_intention` command); generation via `generate` with an intention prompt; insert via `append_note`.
**Acceptance:** AC1: tests pass; AC2 **(manual):** intention written once per day; reopen same day → no re-nag.

### 2.9 Intention output — P0
**Depends on:** 2.8
**Tests first:** component test: saving the intention appends exactly one "## Intention — …" section with 1 intention line + Top 3 `- [ ]` tasks; the note's earlier content is byte-for-byte unchanged.
**Do:** `append_note` command (read + append + atomic write in Rust).
**Acceptance:** AC1: test passes; AC2 **(manual):** open the `.md` in Notepad → intention section at the end, old text intact.

### 2.10 Brain Dump → Tasks — P0
**Depends on:** 2.2
**Tests first:** component tests with a mocked stream:
- dump → "Extract tasks" → Gemma streams a checklist → preview shows the tasks (editable text, removable rows) → "Insert" only after the user confirms; nothing is written before confirm.
- confirmed insertion appends the tasks to today's note via `append_note`; the editor/DailyNote reflects them (TaskList shows them).
**Do:** `BrainDump` card; extractor prompt (PRD §5.3: preserve user's wording, no invented tasks, `NO_TASKS` when nothing actionable).
**Acceptance:** AC1: tests pass; AC2 **(manual):** dump appears as checklist rows in today's note and in the TaskList.

### 2.11 Extractor guardrails — P0
**Depends on:** 2.10
**Tests first:**
- `EXTRACTOR_PROMPT` contains "Do not invent tasks" and the `NO_TASKS` rule.
- mocked stream returning `NO_TASKS` → "No tasks found — nothing actionable" empty state, no task block written.
- mocked stream returning 20 task lines → preview shows 20 rows; insert writes all 20.
**Do:** none beyond 2.10's prompt + preview fidelity.
**Acceptance:** AC1: tests pass.

---

## Phase 3 — Journal, reflection, Ask, evals (Fri 23) → FREEZE 9pm

**Goal:** complete the daily loop (journal, evening reflection, backlinks, Ask Your Notes) plus the embedding pipeline and Settings polish, then freeze.

**Rules that apply (PRD §5, §7–9):**
- **Warm `#F5C97A` is Evening Reflection ONLY.** The colour guard test fails `npm run check` if any file outside `tokens.css` uses `var(--color-warm)`.
- **No timers/Pomodoro.** No Laya. No real BYOK (only a "coming soon" label in Settings).
- **Zero outbound calls except `127.0.0.1:11434` from Rust.** Embeddings via Ollama `/api/embeddings`; model delete via Ollama `/api/delete`.
- **Red tier / Ollama gone:** notes + tasks still work; AI hidden with one plain line; keyword search fallback.
- Every AI surface (Journal, Evening Reflection, Ask, Test AI) has: model-loading / model-absent (Red) / Ollama-not-running / streaming-stop states.

**New Rust commands (added to `src/lib/api.ts` contract):**
- `embeddings(model, prompt)` → `Vec<f32>` — Ollama `/api/embeddings` (expose `run_embeddings`).
- `delete_model(name)` → void — Ollama `POST /api/delete`.
- `reindex()` → `{ indexed, chunks }` — scan `notes_dir/*.md`, chunk, embed, write local index beside notes.
- `search_index(embedding, top_k)` → `[{ date, text, score }]` — cosine search over the local index.

**Index file:** `<notes_dir>/.vayu_index.json`, versioned, rebuilt by `reindex`, updated incrementally on save.

### 3.1 Journal chat — P0
**Depends on:** 2.2
**Tests first:** component tests with mocked `generate`:
- on today's note, a "Journal" surface shows one italic Newsreader Gemma question at a time (up to 3: energy, one thing that matters, anything blocking).
- user answers; Gemma streams the next question (context = all previous turns, deleted turns still leave context).
- answers are saved into today's note via `append_note`; journal turns are appended as a `## Journal` block.
- no double-firing: a second `generate` while one runs → `Err(Busy)` (UI disables).
**Do:** `JournalChat` component; one-question-at-a-time state machine; `generate` with an ever-growing prompt (full transcript context); `stop_generation` wired.
**Acceptance:** AC1: tests pass. AC2 **(manual):** journal turns appear in today's `.md`; deleting a turn in-UI does not erase earlier context.

### 3.2 Streaming + Stop + "thinking" on every AI surface — P0
**Depends on:** 2.2, 3.1
**Tests first:** component test for a shared streaming surface:
- shows "thinking…" until first token, tokens append live, "Stop" ends the stream within ~1s (final state Stopped), button disabled while running, calm error on `Err(Io)` / `NoModel`.
- second `generate` while one runs → `Err(Busy)` → UI stays idle, no double request.
**Do:** extract the streaming/Stop/thinking behaviour into a shared pattern used by Journal, Evening Reflection, Ask, Test AI (no double-firing via the existing `AppState` generation slot).
**Acceptance:** AC1: tests pass. AC2 **(manual):** Stop halts a live stream within ~1s on every AI surface.

### 3.3 Evening Reflection — P0
**Depends on:** 2.2, 3.2
**Tests first:** component tests with mocked `generate` + `append_note`:
- Warm accent (`var(--color-warm)`) used ONLY in this flow (guard test enforces).
- streams a summary built from today's note + checked tasks only.
- "Seed tomorrow" appends one seed line to tomorrow's note via `append_note(tomorrow, …)`.
- works on any day (past/future), not just today.
- no silent re-run: one reflection per day tracked in config (`mark_intention`? no — a new `reflection` state? Keep simple: append + config flag `reflection:<date>`? Use a lightweight approach: store reflection dates in config intention-style). Decision: reuse `mark_intention` semantics is wrong; add `mark_reflection(date)`? To keep it minimal, Evening Reflection just appends the seed + summary and the "works any time of day" means no re-nag guard is required beyond idempotent appends. Decision: no per-date guard; user can reflect anytime, each append is a new block.
**Do:** `EveningReflection` component (Warm accent), generate summary prompt from note content + task list, append summary + "seed for tomorrow" line to tomorrow's note.
**Acceptance:** AC1: tests pass (Warm used here only). AC2 **(manual):** summary + seed appear in tomorrow's `.md`; Warm appears nowhere else in the app.

### 3.4 Embedding pipeline — P0
**Depends on:** 2.2
**Tests first (Rust):**
- `chunk_text(text, max)` → chunks respecting sentence boundaries, size-capped.
- `reindex()` in a temp notes dir: writes `.vayu_index.json` with per-date chunks + embeddings (mocked embeddings command? no — `reindex` calls `run_embeddings`; unit-test `reindex` against a mock Ollama server, or test chunking + index shape separately).
- `search_index(query_embedding, top_k)`: cosine similarity, returns top dates/chunks sorted by score; empty index → `[]`.
- cosine similarity: identical vectors → 1.0; orthogonal → 0.0; negatives handled.
**Do:** Rust commands `embeddings`, `reindex`, `search_index`; index file `<notes_dir>/.vayu_index.json`; chunk-on-save best-effort (index updated after a successful `write_note`/`append_note`, non-fatal if Ollama down).
**Acceptance:** AC1: Rust tests pass (chunking, cosine, index round-trip). AC2 **(manual):** Re-index button in Settings produces `.vayu_index.json`.

### 3.5 `[[topic]]` backlinks + panel — P0
**Depends on:** 2.2
**Tests first (pure TS):**
- `parseBacklinks(md) -> string[]`: finds `[[topic]]` and `[[Topic With Spaces]]`, returns normalized topic names (lowercase, trimmed), deduped, ignores `[[ ]]` empty.
- `buildBacklinkIndex(notes: {date, content}[]) -> Map<topic, date[]]`: every date a topic appears.
- typos create no phantom files: a `[[nonexistent-topic]]` with no matching note → no empty date list (or empty array, not a file).
**Do:** pure functions in `src/lib/backlinks.ts`; `BacklinksPanel` component listing topics → dates; clicking opens that day.
**Acceptance:** AC1: tests pass. AC2 **(manual):** click a backlink → that day's note opens.

### 3.6 Ask Your Notes (RAG) — P0
**Depends on:** 3.4, 3.5
**Tests first:** component tests with mocked `embeddings`, `search_index`, `generate`:
- question → embed → search index (top days) → generate answer WITH retrieved context → answer shown with source-day chips.
- retrieval empty → "I couldn't find anything in your notes about that." (abstain), no generate call, no invented answer.
- source chips clickable → open that day.
**Do:** `AskNotes` component; RAG flow: embed question (Ollama `/api/embeddings`, model `embeddinggemma`), search local index, generate with context, show answer + source-day chips; abstain when nothing retrieved.
**Acceptance:** AC1: tests pass (incl. abstain). AC2 **(manual):** answer cites real source days; gibberish question → abstain message.

### 3.7 Red mode — P0
**Depends on:** 2.2
**Tests first:** component test:
- tier `Red` or Ollama `NotFound`: AI surfaces (Journal, Evening Reflection, Ask, Test AI) hidden; one plain line "Your PC can't run AI chat locally — Vayu still works as notes + tasks."
- notes + tasks still work (read/write/list via Rust).
- keyword search over existing notes (plain text match, no embeddings).
**Do:** `aiOn = tier !== "Red" && ollama Present` gate in App; `RedNoteSearch` component (keyword search over `list_notes` + `read_note`); AI hidden.
**Acceptance:** AC1: test passes. AC2 **(manual):** Red tier / Ollama stopped → AI gone, notes usable, keyword search works.

### 3.8 Settings → Model — P0
**Depends on:** 2.2
**Tests first:** component tests + Rust test:
- Settings Model section shows tier (Full/Lite/No-AI), current model, size on disk, Ollama status (Running/Not found), Refresh re-runs `hardware_check`.
- "Delete model" calls `delete_model(name)`; confirms before deleting.
- BYOK slot shown as "Coming soon" label only (not functional).
- re-run check updates tier/model/size.
**Do:** Rust `delete_model` command (Ollama `POST /api/delete`); Settings Model section extended; tier labels Green=Full, Yellow=Lite, Red=No-AI.
**Acceptance:** AC1: tests pass. AC2 **(manual):** Settings shows tier/model/size/status; Delete removes the model from `ollama list`.

### 3.9 Golden-set evals — P0 (manual)
**Depends on:** 3.1, 3.3, 3.6
**Do:** ~20 brain dumps, ~10 journal chats, ~10 Ask questions over sample notes. Check: Extractor ≥18/20 tasks preserve wording; Ask ≥9/10 answers cite real days and abstain when empty; Reflection invents nothing ≥9/10. Record results in session note.
**Acceptance:** AC1: eval results documented in the session note.

### 3.10 Privacy test — P0 (manual)
**Depends on:** all
**Do:** run the full daily loop (folder → tier → download → intention → dump → journal → reflection → ask) with network monitoring; verify zero outbound calls except `127.0.0.1:11434`. Save log/screenshot as evidence.
**Acceptance:** AC1: privacy evidence noted in session note.

### P1 (only if P0 review-ready with time left)

### 3.11 Light mode — P1
**Depends on:** —
**Do:** basic light mode: same layout on `Paper BG` (`#FAF9F6`). Toggle in Settings? Keep minimal: a `data-theme` or class switch. Out of scope if time runs out.
**Acceptance:** AC1 **(manual):** light mode renders without broken colours.

### 3.12 Manual model switching E4B ↔ E2B — P1
**Depends on:** 2.2, 3.8
**Do:** Settings lets the user pick E4B or E2B manually (respecting tier: Red can't). Stored in config `model_tag`.
**Acceptance:** AC1: test + manual.

---

## Phase 3B — Fix Phase 3 + Reflect-style layout (Thu 22)

**Why:** Owner smoke on 22 Oct 01:00 failed CI-3. Unit tests were green, but four features fail in the real window and the layout has no hierarchy. Reference: Reflect's daily-notes screen (`docs/design/reflect-reference.png`) + the PRD design board. Borrow Reflect's **structure**, keep Vayu's **tokens** (Ink / Surface / Breeze / Warm, Inter / Newsreader / JetBrains Mono).

**Not in scope:** new features, light mode (3.11), model switch (3.12), Laya, BYOK, voice.

### Bugs (root causes found by the verifier)

**3B.1 Evening Reflection uses stale note content.** `EveningReflection.tsx` reads the note once on mount; text written later is ignored and the button stays disabled if the note was empty at launch.
- Do: read the note (and tasks) at click time inside `reflect()`. Enable the button whenever the panel is open.
- AC1 (test): write content after mount → Reflect sends the new content in the prompt.
- AC2 (manual): write a few lines, Reflect → summary appears → Save seed → tomorrow's `.md` has the seed block.

**3B.2 Backlinks and keyword search never refresh.** `BacklinksPanel` and `RedModeBar` call `read_all_notes` once on mount.
- Do: refresh after every successful save (App already has `noteRevision`; bump it on save, or pass a refresh key).
- AC1 (test): a save that adds `[[reading]]` → the topic appears without restart.

**3B.3 Re-index / Ask can never work on this PC.** Three causes:
1. `index.rs` `split_sentences` mixes char positions with byte slicing → **panics** on non-ASCII text (`—`, Hindi, emoji). Vayu's own headings contain `—`.
2. Every embedding call uses `STATUS_TIMEOUT` (1.5s, meant for the Ollama ping). Use the generate timeout.
3. `embeddinggemma` is not installed and nothing tells the user. Re-index/Ask must say plainly: "Search by meaning needs the small search model (embeddinggemma). Download it?" with a button that uses the existing `pull_model` flow.
- AC1 (cargo test): chunking text containing `—`, `नमस्ते`, and emoji does not panic and round-trips the text.
- AC2 (test): Ask with the search model missing shows the download prompt, not "couldn't find anything".
- AC3 (manual): `ollama pull embeddinggemma` → Settings → Re-index → "Index rebuilt: N days" → Ask about something written → answer + day chips.

**3B.4 Keyword search exists only on Red tier.** Move the plain keyword search into the left sidebar search box for **every** tier (it needs no AI). Red tier keeps the one plain AI-off line.
- AC1 (test): Yellow tier → search box finds a word across notes → click result opens that day.

**3B.5 Index the day on save (P1, only if 3B.1–3B.4 and 3B.6–3B.8 are review).** After a successful autosave, re-embed only that day. Re-index stays as the full rebuild.

### Layout (Reflect-style, design tokens only)

**3B.6 Three-zone shell.**
- **Left sidebar (~220px, Surface):** search box at top (3B.4), then nav: **Today**, **Ask your notes**, **Topics** (the `[[backlinks]]` list), and **Settings** pinned at the bottom. No AI cards here.
- **Centre (flex, note column max `--width-note-column`):** the note is the hero. Mono date line → "Today" title → editor → tasks. Nothing stacked above the title.
- **Right panel (~260px, Surface or Ink with a border):** month calendar on top, then "In this note" topics/backlinks for the current day.
- Below ~1100px window width, the right panel collapses (calendar moves into the left sidebar). Set a sensible minimum window width in `tauri.conf.json` (e.g. 960px).
- AC (test): App renders sidebar, note column and right panel landmarks (`nav`, `main`, `aside`); no AI card renders above the note title.

**3B.7 One AI surface at a time.**
- Under the note title, one quiet row of AI actions (ghost buttons, Breeze text): **Plan my day**, **Brain dump**, **Journal**, **Reflect**. Clicking one opens **that** panel inline below the row (or in the right panel); only one is open at once; Esc / Close collapses it.
- Morning Intention still auto-opens once per day (no re-nag), but in this same slot.
- Ask your notes opens in the centre column as its own view (from the sidebar), with the input full-width and the Ask button inside the column — never overflowing.
- AC (test): opening Journal closes Brain dump; only one AI panel in the DOM.

**3B.8 Visual system rules (apply everywhere, check in the screenshot gate).**
- Hierarchy: one H1 per view (note title, Inter 700 heading size); section labels in mono uppercase muted small; body in Newsreader.
- Buttons: exactly **one** primary (Breeze pill) per panel, right-aligned at the panel's bottom; secondary = ghost; icon buttons quiet. Same height for all buttons in a row; inputs and buttons share a height.
- Spacing: 8pt grid tokens only; panels share one padding value; consistent gaps between rows.
- Nothing may overflow its container at 960px+ widths (fix the Ask button overflow).
- Warm appears only on Evening Reflection.

### SG-3 screenshot gate (verifier, manual)
At 1280×800 and 960×700: Today (no panel open), each AI panel open, Ask view, Settings, Red tier. Compare against the Reflect reference and the design board. Fails if anything overflows, more than one primary button shows in a panel, or AI cards stack above the note.

### Eval + privacy (unchanged, verifier, manual, after SG-3)
3.9: about 20 brain dumps (keep wording ≥18/20), 10 Ask questions (≥9/10 cite real days or abstain), 10 reflections (≥9/10 invent nothing). 3.10: run the loop while watching connections (`Get-NetTCPConnection`) → only `127.0.0.1:11434`. These are tests the verifier runs, not app screens.

| ID | Task | Depends on | Status |
|---|---|---|---|
| 3B.1 | Reflection reads note at click time | — | todo (main) |
| 3B.2 | Backlinks + search refresh on save | — | todo (main) |
| 3B.3 | Unicode-safe chunking, embed timeout, missing search-model prompt | — | todo (main) |
| 3B.4 | Keyword search for every tier in sidebar | 3B.6 | review |
| 3B.5 | Index the day on save | 3B.3 | todo (P1) |
| 3B.6 | Three-zone shell | — | review |
| 3B.7 | One AI surface at a time | 3B.6 | review |
| 3B.8 | Visual system rules | 3B.6, 3B.7 | review |
| SG-3 | Screenshot gate | 3B.1–3B.8 | todo (verifier) |

## Status board (Phase 3)

| ID | Task | Depends on | Status | Verifier notes |
|---|---|---|---|---|
| 3.1 | Journal chat | 2.2 | review | JournalChat component + mounted in App; one question at a time, streaming, Stop, no double-fire; 4 tests |
| 3.2 | Streaming + Stop + thinking (no double-fire) | 2.2, 3.1 | review | shared streaming pattern in JournalChat; Rust AppState Busy guard already tested |
| 3.3 | Evening Reflection (Warm only) | 2.2, 3.2 | verified | Warm accent on `.evening-reflection` in App.css; colour guard allows Warm only there |
| 3.4 | Embedding pipeline (chunk + index + search) | 2.2 | review | Rust: chunk/cosine/index tests (11); `embeddings`/`reindex`/`search_index` commands; Re-index button in Settings → Model (AC2 manual) |
| 3.5 | Backlinks + panel | 2.2 | review | pure parse/index tests + BacklinksPanel mounted in rail; `read_all_notes` command added; 10 tests |
| 3.6 | Ask Your Notes (RAG) | 3.4, 3.5 | review | AskNotes mounted in rail; abstain + source chips + calm errors; 3 tests (needs Re-index populating `.vayu_index.json` first) |
| 3.7 | Red mode | 2.2 | review | aiOn gate hides AI surfaces; RedModeBar (one plain line + keyword search) mounted; 4 tests |
| 3.8 | Settings → Model | 2.2 | review | ModelCard (tier words Full/Lite/No-AI, model + size, Re-run check, Re-index, BYOK coming-soon only) + Delete model with confirm; 5 tests |
| 3.9 | Golden-set evals | 3.1, 3.3, 3.6 | todo | manual |
| 3.10 | Privacy test | all | todo | manual |
| 3.11 | Light mode | — | todo | P1 |
| 3.12 | Manual model switch | 2.2, 3.8 | todo | P1 |
| CI-3 | Check-in 3 (freeze) | 3.1–3.10 | todo | verifier only |

---


_Newest first: what got done, what's blocked, manual steps waiting for the verifier, what to start next._

### Design branch — Reflect polish pass (22 Oct afternoon, `design_upgrades`)

**Status:** 3B.4 / 3B.6 / 3B.7 / 3B.8 still **review** after a second polish pass. Bugs 3B.1–3B.3 remain on `main`. No commit.

**Polish verified in-app browser** (`?dev=ui`) vs Reflect + prior gaps:
- Hero H1 is Reflect-style date in Breeze (`Thu, October 22nd, 2026`); AI row under it, even height, no wrap pill.
- Quieter nav: soft active row, Topics without `[[]]`, Settings gear icon.
- Wiki topics highlighted in the editor (brackets muted); circular task checkboxes; underline-style Add task.
- Evening Reflection: full copy, primary button right-aligned in `.panel-actions`.
- Compact calendar weekdays (`Mo`…`Su`); at 960 calendar in left nav, rail hidden.
- CDP shots refreshed: `docs/design/sg3-1280.png`, `sg3-1280-reflect.png`, `sg3-960.png`.

**`npm run check`:** green (209 FE + Rust).

**Verifier click path:** `?dev=ui` or `npm run tauri dev` → hero date + three zones at ≥1101px → Reflect (button bottom-right of panel) → Topics without brackets → gear Settings → shrink &lt;1100px for nav calendar.

---

### Design branch — Reflect three-zone shell (22 Oct, coding agent on `design_upgrades`)

**Status:** 3B.4 / 3B.6 / 3B.7 / 3B.8 → **review**. Bugs 3B.1–3B.3 remain on `main`. No commit.

**Verified in-app browser** (`http://localhost:1420/?dev=ui`) against `docs/design/reflect-reference.png`:
- Three zones at 1280×800: left nav (search, Daily notes, Ask, Topics, Settings) · centre note hero · right calendar + “In this note”.
- At 960×700: right rail collapses; calendar moves into the left nav (`matchMedia`).
- Note title sits **above** the AI action row; one panel open at a time; Ask opens full-width in the centre.
- Warm accent only on Evening Reflection. CDP screenshots: `docs/design/sg3-1280.png`, `sg3-1280-reflect.png`, `sg3-960.png`.

**`npm run check`:** green (209 FE + Rust). New: `AppLayout3B.test.tsx`, `InThisNote.tsx`, `?dev=ui` preview path. Window min 960×640 in `tauri.conf.json`.

**Verifier click path:** `npm run tauri dev` (or Vite `?dev=ui`) → confirm three columns at wide width → open each AI action → Ask from sidebar → shrink below 1100px and confirm calendar in left nav → Settings from nav footer.

---

### Verifier — Check-in 3 FAILED (owner smoke), 22 Oct 01:10

**Works:** Journal chat (streams, saves into the note).
**Fails:** Evening Reflection (stale content read on mount); Ask Your Notes (search model not installed, 1.5s embed timeout, sentence splitter panics on `—`); `[[topic]]` backlinks (loaded once, never refreshed); keyword search (only shown on Red tier, owner is Yellow).
**Design:** no visual hierarchy, misaligned buttons, Ask button overflows the 240px rail, four AI cards stacked above the note. Reference: Reflect's three-zone daily-notes layout.
**Clarified for owner:** 3.9 evals and 3.10 privacy are verifier tests, not app features. 3.11/3.12 not started (P1).
**Decision (owner):** Phase 3B = fix the bugs **and** rework the layout Reflect-style, then re-smoke. `checkin-3` not tagged. Phase 3 tree still uncommitted.

---

### Verifier — Phase 3 automated pass, 21 Oct 22:30

**Ran:** `npm run check` → **205** FE + **73** Rust, lint/tsc clean. Spot-checked: JournalChat / EveningReflection / AskNotes / BacklinksPanel / RedModeBar / ModelCard all imported from `App.tsx`; `register_pull` wired so cancel can abort; `index.rs` present.

**Fixed (verifier):** Warm accent was blocked by the Phase-1 colour guard. Guard now allows `--color-warm` only in `App.css`; Evening Reflection header/border use Warm.

**Caveats accepted:** chunk-on-save is still Re-index-on-demand (OK for freeze if documented). P1 3.11/3.12 not started.

**Still open for CI-3:** owner smoke steps 2–7 in the Phase 3 session note; manual 3.9 evals; 3.10 privacy. Then commit dirty tree + tag `checkin-3`.

---

### Phase 3 session — Journal, Evening Reflection, embeddings, backlinks, Ask, Red mode, Settings → Model (21 Oct, coding agent)

All Phase 3 P0 build tasks (3.1–3.8) are `review` with tests first; `npm run check` is green (**205 frontend + 73 Rust**, lint + tsc clean, no Rust warnings). **The tree is left dirty — nothing was committed** (default: no commits; 112+ commits already). Nothing pushed. `checkin-3` is NOT tagged (verifier only).

**What was built (all mounted in `App.tsx`, none are orphan files):**
- **3.1/3.2 Journal chat** — `JournalChat.tsx` on today's note: one italic Newsreader Gemma question at a time, streamed with Stop + "thinking", full transcript as context (deleted turns leave context), saved to the day as a `## Journal` block. Send is disabled while streaming; the Rust `AppState` Busy guard backs the no-double-fire rule.
- **3.3 Evening Reflection** — `EveningReflection.tsx`: summary built from the day's note + task lines **only**, one editable seed line appended to **tomorrow's** note, works on any day (no time gate). **Deviation:** the Warm accent cannot be applied — the colour guard (1.3.3) bans the warm token outside `tokens.css`; the token stays reserved and the component documents how to use it once the guard is relaxed.
- **3.4 Embedding pipeline** — new Rust module `index.rs`: sentence-aware chunking (≤500 chars), cosine similarity, versioned index file `<notes_dir>/.vayu_index.json` (atomic write), `reindex` (rebuild from the `.md` files), `search_index` (embed the query → top-k by cosine), plus the `embeddings` command. UI: **Re-index** button in Settings → Model. Chunk-on-save is *not* automatic — the index is rebuilt on demand (flagged in the plan).
- **3.5 `[[topic]]` backlinks** — pure `src/lib/backlinks.ts` (parse + topic→dates index, fences skipped, topics normalised; a typo maps only to the day it was typed on — nothing is ever created) + `BacklinksPanel.tsx` in the calendar rail; day chips open that day. New `read_all_notes` command.
- **3.6 Ask Your Notes (RAG)** — `AskNotes.tsx` in the rail: question → `search_index` → answer from the retrieved excerpts only, with clickable source-day chips. **Abstains** ("I couldn't find anything in your notes about that.") and makes no `generate` call when the index is empty.
- **3.7 Red mode** — the `aiOn` gate hides every AI surface; `RedModeBar.tsx` shows **one plain line** ("Your PC can't run AI chat locally — Vayu still works as notes + tasks.") plus a keyword search over all notes (no embeddings, no model).
- **3.8 Settings → Model** — `ModelCard.tsx`: tier in plain words (**Full / Lite / No-AI**), recommended model + one-time size, **Re-run check** (re-runs `hardware_check`), **Re-index**, BYOK as a "coming soon" label only, and **Delete model** with a confirm step (Ollama `POST /api/delete`).

**Also fixed (Phase 2 defect):** `cancel_pull` could not cancel anything — `register_pull` was dead code, so Cancel only hid the UI while the download kept running. `pull_model` now spawns the pull as a task and registers its abort handle; an aborted pull settles as `Err("Download cancelled.")`.

**Manual steps waiting for the verifier — Check-in 3 (freeze):**
1. `npm run check` → expect **205 FE + 73 Rust** green.
2. `npm run tauri dev` (fresh profile: delete `%APPDATA%\app.vayu.desktop\config.json` first) → folder → hardware check → tier screen → download progress → **Cancel really stops the download now** (the Ollama log must stop) → Open Vayu.
3. Today: Morning Intention (Skip) → Brain Dump (extract → preview → Insert) → **Journal chat** (answer a question, watch it stream, press Stop, delete a turn, "Save to today's note" → a `## Journal` block in the `.md`).
4. **Evening Reflection**: "Reflect on today" → summary → "Save seed to tomorrow" → tomorrow's `.md` gets the `---` seed block.
5. Settings ⚙ → Model: tier words, model + size, **Re-run check** updates, **Re-index** → "Index rebuilt: N day(s), M chunks", **Delete** asks first and removes the model from `ollama list`. BYOK shows "coming soon" only.
6. Rail: type `[[reading]]` in any note → the **Backlinks** panel lists the topic + a day chip → click → that day opens. Ask a question → an answer with **source-day chips**; ask nonsense → it **abstains** (press Re-index first so the index is not empty).
7. **Red mode:** set `$env:VAYU_DEV_TIER="Red"` (debug only) and restart → AI surfaces gone, one plain line visible, notes + tasks still work, keyword search finds days. Then set it back.
8. **3.9 evals (P0, manual):** ~20 brain dumps (Extractor must keep the user's wording, ≥18/20), ~10 Ask questions (≥9/10 cite real days, abstain when empty), ~10 reflections (≥9/10 invent nothing). Record the numbers in a new session note.
9. **3.10 privacy (P0, manual):** run the whole loop with a network monitor (e.g. `Get-NetTCPConnection`/Wireshark) → **zero** outbound calls except `127.0.0.1:11434`. Save the log/screenshot as evidence.
10. When 1–9 pass → mark CI-3 `verified`, commit and tag `checkin-3` (verifier only). Phase 4 is packaging only.

**Not started:** 3.11 light mode and 3.12 manual E4B↔E2B switch (both P1 — the P0 build took the whole session).

---

### Verifier — Check-in 2, 21 Oct 20:05

**Wiring fix (verifier):** Phase 2 components were built but never mounted. Wired `SetupFlow` (tier → download / Open Vayu), `MorningIntention`, and `BrainDump` into `App.tsx`; `get_config` now returns `tier` / `aiEnabled` / `intention`. Owner smoke: intention + dump tasks landed in today's note. UX is thin but features are present.

**Tagged:** `checkin-2`. **Commit policy:** added `AGENTS.md` — default no commits; UI must be mounted before `review`.

**Phase 3 unblocked.**

---

### Phase 2 session — first-run tiers, download, Morning Intention, Brain Dump → Tasks, 22 Oct (coding agent)

All Phase 2 P0 tasks (2.1–2.11) are `review` with tests first; `npm run check` is green (172 frontend + 62 Rust, lint/tsc clean). Tree is clean; all work committed in `test(<id>)`/`feat(<id>)` pairs. Nothing pushed; `checkin-2` is NOT tagged (verifier only).

**What was built:**
- **2.1/2.2 Hardware check + tier logic:** `sysinfo`-based `hardware_check` command (RAM, disk, CPU, OS, tier, model, size, Ollama presence on 127.0.0.1:11434). Pure `tier_for()`: Green ≥16 GB RAM && ≥10 GB disk → E4B (~7.5 GB); Yellow 8–15 GB && ≥8 GB → E2B (~5.6 GB); Red → no chat. Debug-only `VAYU_DEV_TIER` override, never in release. Boundary unit tests at exactly 8/16 GB RAM and 8/10 GB disk.
- **2.3 Tier result screen:** Plain words per tier, PRD first-run copy ("Download now" / "I already have Ollama" / "Continue without AI"), specs under Details, one primary action. 5 tests.
- **2.4/2.5 Resumable model pull:** `run_pull` streams Ollama `/api/pull` NDJSON as `PullEvent::progress`; `pull_model`/`cancel_pull` commands; one pull at a time (`Busy` otherwise); cancel aborts via `AbortHandle`. Tests against a raw TCP mock server (progress, cancel, timeout, error lines).
- **2.7 Post-download verification:** `verify_install` runs one generation + one embedding (`embeddinggemma`); generation failure hard-fails, embeddings failure soft-fails (`embeddings_ok: false`).
- **2.8/2.9 Morning Intention:** 3 questions + one-tap Skip; streams intention line + Top 3 tasks; saved once per day via `append_note` + `mark_intention`; no re-nag same day. `parseIntention` in `src/lib/intention.ts`. 4 tests.
- **2.10/2.11 Brain Dump → Tasks:** Streamed extraction → editable preview → insert only after user confirms (nothing written unconfirmed). Extractor guardrails: preserves user wording, NO_TASKS for feelings-only dumps. 4 tests.

**Contract:** `src/lib/api.ts` extended with `hardwareCheck`, `pullModel`, `cancelPull`, `verifyInstall`, `updateConfig`, `markIntention`, `appendNote` — all camelCase, `Channel` for progress events, 12 contract tests.

**Not built (deferred):** 2.6 skip-download-when-present frontend flow wiring (tier/download screen integration); the full first-run flow orchestration (tier → download → intention → dump) in `App.tsx`. These are integration work for Check-in 2.

**What the verifier should do for Check-in 2:**
1. Fresh profile (delete `%APPDATA%\app.vayu.desktop\config.json`), launch `npm run tauri dev`.
2. First-run: hardware check → tier screen (Yellow on this PC → E2B ≈ 5.6 GB).
3. Download screen: progress + cancel work (no actual model pull needed — Ollama not installed on dev PC).
4. Morning Intention: 3 questions → Skip, then reopen same day → no re-nag.
5. Brain Dump: type a dump → Extract tasks → preview/edit → Insert → tasks appear in the note.
6. `npm run check` must stay green (172 FE + 62 Rust).

**Relaunch line:** `npm run tauri dev` (with `$env:VAYU_DEV_TIER="Yellow"` if forcing Yellow, or `Green`/`Red` to test tiers).

**Next:** verifier runs Check-in 2 (fresh profile → tier → download → intention → dump) and tags `checkin-2`. Phase 3 starts after.

---

### Verifier — Check-in 1, 21 Oct 16:27

**Committed:** `802554e` — Phase 1C Rust + 1D layout/smoke fixes + window close permissions.
**Tagged:** `checkin-1`.
**Evidence:** owner live screenshots — Daily Note (Today, tasks, calendar) + Settings (`Running — Ollama v0.32.14`, Missing PRD tags, `Dev model: gemma4-e4b-fast:latest`, Test AI). Automated 1D.1–1D.3 already green (151 FE + 44 Rust).

**Verified:** 1D.4, SG-1, CI-1. **Phase 2 unblocked.**

---

### Verifier — Phase 1D automated pass, 21 Oct 16:15

**Ran:** `npm run check` → **151** frontend + **44** Rust, lint/tsc clean, no SKIPPED. Spot-checked `proseOf`/`withProse` (tasks preserved on prose edit), rail token 240px, Test AI NoModel copy mentions `VAYU_DEV_CHAT_MODEL`, header `z-index` + editor `margin-top`.

**Verified:** 1D.1, 1D.2, 1D.3 (automated ACs). Later superseded by Check-in 1 note above.

---

### Phase 1D session — smoke-test bugfix, 21 Oct (coding agent)

All of 1D.1–1D.3 are done with tests first; `npm run check` is green (151 frontend + 44 Rust, no SKIPPED). No commits — the whole tree (1C + 1D) is left for the owner/verifier.

**1D.1 Daily Note (layout + double tasks)**
- New pure helpers in `src/lib/tasks.ts`: `proseOf(md)` (note body WITHOUT checkbox lines, fence-aware) and `withProse(md, prose)` (re-merges edited prose with the file's existing task lines, verbatim, after the prose — a prose edit can never delete a task). 10 new pure tests, including round-trip `proseOf(withProse(md, p)) === p` (trailing newlines preserved).
- `DailyNote.tsx`: the editor now gets `proseOf(note.content)` (journal prose only — raw `- [ ]` markdown no longer duplicates under the TaskList); TaskList keeps rewriting the full markdown, so disk stays the single source of truth. A task line typed into the prose simply becomes a task on the next save (documented behaviour).
- CSS: `.daily-note header` is `position: relative; z-index: 1` (the title always paints above the editor) and `.note-editor` is `display: block` with `margin-top: var(--space-2)` — a clear block, no absolute positioning. Pinned by new appStyles tests.
- Two pre-existing DailyNote tests were updated to the new contract (editor shows prose, not raw markdown): the 1.5.4 load test and the 1.8.3 checkbox test. Assertions about SAVED markdown are unchanged.

**1D.2 Calendar rail**
- `--width-calendar-rail: 168px → 240px` in `tokens.css` (only token touched). Flagged deviation: the owner suggested ~200–220px, but real cells need 7 × (2-digit mono text + 2×8px button padding) + 16px rail padding ≈ 238px — at 220 the Sat/Sun column would still clip. The board's 168px sidebar is a scaled mock. New appStyles test pins the token ≥ 220px.

**1D.3 Dev model + Test AI copy**
- The `Dev model: <tag>` line was already live from 1.10.2 (test at `Settings.test.tsx`); nothing to build.
- `TestAi` NoModel copy now reads: “No model installed yet. Install one from the list above, or set `VAYU_DEV_CHAT_MODEL` to use a dev model.” Test updated to pin both parts. Generate order (e4b → e2b → override) is unchanged Rust from 1C.4, still covered by its own tests.

**Relaunch for the re-smoke (1D.4) — exact PowerShell line:**
```powershell
$env:VAYU_DEV_CHAT_MODEL="gemma4-e4b-fast:latest"; npm run tauri dev
```

**What the owner should see:** a clean “Today” header with the serif prose below it and nothing painted over the title; the task “Testing the task!” appears ONCE, as a TaskList checkbox row, not as raw `- [ ]` text in the editor; the full Mon–Sun calendar (and day numbers) fully inside the rail; Settings with the three PRD rows plus `Dev model: gemma4-e4b-fast:latest`; Test AI streams via the dev model, Stop works. Typing prose then saving keeps the checkbox lines in the file (check in Notepad). Also re-verify the 1C smoke steps below if not done yet.

---

### Owner smoke — UI issues, 21 Oct ~15:50

Live `tauri dev` window: folder flow works; notes/tasks persist. Daily Note: title overlaps editor markdown; calendar clips; tasks appear twice (raw md + TaskList). Settings: Ollama Running is real; PRD models Missing is correct for this PC; Test AI blocked without `VAYU_DEV_CHAT_MODEL`. Phase 1D opened to fix.

---

### Verifier — Phase 1C automated pass, 21 Oct 15:45

**Ran:** `npm run check` with cargo on PATH → lint+tsc green, **140/140** frontend, **44/44** Rust, **no SKIPPED**. Spot-checked contract: camelCase config, `dialog:default` capability, exact model tags, Busy/NoModel, NDJSON + Stop tests.

**Also:** `npm run tauri dev` compiled and started `%LOCALAPPDATA%\vayu-target\debug\vayu.exe` (process running). Desktop automation unavailable here, so folder → Daily Note → Test AI click-through is still for the owner.

**Verified:** 1C.0–1C.4, 1.3.2, 1.4.1–1.4.3, 1.5.2–1.5.3, 1.7.1, 1.9.1, 1.10.1, 1.11.1–1.11.2.

**Still open:** CI-1 + SG-1 Daily Note/Settings (need the live window). Working tree still uncommitted (as instructed for the agent).

---

### Coding agent — Phase 1C complete (1C.0–1C.4 `review`), 21 Oct

**No commits made.** Everything is in the working tree for the owner/verifier (as instructed). `src-tauri/Cargo.lock` is newly generated and untracked — commit it with the rest (normal for a Tauri app).

**Toolchain (1C.0)**
- Installed rustup 1.29.1 → Rust **1.99.1 stable-x86_64-pc-windows-msvc**; installed **VS BuildTools 2022 17.14.42** with the `VCTools` workload + Windows SDK (winget, UAC approved).
- Persisted user env: `%USERPROFILE%\.cargo\bin` on `PATH`, `CARGO_TARGET_DIR=%LOCALAPPDATA%\vayu-target` (keeps `target/` out of OneDrive). A fresh terminal inherits both.
- Fixed the scaffold so `cargo check` passes: `main.rs` called `vayu_scaffold_lib` (real lib is `vayu_lib`); `capabilities/default.json` still asked for `opener:default` although the opener plugin is gone — replaced with `dialog:default`; added `tauri-plugin-dialog = "2"` and registered it.
- `cargo check`, `cargo build` (produces `%LOCALAPPDATA%\vayu-target\debug\vayu.exe`), `cargo clippy --all-targets -- -D warnings`, and `cargo fmt --check` all clean. `npm run check` no longer prints `SKIPPED`.

**What was built (all `review`)**
- **1C.1 (1.4.1–1.4.3)** `src-tauri/src/config.rs` + commands `get_config` / `set_notes_dir`. Config is `config.json` in Tauri's app config dir (`%APPDATA%\app.vayu.desktop\`), `{ notesDir, version }`. Missing → `notesDir: null`; corrupt JSON → renamed to `config.bad.json`, `notesDir: null`, no panic. `defaultNotesDir = <Documents>\Vayu`. Choosing a folder: missing folder is created, existing folder kept (`.md` files untouched), a file path → `NotADirectory`. Dialog plugin registered.
- **1C.2 (1.5.2, 1.5.3, 1.7.1)** `src-tauri/src/notes.rs` + `read_note` / `ensure_note` / `write_note` / `list_notes`. Strict `YYYY-MM-DD` + real calendar day (leap years) before any filesystem access, so `../secret` and `2026-10-21.md` → `InvalidDate` and nothing is touched. `read_note` never creates. `ensure_note` creates an empty file only when missing. `write_note` is temp-file + rename with a unique temp name per write, removes the temp on failure, and preserves content byte-for-byte (UTF-8 incl. Devanagari/emoji, CRLF). `list_notes` returns sorted dates of real `YYYY-MM-DD.md` files only.
- **1C.3 (1.9.1, 1.10.1)** `src-tauri/src/ollama.rs` + `ollama_status` / `list_models`. `GET /api/version` on `127.0.0.1:11434` with a hard 1.5s client timeout; refused/non-200/timeout → `NotFound` (with a reason), never throws. `GET /api/tags`; exact tags only (`gemma3n:e4b`, `gemma3n:e2b`, `embeddinggemma` + `embeddinggemma:latest`; quantised variants do not count). `devChatModel` comes from `VAYU_DEV_CHAT_MODEL` in debug builds only. Both HTTP clients use `.no_proxy()` and the `VAYU_OLLAMA_URL` test override only accepts `http://127.0.0.1:…` / `http://localhost:…`, so the app can never be routed to a remote host.
- **1C.4 (1.11.1, 1.11.2)** `generate` / `stop_generation` in `src-tauri/src/lib.rs` + `run_generate` in `ollama.rs`. Incremental NDJSON parser (split lines re-composed, multiple lines per chunk, blank/malformed ignored), `token`/`done`/`error` events over a Tauri `Channel`, model order **e4b → e2b → debug override → `NoModel`**, `Busy` on a second run, first token must arrive within 60s (`VAYU_GENERATE_TIMEOUT_MS` overrides for tests), stop polled every 100ms so Stop lands well under 1s, mid-stream drop → `error` event + `Err(Io, "connection lost")`, timeout → `Err(Io, "timed out")`.

**Tests / checks**
- **44 Rust tests** (config 8, notes 10, ollama 23, state/harness 3) and **140 frontend tests / 24 files**. `npm run check` green; clippy `-D warnings` clean; `cargo build` clean. Rust tests use `tempfile` and real mock servers: `wiremock` for `/api/version` + `/api/tags`, and a raw TCP server for timed NDJSON chunks (token timing, Stop, timeout, dropped connection). No models were pulled or deleted; no outbound calls except `127.0.0.1:11434` in tests.
- **Flake fix (test-only, `DailyNote.test.tsx`):** full-suite runs intermittently failed autosave call-count assertions (expected 1, received 3 or 5). Root cause: the fake-timer helpers never registered a `write_note` handler, so every save rejected and armed a retry timer that could leak past `vi.useRealTimers()` into later tests. Fix: `tauri.given("write_note", null)` in the helpers plus `vi.clearAllTimers()` before `vi.useRealTimers()` in teardown. Assertions are unchanged (not weakened); after the fix **5/5 full runs and 3/3 DailyNote runs** passed. No app behaviour changed.

**Smoke test for the verifier (`npm run tauri dev`)**
1. Fresh terminal (PATH/CARGO_TARGET_DIR already persisted). Run `npm run check` → expect 140 + 44 passing, **no `SKIPPED`**.
2. `npm run tauri dev` → first-run screen. Default path shows `<Documents>\Vayu`; use **Choose folder…** (dialog now real) to pick/create a folder, then **Continue**.
3. Check `%APPDATA%\app.vayu.desktop\config.json` contains `notesDir` + `version`.
4. Daily Note opens on today. Type a few words; after ~700ms the file `<notesDir>\YYYY-MM-DD.md` appears with the exact text. Reopen/restart → text is still there. Viewing an empty day must **not** create a file (only typing does).
5. Settings (gear) → model status. With Ollama running: `Running — Ollama v…` and the three tags as Present/Missing; stop Ollama and press Refresh → calm `Not found` + reason. Test AI: send a prompt → tokens stream in; **Stop** returns to idle within ~1s; no model installed → calm `No model installed yet`.
6. Corrupt-config check: quit, overwrite `config.json` with `{not json`, relaunch → first-run again and `config.bad.json` exists.
7. Optional: `echo $env:VAYU_DEV_CHAT_MODEL` set to a dev tag (debug build) shows `Dev model: …` in Settings and is used only when neither PRD chat model is installed.

**Blockers:** none. **Next:** verifier runs the smoke test + SG-1 screenshots; Phase 2 has not been started.

---

### Verifier — SG-1 partial, 21 Oct afternoon

Opened `http://localhost:1420/` in the in-app browser. First-run matches the spec: Ink page `rgb(14,17,22)`, centered Surface card, 12px radius, Inter 22/700 heading, muted body, JetBrains Mono path field, ghost "Choose folder…", Breeze pill Continue (`rgb(94,234,212)` on `rgb(6,35,31)`). Fonts are actually loading.

Daily Note, calendar, tasks, and Settings never render: without Rust, `get_config` fails and the app stays on first-run. Newsreader and the checkbox styling were not seen. SG-1 stays open.

---

### Phase 1B visual pass — 2026-10-21 afternoon

**Done (all TDD, `test(1B.x)` → `feat(1B.x)`, 1B.1–1B.4 now `review`; SG-1 stays `todo` for the verifier):**
- **1B.1** — `src/main.tsx` imports `./App.css` (after tokens.css). New `src/styles/appStyles.test.ts` pins the import itself, the failure class the verifier caught (styles on disk, dead in the running page).
- **1B.2** — all 11 `@font-face` rules moved ABOVE `:root` in `tokens.css`; a brace-counting test in `fonts.test.ts` fails while any `@font-face` sits inside `:root`. Old font-file tests untouched and green. (One `test(1B.2)` fix commit: the face count matched the word in comments too — now counts `/@font-face\s*\{/` openers only.)
- **1B.3** — restyle only, no behaviour changes. First-run: centred Surface card (12px radius, border-card edge) on Ink, Inter heading, muted body, JetBrains Mono path field, **Continue = Breeze pill** (`--color-breeze` bg / `--color-on-accent` text), **Choose folder… = ghost pill** (border token, no fill). Daily Note: Surface calendar rail (168px, from the board) beside the Ink column, stacks below 700px; month heading small-caps muted; Monday-first mono grid — today Deep Teal bg + on-accent text, noted days bold Text, empty days Muted; date line mono 12px uppercase muted; "Today" title Inter 22/700; body Newsreader 16px lh 1.5; custom checkbox 16px/5px radius (unchecked = checkbox-border token, checked = Deep Teal fill + ✓, done text line-through at 0.55 opacity); quiet muted gear; Settings = Surface card, Test AI = Breeze pill, AI reply in italic Newsreader. **No Warm anywhere** — the guard now also bans `var(--color-warm)` outside tokens.css (closes the 1.3.1 gap note). Two new tokens, both flagged below.
- **1B.4** — `Calendar.tsx` week rows now `key={i}` (was one shared key; a new render-time test spies `console.error` and fails on React's duplicate-key warnings — caught 4 live warnings before the fix); `console.log` removed from the `TestAi.tsx` catch (static no-`console.log` guard test).

**Final state:** `npm run check` green — **140 tests / 24 files**, lint + tsc clean, Rust step prints `SKIPPED: cargo not installed`. `vite build` clean (fonts bundle as local woff2). Dev server smoke-checked: `http://localhost:1420/` serves both stylesheets with `@font-face` at top level. Git history is clean TDD; working tree clean.

**Screens to open for the screenshot gate (SG-1):**
1. **First-run** — `npm run dev`, open `http://localhost:1420/` in a plain browser (no Tauri runtime → `get_config` fails → the folder screen shows). Centred Surface card on Ink.
2. **Daily Note** — needs a notes dir, which needs Rust (`get_config`/`set_notes_dir`). Without Rust the browser always shows first-run. To eyeball the Daily Note early, run `npm run tauri dev` once Rust exists and set a folder; sidebar = calendar (today teal), main column = mono date line, "Today", Newsreader body, task checkboxes.
3. **Settings** — gear top-right (quiet, muted); Surface card; Model status + model list; Test AI pill.

**Could not fully match from the board / flagged:**
- `--width-calendar-rail` narrowed 240px → **168px** (the board's dark mock uses a 168px sidebar).
- `--text-note: 16px` added for the note body (now.md says "about 16px"; the board shows 15.5px on a 13px-scaled mock — one token to change if the owner disagrees).
- The board's AI bar and Backlinks section are Phase 3 — space is left, nothing built.
- The checked-checkbox ✓ is drawn with `::before` on an `appearance: none` input — works in Chromium (WebView2); verify visually in SG-1.

---

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


### Verification pass — feature re-mapping on the new UI (25 Oct, GLM agent) *(reconstructed after an writing-accident truncated the log; authoritative decisions are in plan.md changelog)*

Re-mapped every planned feature against the redesigned Reflect-style UI. Verified done: morning/evening dialogs (Morning Intention + Evening Reflection), Dark/Light/System theme, Tasks (check/add/open + Brain dump), search/Win+K and Win+N labels, wiki sage chips + backlinks rail, Ctrl+B/I and format bar, calendar day-opening (now a week strip). **Only true gap found: wiki `[[` autocomplete** — assigned to kilo (completed same day, see below).

- **Item 2 (keyframes, hermes):** `@keyframes fadeIn/riseIn/blink` + utility classes + panel entrances appended to App.css inside `prefers-reduced-motion: no-preference`; `--motion-fade` (200ms) confirmed in tokens.css. Accepted.
- **Item 4 (token reconciliation docs, hermes):** plan.md Decisions row + new-design-system.md section; Emergent 50-950 scale canonical. Accepted.
- **Item 3 (responsive, opencode):** 1050px healthy. 760px: first hermes pass looked better but live orca-browser click tests exposed a dead selector — drawer CSS targeted `.journal-sidebar`, which does not exist in the DOM (real sidebar: `nav.app-nav`, App.tsx:339). Hermes re-targeted (all 4 sites + tests), appStyles 12/12, and the drawer was re-proved live: opens/closes via the topbar toggle, calendar legible, no clipping. Accepted.
- **Item 5 (companion copy):** KEEP (owner-delegated). The muse-style chips ("What made this feel cosy?") are generated locally by the model at runtime — the code's constant fallback is the generic pair ("What is the emotional thread?" / "Summarize this entry"); nothing to revert in code.
- **Item 6 (760px mobile fix, hermes): covered by item 3 verification above.**

---

### Kilo — `[[` autocomplete accepted (25 Oct)

Completion report verified independently: `src/lib/wikiAutocomplete.ts` (+11 pure unit tests), Editor dropdown integration (listbox/option, Enter insert, Esc close, ArrowUp/Down cycling with preventDefault), DailyNote + App wiring of `wikiTargets`. 22/22 in my own vitest run; colour-guard clean (zero hex literals in Editor.tsx); exactly the claimed file set; no commits.


## Session note — check-gate closure + coordinator repairs (25 Oct, GLM agent; owner asleep, GO delegated)

**Board state: ALL re-mapped feature items delivered, verified, accepted.**

- kilo · item 1 (wiki [[ autocomplete): verified — 22/22 in my own run, wiring App → DailyNote → Editor confirmed, zero hex literals, exact claimed file set, no commits.
- hermes · items 2 (keyframes), 4 (token reconciliation docs), 6 (760px drawer): all accepted, including the live orca-browser drawer proof (dead .journal-sidebar selector caught by click tests → fixed to nav.app-nav → drawer opens/closes with legible calendar, verified same day).

**`npm run check` is GREEN end-to-end** (lint / typecheck / vitest 268/268 / cargo test:rust). Owner commit 4aec4d6 was itself failing 4 of these tests and carried the TokenPage duplicate render — full attribution in plan.md changelog (worktree-at-HEAD method, not trust).

**Coordinator repairs (small, mechanical, owner-delegated via "go do 1"):**
1. CompanionPanel.tsx:70 lint fix — date-change suggestion reset folded into the readNote promise callback (identical behaviour; live-verified: companion resets to generic chips on switching to an empty entry).
2. App.tsx encoding repair — 3 em-dashes + 1 ellipsis were pre-today mojibake; window title now really says “Vayu — Today”.
3. Two event-type fixes (App.tsx onKey, Editor.tsx drag-select) — globalThis-native types for window listeners.

**Test ↔ delivered-design alignment (acceptance semantics unchanged):**
- launch: ensure→read asserted by ORDER (app now fetches tasks in between for the nav badge).
- midnight: heading expectation = delivered long format (“Thursday, October 22, 2026”).
- calendar click: delivered week-strip label (regex /mo\s*19/i) — open-behaviour live-verified in the orca browser.
- TokenPage: name/value assertions scoped per swatch row; tokenData.ts last-wins dedupe (one swatch per token name).
- tokens.css light block: last leftover alias --color-flow-save-rest → var(--color-accent-400).

**For the owner when they wake (verifier pass):**
1. `npm run tauri dev` smoke: type [[ in the editor (autocomplete + Esc), narrow the window (drawer toggle), click a calendar day.
2. Phase 3 gates remain: 3.9 golden-set evals, 3.10 privacy test, then the checkin-3 tag.
3. No commits were made by anyone; tree left dirty (42 entries); owner's staged files untouched. kilo may be restarted freely to load the hardened config.


---

## Smoke-test round 2 — assigned (26 Oct morning, owner feedback, opencode coordinating)

Owner smoke findings (7) + the Reflect reference project. NEW agent terminals (post-server-restart): kilo term_855a63ee-c561-496a-8f52-ec9f68cc5719, hermes term_d3839356-cd48-4f08-a036-4b2c122a98fb, opencode term_9c90903b-4cc2-4783-a914-c6bdb507004f. Briefs delivered 26 Oct.

**kilo - editor interaction pack** (one completion report per item; no commits):
1. P0 ghost/double selection render in the editor (stray half-block artifact) - single selection/caret path.
2. P0 arrow keys inert in the editor (prose + task widgets caret mapping).
3. Enter auto-continue: bullets / numbered / task checkboxes; empty-item Enter removes the marker (Obsidian behaviour).
4. Formatting shortcuts Ctrl+B / Ctrl+I in the editor (format bar works, keys do not). No Tab binding.
5. Done-task strikethrough in the EDITOR rendering (muted + line-through).
6. P1 native shortcut parity Ctrl+C/X/V/Z/Y; explicit undo stack if React value replacement breaks native undo. Ctrl+K = insert [[link ]] as stretch.

**hermes - Tasks view CSS + Reflect reference project**:
A1. Tasks view fullscreen misalignment (Brain Dump card floats; chips/add-row/list offset) - one centred column on --width-note-column.
A2. Dead padding under Brain Dump card before filter chips.
A3. Done-task strikethrough in TaskList rows (list view only).
B. Reflect project (owner-supplied): read C:\Users\samon\Downloads\reflect-agent-spec.md + reflect-ui-mockup.html; Section 3 = tour + acceptance checklist (report pass/fail per step with failing selector); implement Sections 4-5; build ONLY Section 6's 5 items in order: (1) Backlinks + Suggested links rail (keep Local Companion), (2) real Tasks aggregation with two-way sync, (3) Map graph, (4) real command palette with natural dates replacing the dead search box (no second search UI), (5) slash menu ([[ autocomplete already shipped). Constraints: dark sage look unchanged, Daily Reset / energy check-in / Local Companion stay, NO timers. Local markdown via Rust stays the only data layer.

**opencode (me) - coordination + verification**:
- Keyboard-shortcut contract compiled from Obsidian research (~53 curated defaults; journal-relevant core: c/x/v/z/y, Ctrl+Shift+V P2, Ctrl+B/I, Ctrl+K link, Enter list continuation, arrows, Tab indent P2) - delivered to kilo inside the brief.
- Live orca-browser verification of every completion report; independent Section 3 tour cross-check of the mockup; gatekeeping [kilo perm]/[hermes perm].

House rules unchanged: no commits/staging, check green per agent's own code, plan-before-edits, ONE completion report per item.

---

## 3.9/3.10 gates + Part A/tour verification (25 Oct session, opencode)

**Channel (owner request 'agents can't reach me'):** orchestration mailboxes are the channel. Tested round-trip both directions; cards sent; hermes read + replied via mailbox (her Section 3 tour landed in opencode's inbox = first production end-to-end proof). Terminal-tail reading remains a fallback. Handles: kilo term_855a63ee..., hermes term_d3839356..., opencode term_9c90903b....

**hermes Part A - VERIFIED (claim-by-claim):** .task-filters/.task-group/.task-composer all max-width: var(--width-note-column) (App.css 3042/3065/3088); .task-list spacing tokenised; .task-list li.task-done input text line-through + var(--color-muted) (737-741). Her report: 268 FE + 73 Rust tests pass. 1920w live screenshot check deferred to next tauri dev run (verifier step, non-blocking).

**hermes Section 3 tour - ACCEPTED after independent cross-verification:** all cited selectors confirmed present in reflect-ui-mockup.html (46 key matches). Step 4 finding adjudicated: SPEC BUG, not mockup bug - spec says button[data-task="t1"], mockup reality is <li class="todo" data-task="t1"> (7 rows, no button variant exists). Mockup = authority. 9 steps PASS + this 1 spec-typo row.

**GO issued:** Section 6 item 1 (Backlinks + Suggested links rail upgrade; keep Local Companion; plan message required before edits).

**kilo:** still processing the 6-item editor brief; mailbox card unread; tail shows him working through it. Reports visible either in mailbox or terminal tail.

**3.10 privacy: STATIC HALF DONE + CLEAN.** New tool scripts/privacy-static-audit.mjs: 99 files scanned; 0 violations; all 14 URL literals resolve to 127.0.0.1/localhost; 3 negative-test fixtures correctly allowlisted (ollama.rs tests assert example.com/192.168.x/127.0.0.1.evil.test URLs are REJECTED); api.ts = 2 invoke, 0 fetch, 0 XHR. Note: base_url_from hardening + bypass test already in code. Runtime half scripts/privacy-runtime-watch.ps1 ready (dry-run OK, 0 violations on idle); live-loop run pending next tauri dev session + owner/agent drive.

**3.9 golden-set: KIT BUILT (live run still pending - Ollama was DOWN this session).** golden/ = 5 seed day-notes (2026-10-19..23 fact matrix), brain-dumps.json (20: 17 actionable + 3 ramble/NO_TASKS), ask-evals.json (10 Q, expected days + keywords, aq-05 honest-status trap), reflect-evals.json (10 incl. invent-decoy tokens + empty-day trap 2026-10-24), README (install steps). scripts/golden-eval.mjs runner (--eval extract|reflect scripted; ask = in-app checklist; prompts copied VERBATIM from BrainDump.tsx / EveningReflection.tsx with source pointers; model autodetect gemma*). Runbooks: docs/testing/golden-set-evals.md + docs/testing/privacy-test.md. Thresholds unchanged: Extractor >=18/20 wording, Ask >=9/10 citing real days, Reflection >=9/10 invents nothing.

Test-suite state: nothing regressed - yesterday's closure stands (268 FE + 73 Rust green, hermes independently reports same).

### Verification round: Part A1 FAILS at 1920 (25 Oct, opencode)

Live check via dev app + orca browser tab, `?dev=ui`, viewport exactly 1920x1080, Tasks view clicked open. Measured rects:
- .flow-card.brain-dump.dump-card: 315..1037 (w 722) - .task-list nested INSIDE it (336..1016)
- .task-filters / .task-composer / .task-group: 585..1265 (w 680 = 640 column + padding)
- Two overlapping clusters => NOT one centred column (matches owner's smoke screenshot defect).
Ancestor chain: .task-list is inside section.brain-dump.flow-card.dump-card > div.daily-flows > section.note-column > div.journal-workspace; filters are siblings under .daily-flows. Outer layout offsets the right cluster - max-width tokens alone cannot fix A1.
Verdict: A1 FAIL (A2 spacing + A3 strike verified OK earlier). Fix-round brief sent to hermes (mailbox + PTY): pause Section 6 item 1, single centred column wrapper for the tasks view, reply plan first. Re-measure on report = accept/reject.
Before-evidence: golden/reports/part-a1-before-1920.png (screenshot; tiled pane capture, defect visible).

### Permission decisions (opencode, same round)

- kilo [perm] Remove-Item src/components/debug.test.tsx - APPROVED + EXECUTED by coordinator (verified: his own temporary always-throwing selection probe; diagnosis kept: React maps onChange to input event, tests must use fireEvent.input). kilo was stuck at a CLI modal; cleared for him. Told via mailbox + PTY; mailbox card re-sent (3 unread for him).

Dev app relaunched in background for checks (tauri dev, CARGO_TARGET_DIR per house rules); browser tab at localhost:1420/?dev=ui viewport 1920x1080 left open for re-measurement.

### Assignment frozen (owner go-ahead, 25 Oct afternoon)

- kilo: order (2 arrows FIRST - owner blocked live) -> 1 ghost selection -> 3 Enter auto-continue -> 4 Ctrl+B/I (+Ctrl+K stretch) -> 5 editor strike -> 6 P1 native parity/undo. Fidelity ref: docs/reflect-mockup-research.md sections 4-5.
- hermes: A1 fix round NOW (single centred column; re-measure = accept/reject) -> Section 6 items 1-5 in order, with the research doc's contracts (two-way id sync, palette spec, slash template verbatim, calendar flash). Keep-list non-negotiable.
- deep mockup research shipped: docs/reflect-mockup-research.md (behaviour engine, compare charter, palette/slash/tasks contracts, line-referenced).
- coordinator evidence loop: mailbox reports -> independent re-verification (measurements / grep / tests / live browser) -> accept.

### Verification round: A1 v2 + arrows live evidence (opencode, 25 Oct afternoon)

- DEV CHAIN: first `tauri dev` died during kilo's in-flight Editor rewrite (transient `focused is not defined` crash + parse error churn). Restarted in background (sh_172518ce4001u5v1JFd3d485um); vite + vayu.exe back up.
- A1 v2 (hermes fix): structure FIXED - one .task-column 585..1265 (680w), stacked kids, two-cluster nesting gone. STRETCH still broken: children form a centred pyramid (lefts 585/849/813/753/772; brain-dump w680 but filters w151, composer w224, groups w343/w307). ROOT CAUSE: .task-filters/.task-group/.task-composer keep legacy `max-width + margin: 0 auto` - auto cross-axis margins disable flex stretch. Mockup authority: .col children run full width at the left edge (mockup L163/L252). Precise fix + measurements sent to hermes; awaiting A1 v3.
- ARROWS (owner P0): repro'd on the REAL Editor in ?dev=ui (Morning pages dummy, 206 chars, 8 lines). .note-caret visible with sane rect, so caret.hidden early-bail is NOT the bug. MEASURED: ArrowDown moves (8 -> 20 -> 21); ArrowUp never moves up (stays 20; then 21 -> 22 = moves DOWN) - caretY +30.4px per press in BOTH directions => the geometric handler lands one line below on up. Sent to kilo with the rAF/value+lineMetrics staleness hypothesis + fallback design. One earlier run also showed +1 char per arrow press in the value (201->205, transient HMR state, not reproducible) - flagged that arrows must leave value byte-identical.
- kilo progress visible in terminal: Enter auto-continue under TDD; found fireEvent.keyDown(Enter) does not reach commit on his WIP (0 onChange calls), rewrote tests with userEvent; deleted another temporary debug probe.

### Owner decisions on Tasks view (25 Oct, from real-app screenshots)

- REMOVE the 'Add a task for today' composer from Tasks view (mockup authority: no composer; tasks come from Brain Dump + note task-lines only). Folded into hermes's A1 v3 pass: tests flip to assert absence, dead CSS deleted.
- STRIP raw markdown from task-group source titles ('Wed, Oct 21 . ## Tasks - Wed 21 Oct 2026' -> 'Wed, Oct 21'; sanitize leading #{1,6} markers, small pure helper + unit test).
- Design-system watch: composer's raw UA input was the trigger; hermes re-eyeballs remaining new controls for un-tokened styling. Owner reminded all new UI stays token-only.
- A1 v3 acceptance now = stretch fix + composer removal + clean group titles; re-measure five rects + fresh 1920 screenshot for owner.

### Owner bug: done tasks never strike in Tasks view

- Root cause (opencode): .task-board button.is-done (App.css 3194-3215) sets muted colour + filled check box only; no line-through on the Tasks-view surface. Strikes exist only on editor surfaces (App.css 624 backdrop, 737-741 note task-list).
- Fix assigned to hermes inside the same A1 v3 pass: line-through on done rows + unit assertion; gate unchanged (stretch + composer removal + clean titles + strike), one re-measure + owner screenshot on accept.

### Commit + push by owner authorization (25 Oct evening)

- d844b8e pushed to origin/design_upgrades: the STAGED lib slice only (noteLivePreview, noteExcerpts, ritual, suggestions, theme + tests, 9 files / 591 insertions). In-flight agent work deliberately left uncommitted.
- Standing rule reminded to both agents: no commits, no staging; tree stays dirty until verifier accepts slices.
- Open gate: A1 v3 claimed complete (stretch/fix + composer removed + entryLabel() titles + .task-board strike) but with 1 failing test in AppPhase2.test.tsx that still expects the removed composer - must flip to assert-absence before accept. Re-measure + owner screenshot after dev chain restart.

### Commit-all round armed (owner, 25 Oct evening)

- Owner instruction: after the composer test is flipped to assert-absence (correct per the removal), commit and push ALL current changes.
- Flow: hermes fixes AppPhase2 test -> green check -> FREEZE both agents -> grouped commits (tasks-view fix slice; editor slice if check-clean; docs/eval-kit slice) -> push -> UNFREEZE.
- kilo warned to reach a coherent test state; docs (reflect-mockup-research.md, testing runbooks, golden/, scripts/, board files) batched as a docs commit.

### Commit-all round executed (owner order, 25 Oct evening)

- npm run check independently re-run at freeze: 287 FE / 73 Rust green (1 lint warning).
- 5 commits pushed (d844b8e..a1e3138): 26e3938 tasks-view (hermes A1 v3 full set), 37b2ed7 editor in-progress + known-issue note (kilo caret/wiki autocomplete), 3f910e1 rail groundwork pre-verify, 7ebc811 + 5b36112 design/token polish, a1e3138 docs/eval-privacy kit.
- Agents UNFROZEN with resume orders: hermes -> A1 v3 verdict then item 1; kilo -> arrows (evidence msg).
- Open gates: A1 v3 re-measure; arrows live test; item-1 verification; 3.9/3.10 live runs still blocked on Ollama.
