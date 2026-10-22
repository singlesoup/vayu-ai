// Daily note view for ONE date (tasks 1.5.4, 1.7.3).
// When `create` is true (today on launch / a new day), Rust's ensure_note
// creates the file; otherwise the day is only read. An empty day shows the
// placeholder and STAYS editable (1.7.3): its first save (write_note) creates
// the file. Saves are debounced by the autosaver (1.6.2), flushed on close or
// day switch (1.6.3).

import { useEffect, useMemo, useState, type ReactNode } from "react";
// NOTE on initial state: `null` = "loading"; switching days remounts this
// component via `key={date}` in App (no setState-in-effect reset here).
import { ensureNote, readNote, writeNote } from "../lib/api";
import { createAutosaver } from "../lib/autosave";
import type { UnlistenFn } from "../lib/windowClose";
import { onWindowClose } from "../lib/windowClose";
import type { NoteDate } from "../lib/noteFile";
import { noteDateToDate } from "../lib/noteFile";
import { formatReflectTitle } from "../lib/dateFormat";
import { proseOf, withProse } from "../lib/tasks";
import { Editor } from "./Editor";
import { TaskList } from "./TaskList";

/** Quiet window before a save lands (task 1.6.2, PRD ~800ms). */
export const AUTOSAVE_DELAY_MS = 800;

type NoteState = { content: string; exists: boolean };

type Props = {
  date: NoteDate;
  isToday: boolean;
  create: boolean;
  /** Slot under the title (AI action row + one open panel). Never above the H1. */
  afterTitle?: ReactNode;
};

export function DailyNote({ date, isToday, create, afterTitle }: Props) {
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

  const title = formatReflectTitle(noteDateToDate(date));

  /** Task edits (TaskList) hand back FULL markdown — route it through the save. */
  function onNoteChange(content: string) {
    setNote((n) => (n ? { ...n, content, exists: true } : n));
    saver.schedule(content);
  }

  /**
   * Task 1D.1: the prose editor never shows task lines. What the user types is
   * merged with the file's EXISTING task lines (`withProse`), so editing prose
   * can never delete a task, and the disk markdown stays the source of truth.
   */
  function onProseChange(prose: string) {
    if (note === null) return;
    const merged = withProse(note.content, prose);
    setNote({ ...note, content: merged, exists: true });
    saver.schedule(merged);
  }

  return (
    <section className={`daily-note${isToday ? " daily-note-today" : ""}`}>
      <header>
        <h1 className="note-title">{title}</h1>
      </header>
      {afterTitle}
      {saveState === "error" && (
        <p className="save-note" role="status">
          Couldn't save — retrying
        </p>
      )}
      {note === null ? (
        <p>Loading…</p>
      ) : (
        <>
          {/* Task 1.7.3: empty days stay editable — the placeholder shows
              until first typing; the day's FIRST SAVE creates the file. */}
          {!note.exists && <p className="empty-note">Nothing written on this day yet</p>}
          <Editor value={proseOf(note.content)} onChange={onProseChange} />
          {/* Task panel (1.8.3): edits flow through the same change handler,
              so they ride the same debounced save. */}
          <TaskList markdown={note.content} onChange={onNoteChange} />
        </>
      )}
    </section>
  );
}
