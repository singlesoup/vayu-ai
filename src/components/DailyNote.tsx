// Daily note view for ONE date (tasks 1.5.4, 1.7.3).
// When `create` is true (today on launch / a new day), Rust's ensure_note
// creates the file; otherwise the day is only read — an empty result shows the
// empty state and never creates a file. Saves are handled by the editor's
// autosave (1.6.2); here the content starts from what Rust reports.

import { useEffect, useMemo, useState } from "react";
// NOTE on initial state: `null` = "loading"; switching days remounts this
// component via `key={date}` in App (no setState-in-effect reset here).
import { ensureNote, readNote, writeNote } from "../lib/api";
import { createAutosaver } from "../lib/autosave";
import type { UnlistenFn } from "../lib/windowClose";
import { onWindowClose } from "../lib/windowClose";
import type { NoteDate } from "../lib/noteFile";
import { noteDateToDate } from "../lib/noteFile";
import { formatNoteHeader, titleForDate } from "../lib/dateFormat";
import { Editor } from "./Editor";

/** Quiet window before a save lands (task 1.6.2, PRD ~800ms). */
export const AUTOSAVE_DELAY_MS = 800;

type NoteState = { content: string; exists: boolean };

type Props = {
  date: NoteDate;
  isToday: boolean;
  create: boolean;
};

export function DailyNote({ date, isToday, create }: Props) {
  const [note, setNote] = useState<NoteState | null>(null);
  // "error" shows the calm retrying note; back to null when a save succeeds.
  const [saveState, setSaveState] = useState<"error" | null>(null);

  const saver = useMemo(
    () =>
      createAutosaver({
        delayMs: AUTOSAVE_DELAY_MS,
        save: (content) => writeNote(date, content),
        onSaved: () => setSaveState(null),
        onError: () => setSaveState("error"),
      }),
    [date],
  );

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

  // Task 1.6.3: a pending edit is never lost — it is flushed when the window
  // gets a close request, and again on unmount (day switch remounts this view).
  useEffect(() => {
    let disposed = false;
    let unlisten: UnlistenFn | undefined;
    void onWindowClose(() => saver.flush()).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      if (unlisten) unlisten();
      saver.flush();
    };
  }, [saver]);

  const title = isToday ? "Today" : titleForDate(noteDateToDate(date));

  function onEditorChange(content: string) {
    setNote((n) => (n ? { ...n, content, exists: true } : n));
    saver.schedule(content);
  }

  return (
    <section className="daily-note">
      <header>
        <code className="note-date">{formatNoteHeader(noteDateToDate(date))}</code>
        <h1 className="note-title">{title}</h1>
      </header>
      {saveState === "error" && (
        <p className="save-note" role="status">
          Couldn't save — retrying
        </p>
      )}
      {note === null ? (
        <p>Loading…</p>
      ) : !note.exists ? (
        <p className="empty-note">Nothing written on this day yet</p>
      ) : (
        <Editor value={note.content} onChange={onEditorChange} />
      )}
    </section>
  );
}
