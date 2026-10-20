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
| 1. Foundation + walking skeleton | Wed 21 | todo | Check-in 1 |
| 2. First run, tiers, morning features | Thu 22 | todo | Check-in 2 |
| 3. Journal, reflection, Ask, evals | Fri 23 | todo | Check-in 3 + freeze |
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

| ID | Task | P | Status |
|---|---|---|---|
| 1.1 | Lock design system (PRD §8): record decision in Decisions log | P0 | todo |
| 1.2 | Tauri skeleton; `dev` opens a window named Vayu with Ink BG `#0E1116` | P0 | todo |
| 1.3 | Design tokens as CSS variables (8 colours, Inter / Newsreader / JetBrains Mono, 12px radius, 8pt spacing) + token test page | P0 | todo |
| 1.4 | Notes folder: ask or default on first launch, store path in local config | P0 | todo |
| 1.5 | App opens to today's note (`YYYY-MM-DD.md`); new day creates a new file | P0 | todo |
| 1.6 | Editor: single column, Newsreader body, debounced autosave + save on close | P0 | todo |
| 1.7 | Calendar sidebar: open any past/future day; empty state for missing days | P0 | todo |
| 1.8 | Checkbox tasks stored as `- [ ]` / `- [x]`; add/edit/delete; no timer UI | P0 | todo |
| 1.9 | Ollama detection on `localhost:11434`, status in Settings → Model | P0 | todo |
| 1.10 | Detect installed models (`gemma3n:e4b`, `gemma3n:e2b`, `embeddinggemma`) | P0 | todo |
| 1.11 | "Test AI" button: streamed reply, Stop within ~1s, calm error if Ollama dies | P0 | todo |
| CI-1 | **Check-in 1:** note + 3 tasks survive restart, Test AI streams, no crash on Ollama on/off → tag `checkin-1` | Gate | todo |

---

## Phase 2 — First run, tiers, morning features (Thu 22)

**Goal:** A new user can install, get checked, download the right model, and use Morning Intention and Brain Dump → Tasks.

