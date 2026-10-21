// Task 2.10: Brain Dump → Tasks — streamed extraction → preview/edit → insert;
// nothing is written to the note before the user confirms.
import { useRef, useState } from "react";
import { appendNote, generate } from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";
import { type NoteDate } from "../lib/noteFile";

type Step = "idle" | "extracting" | "preview" | "empty" | "done" | "error";

type Props = {
  date: NoteDate;
  /** Fired when the dump has been handled (inserted or found no tasks). */
  onFinish: () => void;
};

function dateLabel(d: NoteDate): string {
  const dateObj = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)), 12);
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dateObj.getDay()];
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][dateObj.getMonth()];
  return wd + " " + dd + " " + mon + " " + dateObj.getFullYear();
}

const TASK_LINE = /^-\s*\[( |x)\]\s+(.+)$/;

function extractTasks(text: string): string[] | null {
  if (text.toUpperCase().includes("NO_TASKS")) return null;
  const found: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(TASK_LINE);
    if (m) found.push(m[2]);
  }
  return found;
}

export function BrainDump({ date, onFinish }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [dump, setDump] = useState("");
  const [tasks, setTasks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const bufferRef = useRef("");

  function extract(): void {
    bufferRef.current = "";
    setTasks([]);
    setError(null);
    setStep("extracting");
    const prompt =
      "Extract clear, actionable tasks from this brain dump. " +
      "Preserve the user's exact wording wherever possible. " +
      "Do not invent tasks the user didn't imply. " +
      "If nothing is actionable, reply with exactly: NO_TASKS\n" +
      "Otherwise reply with one '- [ ] task' line per task, nothing else.\n\n" +
      "Brain dump:\n" +
      dump;
    void generate(prompt, (event) => {
      if (event.event === "token") {
        bufferRef.current += event.value;
      }
      if (event.event === "done") {
        const parsed = extractTasks(bufferRef.current);
        if (parsed === null) {
          setStep("empty");
          return;
        }
        setTasks(parsed);
        setStep(parsed.length > 0 ? "preview" : "empty");
      }
    }).catch((err) => {
      setError(isApiErrorLike(err) ? err.message : "Couldn't extract tasks.");
      setStep("error");
    });
  }

  function updateTask(index: number, value: string): void {
    const next = tasks.slice();
    next[index] = value;
    setTasks(next);
  }

  function removeTask(index: number): void {
    const next = tasks.slice();
    next.splice(index, 1);
    setTasks(next);
  }

  function insert(): void {
    const appendix =
      "\n\n## Tasks — " +
      dateLabel(date) +
      "\n\n" +
      tasks.map((t) => "- [ ] " + t).join("\n") +
      "\n";
    void appendNote(date, appendix);
    setStep("done");
    onFinish();
  }

  if (step === "done") {
    return null;
  }

  if (step === "error") {
    return (
      <section className="brain-dump" aria-label="Brain Dump">
        <h2>Brain Dump → Tasks</h2>
        <p className="form-error" role="status">{error}</p>
        <button type="button" onClick={() => { setStep("idle"); setError(null); }}>
          Try again
        </button>
      </section>
    );
  }

  if (step === "idle") {
    return (
      <section className="brain-dump" aria-label="Brain Dump">
        <h2>Brain Dump → Tasks</h2>
        <p>Type everything on your mind — no structure needed.</p>
        <textarea
          placeholder="Brain dump (e.g. revise physics, mock test at 4 pm, buy milk)"
          value={dump}
          onChange={(e) => setDump(e.currentTarget.value)}
        />
        <button type="button" className="btn-primary" disabled={!dump.trim()} onClick={extract}>
          Extract tasks
        </button>
      </section>
    );
  }

  if (step === "extracting") {
    return (
      <section className="brain-dump" aria-label="Brain Dump">
        <h2>Brain Dump → Tasks</h2>
        <p>Extracting tasks…</p>
      </section>
    );
  }

  if (step === "empty") {
    return (
      <section className="brain-dump" aria-label="Brain Dump">
        <h2>Brain Dump → Tasks</h2>
        <p>No tasks found — nothing actionable in that dump. Nothing was written.</p>
      </section>
    );
  }

  // step === "preview"
  return (
    <section className="brain-dump" aria-label="Brain Dump">
      <h2>Brain Dump → Tasks</h2>
      <p>Review the extracted tasks before they are added to today's note.</p>
      <ul>
        {tasks.map((t, i) => (
          <li key={i} className="task-row">
            <input type="text" value={t} onChange={(e) => updateTask(i, e.currentTarget.value)} role="textbox" aria-label={"Task " + (i + 1)} />
            <button type="button" className="btn-ghost" onClick={() => removeTask(i)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-primary" disabled={tasks.length === 0} onClick={insert}>
        Insert
      </button>
    </section>
  );
}
