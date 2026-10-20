// Task 1.5.1 (pure): the ONLY place note file names are built in the UI.
// Note dates are local (a note belongs to the day the user sees on their clock),
// never UTC, and file-name strings are validated strictly before use in paths.

export function noteFileName(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}.md`;
}

/** `YYYY-MM-DD` (from the noteFileName format, without ".md"). */
export type NoteDate = string;

export function isNoteDate(value: string): value is NoteDate {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // Reject impossible dates (e.g. 2026-02-30).
  const daysInMonth = new Date(y, m, 0, 12).getDate();
  if (d > daysInMonth) return false;
  return true;
}

/** Parses a validated note date string into a local Date at local noon. */
export function noteDateToDate(value: NoteDate): Date {
  const [y, m, d] = value.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12, 0, 0);
}

/** Inverse of noteDateToDate: the validated YYYY-MM-DD key for a local Date. */
export function localDateKey(date: Date): NoteDate {
  return noteFileName(date).replace(/\.md$/, "");
}
