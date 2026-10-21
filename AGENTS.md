# Agent rules for Vayu

Owner = human. Verifier = human (or a chat acting as verifier). Coding agent = the worker.

## Commits (read this first)

**Default: do not commit.** Leave a dirty tree. Update `now.md` status to `review` and write a session note. The owner or verifier commits.

Only commit when the owner's message explicitly says one of:
- `commits are OK`
- `commit after each task`
- `commit when done`

When commits are allowed:

1. Prefer **one commit per finished vertical slice** that a user can see or a command that is fully wired (e.g. `feat(2.wire): first-run tier → download → morning + dump in App`).
2. `test(<id>)` then `feat(<id>)` is allowed for hard TDD blocks, but **do not** flood history with drive-by chore/docs commits. Batch board updates into the feature commit or one `docs:` commit at session end.
3. Never push. Never create tags (`checkin-*`, `v*`) — verifier only.
4. Never commit secrets, `.env`, or large binaries.

## Definition of “done” / `review`

A task is not `review` until:

- Acceptance criteria have tests (or are marked **(manual)** with steps).
- `npm run check` is green.
- **UI work is mounted in the running app** (`App.tsx` or the real parent). Components that only exist as files + unit tests are **not** done.
- Session note lists what the verifier should click in `npm run tauri dev`.

## Scope

- Follow `now.md` then `plan.md`. Do not start the next phase until the check-in tag for the current phase exists (or the owner says GO).
- No timers/Pomodoro. No cloud calls. No BYOK/Laya/voice unless the board says so.
- Design tokens only — no hard-coded colours outside `tokens.css`.
- All filesystem and Ollama HTTP stay in Rust; the web UI uses `src/lib/api.ts` only.

## Workflow

1. Break the phase into small tasks in `now.md` before coding (if the board is missing).
2. Work in order; respect dependencies.
3. TDD: failing tests first when the task lists them.
4. Stay sequential — no subagents / Task tool unless the owner asks.
5. At session end: session note in `now.md`, change log line in `plan.md` (even if you did not commit).

## PATH (Windows)

- Ensure `cargo` is on `PATH` (`%USERPROFILE%\.cargo\bin`).
- `CARGO_TARGET_DIR=%LOCALAPPDATA%\vayu-target` (keep build artefacts off OneDrive).
