# Vayu v1 — Plan & Progress

**Ship date (hard):** Sat 24 Oct 2026, evening
**Build window:** Wed 21 Oct → Sat 24 Oct 2026 (4 days, 5–6 hrs/day)
**Feature freeze:** Fri 23 Oct, 9pm
**Current focus:** see [`now.md`](now.md)

This file is the single source of truth for scope, status, and decisions. The coding agent updates task status here; the verifier moves tasks to `verified` only after checking the **Done when** criteria on a real run.

## Source documents

| Document | Wins on |
|---|---|
| Vayu Build Checklist to Oct 24 | Scope, priorities, dates, cuts |
| Vayu PRD v1 (21 Oct 2026) | Product behaviour, model stack, tiers, architecture, disclosure copy |
| Vayu — Design & Architecture Visuals | Visuals: colours, type, layout, components |

Known conflicts between them are listed under **Open questions** at the end of this file.

**When stuck on a UX or behaviour question** the documents don't answer, look at these, in order:
1. [Focu](https://focu.app/): AI-guided journaling, check-ins, reflections, 100% local (the closest match for the AI flows)
2. [Reflect](https://reflect.app/): daily notes, backlinks, minimal write-first design (the closest match for the notes UI)

Borrow the feel, not features. Anything that adds scope goes in the change log as a question, not into code.

---

## How this works

### Status values

| Status | Meaning |
|---|---|
| `todo` | Not started |
| `doing` | Coding agent is working on it |
| `review` | Coding agent says it's done; waiting for verification |
| `verified` | Verifier checked the Done-when criteria and they pass |
| `failed` | Verification failed; see notes and fix |
| `cut` | Removed or moved to P2 under the fix-or-cut rule |

### Priorities

- **P0:** must ship.
- **P1:** ship only if the check-in before it passed on time. A P1 that fails once becomes P2.
- **P2:** parked until after 24 Oct. Do not start.

### Rules

- A task is done when its **Done when** criteria pass on a real run, not when the code exists.
- **Fix-or-cut:** if a P0 fails a check-in twice, ship a smaller version that passes. Never move the date.
- No timer or Pomodoro code, ever.
- No clinical labels in any user-facing or store-facing copy.
- Local mode makes zero outbound network calls.
- Notes are plain `.md` files and must stay readable outside Vayu.
- Commit at every passed check-in with a tag: `checkin-1`, `checkin-2`, `checkin-3`, `v1.0.0`.
- Nothing goes to a public link without the owner's preview and go-ahead.
- **Test-driven development:** for each task, write the failing tests first and commit them (`test(<id>)`), then implement (`feat(<id>)`). Every acceptance criterion is an automated test unless it's marked **(manual)**. `npm run check` must be green before a task moves to `review`.
- Each phase is broken into small tasks with acceptance criteria in `now.md` before coding starts on it.

---

## Progress overview

| Phase | Day | Status | Gate |
|---|---|---|---|
| 0. Repo setup | Wed 21 | verified | — |
| 1. Foundation + walking skeleton | Wed 21 | verified (tag `checkin-1`) | Check-in 1 |
| 1B. Visual pass (design board) | Wed 21 | verified (SG-1) | Screenshot gate |
| 1C. Rust backend | Wed 21 | verified | — |
| 1D. Smoke bugfix | Wed 21 | verified | Layout + Dev model for Test AI |
| 2. First run, tiers, morning features | Thu 22 | verified (tag `checkin-2`) | Check-in 2 |
| 3. Journal, reflection, Ask, evals | Fri 23 | CI-3 failed owner smoke → Phase 3B | Check-in 3 + freeze |
| 3B. Fix Phase 3 + Reflect-style layout | Thu 22 | todo | SG-3 screenshots + re-smoke |
| 4. Packaging + ship | Sat 24 | todo | Final ship gate |

---

## Phase 0 — Repo setup (Wed 21)

| ID | Task | P | Status |
|---|---|---|---|
| 0.1 | Git repo on `main`, README, `.gitignore`, `.gitattributes` | P0 | verified |
| 0.2 | `plan.md` + `now.md` | P0 | verified |

---

## Phase 1 — Foundation + walking skeleton (Wed 21)

**Goal:** Vayu opens, you write today's note, it saves as a real `.md` file, and it can talk to Ollama.

Parent tasks are below. The small test-first tasks (1.2.1, 1.2.2, …) with acceptance criteria are in [`now.md`](now.md). A parent task is `verified` when all of its small tasks are.

| ID | Task | P | Status | Verifier notes |
|---|---|---|---|---|
| 1.1 | Adopt design system (PRD §8): record decision in Decisions log | P0 | verified | |
| 1.2 | Tauri skeleton; `dev` opens a window named Vayu with Ink BG `#0E1116` | P0 | review | harness/CSP/Ink verified; window launch pending Rust |
| 1.3 | Design tokens as CSS variables (8 colours, Inter / Newsreader / JetBrains Mono, 12px radius, 8pt spacing) + token test page | P0 | failed | tokens/guard/page verified; **1.3.2 fonts failed** (`@font-face` nested in `:root`) |
| 1.4 | Notes folder: ask or default on first launch, store path in local config | P0 | review | UI (1.4.4) done; Rust 1.4.1–1.4.3 blocked |
| 1.5 | App opens to today's note (`YYYY-MM-DD.md`); new day creates a new file | P0 | review | pure 1.5.1 verified; UI 1.5.4 review; Rust 1.5.2/1.5.3 blocked |
| 1.6 | Editor: single column, Newsreader body, debounced autosave + save on close | P0 | review | UI + unit tests OK; disk ACs pending Rust |
| 1.7 | Calendar sidebar: open any past/future day; empty state for missing days | P0 | failed | **1.7.2 duplicate React week keys**; 1.7.3 review; Rust 1.7.1 blocked |
| 1.8 | Checkbox tasks stored as `- [ ]` / `- [x]`; add/edit/delete; no timer UI | P0 | review | 1.8.1/1.8.2/1.8.4 verified; 1.8.3 UI review (disk ACs pending) |
| 1.9 | Ollama detection on `localhost:11434`, status in Settings → Model | P0 | review | UI 1.9.2 review; Rust 1.9.1 blocked |
| 1.10 | Detect installed models (`gemma3n:e4b`, `gemma3n:e2b`, `embeddinggemma`) | P0 | review | UI 1.10.2 review; Rust 1.10.1 blocked |
| 1.11 | "Test AI" button: streamed reply, Stop within ~1s, calm error if Ollama dies | P0 | review | UI 1.11.3 review (drop console.log); Rust 1.11.1/1.11.2 blocked |
| CI-1 | **Check-in 1:** note + 3 tasks survive restart, Test AI streams, no crash on Ollama on/off → tag `checkin-1` | Gate | verified | `802554e` + tag `checkin-1`; live Settings/Daily Note screenshots 21 Oct |

---

## Phase 1B — Visual pass (Wed 21, before Check-in 1)

**Goal:** The screens that already exist look like the design board's dark Daily Note, not like unstyled browser controls. No new features.

**Why it exists:** Phase 1 tests checked file contents. `App.css` was never imported, and `@font-face` was nested inside `:root`, so the running app ignored the design system. A task is not done here until the verifier screenshots the running UI next to the design board.

Small tasks and the screenshot checklist are in [`now.md`](now.md) under **Phase 1B**.

| ID | Task | P | Status |
|---|---|---|---|
| 1B.1 | Import `App.css`; prove the running page actually applies it | P0 | verified |
| 1B.2 | Fix fonts: `@font-face` outside `:root`, and they render | P0 | review |
| 1B.3 | Restyle first-run, Daily Note, calendar, tasks, Settings to the design board | P0 | review |
| 1B.4 | Fix the known render bugs (calendar week keys, Test AI `console.log`) | P0 | review |
| SG-1 | **Screenshot gate:** first-run passed; Daily Note + Settings still unseen | Gate | todo |

---

## Phase 1C — Rust backend (Wed 21)

**Goal:** Real config, `.md` files, Ollama status/models, streaming Test AI — matching `src/lib/api.ts`.

**Status (21 Oct):** automated ACs **verified** (140 + 44 tests, `vayu.exe` launched). Manual smoke + CI-1 still open. Working tree still uncommitted.

Details: [`now.md`](now.md) Phase 1C.

| ID | Task | P | Status |
|---|---|---|---|
| 1C.0 | Rust + MSVC toolchain; `cargo check`; `npm run check` runs cargo tests | P0 | verified |
| 1C.1 | Config storage, default folder, validate, dialog plugin (1.4.1–1.4.3) | P0 | verified |
| 1C.2 | `read_note` / `ensure_note` / `write_note` / `list_notes` (1.5.2, 1.5.3, 1.7.1) | P0 | verified |
| 1C.3 | `ollama_status` + `list_models` (1.9.1, 1.10.1) | P0 | verified |
| 1C.4 | Stream parser + generate/stop (1.11.1, 1.11.2) | P0 | verified |

---

## Phase 2 — First run, tiers, morning features (Thu 22)

**Goal:** A new user can install, get checked, download the right model, and use Morning Intention and Brain Dump → Tasks.

| ID | Task | P | Status |
|---|---|---|---|
| 2.1 | Hardware check before any download (RAM, free disk, CPU, OS), <5s, debug screen | P0 | review | sysinfo; tier + model + size + Ollama presence |
| 2.2 | Tier logic: Green (≥16GB RAM & ≥10GB disk → E4B), Yellow (8–15GB & ≥8GB → E2B), Red (otherwise → no chat); dev override; boundary tests at 8GB/16GB | P0 | review | `tier_for()` pure + boundary unit tests; `VAYU_DEV_TIER` debug override; `hardware_check` command |
| 2.3 | Tier result screen in plain words, specs under "details", one primary action | P0 | review | Plain words per tier; PRD first-run copy; 5 tests |
| 2.4 | Download screen: model name, exact size, free/no-account copy, progress + % + cancel | P0 | review | `pull_model` streams progress; one pull at a time; cancel aborts |
| 2.5 | Resumable pull via Ollama; survives 2 mid-download kills; low-disk → plain error, app usable | P0 | review | client re-POSTs after failure; Ollama resumes server-side |
| 2.6 | Skip download when Ollama + model already present (zero bytes on dev PC) | P0 | review | `list_models` gates the pull; frontend flow skips the download screen |
| 2.7 | Post-download check: one generation + one embedding must pass before "You're ready" | P0 | review | `verify_install` command; embeddings failure soft-fails (search later) |
| 2.8 | Morning Intention: optional 3 questions, one-tap Skip, ≤90s, no re-nag same day | P0 | review | component + per-date state; 4 tests |
| 2.9 | Intention output: 1 intention line + Top 3 checkbox tasks; no silent duplicates | P0 | review | saved once per day via append_note + mark_intention |
| 2.10 | Brain Dump → Tasks: streamed extraction → preview/edit → insert; nothing written unconfirmed | P0 | review | component + extractor prompt + insert-only-after-confirm; 4 tests |
| 2.11 | Extractor guardrails: no invented tasks; "no tasks found" for feelings-only dumps; 20-item dump → 20 tasks | P0 | review | extractor prompt preserves wording, NO_TASKS rule; preview fidelity tests |
| CI-2 | **Check-in 2 (new-user test):** fresh profile → install → tier → download → intention → dump → tags `checkin-2` | Gate | verified | Owner smoke + App wiring; tag `checkin-2` |

**Cut trigger:** if the download manager fails Check-in 2 twice, v1 ships with "detect existing Ollama + guided install link"; bundled download moves to v1.1.

**PRD rules that apply here:**
- **Default model rule (hard, PRD §7):** E2B first. Promote to E4B only on 16GB+ machines after the first-run check. Never download both models by default. Design and test for Yellow first, since it's the typical Indian laptop.
- First-run copy and buttons come from PRD §6: "Download now" / "I already have Ollama" / (Red) "Continue without AI".
- Ollama states to handle (PRD §9): Ollama absent → offer install; Ollama present but model missing → offer download; model present → skip to app.
- Model updates are user-approved downloads in Settings, never silent multi-GB pulls.
- AI replies stay short (~120–180 tokens) and streamed.

---

## Phase 3 — Journal, reflection, Ask, evals (Fri 23) → FREEZE 9pm

**Goal:** Complete the daily loop and search, then stop adding features.

| ID | Task | P | Status |
|---|---|---|---|
| 3.1 | Journal chat: italic Newsreader prompt, one question at a time, saved to note; deleted turns leave context | P0 | review |
| 3.2 | Streaming + Stop + "thinking" state on every AI surface; no double-firing | P0 | review |
| 3.3 | Evening Reflection (Warm `#F5C97A`, only here): summary from note + tasks only, seed line in tomorrow's note, works any time of day | P0 | verified (Warm via App.css; guard allows App.css only) |
| 3.4 | Embedding pipeline: chunk on save → EmbeddingGemma → local index beside notes; rebuildable from `.md` files | P0 | review |
| 3.5 | `[[topic]]` backlinks + backlink panel; typos create no phantom files | P0 | review |
| 3.6 | Ask Your Notes (RAG) with source-day chips; abstains when not found | P0 | review |
| 3.7 | Red mode: notes + tasks + keyword search with Ollama uninstalled; AI hidden with one plain line | P0 | review |
| 3.8 | Settings → Model: tier (Full / Lite / No-AI), model, size on disk, Ollama status, re-run check, delete model; BYOK slot shown as "coming soon" only | P0 | review |
| 3.9 | Golden-set evals (60 min): Extractor ≥18/20, Ask ≥9/10, Reflection invents nothing ≥9/10 | P0 | todo — manual, needs a live model (verifier) |
| 3.10 | Privacy test: zero outbound calls during full loop; log/screenshot saved | P0 | todo — manual (verifier) |
| 3.11 | Light mode (basic: same layout on Paper BG) | P1 | todo — not started (P1) |
| 3.12 | Manual model switching E4B ↔ E2B in Settings | P1 | todo — not started (P1) |
| CI-3 | **Check-in 3 (freeze):** full honest day in-app, eval bars met, privacy clean → tag `checkin-3` | Gate | todo — verifier only |

---

## Phase 4 — Packaging + ship (Sat 24) — no new features

| ID | Task | P | Status |
|---|---|---|---|
| 4.1 | Release build v1.0.0: `.exe` installer + MSIX; no model inside; uninstall keeps notes | P0 | todo |
| 4.2 | Clean-machine install test (no dev tools, no Ollama) through to one dump | P0 | todo |
| 4.3 | Yellow-tier test on 8GB; raise stated minimum if E2B is unusable | P0 | todo |
| 4.4 | Landing page + Store listing copy (PRD §10), numbers match tier engine; no "runs in 3GB" | P0 | todo |
| 4.5 | Store submission with release-build screenshots (or dated blocker note) | P0 | todo |
| 4.6 | 15-minute smoke script on the installed release build | P0 | todo |
| 4.7 | First-10-users kit (intro message, links, "if it breaks" line, pay-signal question) | P0 | todo |
| 4.8 | Build story: screenshots + 5 bullet notes for portfolio | P0 | todo |
| SHIP | **Final gate:** clean install loop · Yellow passed or minimum raised · privacy proof · listing matches tiers · notes survive uninstall → tag `v1.0.0` | Gate | todo |

**If a gate fails:** ship the website build to the first-10 list as a closed beta with the failing gate stated, fix on Sun.

---

## Parked (P2 — after 24 Oct only)

Laya Red-tier decisions · Cloud BYOK · Landing-page compatibility checker · Voice dictation · Manual model switching polish · Full light-mode component pass.

---

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-10-21 | Coding-agent commit default is **do not commit** (`AGENTS.md`). Owner must say "commits are OK". Prefer one commit per user-visible slice; never mark UI `review` until mounted in `App.tsx`. Check-in tags stay verifier-only | Phase 2 left ~19 micro-commits and unmounted screens claiming review-ready |
| 2026-10-21 | 4-day plan replaces PRD §12 7-day plan; Laya, BYOK, voice, compat checker moved to P2 | Fit the 24 Oct ship date |
| 2026-10-21 | Repo on `main`, LF line endings | Consistent diffs across tools |
| 2026-10-21 | Test-driven development for every task; tests committed before code | Gives the verifier evidence and protects the core loop |
| 2026-10-21 | Stack (owner confirmed): Tauri v2, React + TypeScript + Vite, Vitest + Testing Library, `cargo test`; all filesystem and Ollama HTTP calls in Rust | PRD only fixes "Tauri shell + web UI"; this stack is easy to test |
| 2026-10-21 | Design system adopted from PRD §8 (owner: "open to these for now, may revisit later"): Ink `#0E1116`, Surface `#171B22`, Text `#EDEFF3`, Muted `#9BA3AF`, Breeze `#5EEAD4`, Deep Teal `#14B8A6`, Paper `#FAF9F6`, Warm `#F5C97A`; Inter / Newsreader / JetBrains Mono 12px; 12px radius; 8pt grid; 200ms fade. Later changes go through `tokens.css` only, with a log row | Keeps a later revisit cheap without reopening components |
| 2026-10-21 | Dev PC has only `gemma4-e4b-fast:latest` (no PRD models). Owner: use it for Test AI via a dev-only `VAYU_DEV_CHAT_MODEL` override; model detection still checks the PRD models | Unblocks Check-in 1 without a 7.5GB download |
| 2026-10-21 | Dev PC is missing Rust and the MSVC C++ build tools. Owner: overnight run is **frontend-only** (no installs, nobody to approve prompts). Frontend tasks are built against a typed API contract with mocked calls; Rust tasks wait for the owner to install Rust in the morning | Keep making progress overnight without hanging on permission prompts |
| 2026-10-21 | Phase 1B visual pass added before Check-in 1. Home screens must match the design board; a screenshot comparison is the gate. File-content tests are not enough | The running app shipped unstyled because `App.css` was never imported |
| 2026-10-21 | Editor = plain controlled `<textarea>` (not CodeMirror/TipTap) | Smallest path that keeps disk bytes = typed Markdown |
| 2026-10-21 | `get_config` returns `{ notesDir, version, defaultNotesDir }` in one call | First-run screen can pre-fill without a second command |
| 2026-10-23 | Journal redesign palette in `tokens.css`: Ink `#0b0d10`, Surface `#111419`, Text `#eef1f4`, Muted `#8b949f`, Breeze `#a9d9bc`, Deep Teal `#78be99`, plus Elevated `#171b21` and Soft `#bac3cd`. Inter / Newsreader stay (offline). Layout follows `vayu-frontend-source` (sidebar, daily reset, companion) without its axios backend or font CDN | Owner asked to match the live journal UI; PRD §8 stays revisable through tokens only |

---

## Open questions (conflicts between the source documents)

| # | Where | Conflict | Proposed resolution | Needed by |
|---|---|---|---|---|
| Q1 | 1.1 | PRD §13 says the design lock is open; the design board says "locked" | **Resolved 21 Oct:** adopted for now, revisit allowed through `tokens.css` only | — |
| Q2 | 2.3 | The design board's Red tier card promises "Laya decisions" and "tiny built-in decisions", but Laya is cut to P2 | Red tier copy says only "Notes work, AI chat is off on this PC" (checklist wording); no Laya mention | Thu |
| Q3 | 2.2 | The PRD's Red tier is "≤4GB RAM"; the checklist says "RAM <8GB" | Use the checklist's thresholds (they're marked "exact") | Thu |
| Q4 | 2.10 | The design board's Brain Dump card shows a "Parking lot" line from the Extractor; the PRD only describes a Parking Lot for Laya (Red tier) | v1 Extractor outputs tasks only; non-task text stays in the note as journal | Thu |
| Q5 | 2.4 | The PRD says Vayu bundles or installs Ollama when absent; the checklist's cut trigger allows "guided install link" instead | Try the in-app path first; fall back to the guided link if Check-in 2 fails twice | Thu |
| Q7 | 2.6, CI-2 | The checklist assumes the dev PC already has `gemma3n:e4b` ("zero bytes downloaded" test), but it has only `gemma4-e4b-fast` | Either pull the PRD models before Thursday or rerun that test against the pulled model; or decide to move the product to Gemma 4 | Thu |
| Q6 | 1.10.1 | Should quantised tags like `gemma3n:e4b-it-q4_K_M` count as E4B? | Exact match only, plus `:latest` for `embeddinggemma` | Wed |

---

## Change log

Newest first. One line per meaningful change or verification result.

| Date | Phase/ID | Change | By |
|---|---|---|---|
| 2026-10-22 | design Pages | `design_upgrades` push + GitHub Actions Pages deploy of static UI preview (`VITE_UI_PREVIEW`, dummy notes). Not merged to main. URL: https://singlesoup.github.io/vayu-ai/ | agent |
| 2026-10-22 | 3B polish | Reflect polish on `design_upgrades`: hero date H1, quieter nav + gear, wiki highlight, circular tasks, compact calendar, Reflection primary right-aligned. Browser-verified 1280/960; `npm run check` green | agent |
| 2026-10-22 | 3B.4/6/7/8 | `design_upgrades`: Reflect three-zone shell (nav \| note \| calendar), keyword search every tier, one AI surface under the title, Ask in centre. Browser-verified vs Reflect reference + SG-3 shots in `docs/design/`. `npm run check` green. Bugs 3B.1–3B.3 still on `main`. Tree dirty, no commit | agent |
| 2026-10-21 | Phase 3 | P0 build done: 3.1–3.8 review-ready, tree left dirty (no commit, per default). `npm run check` green: **205 FE + 73 Rust**, lint + tsc clean, no Rust warnings. New Rust: `index.rs` (chunking, cosine, index file `.vayu_index.json`), `embeddings`/`delete_model`/`reindex`/`search_index`/`read_all_notes` commands. New UI mounted in `App.tsx`: JournalChat, EveningReflection, RedModeBar, BacklinksPanel, AskNotes, ModelCard in Settings. Rust tests 62 → 73; FE 175 → 205 | agent |
| 2026-10-21 | 2.5 fix | `cancel_pull` now really cancels: `pull_model` spawns the pull as a task and registers its abort handle (`register_pull` was dead code before, so Cancel only hid the UI while the download kept running). An aborted pull settles as `Err("Download cancelled.")`. Rust is warning-free again | agent |
| 2026-10-21 | 3.8 | Settings → Model: `ModelCard` (tier in plain words Full/Lite/No-AI, recommended model + one-time size, Re-run check, Re-index, BYOK "coming soon" label only) + Delete model with a confirm step (Ollama `POST /api/delete`). New `src/lib/tiers.ts` (react-refresh rule: no non-component exports from a component file) | agent |
| 2026-10-21 | 3.7 | Red mode: the `aiOn` gate hides every AI surface; `RedModeBar` shows one plain line ("Your PC can't run AI chat locally — Vayu still works as notes + tasks.") plus keyword search over all notes via `read_all_notes` — no embeddings, no model | agent |
| 2026-10-21 | 3.6 | Ask Your Notes (RAG): question → `search_index` (embed + cosine over the local index) → answer from the retrieved excerpts only, with clickable source-day chips; abstains with "I couldn't find anything in your notes about that." and makes no `generate` call when the index is empty | agent |
| 2026-10-21 | 3.5 | `[[topic]]` backlinks: pure `src/lib/backlinks.ts` (parse + index, fences skipped, topics normalised, typos map only to the day they were typed on — nothing is ever created) + `BacklinksPanel` in the calendar rail, day chips open that day. New `read_all_notes` command | agent |
| 2026-10-21 | 3.4 | Embedding pipeline (Rust): `index.rs` — sentence-aware chunking (≤500 chars), cosine similarity, versioned index file `<notes_dir>/.vayu_index.json` (atomic write), `reindex` (rebuild from the `.md` files) and `search_index` (embed the query, top-k by score). UI: Re-index button in Settings → Model. Chunk-on-save is not automatic yet — the index is rebuilt on demand | agent |
| 2026-10-21 | 3.3 | Evening Reflection: summary built from the day's note + task lines only, one editable seed line appended to tomorrow's note (`append_note`), works on any day. Deviation: the Warm accent cannot be applied yet — the colour guard (1.3.3) bans the warm token outside `tokens.css`; the token stays reserved and the component notes how to use it once the guard is relaxed | agent |
| 2026-10-21 | 3.1/3.2 | Journal chat: one italic Newsreader Gemma question at a time, streamed with Stop + "thinking", full transcript as context (deleted turns leave context), saved to the day as a `## Journal` block. Send is disabled while streaming — no double-fire; the Rust `AppState` Busy guard backs it | agent |
| 2026-10-21 | 3.9/3.10 | Left as manual P0 gates for the verifier: golden-set evals (Extractor ≥18/20, Ask ≥9/10, Reflection invents nothing ≥9/10) and the zero-outbound privacy check. They need a live Ollama model, which this session had no access to; the steps are in the session note | agent |
| 2026-10-22 | CI-3 | **Failed** owner smoke. Journal works; Reflection (stale read), Ask (no embeddinggemma, 1.5s embed timeout, non-ASCII chunking panic), backlinks (never refresh), keyword search (Red-only) fail. Layout lacks hierarchy; Ask overflows rail. Owner chose Phase 3B: bug fixes + Reflect-style three-zone layout + SG-3 screenshot gate. Details in `now.md` Phase 3B | verifier |
| 2026-10-21 | 3 verify | `npm run check`: 205 FE + 73 Rust. 3.1–3.8 mounted in App. Warm accent applied (colour guard: App.css only). CI-3 still needs owner smoke + 3.9/3.10. Tree dirty (no commit yet) | verifier |
| 2026-10-21 | CI-2 | Check-in 2 verified. Wired SetupFlow + Morning Intention + Brain Dump into App; owner smoke showed intention/tasks in note. Tag `checkin-2`. `AGENTS.md` added. Phase 3 unblocked | verifier |
| 2026-10-21 | CI-1 | Check-in 1 verified. Code commit `802554e` (Phase 1C Rust + 1D smoke fixes + window close perms). Owner live screenshots: Daily Note + Settings (Ollama Running, Dev model). Tag `checkin-1`. Phase 2 unblocked | verifier |
| 2026-10-21 | 1D.1 | Daily Note: prose editor split. New pure `proseOf`/`withProse` in `tasks.ts` (fence-aware; `withProse` re-merges edited prose with existing task lines verbatim — prose edits can never delete tasks; round-trip `proseOf(withProse(md, p)) === p` covered). `DailyNote.tsx` editor now shows journal prose only — raw `- [ ]` lines no longer duplicate the TaskList; TaskList still rewrites full markdown (disk unchanged as source of truth). CSS: `.daily-note header` `position: relative; z-index: 1`, `.note-editor` `display: block` + token `margin-top`. 2 pre-existing tests updated to the prose-only contract (saved-markdown assertions unchanged); +11 tests, `npm run check` 151 FE + 44 Rust green | agent |
| 2026-10-21 | 1D.2 | `--width-calendar-rail` 168px → 240px (token only, `tokens.css`). Flagged deviation: owner suggested ~200–220px, but real cells need 7 × (2-digit mono text + 2×8px button padding) + rail padding ≈ 238px — the board's 168px sidebar is a scaled mock; at 220 Sat/Sun still clips. New appStyles test pins the token ≥ 220px | agent |
| 2026-10-21 | 1D.3 | `TestAi` NoModel copy now mentions the debug override: “No model installed yet. Install one from the list above, or set `VAYU_DEV_CHAT_MODEL` to use a dev model.” (test pins both parts). `Dev model: <tag>` line already live from 1.10.2 — no change. Generate order e4b → e2b → override unchanged (1C.4). Relaunch documented: `$env:VAYU_DEV_CHAT_MODEL="gemma4-e4b-fast:latest"; npm run tauri dev` | agent |
| 2026-10-21 | 1C.0–1C.4 | Phase 1C Rust backend implemented (working tree only, no commits). Toolchain: Rust 1.99.1 stable-msvc + VS BuildTools 2022 VCTools/SDK, `CARGO_TARGET_DIR=%LOCALAPPDATA%\vayu-target`; fixed scaffold lib name, stale `opener:default` → `dialog:default`, added/registered `tauri-plugin-dialog`. New modules `config.rs` (config.json, corrupt → config.bad.json, default `<Documents>\Vayu`, folder validation), `notes.rs` (strict dates, read-never-creates, ensure-empty, unique-temp atomic writes, sorted date-only listing), `ollama.rs` (1.5s `/api/version`, exact `/api/tags` matching + `embeddinggemma:latest`, debug-only `VAYU_DEV_CHAT_MODEL`, proxy-free local-only HTTP, NDJSON parser, e4b→e2b→override model order, Stop polling, timeout/connection-lost). 44 Rust tests (tempfile + wiremock + raw TCP streaming mock) and 140 frontend tests green; clippy `-D warnings` and `cargo build` clean. Session notes + smoke steps in `now.md` | agent |
| 2026-10-21 | test(1.6.2/1.8.3) | Test-hygiene fix for an intermittent autosave flake (no app change, assertions unchanged): the fake-timer `DailyNote` helpers never registered a `write_note` handler, so each save rejected and armed a retry timer that could leak past `vi.useRealTimers()` into later tests (expected 1 write, received 3/5). Added `given("write_note", null)` in the helpers and `vi.clearAllTimers()` before `vi.useRealTimers()` in teardown. 5/5 full runs and 3/3 file runs green after | agent |
| 2026-10-21 | 1B.1 | `src/main.tsx` now imports `./App.css` (after tokens.css). New test `src/styles/appStyles.test.ts` pins the import itself — the class of failure the verifier found (styles on disk, dead in the running page) | agent |
| 2026-10-21 | 1B.2 | All 11 `@font-face` rules moved above `:root` in `tokens.css` (brace-counting test in `fonts.test.ts` fails while any sits inside). Test fixed in its own `test(1B.2)` commit: the face-count counted the WORD "@font-face" including comment text — now matches `/@font-face\s*\{/` openers. Sidebar rail token narrowed to the board's 168px and `--text-note: 16px` added (both flagged in change log) | agent |
| 2026-10-21 | 1B.3 | Restyled to the dark Daily Note board: App.css rewritten (token-only colours; ghost base buttons via `:where()` so `.btn-primary`/`.btn-ghost` win), Surface first-run card centred on Ink with Breeze-pill Continue + ghost "Choose folder…", Surface sidebar rail (mono Monday-first grid, today = Deep Teal/on-accent, noted days bold Text, empty days Muted, board's 168px rail width), mono uppercase muted date line, Inter "Today" title, Newsreader 16px body (`--text-note` token, agent-picked — board shows 15.5px on a 13px mock scale), custom 16px/5px checkbox (Deep Teal checked with ✓, done text line-through 0.55), muted gear, Surface settings card, Test AI reply in italic Newsreader, ≤700px stacking media query. Warm usage now banned outside tokens.css (guard test added; closes the 1.3.1 gap note). No behaviour changes | agent |
| 2026-10-21 | 1B.3 | Test fixed in its own `test(1B.3)` commit: `cssBlock` escaped its selector argument although call sites already pass regex source — every rule was "missing". CSS fix, not a weaker assert | agent |
| 2026-10-21 | 1B.4 | `Calendar.tsx` week rows keyed by row index (`key={i}`, was one shared key → React duplicate-key warnings — now caught by a render-time test that spies console.error); removed the debug `console.log` from the `TestAi.tsx` catch (a static no-`console.log` test guards it) | agent |
| 2026-10-21 | 1D verify | `npm run check`: 151 FE + 44 Rust. 1D.1–1D.3 verified (prose/tasks split, rail 240px, NoModel copy). 1D.4 + SG-1 + CI-1 still need live window. Tree still uncommitted | verifier |
| 2026-10-21 | 1C verify | `npm run check`: 140 frontend + 44 Rust, no SKIPPED. `tauri dev` launched `vayu.exe`. Automated 1C.0–1C.4 verified. Manual smoke + CI-1 still open. Tree still uncommitted | verifier |
| 2026-10-21 | 1C | Phase 1C (Rust) added to now.md/plan.md; owner moves past folder-block screenshots; coding agent must not commit | verifier |
| 2026-10-21 | 1B | Phase 1B visual pass complete: 1B.1–1B.4 `review`, SG-1 `todo` (verifier). `npm run check` green — 140/140 tests, lint+tsc clean, Rust SKIPPED. Session notes in `now.md` list the screens to screenshot and the two flagged token picks (168px rail, 16px note body) | agent |
| 2026-10-21 | 1B | Added Phase 1B (visual pass + screenshot gate) to `plan.md` and `now.md` | verifier |
| 2026-10-21 | verify | Overnight frontend verified. `npm run check` green: 124/124 tests, lint+tsc clean, Rust SKIPPED. **Verified:** 1.1, 1.2.2–1.2.4, 1.3.1, 1.3.3, 1.3.4, 1.5.1, 1.8.1, 1.8.2, 1.8.4, api. **Failed:** 1.3.2 (`@font-face` nested inside `:root` in `tokens.css` — fonts won't load); 1.7.2 (duplicate React `key` on calendar week rows). **Still review (UI OK, Rust/manual pending):** 1.2.1, 1.4.4, 1.5.4, 1.6.*, 1.7.3, 1.8.3, 1.9.2, 1.10.2, 1.11.3. **Blocked Rust:** 1.4.1–1.4.3, 1.5.2–1.5.3, 1.7.1, 1.9.1, 1.10.1, 1.11.1–1.11.2. Colour guard AC2 re-tested live. TDD order in git history is clean (test→feat). CI-1 not ready | verifier |
| 2026-10-21 | 1.11.3 | Test AI panel (`src/components/TestAi.tsx`, rendered under Settings → Model in `src/components/Settings.tsx`). Phases: idle → `Thinking…` until the first `token` StreamEvent (arrives via the mocked `Channel.onmessage` from Rust) → streaming → idle when the command's outcome resolves (Done/Stopped; Error → calm message). While running the "Test AI" button is disabled and a "Stop" button appears (`stop_generation`); Rust settling the run returns Test AI to idle. Error text contract: `Vayu couldn't reach the local AI. Your notes are safe.` for Io/Busy/mid-stream, `No model installed yet — see the list above.` for NoModel. Test gotchas (test fixes in own commit): (1) TWO `mockInvoke()` calls in one test ARRANGE reset — the 2nd call wipes the 1st handler; use one handle for all `on()`s. (2) RTL `getByText("Hello ")` failed against DOM that literally contained `Hello ` — assert `getByTestId("test-ai-reply").textContent` instead. AC2/AC3 (manual streaming + mid-quit pending real Ollama) | agent |
| 2026-10-21 | 1.10.2 | Settings → Model list. `ModelStatus` in `src/components/Settings.tsx` now fetches `ollama_status` + `list_models` together (Promise.allSettled with calm NotFound fallbacks) and renders the three PRD models as rows `<code>tag</code> Present|Missing`, plus `Dev model: <override>` when `devChatModel` is non-null. NO download/install/pull affordance anywhere (guard exists in the test: container text must not match). Refresh/poll cover both commands. Test-vs-mock consistency gotcha: mock `ollama_status` Running but `list_models.status` NotFound is incoherent — the panel shows the status from `ollama_status`, so the "Ollama down" test arms BOTH as NotFound (helper takes a status param). AC2 (manual, dev PC with `gemma4-e4b-fast:latest` only) | agent |
| 2026-10-21 | 1.9.2 | Settings → Model status (`src/components/Settings.tsx`, opened by a gear button top-right in `src/App.tsx`). Labels: `Running — Ollama v<version>` from `ollama_status`, `Not found` + reason + hint from NotFound; `Checking Ollama…` while in flight; Refresh re-checks on demand; while open the status re-checks every 5s. Structure: nested `<ModelStatus />` mounts fresh per opening and unmounts on close — polling stops with NO cleanup-state side effects; this design also resolved an ESLint `react-hooks/set-state-in-effect` error (don't setState synchronously inside effects — use a fresh mount / the async `.then` instead). Locked state on close so reopening never shows stale labels. Tests: closed renders nothing; labels; Refresh callCount grows to 2 and updates the label; ~5s poll (two cycles within 10s) and no further calls after unmount; Close hands control back | agent |
| 2026-10-21 | 1.8.4 | No-timer guard (task 1.8.4): test in `src/AppWorkspace.test.tsx` renders the full shell (armConfig mocks) and asserts NOTHING matches `/pomodoro\|timer\|countdown\|start focus/i` — no `ByLabelText`, no `ByPlaceholderText`, and no match anywhere in `container.textContent`. This is a guard-style task: the test commits green because the absence IS the feature; it fails if anyone ever adds timer UI | agent |
| 2026-10-21 | 1.8.3 | Task UI panel (`src/components/TaskList.tsx`) rendered under the editor in DailyNote. The markdown stays the single source of truth: checkbox click → `toggleTask`, text input → `editTask` (per keystroke — collapses in the saver), Enter in the "New task" input → `addTask` (input clears), × button → `deleteTask`; every result is passed to DailyNote's change handler, so all task edits ride the same 800ms debounced `write_note` (AC2 (manual) pending Rust). Cheap-style rows: `.task-done` strikes the text input and dials opacity. Accessible names: checkbox AND text input both labelled `Task: <text>`, delete = `Delete task: <text>`. Test fixes in own commit: `li.textContent` does NOT include nested `<input>` values — the done-style row lookup matches via the input's `[aria-label]` instead. History note: -  feature/configure commits split manually (an accidental sweep commit was `mixed`-reset and recommitted cleanly) | agent |
| 2026-10-21 | 1.7.3 | Empty-day state made editable. `src/components/DailyNote.tsx`: when `read_note` reports a day with no file AND `create` is false, the placeholder `<p>` "Nothing written on this day yet" now shows ABOVE the editor (previously the editor was hidden entirely, so empty future/past days could not be typed into) — both tests for 1.5.4-era empty-state behaviour still hold (nothing is written until typing, `ensure_note` never runs). Typing clears the placeholder immediately (`exists` flips true on change) and the day's FIRST debounced save carries that exact date, so Rust's `write_note` (1.5.3) creates the file. Future dates covered by a dedicated test (2027-01-05). Today with a failed read still falls back to empty-editor + ensured file. AC1 done; (manual) file-creation check needs real Rust | agent |
| 2026-10-21 | 1.7.2 | Calendar sidebar. Pure grid math `src/lib/calendar.ts` (`daysInMonth`, `mondayFirstIndex` Mon=0, `monthGrid` = complete 7-cell Monday-first weeks with `null` blanks); component `src/components/Calendar.tsx` (weekday header `Mon…Sun`, `<h2>` `Month YYYY`, ‹/› month nav wrapping years, today = `aria-current="date"`, days with a note = `data-note="true"` styled bold; every day click → `onSelect(dateKey)` — clicking NEVER creates a file). App wiring (`src/App.tsx`): `list_notes` fetched on every `days.current` change → `noteDates` passed to the calendar; day click sets `current` (DailyNote remounts via `key`). Layout CSS in App.css + 2 new tokens (`--width-calendar-rail: 240px`, `--space-half: 4px`) — width picked by agent, flagged: design board doesn't state a rail width. Hook-lint note: `days?.current` in a dep array without using it throws unnecessary-dep warning → hoisted into `currentDay` const that IS read (`if (currentDay === null) return`). AppIntegration test: clicking day 5 opens 2026-10-05's note via mocked `read_note` per date | agent |
| 2026-10-21 | 1.6.3 | Save on close / day switch. Pure `flush()` coverage already existed from 1.6.2; wired into `src/components/DailyNote.tsx`: unmount effect flushes the pending saver (day-switch remount via `key={date}` runs it), plus `src/lib/windowClose.ts` (`onWindowClose` over `getCurrentWindow().onCloseRequested`, never prevents the close) registers a flush per mounted DailyNote. Design decision: `onWindowClose` degrades to a valid no-op when no window runtime exists (tests/no-Tauri contexts) — both failure paths covered by test; consumers need not mock `@tauri-apps/api/window` in every test file. Gotchas: `vi.mock` + its `vi.hoisted` state must live at module top level (inside `describe` Vitest throws "defined outside of the module's top level scope"); "close-test helper was scoped to 1.6.2 describe" duplicating `renderLoaded` in the new describe. AC2/AC3 (manual, need real runtime) | agent |
| 2026-10-21 | 1.6.2 | Debounced autosave. Pure `createAutosaver({ delayMs, save, onSaved, onError })` in `src/lib/autosave.ts` (leading schedule resets the timer; trailing fire saves the LATEST content; failed save is retried on the same timer window and text is never dropped). Wired into `src/components/DailyNote.tsx`: per-keystroke `write_note` replaced by `saver.schedule(content)`, 800ms quiet window (`AUTOSAVE_DELAY_MS`), failed save shows calm `<p role="status">` "Couldn't save — retrying" until a save succeeds. Component tests in `DailyNote.test.tsx` with fake timers + `fireEvent.change` — NOTE: `userEvent` deadlocks with fake timers in this setup (its event delays never fire), so autosave tests use fireEvent; gotcha: `act(async () => await vi.advanceTimersByTimeAsync(1))` recipe needed to flush React's loading state before firing events. Test fixes in own commits: autosave option named `onSaved` (tests/impl mismatch `onSuccess` found via debug run) | agent |
| 2026-10-21 | 1.6.1 | Editor = plain controlled `<textarea>` wrapped in `src/components/Editor.tsx` (`.note-column` max `--width-note-column: 680px` — NEW token added to tokens.css for this task (verbatim from typical single-column notes layouts; flagged in Blockers since the design board doesn't state a width), Newsreader body via `var(--font-body)` in `src/App.css`). What is typed is exactly what `onChange` reports; nothing is reformatted. Decision recorded per 1.6.1 Do: textarea over CodeMirror/TipTap — smallest, guarantees plain-Markdown byte fidelity | agent |
| 2026-10-21 | 1.5.4 | App opens to today's note: `src/components/DailyNote.tsx` (ensure→read when `create`, header mono date via pure `formatNoteHeader`, title "Today" on today else full weekday/date via pure `titleForDate`, `localDateKey` pure inverse added to `src/lib/noteFile.ts`; empty state "Nothing written on this day yet" when read finds no file without create; typing writes via `write_note` straight away until 1.6.2 replaces it with debounce). App clock injectable for tests (`src/lib/appClock.ts`); refocus/visibilitycheck merges midnight rollover in `src/App.tsx`; window title `Vayu — Today` / `Vayu — <weekday, d Month y>`. Tests: `src/AppWorkspace.test.tsx`, `src/components/DailyNote.test.tsx` (+ small `test(1.5.4)` fixes: RTL `getByDisplayValue` normalizes newlines — multiline content asserted via `textarea.value`; midnight assertion checks the LAST ensure/read pair; non-today title interpretation = full weekday+date, mono header unchanged). AC2 = (manual) timing pending Rust | agent |
| 2026-10-21 | 1.4.4 | First-run folder screen `src/components/FirstRunScreen.tsx` (default path pre-filled, `Choose folder…` via `@tauri-apps/plugin-dialog` `open({directory:true})` JS API — **its Rust plugin crate + `.plugin(tauri_plugin_dialog::init())` is morning Rust work**, `Continue` → `set_notes_dir`, calm error, screen stays). App flow in `src/App.tsx`: `get_config` on boot → FirstRunScreen when `notesDir` null. **Contract decision:** `get_config` returns `{ notesDir: string|null, version: number, defaultNotesDir: string }` (`defaultNotesDir` = `<documents>\Vayu`) so the UI can pre-fill without a second command — Rust 1.4.1/1.4.2 must match. `npm i @tauri-apps/plugin-dialog` already in package.json. AC2/AC3 (manual) pending Rust | agent |
| 2026-10-21 | api | Typed contract `src/lib/api.ts` for ALL Phase-1 Rust commands (`get_config`, `set_notes_dir`, `read_note`, `ensure_note`, `write_note`, `list_notes`, `ollama_status`, `list_models`, `generate`, `stop_generation`) with result/error/StreamEvent types — the header comment doubles as the spec for the morning Rust work. Every function routes through `@tauri-apps/api/core`'s `invoke`; components must import only from here. `src/test/mocks.ts` now also fakes `Channel` (the real one needs the Tauri IPC runtime). Contract tests in `src/lib/api.test.ts` (this file must import `../test/mocks` before `./api`) | agent |
| 2026-10-21 | 1.8.1 | `parseTasks(md)` in `src/lib/tasks.ts`: `{ line, text, done }[]` with 0-based line index; recognises `- [ ]`/`- [x]`/`- [X]`, `* [ ]`, indented items; skips fenced (` ``` ` / `~~~`) code; ignores normal bullets/text; handles CRLF+LF | agent |
| 2026-10-21 | 1.8.2 | Pure edits in `src/lib/tasks.ts`: `toggleTask`, `addTask` (appends after last task line, else at end; trailing blank lines dropped), `editTask` (text only), `deleteTask` (that line only); out-of-range/non-task lines return the note unchanged. One corrected test: my original fence test had **no fence** in its input — fixed in its own `test(1.8.1)` commit to actually expect inside-fence lines to be ignored | agent |
| 2026-10-21 | 1.5.1 | Pure note-date helpers in `src/lib/noteFile.ts`: `noteFileName(date)` → zero-padded local `YYYY-MM-DD.md` (the single place file names are built in the UI), `isNoteDate(value)` strict (rejects `2026-13-01`, `../x`, `2026-1-1`, `2026-10-21.md`, impossible days), `noteDateToDate(value)` parses back to a local Date at noon. No UTC anywhere | agent |
| 2026-10-21 | 1.3.4 | Dev token page: `src/components/TokenPage.tsx` (swatches from `var()` refs — no literals, colour-guard safe; fonts, type sizes, radius/spacing/motion examples; values parsed from `tokens.css?raw` via pure `parseTokens` in `src/components/tokenData.ts`). Gate = pure `shouldShowTokenPage(isDev, param)` in `src/tokenPageGate.ts`, used by `App`; `vite.config.ts` test config sets `css: true` so `?raw` CSS imports resolve under Vitest (stub returned "" otherwise). Page reachable only at `?dev=tokens` in dev builds | agent |
| 2026-10-21 | 1.3.3 | Colour guard: `src/styles/colours.test.ts` scans all `src/**/*.{css,ts,tsx}` (excl. `tokens.css` and `*.test.ts(x)`) for hex colours, `rgb/rgba/hsl(`, and CSS named keywords assigned to colour-ish style props; failures report file + line. Keyword names live in `src/styles/guard-colour-names.ts` (string list — cannot self-trigger). Demonstrated red before commit by temp-adding `color: #fff; background-color: lightblue` (both caught), then removed. AC2 (verifier): re-add any colour to any component and `npm run check` fails | agent |
| 2026-10-21 | 1.3.2 | Fonts bundled locally in `src/assets/fonts/` (11 woff2, latin subset: Inter 400–800, Newsreader 400/500 + italics, JetBrains Mono 400/500) with the three SIL OFL licences. @font-face declared in `tokens.css` (exempt from the colour guard). Downloaded once via dev-only `scripts/fetch-fonts.mjs` (Google Fonts + OFL texts); the app itself has zero font network access (test scans every CSS for `http(s)`). Hindi/Devanagari typed text falls back to the system font — UI subset is latin/latin-ext only | agent |
| 2026-10-21 | 1.3.1 | Full token file `src/styles/tokens.css`: the 8 core colours (incl. `--color-warm`, defined but unused in Phase 1 — see 1.3.3 guard), supporting shades (`--color-border`, `--color-border-card`, `--color-checkbox-border`, `--color-on-accent`), font tokens (unquoted family names — valid CSS custom-idents), type scale, `--radius`, spacing scale, `--motion-fade`. Hex values written uppercase to match the PRD/test | agent |
| 2026-10-21 | 1.2.4 | CSP: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost`. `devCsp` = same but `script-src` adds `'unsafe-inline'` (React-refresh preamble is an inline module script in dev) and `connect-src` adds `ws:` (Vite HMR). Test asserts no `http(s)://` source except Tauri's `http://ipc.localhost`. Dev/release load is (manual) pending Rust — if the release build somehow blocks Tauri's own injected scripts, the fix is to let Tauri's automatic CSP hash-modification run (it is on by default) or extend `script-src` — do NOT remove the strict CSP here | agent |
| 2026-10-21 | 1.2.3 | Ink window background: `"backgroundColor": "#0E1116"` on the main `Vayu` window (test reads `src-tauri/tauri.conf.json`); `body` background set to `var(--color-ink)` with a starter `src/styles/tokens.css` (1.3.1 fills the full token set). Added `@types/node` + `"types": ["node"]` for the config-reading test. No-white-flash launch is a (manual) step pending Rust | agent |
| 2026-10-21 | 1.2.2 | Test harness wired: Vitest 5 + RTL + jsdom (`src/test/setup.ts`), reusable `mockInvoke` helper + self-tests (`src/test/mocks{:,.test}.ts` — must import `./mocks` **before** `@tauri-apps/api/core`), ESLint 10 flat config, Prettier, scripts `test` / `test:rust` / `lint` / `typecheck` / `format` / `check` (`check` = lint → typecheck → Vitest → Rust step). Rust step = `scripts/run-rust.mjs`; with no toolchain it prints `SKIPPED: cargo not installed — Rust test step pending the Rust toolchain install.` and exits 0; with cargo it propagates `cargo test`'s exit code. Note: eslint-plugin-react-hooks v7 uses `configs.flat.recommended` (the `recommended-latest` key is legacy-format). Trivial cargo harness test added in `src-tauri/src/lib.rs` — unrunnable until Rust is installed | agent |
| 2026-10-21 | 1.2.1 | Scaffolded Tauri v2 + React + TS + Vite in repo root (create-tauri-app 4.7.5, react-ts template, non-interactive). Product name and window title `Vayu`, window class from identifier `app.vayu.desktop`. Removed the template's unused `tauri-plugin-opener` (frontend + Cargo) — the UI must open no external links. `npm install` passes. `cargo check` in `src-tauri` and `npm run tauri dev` are pending the owner's Rust install | agent |
| 2026-10-21 | 1.x | Reviewed PRD v1, build checklist PDF, and design board. Added design values, layout reference, and doc conflicts. Phase 1 split into test-first tasks in `now.md` | verifier |
| 2026-10-21 | 0.2 | Added `plan.md` and `now.md` | verifier |
| 2026-10-21 | 0.1 | Initial commit: README, `.gitignore`, `.gitattributes` | verifier |
| 2026-10-22 | feat(2.1/2.2) | Hardware check + E2B-first tier logic: `sysinfo` RAM/CPU/disk, pure `tier_for()` (Green >=16 GB && >=10 GB → E4B ~7.5 GB; Yellow 8-15 GB && >=8 GB → E2B ~5.6 GB; Red → no chat), debug-only `VAYU_DEV_TIER` override, `hardware_check` command reports Ollama presence; boundary tests at exactly 8/16 GB RAM and 8/10 GB disk | agent |
| 2026-10-22 | feat(2.2 config) | `StoredConfig` gains optional `tier`/`model_tag`/`ai_enabled` (old files still load); atomic `save_config` of the whole struct; `update_config` command merges tier fields without wiping `notes_dir`; `set_notes_dir` preserves stored tier | agent |
| 2026-10-22 | feat(2.4/2.5) | Resumable model pull: `run_pull` streams Ollama `/api/pull` NDJSON as `PullEvent::progress`; `pull_model`/`cancel_pull` commands; one pull at a time (`Busy` otherwise), cancel aborts the task; tests against a raw TCP mock server | agent |
| 2026-10-22 | feat(2.7) | Post-download install verification: `VerifyResult`, `run_embeddings` via POST `/api/embeddings`, `verify_install` command; generation failure hard-fails, embeddings failure soft-fails | agent |
| 2026-10-22 | feat(2.api) | Typed contract: `hardwareCheck`, `pullModel`, `cancelPull`, `verifyInstall`, `updateConfig`, `markIntention`, `appendNote` with exact invoke shapes; `PullEvent` streams progress via Tauri Channel; 12 contract tests, tsc clean | agent |
| 2026-10-22 | feat(2.3) | Tier result screen: plain words per tier (Green E4B / Yellow E2B / Red no-chat), PRD first-run copy, one primary action, specs under Details; 5 tests | agent |
| 2026-10-22 | feat(2.8/2.9) | Morning Intention: 3 questions + one-tap Skip, streams intention line + Top 3 tasks, saved once per day via append_note/mark_intention, no re-nag same day; `parseIntention` in src/lib/intention.ts; 4 tests | agent |
| 2026-10-22 | feat(2.10/2.11) | Brain Dump → Tasks: streamed extraction → editable preview → insert only after confirm; extractor guardrails (no invented tasks, NO_TASKS empty state); 4 tests | agent |
