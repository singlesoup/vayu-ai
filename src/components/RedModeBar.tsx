// Task 3.7: Red mode — Ollama gone / No-AI tier. AI surfaces are hidden;
// this bar shows one plain line and keeps notes useful with a plain keyword
// search over every existing note (no embeddings, no model).
import { useEffect, useState } from "react";
import { readAllNotes } from "../lib/api";
import { formatNoteHeader } from "../lib/dateFormat";
import { noteDateToDate } from "../lib/noteFile";

export const AI_OFF_LINE =
  "Your PC can't run AI chat locally — Vayu still works as notes + tasks.";

type Props = {
  onOpenDay: (date: string) => void;
};

function short(date: string): string {
  return noteDateToDate(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function RedModeBar({ onOpenDay }: Props) {
  const [notes, setNotes] = useState<{ date: string; content: string }[] | null>(null);
  const [query, setQuery] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void readAllNotes()
      .then(setNotes)
      .catch(() => setFailed(true));
  }, []);

  const q = query.trim().toLowerCase();
  const matches = (notes ?? []).filter((n) => q && n.content.toLowerCase().includes(q));

  return (
    <section className="red-mode-bar" aria-label="Notes without AI">
      <p className="ai-off-line" role="status">
        {AI_OFF_LINE}
      </p>
      {failed && (
        <p className="form-error" role="status">
          Couldn't load the notes list.
        </p>
      )}
      <div className="keyword-search">
        <label htmlFor="keyword-search-input">Keyword search</label>
        <input
          id="keyword-search-input"
          placeholder="Find words across your notes…"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
      </div>
      {q && matches.length === 0 && (
        <p className="settings-reason" role="status">
          No days mention “{query}”.
        </p>
      )}
      {matches.length > 0 && (
        <ul className="keyword-hits">
          {matches.map((n) => (
            <li key={n.date}>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => onOpenDay(n.date)}
                title={formatNoteHeader(noteDateToDate(n.date))}
              >
                {short(n.date)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
