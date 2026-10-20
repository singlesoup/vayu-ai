# Vayu

**A calm, private, local-AI journaling app for Windows.**

Vayu opens straight to today's note. You write, plan your tasks, and reflect on your day with an AI that runs entirely on your own PC. There's no account, no API key, and no cloud. Your notes stay plain `.md` files in a folder you choose.

> Status: v1 in active build. Target ship date is **Sat, 24 Oct 2026**.

---

## What Vayu does

- **Daily Note:** Opens to today's page (`YYYY-MM-DD.md`). Writing comes first in a single-column editor, with autosave.
- **Tasks:** Checkbox tasks saved as standard `- [ ]` / `- [x]` lines that any editor can read. Vayu has no timers and no Pomodoro.
- **Calendar sidebar:** Jump to any past or future day.
- **Morning Intention:** An optional check-in with three questions (energy, the one thing that matters, blockers). It writes one intention line and your Top 3 tasks.
- **Brain Dump → Tasks:** Paste messy text and get a task list to preview and edit before anything is saved. Your own wording is kept.
- **Journal Chat:** Guided journaling, one question at a time. The conversation is saved into today's note.
- **Evening Reflection:** A short chat that sums up the day using only what's in your note and tasks, plus one seed line for tomorrow.
- **Ask Your Notes:** Ask questions about your past notes. Answers link to the days they came from, and Vayu says when it can't find something instead of making it up.
- **`[[topic]]` backlinks:** Link related days together and browse them in a backlinks panel.

## Privacy

In local mode, Vayu makes **zero outbound network calls**. All AI runs on your machine through [Ollama](https://ollama.com). Notes are plain Markdown files on your disk, and uninstalling Vayu does not touch them.

## Hardware tiers

On first run, Vayu checks your hardware before downloading anything and picks the right model:

| Tier | Requirements | Experience |
|---|---|---|
| Green | 16GB+ RAM and 10GB+ free disk | Full model (`gemma3n:e4b`) |
| Yellow | 8–15GB RAM and 8GB+ free disk | Lite model (`gemma3n:e2b`), a little slower, fully private |
| Red | Below minimum | Notes, tasks, and search still work; AI chat is off |

Search and Ask Your Notes use `embeddinggemma` for local embeddings.

**Minimum:** Windows 10/11 64-bit, 8GB RAM, 8GB free SSD space, i3/Ryzen 3 (2019+).
**Recommended:** 16GB RAM, 10GB free SSD space, i5/Ryzen 5 (2021+).

The model is downloaded once, for free, and works fully offline after that.

## Tech stack

- **Shell:** [Tauri](https://tauri.app) desktop app with a web UI
- **Local AI:** Ollama on `localhost:11434` running Gemma 3n (E4B / E2B) and EmbeddingGemma
- **Storage:** Plain `.md` files, plus a local vector index that can be rebuilt from those files
- **Design:** Dark-first ("Ink" `#0E1116`), Inter / Newsreader / JetBrains Mono, 12px radius, 8pt spacing
- **Distribution:** Website `.exe` installer and Microsoft Store MSIX package

## Getting started (development)

> The project skeleton is being set up. Commands will be added here once the Tauri app is scaffolded.

Prerequisites:

- Windows 10/11 64-bit
- [Node.js](https://nodejs.org) (LTS)
- [Rust](https://www.rust-lang.org/tools/install) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/)
- [Ollama](https://ollama.com) with `gemma3n:e4b` (or `gemma3n:e2b`) and `embeddinggemma`

## Roadmap

**v1 (24 Oct 2026):** Everything listed above.

**Planned after v1:**

- Laya decision model for the Red tier
- Bring-your-own-key cloud models
- Voice dictation for Brain Dump
- Manual model switching
- Full light mode
- Compatibility checker on the landing page

## Inspirations

[Focu](https://focu.app/) · [Reflect](https://reflect.app/) · [Rosebud](https://www.rosebud.app) · [Day One](https://dayoneapp.com/)
