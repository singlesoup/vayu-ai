// Task 3.5: [[topic]] backlinks panel — every topic written in any note,
// with day chips that open the day where the topic appears. Typos only map
// to the days they were typed on; nothing is ever created.
import { useEffect, useState } from "react";
import { readAllNotes } from "../lib/api";
import { buildBacklinkIndex } from "../lib/backlinks";
import { formatNoteHeader } from "../lib/dateFormat";
import { noteDateToDate } from "../lib/noteFile";

type Props = {
  /** Open the day a backlink chip points at. */
  onOpenDay: (date: string) => void;
  /** Bump after a save so topics typed later appear without restart. */
  refreshKey?: number;
};

function shortenDay(date: string): string {
  return formatShort(noteDateToDate(date));
}

function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function BacklinksPanel({ onOpenDay, refreshKey = 0 }: Props) {
  const [index, setIndex] = useState<Map<string, string[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readAllNotes()
      .then((notes) => setIndex(buildBacklinkIndex(notes)))
      .catch(() => setError("Couldn't load backlinks."));
  }, [refreshKey]);

  if (error) {
    return (
      <section className="backlinks-panel" aria-label="Backlinks">
        <h2>Backlinks</h2>
        <p className="form-error" role="status">
          {error}
        </p>
      </section>
    );
  }

  const topics = [...(index?.keys() ?? [])].sort();

  return (
    <section className="backlinks-panel" aria-label="Backlinks">
      <h2>Backlinks</h2>
      {index === null ? (
        <p>Loading…</p>
      ) : topics.length === 0 ? (
        <p>Type [[something]] in a note to link topics together.</p>
      ) : (
        <ul className="backlink-topics">
          {topics.map((topic) => (
            <li key={topic}>
              <span className="backlink-topic">{topic}</span>
              <span className="backlink-days">
                {(index.get(topic) ?? []).map((date) => (
                  <button
                    key={date}
                    type="button"
                    className="backlink-day"
                    onClick={() => onOpenDay(date)}
                    title={formatNoteHeader(noteDateToDate(date))}
                  >
                    {shortenDay(date)}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
