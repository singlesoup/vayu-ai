// Tasks 1.9.2 + 1.10.2: Settings panel — Phase 1 holds only the Model
// (Ollama) section. The status and model list come from the Rust commands
// `ollama_status` and `list_models` (never from the UI, which makes NO
// network calls itself). While the panel is open both re-check every 5s; the
// poll lives inside <ModelStatus />, which mounts fresh on every open and
// unmounts on close — so polling simply stops. No download buttons: installing
// models is Phase 2. All outcomes are calm — Ollama being down is a normal
// state, not a crash.
import { useCallback, useEffect, useState } from "react";
import { listModels, ollamaStatus } from "../lib/api";
import type { DetectedModels, OllamaStatus } from "../lib/api";

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

type ModelData = { status: OllamaStatus; models: DetectedModels };

/** Ollama reachability + installed models: fresh on mount, re-checked every 5 seconds. */
function ModelStatus() {
  const [data, setData] = useState<ModelData | null>(null);

  const refresh = useCallback(() => {
    void Promise.allSettled([ollamaStatus(), listModels()]).then(([s, m]) => {
      setData({
        status:
          s.status === "fulfilled"
            ? s.value
            : { kind: "NotFound", reason: "status check failed" },
        models:
          m.status === "fulfilled"
            ? m.value
            : {
                present: [],
                missing: ["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"],
                status: { kind: "NotFound", reason: "model check failed" },
                devChatModel: null,
              },
      }); // the panel ignores a refresh that lands after unmount
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const guardedRefresh = () => {
      void Promise.allSettled([ollamaStatus(), listModels()]).then(([s, m]) => {
        if (cancelled) return;
        setData({
          status:
            s.status === "fulfilled"
              ? s.value
              : { kind: "NotFound", reason: "status check failed" },
          models:
            m.status === "fulfilled"
              ? m.value
              : {
                  present: [],
                  missing: ["gemma3n:e4b", "gemma3n:e2b", "embeddinggemma"],
                  status: { kind: "NotFound", reason: "model check failed" },
                  devChatModel: null,
                },
        });
      });
    };
    guardedRefresh();
    const interval = setInterval(guardedRefresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (data === null) {
    return (
      <>
        <p role="status">Checking Ollama…</p>
        <RefreshButton onRefresh={refresh} />
      </>
    );
  }

  return (
    <>
      {data.status.kind === "Running" ? (
        <p role="status">Running — Ollama v{data.status.version}</p>
      ) : (
        <p role="status">
          Not found
          {data.status.reason && <span className="settings-reason"> ({data.status.reason})</span>}
          <br />
          <span className="settings-reason">Start Ollama, then use Refresh.</span>
        </p>
      )}

      {/* Task 1.10.2: the three PRD models, Present/Missing, no download UI. */}
      <ul className="model-list">
        {data.models.present.map((name) => (
          <li key={name}>
            <code>{name}</code>
            <span>Present</span>
          </li>
        ))}
        {data.models.missing.map((name) => (
          <li key={name}>
            <code>{name}</code>
            <span>Missing</span>
          </li>
        ))}
      </ul>
      {data.models.devChatModel && (
        <p className="settings-reason">Dev model: {data.models.devChatModel}</p>
      )}

      <RefreshButton onRefresh={refresh} />
    </>
  );
}

function RefreshButton({ onRefresh }: { onRefresh: () => void }) {
  return (
    <button type="button" onClick={onRefresh}>
      Refresh
    </button>
  );
}