| ID | Task | P | Status |
|---|---|---|---|
| 2.1 | Hardware check before any download (RAM, free disk, CPU, OS), <5s, debug screen | P0 | todo |
| 2.2 | Tier logic: Green (≥16GB RAM & ≥10GB disk → E4B), Yellow (8–15GB & ≥8GB → E2B), Red (otherwise → no chat); dev override; boundary tests at 8GB/16GB | P0 | todo |
| 2.3 | Tier result screen in plain words, specs under "details", one primary action | P0 | todo |
| 2.4 | Download screen: model name, exact size, free/no-account copy, progress + % + cancel | P0 | todo |
| 2.5 | Resumable pull via Ollama; survives 2 mid-download kills; low-disk → plain error, app usable | P0 | todo |
| 2.6 | Skip download when Ollama + model already present (zero bytes on dev PC) | P0 | todo |
| 2.7 | Post-download check: one generation + one embedding must pass before "You're ready" | P0 | todo |
| 2.8 | Morning Intention: optional 3 questions, one-tap Skip, ≤90s, no re-nag same day | P0 | todo |
| 2.9 | Intention output: 1 intention line + Top 3 checkbox tasks; no silent duplicates | P0 | todo |
| 2.10 | Brain Dump → Tasks: streamed extraction → preview/edit → insert; nothing written unconfirmed | P0 | todo |
| 2.11 | Extractor guardrails: no invented tasks; "no tasks found" for feelings-only dumps; 20-item dump → 20 tasks | P0 | todo |
| CI-2 | **Check-in 2 (new-user test):** fresh profile → install → tier → download → intention → dump → tags `checkin-2` | Gate | todo |

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
| 3.1 | Journal chat: italic Newsreader prompt, one question at a time, saved to note; deleted turns leave context | P0 | todo |
| 3.2 | Streaming + Stop + "thinking" state on every AI surface; no double-firing | P0 | todo |
| 3.3 | Evening Reflection (Warm `#F5C97A`, only here): summary from note + tasks only, seed line in tomorrow's note, works any time of day | P0 | todo |
| 3.4 | Embedding pipeline: chunk on save → EmbeddingGemma → local index beside notes; rebuildable from `.md` files | P0 | todo |
| 3.5 | `[[topic]]` backlinks + backlink panel; typos create no phantom files | P0 | todo |
| 3.6 | Ask Your Notes (RAG) with source-day chips; abstains when not found | P0 | todo |
| 3.7 | Red mode: notes + tasks + keyword search with Ollama uninstalled; AI hidden with one plain line | P0 | todo |
| 3.8 | Settings → Model: tier (Full / Lite / No-AI), model, size on disk, Ollama status, re-run check, delete model; BYOK slot shown as "coming soon" only | P0 | todo |
| 3.9 | Golden-set evals (60 min): Extractor ≥18/20, Ask ≥9/10, Reflection invents nothing ≥9/10 | P0 | todo |
| 3.10 | Privacy test: zero outbound calls during full loop; log/screenshot saved | P0 | todo |
| 3.11 | Light mode (basic: same layout on Paper BG) | P1 | todo |
| 3.12 | Manual model switching E4B ↔ E2B in Settings | P1 | todo |
| CI-3 | **Check-in 3 (freeze):** full honest day in-app, eval bars met, privacy clean → tag `checkin-3` | Gate | todo |

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
| 2026-10-21 | 4-day plan replaces PRD §12 7-day plan; Laya, BYOK, voice, compat checker moved to P2 | Fit the 24 Oct ship date |
| 2026-10-21 | Repo on `main`, LF line endings | Consistent diffs across tools |
| 2026-10-21 | Test-driven development for every task; tests committed before code | Gives the verifier evidence and protects the core loop |
| 2026-10-21 | **Proposed** stack: Tauri v2, React + TypeScript + Vite, Vitest + Testing Library, `cargo test`; all filesystem and Ollama HTTP calls in Rust (pending owner confirmation) | PRD only fixes "Tauri shell + web UI"; this stack is easy to test |
| 2026-10-21 | Design values from PRD §8: Ink `#0E1116`, Surface `#171B22`, Text `#EDEFF3`, Muted `#9BA3AF`, Breeze `#5EEAD4`, Deep Teal `#14B8A6`, Paper `#FAF9F6`, Warm `#F5C97A`; Inter / Newsreader / JetBrains Mono 12px; 12px radius; 8pt grid; 200ms fade. **Lock pending owner confirmation** | PRD §13 lists the lock as an open decision |
| | _Editor approach (textarea vs. Markdown editor) — record when chosen in 1.6.1_ | |

---

## Open questions (conflicts between the source documents)

| # | Where | Conflict | Proposed resolution | Needed by |
|---|---|---|---|---|
| Q1 | 1.1 | PRD §13 says the design lock is open; the design board says "locked" | Owner confirms "lock" today | Wed |
| Q2 | 2.3 | The design board's Red tier card promises "Laya decisions" and "tiny built-in decisions", but Laya is cut to P2 | Red tier copy says only "Notes work, AI chat is off on this PC" (checklist wording); no Laya mention | Thu |
| Q3 | 2.2 | The PRD's Red tier is "≤4GB RAM"; the checklist says "RAM <8GB" | Use the checklist's thresholds (they're marked "exact") | Thu |
| Q4 | 2.10 | The design board's Brain Dump card shows a "Parking lot" line from the Extractor; the PRD only describes a Parking Lot for Laya (Red tier) | v1 Extractor outputs tasks only; non-task text stays in the note as journal | Thu |
| Q5 | 2.4 | The PRD says Vayu bundles or installs Ollama when absent; the checklist's cut trigger allows "guided install link" instead | Try the in-app path first; fall back to the guided link if Check-in 2 fails twice | Thu |
| Q6 | 1.10.1 | Should quantised tags like `gemma3n:e4b-it-q4_K_M` count as E4B? | Exact match only, plus `:latest` for `embeddinggemma` | Wed |

---

## Change log

Newest first. One line per meaningful change or verification result.

| Date | Phase/ID | Change | By |
|---|---|---|---|
| 2026-10-21 | 1.x | Reviewed PRD v1, build checklist PDF, and design board. Added design values, layout reference, and doc conflicts. Phase 1 split into test-first tasks in `now.md` | verifier |
| 2026-10-21 | 0.2 | Added `plan.md` and `now.md` | verifier |
| 2026-10-21 | 0.1 | Initial commit: README, `.gitignore`, `.gitattributes` | verifier |
