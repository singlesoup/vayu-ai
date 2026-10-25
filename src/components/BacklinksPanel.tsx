// Task 3.5: [[topic]] backlinks panel — every topic written in any note,
// with day chips that open the day where the topic appears. Typos only map
// to the days they were typed on; nothing is ever created.
import { useEffect, useState, type ReactNode } from "react";
import { readAllNotes } from "../lib/api";
import {
  backlinksForNote,
  buildBacklinkIndex,
  monthDay,
  noteLinkLabel,
  type NoteSummary,
} from "../lib/backlinks";
import { formatNoteHeader } from "../lib/dateFormat";
import { noteDateToDate } from "../lib/noteFile";

type Props = {
  /** Open the day a backlink chip points at. */
  onOpenDay: (date: string) => void;
  /** Bump after a save so topics typed later appear without restart. */
  refreshKey?: number;
  /** When set, show notes that link to this day instead of the full topic index. */
  noteDate?: string;
};

function WikiText({ text }: { text: string }): ReactNode {
  const parts = text.split(/(\[\[[^\][]+?\]\])/g);
  return parts.map((part, index) => {
    const match = /^\[\[([^\][]+?)\]\]$/.exec(part);
    if (!match) return <span key={index}>{part}</span>;
    return (
      <span key={index} className="wiki-topic">
        {match[1]}
      </span>
    );
  });
}

function shortenDay(date: string): string {
  return formatShort(noteDateToDate(date));
}

function formatShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export function BacklinksPanel({ onOpenDay, refreshKey = 0, noteDate }: Props) {
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void readAllNotes()
      .then((loaded) => {
        setNotes(loaded);
        setError(null);
      })
      .catch(() => setError("Couldn't load backlinks."));
  }, [refreshKey]);

  if (noteDate) {
    const open = notes?.find((note) => note.date === noteDate);
    const label = open ? noteLinkLabel(open) : monthDay(noteDate);
    const hits = notes ? backlinksForNote(notes, noteDate) : null;
    return (
      <section className="backlinks-rail" aria-label="Backlinks">
        <h2>
          <span>Backlinks</span>
          {` · ${label}`}
        </h2>
        {error ? (
          <p className="form-error" role="status">
            {error}
          </p>
        ) : hits === null ? (
          <p className="backlink-empty">Loading…</p>
        ) : hits.length === 0 ? (
          <p className="backlink-empty">No other notes link here yet.</p>
        ) : (
          <ul className="backlink-hits">
            {hits.map((hit) => (
              <li key={hit.date}>
                <button type="button" className="backlink-hit" onClick={() => onOpenDay(hit.date)}>
                  <span className="backlink-hit-title">{hit.title}</span>
                  <span className="backlink-excerpt">
                    <WikiText text={hit.excerpt} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const index = notes ? buildBacklinkIndex(notes) : null;

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
