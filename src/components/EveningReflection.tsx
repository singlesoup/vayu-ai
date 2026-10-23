// Task 3.3: Evening Reflection — summary from today's note + tasks only,
// seeds one line into tomorrow's note. Works any time of day.
// Warm accent (PRD evening colour) is applied via App.css on this section.
import { useEffect, useState } from "react";
import { appendNote, generate, readNote } from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";
import { parseTasks } from "../lib/tasks";
import { noteDateToDate } from "../lib/noteFile";
import { type NoteDate } from "../lib/noteFile";

function nextDay(date: NoteDate): NoteDate {
  const d = noteDateToDate(date);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  date: NoteDate;
  onSaved?: () => void;
};

export function EveningReflection({ date, onSaved }: Props) {
  const [step, setStep] = useState<"idle" | "reflecting" | "done" | "error">("idle");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [seed, setSeed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gaveEnergy, setGaveEnergy] = useState("");
  const [lettingGo, setLettingGo] = useState("");

  useEffect(() => {
    void readNote(date)
      .then((r) => setContent(r.content))
      .catch(() => setContent(""));
  }, [date]);

  const tasksText = parseTasks(content).map((t) => t.text).join("\n");

  const reflect = async () => {
    setError(null);
    setStep("reflecting");
    const prompt =
      "Summarize this day in 2-3 sentences based ONLY on the note, tasks, and " +
      "the two wind-down answers below. Do not invent events.\n\n" +
      `Note:\n${content}\n\n` +
      `Tasks:\n${tasksText || "(none)"}\n\n` +
      `What gave energy: ${gaveEnergy || "(not answered)"}\n` +
      `Letting go: ${lettingGo || "(not answered)"}`;
    try {
      let text = "";
      await generate(prompt, (event) => {
        if (event.event === "token") text += event.value;
        if (event.event === "done") {
          setStep("done");
          setSummary(text.trim());
          setSeed(text.trim());
        }
      });
    } catch (err) {
      setStep("error");
      setError(isApiErrorLike(err) ? err.message : "Couldn't reflect on the day.");
    }
  };

  const saveSeed = async () => {
    const tomorrow = nextDay(date);
    const section =
      "\n\n---\nSeed from " +
      date +
      " (evening reflection):\n" +
      seed +
      "\n";
    await appendNote(tomorrow, section);
    onSaved?.();
  };

  return (
    <section className="evening-reflection flow-card" aria-label="Evening Reflection">
      <p className="flow-kicker">Evening reflection</p>
      <h2>Let the day settle.</h2>
      {step === "error" && (
        <p className="form-error" role="status">
          {error}
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}
      {step === "idle" && (
        <>
          <p className="panel-copy">A gentle two-question wind-down, whenever you’re ready.</p>
          <label className="flow-question">
            What gave you energy today?
            <textarea
              className="flow-input"
              value={gaveEnergy}
              placeholder="A person, a moment, a small win..."
              onChange={(e) => setGaveEnergy(e.currentTarget.value)}
            />
          </label>
          <label className="flow-question">
            What is one thing to let go of for tomorrow?
            <textarea
              className="flow-input"
              value={lettingGo}
              placeholder="You do not need to carry it overnight..."
              onChange={(e) => setLettingGo(e.currentTarget.value)}
            />
          </label>
          <div className="panel-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={reflect}
              disabled={!content.trim() && !tasksText && !gaveEnergy.trim() && !lettingGo.trim()}
            >
              Reflect on today
            </button>
          </div>
        </>
      )}
      {step === "reflecting" && <p>Reflecting on your day…</p>}
      {step === "done" && (
        <>
          <p>Summary:</p>
          <p className="panel-copy">{summary || "(nothing to summarize)"}</p>
          <p>Seed for tomorrow:</p>
          <textarea
            value={seed}
            onChange={(e) => setSeed(e.currentTarget.value)}
            rows={2}
          />
          <div className="panel-actions">
            <button type="button" className="btn-primary" disabled={!seed.trim()} onClick={saveSeed}>
              Save seed to tomorrow
            </button>
          </div>
        </>
      )}
    </section>
  );
}
