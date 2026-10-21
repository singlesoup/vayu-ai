// Task 3.6: Ask Your Notes (RAG) — search the local embedding index for the
// question, then answer ONLY from the retrieved excerpts with source-day
// chips. Abstains when nothing is found; never invents.
import { useState } from "react";
import { generate, searchIndex, stopGeneration, type SearchHit } from "../lib/api";
import { isApiErrorLike } from "../lib/apiErrors";
import { formatNoteHeader } from "../lib/dateFormat";
import { noteDateToDate } from "../lib/noteFile";

const ABSTAIN = "I couldn't find anything in your notes about that.";

function buildPrompt(question: string, hits: SearchHit[]): string {
  const excerpts = hits
    .map((hit) => `[${hit.date}] ${hit.text}`)
    .join("\n---\n");
  return (
    "You are Vayu's research helper. Answer the user's question using ONLY " +
    "the note excerpts below. If the excerpts do not contain the answer, " +
    'reply exactly: "I couldn\'t find anything in your notes about that." ' +
    "Do not invent anything.\n\n" +
    `Question: ${question}\n\nNote excerpts:\n${excerpts}`
  );
}

type Props = {
  /** Open the day a source chip points at. */
  onOpenDay: (date: string) => void;
};

type Step = "idle" | "searching" | "answering" | "done" | "error";

export function AskNotes({ onOpenDay }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SearchHit[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    const q = question.trim();
    if (!q || step === "searching" || step === "answering") return;
    setError(null);
    setStep("searching");
    try {
      const hits = await searchIndex(q, 5);
      if (hits.length === 0) {
        setAnswer(ABSTAIN);
        setSources([]);
        setStep("done");
        return;
      }
      setSources(hits);
      setStep("answering");
      let text = "";
      await generate(buildPrompt(q, hits), (event) => {
        if (event.event === "token") text += event.value;
        if (event.event === "done") {
          setAnswer(text.trim() || ABSTAIN);
          setStep("done");
        }
      });
    } catch (err) {
      setStep("error");
      setError(isApiErrorLike(err) ? err.message : "Ask failed. Try again.");
    }
  };

  const stop = async () => {
    await stopGeneration();
    setAnswer((current) => current || ABSTAIN);
    setStep("done");
  };

  return (
    <section className="ask-notes" aria-label="Ask your notes">
      <h2>Ask your notes</h2>
      {error && (
        <p className="form-error" role="status">
          {error}
          <button type="button" onClick={() => setError(null)}>Dismiss</button>
        </p>
      )}
      <div className="ask-input">
        <input
          placeholder="Ask about your past days…"
          value={question}
          onChange={(e) => setQuestion(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void ask();
            }
          }}
        />
        {step === "answering" ? (
          <button type="button" className="btn-ghost" onClick={stop} aria-label="Stop">
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            disabled={!question.trim() || step === "searching"}
            onClick={ask}
          >
            Ask
          </button>
        )}
      </div>
      {step === "searching" && <p role="status">Searching your notes…</p>}
      {step === "answering" && <p role="status">Thinking…</p>}
      {step === "done" && (
        <>
          <p className="ask-answer">{answer}</p>
          {sources.length > 0 && (
            <div className="ask-sources" aria-label="Sources">
              {sources.map((hit) => (
                <button
                  key={`${hit.date}-${hit.score}`}
                  type="button"
                  className="btn-ghost ask-source-chip"
                  onClick={() => onOpenDay(hit.date)}
                  title={formatNoteHeader(noteDateToDate(hit.date))}
                >
                  {noteDateToDate(hit.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
