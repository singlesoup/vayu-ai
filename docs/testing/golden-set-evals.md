# Golden-set evals (3.9) — runbook

Goal: prove the three live-model bars in plan.md row 3.9 with a fresh local
Ollama. Everything below stays on 127.0.0.1:11434 (privacy rule intact).

## 0. Prerequisites

- Ollama running locally and the journal model installed (Vayu's first-run
  flow pulls it, or `ollama pull gemma3n:e2b` — use whichever model Vayu
  actually resolves; the runner auto-picks a `gemma*` model or takes `--model`).
- If Ollama is down: `ollama serve` (or start the desktop app and let Vayu
  detect it).

## 1. Extractor eval — scripted

```
node scripts/golden-eval.mjs --eval extract
```

- Drives all 20 brain dumps from `golden/brain-dumps.json` through the exact
  production prompt (copied verbatim from `src/components/BrainDump.tsx`).
- Pass rules: every expected wording token survives in the extract's task
  lines; the three "ramble" dumps must produce `NO_TASKS`/nothing. Word-set
  fallback tolerates punctuation/word-order cleanups; anything weirder fails
  and is flagged for the human eye.
- Bar: **≥18/20**. Report lands in `golden/reports/extract-*.md`.
- Sanity: `[opencode]` verified prompt parity at write time — if
  BrainDump.tsx changed since, update `EXTRACT_PROMPT` to match byte-for-byte.

## 2. Reflection eval — scripted

```
node scripts/golden-eval.mjs --eval reflect --model <same model as extract>
```

- Replays `golden/reflect-evals.json`: note + tasks + wind-down answers →
  2–3-sentence summary through the production prompt
  (`src/components/EveningReflection.tsx`). Each check must mention what
  happened (`must` groups) and must NOT mention seeded decoys (`invent`
  tokens: Marta/pizza/dentist etc. on days they don't exist). Includes one
  non-existent day (`2026-10-24`) — a summary borrowing other days' facts
  fails it.
- Bar: **≥9/10**. Report lands in `golden/reports/reflect-*.md`.

## 3. Ask eval — in-app (needs the real embedding index)

```
node scripts/golden-eval.mjs --eval ask        # prints the checklist
```

1. Install the journal seed (see `golden/README.md`).
2. Launch Vayu (`npm run tauri dev` or installed build), wait for index build.
3. Ask each question in the Ask panel. Record: answer text, source day chip,
   pass/fail vs the checklist's expected day + keyword set.
4. Bar: **≥9/10 citing real days**. Watch especially `aq-05` (garage sensor —
   the answer must NOT claim it got fixed) and `aq-10` (review raised 10-22,
   done 10-23 — either day acceptable).
5. Record the outcome row in the session log (`now.md`); attribute anything
   missed to retrieval vs generation in the notes.

## 4. Recording results

Each scripted report file lists every item with PASS/FAIL + the raw model
output. Attach/timestamp the reports (verifier may commit them with the
checkin tag — agent commits stay forbidden). If any bar is missed: log exact
samples in `now.md`, mark 3.9 as still open, do NOT silently lower the bar.
