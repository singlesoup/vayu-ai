// Task 2.8/2.9: Morning Intention — up to 3 questions (PRD §5.2), one-tap
// Skip, no re-nag the same day. Output (1 intention line + Top 3 tasks) is
// appended to today's note exactly once per day.
import { useState } from "react";
import { appendNote, generate, markIntention } from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";
import { formatNoteHeader } from "../lib/dateFormat";
import { type NoteDate } from "../lib/noteFile";

const QUESTIONS = [
  "How's your energy today?",
  "What's the one thing that matters today?",
  "Anything blocking you?",
];

type Step = "questions" | "generating" | "preview" | "done" | "error";

type Props = {
  date: NoteDate;
  /** Fired when the intention is done or skipped, so the parent can hide the card. */
  onFinish: (status: "done" | "skipped") => void;
};

export function parseIntention(text: string): { intention: string; tasks: string[] } {
  const m = text.match(/^intention:\s*(.+)$/im);
  const tasks: string[] = [];
  for (const line of text.split("\n")) {
    const mm = line.match(/^-\s*\[( |x)\]\s+(.+)$/);
    if (mm) tasks.push(mm[2]);
  }
  return { intention: (m?.[1] ?? "").trim(), tasks };
}

export function MorningIntention({ date, onFinish }: Props) {
  const [step, setStep] = useState<Step>("questions");
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [streamed, setStreamed] = useState("");
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (qIndex < QUESTIONS.length - 1) {
      setQIndex(qIndex + 1);
      return;
    }
    if (!answers.every((a) => a.trim() !== "")) return;
    const prompt =
      "The user answered three questions:\n" +
      `Energy: ${answers[0]}\n` +
      `One thing that matters: ${answers[1]}\n` +
      `Anything blocking: ${answers[2]}\n\n` +
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
    <section className="morning-intention" aria-label="Morning Intention">
      <h2>Morning Intention</h2>
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
          <p>{QUESTIONS[qIndex]}</p>
          <textarea
            value={answers[qIndex]}
            onChange={(e) => {
              const next = [...answers];
              next[qIndex] = e.currentTarget.value;
              setAnswers(next);
            }}
          />
          <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
            <button type="button" className="btn-ghost" onClick={skip}>
              Skip today
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!answers[qIndex].trim()}
              onClick={next}
            >
              {qIndex === QUESTIONS.length - 1 ? "Plan my day" : "Next"}
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
