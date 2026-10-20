// Daily note view for ONE date (tasks 1.5.4, 1.7.3).
// When `create` is true (today on launch / a new day), Rust's ensure_note
// creates the file; otherwise the day is only read — an empty result shows the
// empty state and never creates a file. Saves are handled by the editor's
// autosave (1.6.2); here the content starts from what Rust reports.

import { useEffect, useState } from "react";
// NOTE on initial state: `null` = "loading"; switching days remounts this
// component via `key={date}` in App (no setState-in-effect reset here).
import { ensureNote, readNote, writeNote } from "../lib/api";
import type { NoteDate } from "../lib/noteFile";
import { noteDateToDate } from "../lib/noteFile";
import { formatNoteHeader, titleForDate } from "../lib/dateFormat";

type NoteState = { content: string; exists: boolean };

type Props = {
  date: NoteDate;
  isToday: boolean;
  create: boolean;
};

export function DailyNote({ date, isToday, create }: Props) {
  const [note, setNote] = useState<NoteState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (create) await ensureNote(date);
        const r = await readNote(date);
        if (!cancelled) setNote({ content: r.content, exists: r.exists });
      } catch {
        if (!cancelled) setNote({ content: "", exists: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date, create]);

  const title = isToday ? "Today" : titleForDate(noteDateToDate(date));

  function onEditorChange(content: string) {
    setNote((n) => (n ? { ...n, content, exists: true } : n));
    void writeNote(date, content).catch(() => {
      // 1.6.2 brings retrying autosave with its UI feedback.
    });
  }

  return (
    <section className="daily-note">
      <header>
        <code className="note-date">{formatNoteHeader(noteDateToDate(date))}</code>
        <h1 className="note-title">{title}</h1>
      </header>
      {note === null ? (
        <p>Loading…</p>
      ) : !note.exists ? (
        <p className="empty-note">Nothing written on this day yet</p>
      ) : (
        <textarea
          aria-label="Note"
          className="note-editor"
          value={note.content}
          onChange={(e) => onEditorChange(e.currentTarget.value)}
        />
      )}
    </section>
  );
}
