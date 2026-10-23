# Vayu redesign plan (for the coding agent)

Branch: `design_upgrades`. Do not merge to `main`. Verify every phase in `?dev=ui` with screenshots before moving on.

## Why the current UI fails

Observed in the shipped shell (screenshot, 22 Oct):

1. **Accent everywhere, so nothing stands out.** Breeze teal is used for the H1 date, all four AI actions, every sidebar topic, wiki links, the checked box and today's calendar cell. Reflect uses its accent for roughly two things per screen.
2. **Three typefaces with no roles.** Inter (chrome, tasks), Newsreader (note body), JetBrains Mono (calendar, "TOPICS", dates). Tasks are Inter 13px inside a Newsreader 16px note, so one note speaks in two voices.
3. **No type scale.** The H1 is 34px bold teal and the next step down is 15–16px. Nothing sits between them, so there is no hierarchy, only a loud title and flat text.
4. **The editor is not an editor.** A transparent textarea plus a separate task list. Blank lines leave large holes, tasks float below the prose, `[[brackets]]` stay visible, and the × delete buttons are always on.
5. **The AI row reads as navigation.** Four teal text links with no icon or affordance, in the same colour as the title.
6. **The sidebar has no structure.** No icons, a topic list where each item takes two lines, a squeezed calendar, and a lone gear at the bottom of an empty column.
7. **Spacing is arbitrary.** The tokens follow an 8pt grid, but nothing defines a rhythm (section gap, row gap, inset), so every component picks its own spacing.
8. **The palette reads as a dev tool.** Teal on blue-grey ink. Reflect's calm comes from a warm-neutral dark with one restrained accent.

## Ground rules (unchanged project rules)

- Colours, fonts, sizes and spacing live in `src/styles/tokens.css` only. Any palette or font change needs a row in the `plan.md` Decisions log and owner sign-off.
- The disk markdown stays the source of truth: what the user types is byte-exact on disk.
- Filesystem and Ollama calls stay in Rust; the UI uses `src/lib/api.ts` only.
- No timers or Pomodoro.

## Owner decisions needed before Phase 1

| # | Decision | Recommendation |
|---|---|---|
| D1 | Keep Breeze teal as the accent, or move to a softer accent? | Keep the hue, but add `accent-subtle` / `accent-muted` steps and restrict where the full accent may appear |
| D2 | Keep Newsreader for the note body? | Yes: it gives the journal feel. Drop JetBrains Mono from all UI labels and keep it only for code |
| D3 | Editor engine | CodeMirror 6 with markdown decorations: it keeps text byte-exact, unlike ProseMirror/TipTap which re-serialise |
| D4 | Base background | Shift ink slightly warmer/neutral (still dark) |

---

## Phase 0: Measurement harness (do first)

- Add Playwright screenshot capture of `?dev=ui` at 1440×900, 1280×800 and 960×700 for: Today, each AI panel open, Ask, Settings, Red tier (`?tier=Red`), and an empty day.
- Save the shots to `docs/design/shots/<phase>/` so every phase has a before/after.
- Add `?dev=components`, a gallery page that renders every primitive in every state.

**Done when:** one command (`npm run shots`) regenerates every screenshot.

## Phase 1: Design system (tokens + DESIGN.md)

Write `docs/design/DESIGN.md`, then encode it in `tokens.css`. Change no components in this phase except to swap in the new token names.

