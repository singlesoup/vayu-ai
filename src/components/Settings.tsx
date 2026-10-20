// Task 1.9.2: Settings panel — Phase 1 holds only the Model (Ollama) section.
// The status comes from the Rust command `ollama_status` (never from the UI,
// which makes NO network calls itself). While the panel is open the status
// re-checks every 5s; the poll is inside <ModelStatus />, which mounts fresh
// on every open and unmounts on close — so polling simply stops. All errors
// are calm: Ollama being down is a normal state, not a crash.
import { useEffect, useState } from "react";
import { ollamaStatus } from "../lib/api";
import type { OllamaStatus } from "../lib/api";

const POLL_MS = 5_000;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function Settings({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="settings-backdrop">
      <section className="settings" aria-label="Settings" role="dialog">
        <header>
          <h2>Settings</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="settings-section">
          <h3>Model</h3>
          <ModelStatus />
        </div>
      </section>
    </div>
  );
}

/** Ollama reachability: fresh on mount, re-checked every 5 seconds. */
function ModelStatus() {
  const [status, setStatus] = useState<OllamaStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    function refresh() {
      void ollamaStatus().then((s) => {
        if (!cancelled) setStatus(s);
      }); // the command never throws to the UI
    }
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      {status === null ? (
        <p role="status">Checking Ollama…</p>
      ) : status.kind === "Running" ? (
        <p role="status">Running — Ollama v{status.version}</p>
      ) : (
        <p role="status">
          Not found
          {status.reason && <span className="settings-reason"> ({status.reason})</span>}
          <br />
          <span className="settings-reason">Start Ollama, then use Refresh.</span>
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          void ollamaStatus().then(setStatus);
        }}
      >
        Refresh
      </button>
    </>
  );
}
