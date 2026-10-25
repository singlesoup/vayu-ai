// Tasks 1.8.1 + 1.8.2 (pure): parse checkbox tasks from Markdown and edit them.
// Task lines are standard `- [ ]` / `- [x]` items (also `* [ ]`, indented), so
// any Markdown editor outside Vayu reads the same file. All edit functions
// return NEW markdown and leave every other line byte-for-byte unchanged.

export type ParsedTask = {
  /** 0-based line index into md.split(/\r?\n/) — the handle all edits use. */
  line: number;
  text: string;
  done: boolean;
};

/** Matches a task line: optional indent, `-` or `*`, space, `[ ]`/`[x]`/`[X]`. */
export const TASK_LINE = /^(\s*)([-*])\s+\[( |x|X)\]\s+(.*)$/;

function splitLines(md: string): string[] {
  return md.split(/\r?\n/);
}

export function parseTasks(md: string): ParsedTask[] {
  const lines = splitLines(md);
  const tasks: ParsedTask[] = [];
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    const m = TASK_LINE.exec(line);
    if (m) {
      tasks.push({ line: i, text: m[4], done: m[3] !== " " });
    }
  });
  return tasks;
}

function taskLineReplaced(original: string, done: boolean, text: string): string {
  const m = TASK_LINE.exec(original);
  const indent = m?.[1] ?? "";
  const marker = m?.[2] ?? "-";
  return `${indent}${marker} [${done ? "x" : " "}] ${text}`;
}

function isTaskLineAt(lines: string[], line: number): boolean {
  return line >= 0 && line < lines.length && TASK_LINE.test(lines[line]);
}

export function toggleTask(md: string, line: number): string {
  const lines = splitLines(md);
  if (!isTaskLineAt(lines, line)) return md;
  const m = TASK_LINE.exec(lines[line]);
  const done = (m?.[3] ?? " ") !== " ";
  lines[line] = taskLineReplaced(lines[line], !done, m?.[4] ?? "");
  return lines.join("\n");
}

export function addTask(md: string, text: string): string {
  // Appending drops trailing blank lines — the parsed content ends either in a
  // task line or at the end of the note, and `- [ ] text` goes right there.
  const trimmedEnd = md.replace(/[\r\n]+$/, "");
  if (trimmedEnd === "") return `- [ ] ${text}`;
  const lines = splitLines(trimmedEnd);
  const tasks = parseTasks(trimmedEnd);
  const anchor = tasks.length > 0 ? tasks[tasks.length - 1].line : lines.length - 1;
  const next: string[] = [];
  lines.forEach((l, i) => {
    next.push(l);
    if (i === anchor) next.push(`- [ ] ${text}`);
  });
  return next.join("\n");
}

export function editTask(md: string, line: number, text: string): string {
  const lines = splitLines(md);
  if (!isTaskLineAt(lines, line)) return md;
  const m = TASK_LINE.exec(lines[line]);
  lines[line] = taskLineReplaced(lines[line], (m?.[3] ?? " ") !== " ", text);
  return lines.join("\n");
}

export function deleteTask(md: string, line: number): string {
  const lines = splitLines(md);
  if (!isTaskLineAt(lines, line)) return md;
  lines.splice(line, 1);
  return lines.join("\n");
}

/* ── Task 1D.1: journal prose vs task lines ──────────────────────────────────
   The prose editor shows the note WITHOUT checkbox lines (they are edited only
   via the TaskList UI), while the markdown on disk stays the single source of
   truth. `proseOf` strips task lines for display; `withProse` re-merges edited
   prose with the file's EXISTING task lines — a prose edit can never delete a
   task. Fence-aware: task-like lines inside ```/~~~ code blocks are prose. */

/** Per-line task flags, honouring fenced code blocks (same rule as parseTasks). */
function taskLineFlags(md: string): boolean[] {
  let inFence = false;
  return splitLines(md).map((line) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return false;
    }
    return !inFence && TASK_LINE.test(line);
  });
}

/** The note body without any task line — exactly what the prose editor shows. */
export function proseOf(md: string): string {
  const flags = taskLineFlags(md);
  return splitLines(md)
    .filter((_, i) => !flags[i])
    .join("\n");
}

/**
 * Re-merge edited prose with the note's existing task lines, keeping every
 * task line verbatim and in order, after the prose. Task-free notes pass the
 * prose through unchanged. A task line typed into the prose simply becomes a
 * task on the next parse — one source of truth, nothing is lost.
 */
export function withProse(md: string, prose: string): string {
  const lines = splitLines(md);
  const flags = taskLineFlags(md);
  const tasks = lines.filter((_, i) => flags[i]);
  if (tasks.length === 0) return prose;
  if (prose === "") return tasks.join("\n");
  return `${prose}\n${tasks.join("\n")}`;
}
