// Task 3.5: [[topic]] backlink parsing — pure functions, no filesystem.
// A topic is written `[[topic]]` anywhere in a note. Topics are normalised
// (trimmed, case-insensitive) and never create files: the index is just a
// map from topic → dates where it appears, built from real note content.

export type NoteSummary = { date: string; content: string };

/** Extract `[[topic]]` occurrences from one note's markdown (fences skipped). */
export function parseBacklinks(md: string): string[] {
  if (!md.includes("[[")) return [];
  const topics: string[] = [];
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    for (const m of line.matchAll(/\[\[([^\][]+?)\]\]/g)) {
      const topic = m[1].trim().toLowerCase();
      if (topic) topics.push(topic);
    }
  }
  return [...new Set(topics)];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Short source label, e.g. "Oct 24". */
export function monthDay(date: string): string {
  const parts = date.split("-");
  const month = MONTHS[Number(parts[1]) - 1];
  const day = Number(parts[2]);
  if (!month || !Number.isFinite(day) || day <= 0) return date;
  return `${month} ${day}`;
}

/** Heading when the note has one, otherwise the short date. */
export function noteLinkLabel(note: NoteSummary): string {
  const heading = note.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || monthDay(note.date);
}

export type NoteBacklink = {
  date: string;
  /** Quiet row title, e.g. "Oct 24 · Daily note". */
  title: string;
  /** Source line, still containing `[[topic]]` so the UI can paint the chip. */
  excerpt: string;
};

function linkTargets(note: NoteSummary): Set<string> {
  const targets = new Set<string>([note.date.trim().toLowerCase()]);
  const heading = note.content.match(/^#\s+(.+)$/m)?.[1]?.trim().toLowerCase();
  if (heading) targets.add(heading);
  return targets;
}

function sourceTitle(note: NoteSummary): string {
  const heading = note.content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return `${monthDay(note.date)} · ${heading || "Daily note"}`;
}

function firstMatchingLine(md: string, targets: Set<string>): string | null {
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    for (const match of line.matchAll(/\[\[([^\][]+?)\]\]/g)) {
      const topic = match[1].trim().toLowerCase();
      if (topic && targets.has(topic)) return line;
    }
  }
  return null;
}

function clipExcerpt(line: string, max = 140): string {
  const clean = line.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const at = clean.indexOf("[[");
  const start = Math.max(0, (at < 0 ? 0 : at) - 36);
  let end = Math.min(clean.length, start + max);
  const open = clean.lastIndexOf("[[", end);
  const close = clean.indexOf("]]", open);
  if (open >= start && close > end) end = Math.min(clean.length, close + 2);
  const slice = clean.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${slice}${end < clean.length ? "…" : ""}`;
}

/**
 * Notes that link to the open note by `[[heading]]` or `[[YYYY-MM-DD]]`.
 * The open note is not listed. Nothing is created for a topic that was never written.
 */
export function backlinksForNote(notes: NoteSummary[], openDate: string): NoteBacklink[] {
  const open = notes.find((note) => note.date === openDate);
  if (!open) return [];
  const targets = linkTargets(open);
  const hits: NoteBacklink[] = [];
  for (const note of notes) {
    if (note.date === openDate) continue;
    const line = firstMatchingLine(note.content, targets);
    if (!line) continue;
    hits.push({ date: note.date, title: sourceTitle(note), excerpt: clipExcerpt(line) });
  }
  hits.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return hits;
}

/**
 * Build the topic → dates index from many notes. Only topics that actually
 * appear get an entry — a typo'd topic simply maps to the days it was
 * written on; nothing is created anywhere.
 */
export function buildBacklinkIndex(notes: NoteSummary[]): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const note of notes) {
    for (const topic of parseBacklinks(note.content)) {
      const dates = index.get(topic) ?? [];
      if (!dates.includes(note.date)) dates.push(note.date);
      index.set(topic, dates);
    }
  }
  return index;
}
