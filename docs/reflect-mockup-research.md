# Reflect mockup — behaviour-layer research (25 Oct, opencode)

Source: `C:\Users\samon\Downloads\reflect-ui-mockup.html` (interactive, single file,
inline JS engine). Produced after owner feedback that "research" stopped at
selectors. This doc mines the INTERACTION ENGINE, not just the DOM. Companion to
`reflect-agent-spec.md` (Sections 3–6) — this file adds what the spec didn't spell out.
Line numbers reference the mockup file for verification.

## 1. The compare section is the project charter (L718–772)

The mockup grades Reflect vs Vayu per feature. Two lists matter:

**Steal list (1–5)** — identical to owner's Section 6 items:
1. Backlinks **+ "Similar notes"** in right panel, ABOVE Local Companion
2. Tasks **aggregate from every note** — not only Brain Dump extraction
3. Map/graph of entries + links ("second brain payoff")
4. ⌘K = real palette (results + commands + date jumps, not an empty search box)
5. `[[` autocomplete creating links inline ("the gesture that makes backlinks — and the Map — happen")

**Vayu's keep-list (the mockup itself confirms owner's guardrails):** Daily Reset
rituals, Energy check-in slider, Local Companion (on-device, entry-scoped). NO timers
anywhere in Reflect's column.

## 2. Tasks aggregation + two-way sync (feeds hermes item 2)

- Data: flat array `{id, text, source, done}` (L847). `source` = `"Oct 23 · Daily note"`
  OR a top-level note title — **tasks live in non-daily notes too** (t4 "Design Review —
  Notes", t5 "On Focus"). Aggregation is by source group, not by day.
- Grouping: preserve first-appearance order of sources (L930–936).
- Filters: open/all/done; empty filter state text: "Nothing here — this filter is empty." (L943)
- Nav badge: "5 open" recomputed after every toggle (L944–945) — badge is live state, not static.
- **Two-way sync contract (L1119–1124):** clicking a `li.todo[data-task]` toggles done;
  if the id exists in the aggregated TASKS array it flips there too AND the Tasks view
  re-renders — else it toggles locally. I.e. editor todo blocks ↔ aggregate view share
  ids. The slash-menu-created to-do is inserted WITH a `data-task` id and the inline
  hint text "New task — it will show up in Tasks too" (L1078–1081) — creation flows
  into Tasks immediately.
- Strike for `done` is class-toggled across every duplicate row (`.done` class) (L951–952).

## 3. Command palette spec (feeds hermes item 4)

- Results mix two kinds (L986–1004): **commands** (arrow-glyph icon + label + hint,
  e.g. "Go to daily note · ⌘D") and **notes** (doc-glyph + title + "note · Oct 21").
- Command set: Go to daily note / Go to Tasks / Go to Map / Go to All notes / New note /
  **Today / Yesterday / "2 days from now" / "5 days from now"** — natural date jumps with
  rendered target hints ("jump · Oct 29").
- Empty query = full list; filter = substring on label. Empty state: `No results for "x"`.
- Keyboard (L1141–1146): arrows + Enter + Escape inside the input, arrow keydown
  preventDefault'd, selection clamped — **same pattern our editor's wiki menu needs**.
- Palette opens with cleared query, selection reset, input focused after 30ms (L1028–1031).
- Global keys (L1147–1152): Ctrl/Cmd+K palette, +D daily note, +N new note, Esc cascade.

## 4. Slash menu semantics (feeds hermes item 5 + kilo's editor)

- Trigger: text ends with `/` at a word boundary (L1095) — not only at caret start.
- Items (L653–657): `/journal` template, H1, To-do (hint "⌘↵"), Quote, Bullet.
- `/journal` fills a real template (L1070–1076): H1 "Journal — template" + 3 prompt lines:
  "What is on my mind right now?", "One thing that would make today a win:", "Gratitude:".
- To-do block is created completed-with-id and flows to Tasks (above). Quote → blockquote
  placeholder. Bullet → plain li. Enter itself defaults to a bullet block (L1102).
- Menus reposition to the caret (app-relative math, L1037–1041) and use **mousedown (not
  click) with preventDefault** to insert — keeps keyboard focus in the field (L1051, L1105).

## 5. `[[` link menu semantics (kilo's shipped item + fidelity hints)

- Trigger: `[[` present, no closing `]]` yet (L1091).
- Filter by title substring. **Creation affordance**: empty result state reads
  "No matching note — Enter would create it in Reflect" (L1049) — a [[ to nowhere is a
  creation gesture in Reflect, not an error.
- Insertion replaces the `[[…` prefix with a non-editable chip and restores the caret to
  the end via explicit Range/Selection manipulation (L1056–1066) — in textarea-land this
  is a caret bookkeeping contract, not DOM surgery.

## 6. Calendar / day navigation (item fidelity)

- Only days that EXIST get `data-jump="day-2026-10-NN"` (L960–966) — no dead cells.
- `jumpToDay` = switch to daily view + `scrollIntoView` + **`.flash` animation on the
  target day block** (L971–978) — volatile but perceptible confirmation.
- "Today" button + `.today` ring on the cell.

## 7. Other surface contracts worth stealing

- **Note open page** (L877–899): title + meta line "Last edited Oct 21 · N backlinks ·
  saved locally as Markdown" + AI row: Summarize / Counterargument / **Decorate with
  backlinks** (its output literally inserts `[[ ]]` around nouns, L860) — per-entry AI
  actions, separate from the always-present Companion.
- **All-notes grid** (L918–925): plain-text excerpt + meta "Edited Oct 19 · **N backlinks**
  · **N links out**" — backlink/away counts visible in the grid row.
- **Map** = clickable SVG nodes with `data-note` → openNote (item 3).
- **Whole-app click delegation treaty** (L1112–1125): `[data-view]`, `[data-note]`,
  `[data-jump]`, `li.todo[data-task]` handled centrally; chips excluded from todo-toggle
  clicks (nested interactive elements don't fire the row).

## 8. Provenance

Mockup rebuilt from reflect.academy + reflect.app (public docs), sample content only;
"Vayu column reflects the Emergent preview build as verified on 24 Oct 2026" (L776–780).
Files remain read-only in Downloads; nothing is copied into the repo without approval.
