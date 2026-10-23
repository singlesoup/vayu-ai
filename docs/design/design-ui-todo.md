# Design UI TODO

Visual pass on `design_upgrades`. Data stays Tauri `invoke` → Rust → local Ollama and markdown files. No FastAPI, Mongo, axios, or hosted API.

Reference for Daily Reset measurements: `https://local-journal-ai.preview.static.emergentagent.com` (the app inside the share link). Older notes: `docs/design/emergent-change-report.md`.

Status as of 24 Oct 2026. `[x]` is in the running app and was checked in `http://localhost:1420/?dev=ui` unless the note says otherwise. Colours live in `src/styles/tokens.css` only.

This file replaces `docs/design/emergent-ui-todo.md`. The 23 Oct audit in that file is stale: it said Lucide was missing and the status pip had no glow. Both are done.

---

## Done

### Type and colour

- [x] Offline DM Sans, DM Mono, and Fraunces (`src/assets/fonts/`). No CDN.
- [x] Sage stays `#a9d9bc` / `#78be99`. Indigo was not adopted.
- [x] Flow, nav, companion, and settings colours are tokens (card flat `#171b21`, borders, save green, gold extract, lavender close, kickers).

### Shell

- [x] Journal grid, 250ms column collapse, mini sidebar (`+` only).
- [x] Topbar 58px, blur, “All notes are local”, concentric status pip.
- [x] Avatar “JD”. Code download button removed.
- [x] Footer: “⌘ K to search” and “Synced just now” with one top border.
- [x] Sidebar `#0E1216`. Search field with a clear icon and ⌘K hint.
- [x] New entry matches the context-card fill.
- [x] Nav: only the selected row is filled (`#1a2026`). Other rows are transparent with grey icon and text.
- [x] All entries count and Recent entries count are 18×18 circles.
- [x] Week strip moves by week (`ChevronLeft` / `ChevronRight`). Unselected days are compact and grey. Selected day is the green chip.
- [x] Recent entry title and snippet type. Selected card uses the entry tokens.
- [x] Preferences renamed Settings, with a divider above it.
- [x] Ask your notes removed from the sidebar (not rebuilt in the companion).

### Journal

- [x] Surface `#111419`. Breadcrumb, Saved, long date, “Last edited just now”.
- [x] 30px between the date row and the writing area.
- [x] Note body DM Sans 16px / 500 / line-height 30.4px, `#dce1e5`. Wiki links stay green.
- [x] Format icons `#eef1f4`.

### Companion

- [x] Panel `#0E1216`. Eyebrow, Fraunces “Reflect with Vayu”, context card, “This entry” chip (68×20).
- [x] TRY ASKING: 8px under the label and between chips. Idle text is muted; hover is light.
- [x] Chat lines DM Sans 11px / 17.05px `#9ca7b0`. User rows say “You”. AI rows use the Sparkles icon.
- [x] Privacy line centered: pip + “Your thoughts stay on this device”.

### Daily reset

- [x] Hero: mono “YOUR DAILY RESET”, Fraunces title, lede. Block is max-width 900px.
- [x] Two columns, 14px gap, cards align to the start. Morning spans the left column; dump and evening stack on the right. One column under 760px.
- [x] All three cards are the flat `#171b21` card. Morning is not a green gradient (owner correction, 24 Oct). Evening keeps the lavender border.
- [x] Kickers: mint / gold / lavender. Numbers `01` `02` `03` sit top-right. Titles Fraunces 20px.
- [x] Energy: 30px icon, Steady left, `3/5` right, Quiet/Full 7px under the slider.
- [x] Fields: 11px, 6px corners, `#101419` fill. The “one thing that matters” field matches the others (the reference highlight was rejected).
- [x] Focus ring is green (`#6da883`) with a 3px soft ring.
- [x] Skip today stays, as an outlined 6px button. Hold this intention is the filled green button.
- [x] Extract is the full-width gold button. Close the day gently and Save seed are lavender 6px buttons. Seed field matches the other inputs.
- [x] Dump empty line: “Your next clear steps will land here.”
- [x] After extract: review copy, task fields, outlined Remove, gold Insert.
- [x] After Hold: intention preview and green “Save to today's note”.
- [x] Evening “Summary” uses the question label and the quieter body colour.

### Tasks, Tags, Settings

- [x] Tasks and Tags use the same Fraunces 40px heading as Daily reset.
- [x] Tasks are parsed `- [ ]` / `- [x]` lines, shown as rows with a box or a check. They are not a markdown document. A row opens that day.
- [x] Tags: backlinks in a flat card, mint BACKLINKS label. A date opens that note.
- [x] Settings dialog: flat card, Fraunces title, mono section labels, outlined 6px buttons, filled green Test AI.

### Tooling

- [x] `lucide-react@0.516.0` is in `package.json` and used in the shell, editor, companion, and daily flows.
- [x] `.cursor/rules/verify-ui-in-browser.mdc` — UI changes are checked at `http://localhost:1420/?dev=ui` before they are called done.

---

## Still open

- [ ] `npm run check` has not been run as a full gate for this pass. Targeted Vitest files were run (tokens, colours, layout, morning, dump, evening).
- [ ] No side-by-side pass at 1280 / 1050 / 760 after the latest Daily Reset and Settings work.
- [ ] Mobile (≤760px): companion is a fixed right drawer (`top: 58px`, `bottom: 27px`, width `315px`) and the topbar center hides. Still open: `min(315px, 90vw)`, a drawer shadow, and hiding the sidebar (it stays a 52px rail).
- [ ] `data-testid` is still missing on calendar day cells and recent-entry cards. Format bar, suggestions, save, search, settings, and the main toggles have ids.
- [ ] `fadeIn` / `riseIn` / `blink` were not copied from the reference.
- [ ] First-run, setup, and Red mode were not restyled in this pass.
- [ ] Ask your notes is removed from the sidebar and not yet a companion feature.
- [ ] Shared controls and a shorter token list stay parked until the design pass is finished and this branch is rebased onto `main` (`plan.md`, 23 Oct).

---

## Out of scope

- Data-layer changes (FastAPI, Mongo, axios, hosted API).
- A real sync clock, a `mood` field, or seed notes.
- Removing Daily reset, Tasks, Tags, Settings, or first-run.
