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
