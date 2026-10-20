# NOW — Phase 1: Foundation + Walking Skeleton

**Day:** Wed 21 Oct 2026
**Gate:** Check-in 1 (tonight)
**Goal:** Vayu opens to today's note, saves it as a real `.md` file, and can stream a reply from Ollama. The UI only needs the design tokens, not polish.

Full plan and status: [`plan.md`](plan.md)

---

## Instructions for the coding agent

1. Work through the sub-phases **in order** (1A → 1B → 1C → 1D). Don't start a sub-phase until the previous one is in `review` or `verified`.
2. When you start a task, set its status to `doing` in both `plan.md` and the status board below.
3. When a task meets its **Done when** criteria on a real run, set it to `review` in both places and add a line to the `plan.md` change log. Note anything the verifier needs to know (commands, file paths, known limits).
4. Commit after each sub-phase with a clear message, e.g. `feat(1B): daily note + autosave`.
5. **Do not** mark anything `verified`. Only the verifier does that.
6. If something is blocked or needs a decision, stop and write it under **Blockers / questions** below instead of guessing.
7. Stay in scope. Anything not listed here is out of scope for today. No timer or Pomodoro UI, no cloud calls, no extra features.

---

## 1A — Setup and design system (first ~60 mins)

### 1.1 Lock the design system
- Record in the `plan.md` Decisions log that the PRD §8 design system is locked.
- **Done when:** the decision line exists; colours and fonts are not changed after today.

### 1.2 Tauri skeleton
- Create the Tauri app (Tauri shell + web UI) in this repo. Record the frontend framework choice in the Decisions log.
- App name: **Vayu**. Window background: Ink `#0E1116`.
- Add the run commands to the README "Getting started" section.
- **Done when:** the dev command opens an empty Vayu window on Windows with the Ink background.

### 1.3 Design tokens
- One token file with CSS variables for all 8 PRD §8 colours, the fonts (Inter for UI, Newsreader for body text, JetBrains Mono for code), a 12px radius, and 8pt spacing.
- Fonts must be bundled locally, not loaded from a CDN (the app must make zero outbound calls).
- Add a dev-only token test page that shows every token.
- **Done when:** the test page shows every token, and no colour is hard-coded outside the token file.

### 1.4 Notes folder
- First launch asks for a notes folder (with a sensible default). Save the path in local app config.
- **Done when:** deleting the app config and relaunching asks again; the chosen path survives a restart.

---

## 1B — Daily note and storage

### 1.5 Open to today's note
- File name is the local date, `YYYY-MM-DD.md`, inside the notes folder.
- **Done when:** a cold start shows today's page in under 2s without loading any model; opening on a new day creates that day's file.

### 1.6 Editor
- Single column, writing first, Newsreader for body text.
- Debounced autosave on pause, plus save on window close.
- **Done when:** type, force-close mid-sentence, relaunch, and the text is there; the `.md` file in Notepad matches exactly what was typed.

### 1.7 Calendar sidebar
- List days and jump to any past or future day; create or open that day's note.
- **Done when:** clicking 3 different dates opens the right files; days without a file show an empty state, not an error.

### 1.8 Tasks in the note
- Checkbox tasks: add, edit, delete, check/uncheck. **No timer UI anywhere.**
- Stored as standard Markdown: `- [ ] task` / `- [x] task`.
- **Done when:** tasks are readable in the `.md` outside Vayu, and checking a box updates the file.

---

## 1C — Ollama handshake

### 1.9 Detect Ollama
- Check `http://localhost:11434` at startup. Show status in Settings → Model: **Running** / **Not found**, with a refresh option.
- **Done when:** running Ollama shows Running; quitting Ollama changes the status without restarting the app (or after a refresh tap); no crash either way.

### 1.10 Detect models
- Show whether `gemma3n:e4b`, `gemma3n:e2b`, and `embeddinggemma` are installed.
- **Done when:** the list matches `ollama list`; E4B already on the dev PC shows as present with no download offered.

### 1.11 Test AI
- A "Test AI" button sends one short prompt and streams the reply into the UI, with a Stop button.
- **Done when:** the reply streams token by token; Stop ends it within ~1s; killing Ollama mid-reply shows a calm error, not a hang.

---

## 1D — Check-in 1 (verifier runs this with the owner)

The coding agent prepares; the verifier runs the test.

- Write a real note for today and add 3 tasks.
- Close the app, reopen, and confirm everything is still there (in the app and in the `.md` file).
- Run Test AI once.
- Turn Ollama off and on; confirm no crash.

**Pass:** note and tasks persist from the real files · Test AI streams · no crash with Ollama on or off.
**On pass:** commit and tag `checkin-1`.
**On fail:** Thursday morning is fix-only until this passes.

---

## Status board

| ID | Task | Status | Verifier notes |
|---|---|---|---|
| 1.1 | Lock design system | todo | |
| 1.2 | Tauri skeleton | todo | |
| 1.3 | Design tokens | todo | |
| 1.4 | Notes folder | todo | |
| 1.5 | Today's note | todo | |
| 1.6 | Editor + autosave | todo | |
| 1.7 | Calendar sidebar | todo | |
| 1.8 | Tasks | todo | |
| 1.9 | Ollama detection | todo | |
| 1.10 | Model detection | todo | |
| 1.11 | Test AI streaming | todo | |
| CI-1 | Check-in 1 | todo | |

---

## Blockers / questions

- **Design tokens:** the PRD §8 hex values aren't in the repo. Known so far: Ink `#0E1116` (dark BG) and Warm `#F5C97A` (Evening Reflection only). Paper BG and the other colours need their hex values from the owner or the PRD before 1.3 can be verified.
- **Frontend framework:** not fixed by the PRD. Pick one, record it in the Decisions log, and keep it simple.
