// Task 1.8.3: the task sidebar. The note's markdown is the single source of
// truth — every edit rewrites the WHOLE note via the pure task functions
// (1.8.2) and hands the result back through `onChange`, which the daily note
// routes through the autosave (1.6.2). Tasks are plain `- [ ]`/`- [x]` lines —
// no timers, no streaks.
import { useState } from "react";
import { addTask, deleteTask, editTask, parseTasks, toggleTask } from "../lib/tasks";

type Props = {
  markdown: string;
  onChange: (nextMarkdown: string) => void;
};

export function TaskList({ markdown, onChange }: Props) {
  const tasks = parseTasks(markdown);
  const [draft, setDraft] = useState("");

  function addOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && draft.trim() !== "") {
      onChange(addTask(markdown, draft.trim()));
      setDraft("");
    }
  }

  return (
    <section className="task-list" aria-label="Tasks">
      <ul>
        {tasks.map((t) => (
          <li key={t.line} className={t.done ? "task task-done" : "task"}>
            <input
              type="checkbox"
              checked={t.done}
              onChange={() => onChange(toggleTask(markdown, t.line))}
              aria-label={`Task: ${t.text}`}
            />
            <input
              type="text"
              value={t.text}
              onChange={(e) => onChange(editTask(markdown, t.line, e.target.value))}
              aria-label={`Task: ${t.text}`}
            />
            <button
              type="button"
              onClick={() => onChange(deleteTask(markdown, t.line))}
              aria-label={`Delete task: ${t.text}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        type="text"
        className="task-add"
        value={draft}
        placeholder="Add task, press Enter"
        aria-label="New task"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={addOnEnter}
      />
    </section>
  );
}