**Colour roles** (semantic, not raw):
`--bg`, `--bg-sidebar`, `--surface`, `--surface-raised`, `--border-subtle`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--accent`, `--accent-hover`, `--accent-subtle` (around 12% tint for selected rows), `--accent-text` (link colour, slightly desaturated), `--warm` (Evening Reflection only), `--danger`.

**Accent budget:** full `--accent` appears at most on (a) today's calendar cell, (b) the primary button, (c) the focus ring. Links use `--accent-text`. The H1 is never accent-coloured.

**Type scale** (Inter for UI, Newsreader for the note body):

| Token | Size / line-height | Use |
|---|---|---|
| `--type-display` | 28/36, 600 | Note date H1 |
| `--type-title` | 20/28, 600 | View titles (Ask, Settings) |
| `--type-body-note` | 17/28 Newsreader | Note prose + tasks |
| `--type-body` | 14/20 | UI text, nav items |
| `--type-small` | 13/18 | Metadata, dates, buttons |
| `--type-label` | 11/16, 600, +0.06em, uppercase | Section labels (Inter, not mono) |

**Spacing rhythm:** `--inset-sidebar: 12px`, `--inset-page: 48px`, `--gap-section: 32px`, `--gap-block: 16px`, `--gap-row: 4px`, `--row-height: 32px` (all nav and list rows).

**Radii:** `--radius-sm: 6px` (rows, inputs, buttons), `--radius-md: 10px` (panels), `--radius-full`. Nested radii must be concentric.

**Elevation:** `--shadow-popover`, `--shadow-panel` (soft, offset). Borders only for structure.

**Motion:** 120ms for hover/press, 180ms ease-out for panels opening, no slides or bounces (PRD).

**Done when:** DESIGN.md exists, tokens are renamed, the `npm run check` colour guard is updated and green, and the screenshots look the same or calmer.

## Phase 2: Primitives (component library)

Build in `src/components/ui/`, render each one in `?dev=components`:

- `Button`: variants `primary | secondary | ghost | icon`, sizes `sm (28px) | md (32px)`. Exactly one primary per panel.
- `Input`, `Textarea`, `SearchField` (leading icon, `Ctrl K` hint).
- `NavItem`: icon + label + optional count, 32px row, `accent-subtle` background when active, text stays primary.
- `SectionLabel`: `--type-label`, `--text-tertiary`.
- `ListRow`: single line, hover background, trailing action revealed on hover/focus only.
- `Kbd`, `Tooltip`, `Popover`, `Panel` (the one AI container).
- Icons: one library (Lucide), 16px, 1.5 stroke, `currentColor`. No unicode glyphs (`‹ › × ✓`).

**Done when:** the gallery shows every state (hover, focus, active, disabled, loading) and no component outside `ui/` defines its own button or input styles.

## Phase 3: Shell layout

- **Sidebar (240px):** search, then nav with icons (Daily notes, Ask, All notes later), then a "Topics" section label with one-line rows (name left, day count right, muted), then a footer row with the app name + settings gear. Calendar moves to the right rail; under 1100px it becomes a popover from a calendar icon, not a squeezed grid.
- **Centre:** note column max 680px, **centred** in the remaining space, `--inset-page` top padding.
- **Right rail (260px, ≥1100px):** calendar, then "In this note" (topics + backlinks count).
- Thin `--border-subtle` dividers between zones.

**Done when:** at 1440/1280 there are three balanced zones, at 960 two zones plus a calendar popover, and nothing overflows.

## Phase 4: The note editor (biggest UX win)

Replace the textarea + TaskList with CodeMirror 6 (pending D3):

- Markdown text stays byte-exact; styling comes from decorations only.
- `[[topic]]` renders as an accent-text link with the brackets hidden while the cursor is outside it, and shows `[[ ]]` while editing. Autocomplete on `[[`.
- `- [ ]` / `- [x]` lines render inline as round checkboxes in Newsreader, so tasks live in the flow like Reflect. Click toggles the character on disk.
- Bullets and headings get proper styling; blank lines collapse to paragraph spacing.
- The task delete action moves to a hover menu.
- Keep autosave (800ms), flush on close, and empty-day behaviour (existing tests must keep passing or move to the new editor).

**Done when:** a note with prose, tasks, links and bullets reads like one document; the existing DailyNote/tasks tests are green; there is a markdown round-trip test.

## Phase 5: AI surfaces

- Replace the four teal links with **one** quiet `Ask Vayu` ghost button (sparkle icon) under the date, plus `Ctrl J`. It opens a small menu: Plan my day, Brain dump, Journal, Reflect.
- The chosen flow opens as a single `Panel` inline under the date (one at a time, Esc closes), using `--surface-raised`, `--radius-md`, a title in `--type-title`, and the primary action bottom-right.
- Morning Intention auto-opens in the same slot (unchanged rule).
- Ask your notes becomes its own centre view with a large input, source chips as `ListRow`s and an empty state with example questions.
- Warm stays only on Evening Reflection (border + title).

**Done when:** there is at most one accent element above the fold, and each flow has loading, streaming, stopped, error and model-missing states in the gallery.

## Phase 6: States and polish

- Empty states: empty day, no topics, Ask with no index, Red tier.
- Loading: skeleton lines instead of "Loading…".
- Focus ring: 2px `--accent` at 2px offset on everything focusable. Theme text selection, the caret and scrollbars.
- Tabular numerals in the calendar.
- Run the `impeccable` skill's `critique` and `audit`, and the `make-interfaces-feel-better` review; fix everything they rate high.

## Phase 7: Verification gate (SG-3 redo)

- Regenerate all screenshots and place them side by side with `docs/design/reflect-reference.png`.
- Checklist: one H1 per view; accent budget respected; no mono in UI labels; every row 32px; body text contrast ≥4.5:1; nothing overflows at 960px; keyboard-only path through every flow.
- `npm run check` green; session note in `now.md` with the click path; Pages preview redeployed.

## Order and sizing

| Phase | Depends on | Rough size |
|---|---|---|
| 0 Harness | none | S |
| 1 Design system | D1, D2, D4 | M |
| 2 Primitives | 1 | M |
| 3 Shell | 2 | M |
| 4 Editor | 2, D3 | L |
| 5 AI surfaces | 2, 3 | M |
| 6 Polish | 3–5 | M |
| 7 Gate | all | S |

Phases 3 and 4 can run in parallel once Phase 2 lands.
