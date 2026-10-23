// Task 2.8/2.9: Morning Intention — up to 3 questions (PRD §5.2), one-tap
// Skip, no re-nag the same day. Output (1 intention line + Top 3 tasks) is
// appended to today's note exactly once per day.
import { useState } from "react";
import { appendNote, generate, markIntention } from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";
import { parseIntention } from "../lib/intention";
import { formatNoteHeader } from "../lib/dateFormat";
import { type NoteDate } from "../lib/noteFile";

const ENERGY = ["Quiet", "Low", "Steady", "Bright", "Full"];

type Step = "questions" | "generating" | "preview" | "done" | "error";

type Props = {
  date: NoteDate;
  /** Fired when the intention is done or skipped, so the parent can hide the card. */
  onFinish: (status: "done" | "skipped") => void;
};

export function MorningIntention({ date, onFinish }: Props) {
  const [step, setStep] = useState<Step>("questions");
  const [energy, setEnergy] = useState(3);
  const [focus, setFocus] = useState("");
  const [blocker, setBlocker] = useState("");
  const [streamed, setStreamed] = useState("");
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (!focus.trim()) return;
    const prompt =
      "The user answered three questions:\n" +
      `Energy: ${ENERGY[energy - 1]} (${energy}/5)\n` +
      `One thing that matters: ${focus}\n` +
      `Anything blocking: ${blocker || "(none)"}\n\n` +
      "Write ONE short daily intention line, then pick the Top 3 tasks from the answers.\n" +
      "Output exactly:\n" +
      "Intention: <one line>\n" +
      "Top 3:\n" +
      "- [ ] task 1\n" +
      "- [ ] task 2\n" +
      "- [ ] task 3";
    setStep("generating");
    void generate(prompt, (event) => {
      if (event.event === "token") setStreamed((s) => s + event.value);
      if (event.event === "done") setStep("preview");
    }).catch((err) => {
      setError(isApiErrorLike(err) ? err.message : "Couldn't plan your day.");
      setStep("error");
    });
  };

  const { intention, tasks } = parseIntention(streamed);

  function dateLabel(d: NoteDate): string {
    return formatNoteHeader(
      new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)), 12),
    );
  }

  const save = () => {
    const section =
      "\n\n## Intention — " +
      dateLabel(date) +
      "\n\n" +
      intention +
      "\n\nTop 3:\n" +
      tasks.map((t) => `- [ ] ${t}`).join("\n") +
      "\n";
    void appendNote(date, section);
    void markIntention(date, "done");
    setStep("done");
    onFinish("done");
  };

  const skip = () => {
    void markIntention(date, "skipped");
    setStep("done");
    onFinish("skipped");
  };

  if (step === "done") return null;

  return (
    <section className="morning-intention flow-card" aria-label="Morning Intention">
      <p className="flow-kicker">Morning intention</p>
      <h2>Arrive before you begin.</h2>
      {step === "error" && (
        <p className="form-error" role="status">
          {error}
          <button type="button" onClick={() => {
            setStep("questions");
            setError(null);
          }}>
            Try again
          </button>
        </p>
      )}
      {step === "questions" && (
        <>
          <p className="flow-question">How is your energy showing up today?</p>
          <div className="energy-readout">
            <strong>{ENERGY[energy - 1]}</strong>
            <span>{energy}/5</span>
          </div>
          <input
            className="energy-slider"
            type="range"
            min={1}
            max={5}
            value={energy}
            aria-label="Energy level"
            onChange={(e) => setEnergy(Number(e.currentTarget.value))}
          />
          <p className="energy-ends"><span>Quiet</span><span>Full</span></p>
          <label className="flow-question">
            What is the one thing that matters today?
            <input
              className="flow-input"
              value={focus}
              placeholder="Give your day a clear center..."
              onChange={(e) => setFocus(e.currentTarget.value)}
            />
          </label>
          <label className="flow-question">
            Anything blocking you?
            <input
              className="flow-input"
              value={blocker}
              placeholder="Name it so it feels lighter..."
              onChange={(e) => setBlocker(e.currentTarget.value)}
            />
          </label>
          <div className="panel-actions">
            <button type="button" className="btn-ghost" onClick={skip}>
              Skip today
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!focus.trim()}
              onClick={next}
            >
              Hold this intention
            </button>
          </div>
        </>
      )}
      {step === "generating" && <p>Planning your day…</p>}
      {step === "preview" && (
        <>
          <p>Your intention for {dateLabel(date)}:</p>
          <p>{intention || "(none)"}</p>
          <ul>
            {tasks.map((t, i) => (
              <li key={i}>- [ ] {t}</li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-primary"
            disabled={intention === "" || tasks.length === 0}
            onClick={save}
          >
            Save to today's note
          </button>
        </>
      )}
    </section>
  );
}
