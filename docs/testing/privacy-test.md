# Privacy test (3.10) — runbook

Goal: prove the full in-app loop produces **zero outbound network calls**
except the local Ollama endpoint (127.0.0.1:11434). Two halves:

## Static half — already run by [opencode], 25 Oct

```
node scripts/privacy-static-audit.mjs
```

Result this session: **CLEAN — 0 violations.**
- 99 source files scanned (8 Rust + 91 FE/TS)
- 14 URL literals, all resolve to 127.0.0.1/localhost (incl. an allowlist entry
  for `format!("http://{addr}")` templates that bind a local test listener)
- 3 negative-test fixtures correctly identified (example.com / 192.168.1.20 /
  127.0.0.1.evil.test exist in `ollama.rs` tests asserting such URLs are
  REJECTED)
- `src/lib/api.ts`: 2× `invoke()`, 0× `fetch`, 0× XHR — the webview cannot open
  its own sockets
- Extra hardening already in code: `base_url_from` rejects https/remote-host
  Ollama URLs (`http://127.0.0.1.evil.test:11434` bypass is covered by a test)

## Runtime half — verifier drives the loop

1. Start the app (`npm run tauri dev`, `CARGO_TARGET_DIR=%LOCALAPPDATA%\vayu-target`).
2. In a second terminal:
   ```
   powershell -ExecutionPolicy Bypass -File scripts\privacy-runtime-watch.ps1 -DurationSec 1200
   ```
3. Drive the whole loop while it watches: launch → morning intention → brain
   dump + extract → task edits/check-offs → Ask Your Notes → evening reflection
   → save → close the app.
4. Read the verdict: `0 outbound violation(s)` = pass. Log path prints at the
   end (default `C:\Users\<user>\AppData\Local\vayu-privacy\privacy-audit-*.log`).
5. **Review-only** loopback contacts (dev server 1420/5173 in `tauri dev`) are
   logged but not violations; a release build running the same loop should
   show none.
6. Save/screenshot the verdict + attach the log with the checkin evidence.
   On any violation: copy the exact pid/remote rows into `now.md`, do not
   proceed to the freeze check-in.

Note: the watcher refreshes the process tree every pass, so it also catches
processes spawned mid-loop (vite/cargo children during dev).
