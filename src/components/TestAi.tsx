// Task 1.11.3: the "Test AI" panel (Settings → Model). Shows a thinking state
// until the first token, appends tokens live via the Rust event channel, and
// offers Stop while a run is live (Test AI disabled meanwhile). Everything
// failing (Ollama down, no model, mid-stream loss) is a CALM message — notes
// live in files, never in the AI panel.
import { useState } from "react";
import { generate, stopGeneration } from "../lib/api";
import type { GenerateOutcome, StreamEvent } from "../lib/api";

type Phase = "idle" | "thinking" | "streaming";

const CALM_ERROR = "Vayu couldn't reach the local AI. Your notes are safe.";
const NO_MODEL = "No model installed yet — see the list above.";

export function TestAi() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run() {
    setPhase("thinking");
    setText("");
    setMessage(null);
    let sawToken = false;
    void generate("Write a short reply that ends with the word Vayu.", (e: StreamEvent) => {
      if (e.event === "token") {
        if (!sawToken) {
          sawToken = true;
          setPhase("streaming");
        }
        setText((prev) => prev + e.value);
      }
      // "done" needs no handling: the command's outcome resolves the state.
    })
      .then((outcome: GenerateOutcome) => {
        setPhase("idle");
        if (outcome.status === "Error") setMessage(CALM_ERROR);
      })
      .catch((err: { kind?: string }) => {
        setPhase("idle");
        setMessage(err?.kind === "NoModel" ? NO_MODEL : CALM_ERROR);
      });
  }

  function stop() {
    void stopGeneration(); // Rust ends the stream; the outcome settles the UI.
  }

  const running = phase !== "idle";

  return (
    <div className="test-ai">
      <div className="test-ai-controls">
        <button type="button" className="btn-primary" onClick={run} disabled={running}>
          Test AI
        </button>
        {running && (
          <button type="button" className="btn-ghost" onClick={stop}>
            Stop
          </button>
        )}
      </div>

      {phase === "thinking" && <p role="status">Thinking…</p>}
      {message !== null && <p role="status" className="test-ai-error">{message}</p>}
      {text !== "" && (
        <p data-testid="test-ai-reply" className="test-ai-reply">
          {text}
        </p>
      )}
    </div>
  );
}
