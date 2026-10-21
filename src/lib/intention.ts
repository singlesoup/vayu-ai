// Task 2.9: parse the Morning Intention streamed reply into an intention line
// and Top 3 tasks. Pure function — no React, easy to unit test.
export function parseIntention(text: string): { intention: string; tasks: string[] } {
  const m = text.match(/^intention:\s*(.+)$/im);
  const tasks: string[] = [];
  for (const line of text.split("\n")) {
    const mm = line.match(/^-\s*\[( |x)\]\s+(.+)$/);
    if (mm) tasks.push(mm[2]);
  }
  return { intention: (m?.[1] ?? "").trim(), tasks };
}
