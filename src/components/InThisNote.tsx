// Topics that appear in the open day's note — right-rail companion to Topics nav.
import { useEffect, useState } from "react";
import { readNote } from "../lib/api";
import { parseBacklinks } from "../lib/backlinks";

type Props = {
  date: string;
  refreshKey?: number;
};

export function InThisNote({ date, refreshKey = 0 }: Props) {
  const [topics, setTopics] = useState<string[] | null>(null);

  useEffect(() => {
    void readNote(date)
      .then((r) => setTopics([...new Set(parseBacklinks(r.content))].sort()))
      .catch(() => setTopics([]));
  }, [date, refreshKey]);

  if (topics === null) {
    return (
      <section className="in-this-note" aria-label="In this note">
        <h2 className="nav-section-label">In this note</h2>
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section className="in-this-note" aria-label="In this note">
      <h2 className="nav-section-label">In this note</h2>
      {topics.length === 0 ? (
        <p className="in-this-note-empty">No [[topics]] in this note yet.</p>
      ) : (
        <ul className="in-this-note-list">
          {topics.map((topic) => (
            <li key={topic}>
              <span className="backlink-topic">{topic}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
