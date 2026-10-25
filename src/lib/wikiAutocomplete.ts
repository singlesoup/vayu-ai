// Wiki `[[topic]]` autocomplete — pure helpers for Editor.tsx.
// A link target is any [[topic]] topic actually written in a note, plus every
// note date (dates can be linked as [[YYYY-MM-DD]]). Nothing is ever created
// for a topic that was never written.

import type { NoteSummary } from "./backlinks";
import { parseBacklinks } from "./backlinks";

export type WikiTrigger = { start: number; prefix: string };

/** Unique, sorted, case-insensitively-deduped link targets across all notes. */
export function collectWikiTargets(notes: NoteSummary[]): string[] {
  const set = new Set<string>();
  for (const note of notes) {
    set.add(note.date.trim().toLowerCase());
    for (const topic of parseBacklinks(note.content)) {
      set.add(topic.trim().toLowerCase());
    }
  }
  return [...set].sort();
}

/**
 * Return the most recent unclosed `[[ ... ` reachable before `caret`, or null.
 * `start` is the index of the opening `[[`; `prefix` is what was typed since.
 */
export function wikiTriggerAt(value: string, caret: number): WikiTrigger | null {
  let best: { start: number; prefix: string } | null = null;
  for (const m of value.matchAll(/\[\[/g)) {
    const open = m.index ?? 0;
    if (open >= caret) break; // a [[ at or after the caret cannot be triggered
    const rest = value.slice(open + 2, caret);
    const closed = rest.includes("]]");
    if (!closed) {
      best = { start: open, prefix: rest };
    }
  }
  return best;
}

/** Replace [start, caret) with `[[topic]]`; caret lands just after `]]`. */
export function insertWikiLink(
  value: string,
  caret: number,
  start: number,
  topic: string,
): { text: string; caret: number } {
  const next = value.slice(0, start) + "[[" + topic + "]]" + value.slice(caret);
  return { text: next, caret: start + 4 + topic.length };
}
