// When the embedding index is empty, pick note text the chat model can answer from.
// The open day is always included. Other days are included only when they share words
// with the question.

import type { SearchHit } from "./api";

const SKIP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "to", "of", "and", "or", "in", "on",
  "for", "this", "that", "what", "who", "how", "you", "me", "my", "i", "it", "your",
  "about", "with", "from", "have", "has", "can", "tell", "entry", "note", "notes",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !SKIP.has(word));
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).trimEnd();
}

export function excerptsFromNotes(
  notes: { date: string; content: string }[],
  query: string,
  focusDate: string,
  limit = 4,
): SearchHit[] {
  const queryWords = new Set(words(query));
  const ranked = notes
    .map((note) => {
      const text = clip(note.content, note.date === focusDate ? 2500 : 800);
      if (!text) return null;
      const overlap = words(text).filter((word) => queryWords.has(word)).length;
      const score = (note.date === focusDate ? 1 : 0) + overlap;
      return { date: note.date, text, score };
    })
    .filter((hit): hit is SearchHit => hit !== null && (hit.date === focusDate || hit.score > 0))
    .sort((a, b) => b.score - a.score || (a.date === focusDate ? -1 : 1));

  const seen = new Set<string>();
  const hits: SearchHit[] = [];
  for (const hit of ranked) {
    if (seen.has(hit.date)) continue;
    seen.add(hit.date);
    hits.push(hit);
    if (hits.length >= limit) break;
  }
  return hits;
}
