# golden/ — Vayu 3.9 golden-set eval kit

Reproducible fixtures for the two live-model eval gates in plan.md (3.9):

| Gate | Bar | Data |
|---|---|---|
| Extractor | ≥18/20 brain-dump wording preserved | `brain-dumps.json` (20 dumps) |
| Ask | ≥9/10 answers citing real days | `ask-evals.json` (10 Q) + `journal/` seed |
| Reflection | ≥9/10 "invents nothing" | `reflect-evals.json` (10 checks) + `journal/` seed |

## Journal seed (`journal/`)

Five realistic daily notes (`2026-10-19.md` … `2026-10-23.md`) with a deliberate
fact matrix (5K time, Marta/Q3, dentist booking, Nia's mugs, garage sensor
still open, Amir review raised→done, pizza night, 6-week countdown, Lisa
volunteered, Project Hail Mary). Ask/Reflect question↔truth mapping depends on
exactly these facts — edit carefully.

Install:

1. Find the configured notes folder (app Settings, or
   `%APPDATA%\com.vayu.app\config.json` → `notes_dir`; default
   `<Documents>\Vayu`).
2. Copy `golden/journal/*.md` **into** it (merge — the filenames are dates the
   user is unlikely to have; back up if collisions).
3. Start the app once so the embedding index rebuilds (`.vayu_index.json`).

Restoring your own journal afterwards = simply move those five files out.
