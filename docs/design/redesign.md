# Vayu journal UI redesign — executed plan

**Date:** 23 Oct 2026  
**Branch context:** `design_upgrades` (not merged to `main`)  
**Reference UI:** [Emergent preview](https://local-journal-ai.preview.emergentagent.com/?utm_source=share)  
**Source bundle:** `C:\Users\samon\Downloads\vayu-frontend-source` (real CRA frontend).  
The earlier `vayu-frontend-structure` folder was stubs only.

Goal: match the Emergent three-column journal (sidebar, editor / Daily reset, companion) while keeping Vayu’s one-markdown-file-per-day model and Tauri commands in [`src/lib/api.ts`](../../src/lib/api.ts).

Do **not** copy: axios / hosted `/api`, Google Fonts CDN, Tailwind, Emergent host chrome (Code zip button, JD avatar, “Synced just now”).

---

## Palette and fonts (executed)

Retuned in [`src/styles/tokens.css`](../../src/styles/tokens.css); logged in `plan.md` Decisions (23 Oct).

| Token | Value | Role |
|-------|--------|------|
| Ink | `#0b0d10` | App background (also Tauri window) |
| Surface | `#111419` | Editor column |
| Elevated | `#171b21` | Cards, inputs |
| Border | `#252b34` / card `#2a333b` | Dividers |
| Text | `#eef1f4` | Primary |
| Soft | `#bac3cd` | Secondary body |
| Muted | `#8b949f` | Metadata |
| Breeze (sage) | `#a9d9bc` | Accent, links |
| Deep Teal (strong) | `#78be99` | Active / selected |
| Warm | `#F5C97A` (kept) | Brain-dump extract button |

Fonts stay **bundled offline**: Inter (UI), Newsreader (display headings), JetBrains Mono (kickers). Emergent’s DM Sans / Fraunces were not downloaded.

---

## Phases

### Phase 0 — Tokens — done

- Sage palette + `--color-elevated` / `--color-soft`
- Tests: [`src/styles/tokens.test.ts`](../../src/styles/tokens.test.ts), [`src/tauri-config.test.ts`](../../src/tauri-config.test.ts)
- Decision row in [`plan.md`](../../plan.md)

### Phase 1 — Three-column shell — done

In [`src/App.tsx`](../../src/App.tsx) / [`src/App.css`](../../src/App.css):

- Top bar: wordmark, “All notes are local”, companion toggle
- Left nav: New entry, search (`⌘K` focus), All entries / Daily reset / Tasks / Tags / Ask, week strip, recent entries, Preferences
- Center view switch: `journal` \| `reset` \| `tasks` \| `tags` \| `ask`
- Footer status bar; companion collapses under ~860–1100px
- Preferences still opens [`Settings`](../../src/components/Settings.tsx)

### Phase 2 — Journal column — done

- [`DailyNote`](../../src/components/DailyNote.tsx) `chrome="journal"`: breadcrumb `Journal / {title}`, Saved state, weekday meta, full-markdown editor (tasks stay in the note body as markdown)
- [`Editor`](../../src/components/Editor.tsx) optional format bar (bold / italic / quote / list / link)
- Separate TaskList panel is classic chrome only; journal mode writes one note stream

### Phase 3 — Daily Reset — done

Center view **Daily reset** (“Make room for today.”) stacks:

1. **Morning Intention** — energy slider Quiet→Full, focus + blocker fields, **Hold this intention** / Skip ([`MorningIntention.tsx`](../../src/components/MorningIntention.tsx))
2. **Brain Dump → Tasks** — extract → preview → insert ([`BrainDump.tsx`](../../src/components/BrainDump.tsx))
3. **Evening Reflection** — two wind-down questions, then summarize + seed tomorrow ([`EveningReflection.tsx`](../../src/components/EveningReflection.tsx))

Still uses `generate` / `append_note` / `mark_intention`. Old under-note AI action row removed.

### Phase 4 — Companion — done

[`CompanionPanel.tsx`](../../src/components/CompanionPanel.tsx): Local companion / Reflect with Vayu, current context, chips (“emotional thread”, “Summarize this entry”), ask box via `generate`, privacy line.

### Phase 5 — Tasks and Tags — done (thin)

- **Tasks:** list of `- [ ]` / `- [x]` lines from `read_all_notes`, click opens day
- **Tags:** reuses [`BacklinksPanel`](../../src/components/BacklinksPanel.tsx)

### Phase 6 — Verify — partial

- Layout / flow tests updated (`AppLayout3B`, `AppPhase2`, MorningIntention, App heading dates)
- Spot-checked in browser at `?dev=ui`
- Full `npm run check` (incl. Rust) not treated as complete gate for this pass
- Browser preview `generate` mock still generic; morning-shaped replies for offline demos are a follow-up

---

## Out of scope (unchanged)

- Multi-entry notes that are not one file per day
- Real command palette
- Light mode
- Emergent Code / avatar / sync frame
- Switching UI font to DM Sans / Fraunces from the network

---

## How to preview

```powershell
Set-Location "C:\Users\samon\OneDrive\Documents\AI_Projects\vayu-ai"
npm run dev
```

Open `http://localhost:1420/?dev=ui`.

Related older critique roadmap: [`REDESIGN_PLAN.md`](./REDESIGN_PLAN.md).
