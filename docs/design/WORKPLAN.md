# Design branch work plan (`design_upgrades`)

Temporary skills live under `.agents/` and `.cursor/` (gitignored). Product code stays under `src/`.

## Goal

Reflect-style hierarchy for Vayu without changing product behaviour. Bug fixes stay on `main`.

## Skills (installed, gitignored)

| Skill | Use | Do not use |
|---|---|---|
| **design-dna** | ANALYZE only: `docs/design/reflect-reference.png` → `docs/design/reflect-dna.json` | Generate standalone HTML |
| **impeccable** | `document` → DESIGN.md (local, gitignored); `critique` / `layout` / `polish` / detector | Ban Inter (PRD keeps Inter); invent new brand colours |
| **make-interfaces-feel-better** | Final pass: alignment, hit areas, radii, hover | Big layout rewrites |

## Steps

1. **Browser preview (`?dev=ui`)** — mock Tauri so Vite can open Today / Ask / Reflection / Red without the folder screen. Definition of done for every design change: verified in the in-app browser with screenshots.
2. **Extract Reflect DNA** — analyze the reference PNG; map spacing / column widths onto our tokens (no new colours).
3. **Three-zone shell** — left nav (search, Today, Ask, Topics, Settings) · centre note as hero · right calendar + in-note topics.
4. **One AI surface** — quiet action row under the title; one panel open at a time.
5. **Polish** — Impeccable + feel-better; SG-3 screenshots at 1280×800 and 960×700.

## Done when

- Layout matches the Phase 3B design rules in `now.md` (3B.6–3B.8).
- Every flow checked in `http://localhost:1420/?dev=ui` (browser), not only unit tests.
- Merge into `main` only after the bug-fix agent finishes 3B.1–3B.3.

## Cleanup after ship

```powershell
Remove-Item -Recurse -Force .agents, .cursor\skills, .cursor\agents -ErrorAction SilentlyContinue
# Keep DESIGN.md / reflect-dna.json only if you want them as project docs (currently gitignored drafts go under docs/design/)
```
