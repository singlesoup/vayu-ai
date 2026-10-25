// Tasks 1.9.2 + 1.10.2: Settings panel — Phase 1 holds only the Model
// (Ollama) section. The status and model list come from the Rust commands
// `ollama_status` and `list_models` (never from the UI, which makes NO
// network calls itself). While the panel is open both re-check every 5s; the
// poll lives inside <ModelStatus />, which mounts fresh on every open and
// unmounts on close — so polling simply stops. No download buttons: installing
// models is Phase 2. All outcomes are calm — Ollama being down is a normal
// state, not a crash.
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { deleteModel, listModels, ollamaStatus } from "../lib/api";
import { applyTheme, getThemeChoice, subscribeTheme, type ThemeChoice } from "../lib/theme";
import type { DetectedModels, OllamaStatus } from "../lib/api";
import { TestAi } from "./TestAi";
import { ModelCard } from "./ModelCard";

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
          <h3>Appearance</h3>
          <Appearance />
        </div>
        <div className="settings-section">
          <h3>Model</h3>
          <ModelStatus />
        </div>
        {/* Task 1.11.3: the Test AI panel lives with the Model section. */}
        <div className="settings-section">
          <h3>Test AI</h3>
          <TestAi />
        </div>
      </section>
    </div>
  );
}

function Appearance() {
  const choice = useSyncExternalStore(subscribeTheme, getThemeChoice, getThemeChoice);
  const options: ThemeChoice[] = ["dark", "light", "system"];
  return (
    <div className="theme-switch" role="group" aria-label="Appearance">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={choice === option}
          onClick={() => applyTheme(option)}
        >
          {option === "dark" ? "Dark" : option === "light" ? "Light" : "System"}
        </button>
      ))}
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
      <ModelCard onModelsChanged={refresh} />
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

      {/* Task 1.10.2: the three PRD models, Present/Missing. Task 3.8:
          present models can be removed from disk via /api/delete. */}
      <ul className="model-list">
        {data.models.present.map((name) => (
          <li key={name}>
            <code>{name}</code>
            <span>Present</span>
            <DeleteModelButton name={name} onDeleted={refresh} />
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

/** Task 3.8: remove an installed model from disk (asks first). */
function DeleteModelButton({ name, onDeleted }: { name: string; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      disabled={busy}
      onClick={() => {
        if (!window.confirm(`Delete ${name} from disk? This can't be undone.`)) return;
        setBusy(true);
        void deleteModel(name)
          .then(onDeleted)
          .catch(() => setBusy(false))
          .finally(() => setBusy(false));
      }}
    >
      Delete
    </button>
  );
}
