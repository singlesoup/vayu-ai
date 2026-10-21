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
      "Summarize this day in 2-3 sentences based ONLY on the note and tasks " +
      "below. Do not invent events. If there is nothing to summarize, say so.\n\n" +
      `Note:\n${content}\n\n` +
      `Tasks:\n${tasksText || "(none)"}`;
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
    <section className="evening-reflection" aria-label="Evening Reflection">
      <h2>Evening Reflection</h2>
      {step === "error" && (
        <p className="form-error" role="status">
          {error}
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}
      {step === "idle" && (
        <>
          <p>Summarize today from your note and tasks, and seed one line for tomorrow.</p>
          <button type="button" className="btn-primary" onClick={reflect} disabled={!content.trim() && !tasksText}>
            Reflect on today
          </button>
        </>
      )}
      {step === "reflecting" && <p>Reflecting on your day…</p>}
      {step === "done" && (
        <>
          <p>Summary:</p>
          <p>{summary || "(nothing to summarize)"}</p>
          <p>Seed for tomorrow:</p>
          <textarea
            value={seed}
            onChange={(e) => setSeed(e.currentTarget.value)}
            rows={2}
          />
          <button type="button" className="btn-primary" disabled={!seed.trim()} onClick={saveSeed}>
            Save seed to tomorrow
          </button>
        </>
      )}
    </section>
  );
}
