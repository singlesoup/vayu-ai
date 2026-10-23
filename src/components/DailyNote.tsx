// Daily note view for ONE date (tasks 1.5.4, 1.7.3).
// When `create` is true (today on launch / a new day), Rust's ensure_note
// creates the file; otherwise the day is only read. An empty day shows the
// placeholder and STAYS editable (1.7.3): its first save (write_note) creates
// the file. Saves are debounced by the autosaver (1.6.2), flushed on close or
// day switch (1.6.3).

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { MoreHorizontal, PanelRight, Save } from "lucide-react";
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
  /** Journal redesign: breadcrumb editor instead of the hero date. */
  chrome?: "classic" | "journal";
  onToggleCompanion?: () => void;
};

export function DailyNote({
  date,
  isToday,
  create,
  afterTitle,
  chrome = "classic",
  onToggleCompanion,
}: Props) {
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

  const heading = note?.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const journal = chrome === "journal";
  const written = noteDateToDate(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className={`daily-note${isToday ? " daily-note-today" : ""}${journal ? " journal-editor" : ""}`}>
      {journal && (
        <div className="editor-toolbar">
          <span className="breadcrumb">
            Journal <b>/</b> {heading || "Untitled entry"}
          </span>
          <div className="editor-actions">
            <button
              type="button"
              className="saved-mark"
              data-testid="save-note-button"
              onClick={() => void saver.flush()}
            >
              <Save size={14} />
              {saveState === "error" ? "Couldn't save — retrying" : "Saved"}
            </button>
            {onToggleCompanion && (
              <button
                type="button"
                className="toolbar-icon"
                aria-label="Toggle companion"
                data-testid="editor-ai-toggle-button"
                onClick={onToggleCompanion}
              >
                <PanelRight size={15} />
              </button>
            )}
            <button type="button" className="toolbar-icon" aria-label="More" data-testid="editor-more-button">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      )}
      <header className={journal ? "entry-meta" : undefined}>
        <h1 className="note-title">{journal ? written : title}</h1>
        {journal && <span className="edited-label">Last edited just now</span>}
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
          {!note.exists && !journal && <p className="empty-note">Nothing written on this day yet</p>}
          <div className={journal ? "writing-zone" : undefined}>
            <Editor
              value={journal ? note.content : proseOf(note.content)}
              onChange={journal ? onNoteChange : onProseChange}
              formatBar={journal}
            />
          </div>
          {!journal && (
            <TaskList markdown={note.content} onChange={onNoteChange} />
          )}
        </>
      )}
    </section>
  );
}
