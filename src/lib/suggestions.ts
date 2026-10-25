// Companion chips. Short notes keep two generic questions. A saved entry with a
// real paragraph gets two questions from the local model, once per text.

export const GENERIC_SUGGESTIONS = ["What is the emotional thread?", "Summarize this entry"];

/** Enough writing that a question about this entry is worth a model call. */
export function entryReadyForSuggestions(content: string): boolean {
  return content.trim().length >= 180;
}

export function suggestionPrompt(content: string): string {
  return (
    "Read this journal entry. Reply with exactly two short questions a reader " +
    "could ask about THIS entry. One question per line. No numbering, no preamble.\n\n" +
    content.trim().slice(0, 2500)
  );
}

/** Two question lines, or null when the model did not follow the shape. */
export function parseSuggestions(text: string): [string, string] | null {
  const lines = text
    .split(/\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.endsWith("?") && line.length >= 8 && line.length <= 140);
  if (lines.length < 2) return null;
  return [lines[0], lines[1]];
}
