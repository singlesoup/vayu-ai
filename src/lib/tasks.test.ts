import { describe, expect, it } from "vitest";
import { addTask, deleteTask, editTask, parseTasks, proseOf, toggleTask, withProse } from "./tasks";

// `line` is the 0-based index into md.split(/\r?\n/), same side as the edits.
const SAMPLE = [
  "# Journal",
  "- [ ] first task",
  "nothing here",
  "```md",
  "- [x] inside a fence",
  "```",
  "* [ ] starred task",
  "  - [X] indented task",
  "- a normal bullet",
  "- [x] done task",
].join("\n");

describe("parseTasks (task 1.8.1 — pure Markdown task parsing)", () => {
  it("finds tasks with their line, text and done state", () => {
    expect(parseTasks(SAMPLE)).toEqual([
      { line: 1, text: "first task", done: false },
      { line: 6, text: "starred task", done: false },
      { line: 7, text: "indented task", done: true },
      { line: 9, text: "done task", done: true },
    ]);
  });

  it("does not count lines inside fenced code blocks", () => {
    expect(parseTasks("```md\n- [x] inside a fence\n```").length).toBe(0);
    // and only the fence contents are ignored:
    expect(parseTasks("- [ ] before\n```md\n- [x] inside\n```\n- [ ] after")).toEqual([
      { line: 0, text: "before", done: false },
      { line: 4, text: "after", done: false },
    ]);
  });

  it("ignores normal bullets and text", () => {
    expect(parseTasks("plain text\n- plain bullet\n- [ ] real task")).toHaveLength(1);
  });

  it("handles both CRLF and LF line endings", () => {
    expect(parseTasks("- [ ] a\r\n- [x] b")).toEqual([
      { line: 0, text: "a", done: false },
      { line: 1, text: "b", done: true },
    ]);
  });

  it("returns [] for empty content", () => {
    expect(parseTasks("")).toEqual([]);
  });
});

describe("toggleTask (task 1.8.2 — pure edits)", () => {
  it("flips [ ] to [x] on one line, byte-identical elsewhere", () => {
    expect(toggleTask("- [ ] a\n- [ ] b", 1)).toBe("- [ ] a\n- [x] b");
  });

  it("flips [X] back to [ ]", () => {
    expect(toggleTask("- [X] b", 0)).toBe("- [ ] b");
  });

  it("leaves the note unchanged for out-of-range or non-task lines", () => {
    expect(toggleTask("- [ ] a\nnot a task", 5)).toBe("- [ ] a\nnot a task");
    expect(toggleTask("- [ ] a\nnot a task", 1)).toBe("- [ ] a\nnot a task");
  });
});

describe("addTask (task 1.8.2 — pure edits)", () => {
  it("appends after the last existing task line", () => {
    expect(addTask("- [ ] a\ntext\n- [x] b", "new task")).toBe(
      "- [ ] a\ntext\n- [x] b\n- [ ] new task",
    );
  });

  it("appends at the end of the note when there are no tasks", () => {
    expect(addTask("just text\n", "new task")).toBe("just text\n- [ ] new task");
    expect(addTask("", "new task")).toBe("- [ ] new task");
  });
});

describe("editTask (task 1.8.2 — pure edits)", () => {
  it("changes only the task text on that line", () => {
    expect(editTask("- [ ] a\n- [x] b", 1, "renamed")).toBe("- [ ] a\n- [x] renamed");
  });

  it("leaves the note unchanged for a non-task line", () => {
    expect(editTask("text\nmore", 0, "renamed")).toBe("text\nmore");
  });
});

describe("deleteTask (task 1.8.2 — pure edits)", () => {
  it("removes only that line", () => {
    expect(deleteTask("- [ ] a\n- [x] b\n- [ ] c", 1)).toBe("- [ ] a\n- [ ] c");
  });

  it("leaves the note unchanged for out-of-range or non-task lines", () => {
    expect(deleteTask("text\nmore", 5)).toBe("text\nmore");
    expect(deleteTask("text\nmore", 1)).toBe("text\nmore");
  });
});

describe("proseOf / withProse (task 1D.1 — prose editor vs task lines)", () => {
  const MD = "## Chores\n- [ ] call plumber\n- [x] pay rent";

  it("the prose editor gets the note WITHOUT task lines, so tasks never duplicate", () => {
    expect(proseOf(MD)).toBe("## Chores");
    expect(proseOf("line one\n- [ ] a\nline two")).toBe("line one\nline two");
    expect(proseOf("- [ ] only tasks")).toBe("");
    expect(proseOf("a\n\nb\n- [ ] x")).toBe("a\n\nb");
  });

  it("task lines inside fenced code stay in the prose editor", () => {
    const md = "```md\n- [ ] example\n```\n- [ ] real";
    expect(proseOf(md)).toBe("```md\n- [ ] example\n```");
  });

  it("withProse keeps every existing task line when the user edits prose", () => {
    expect(withProse(MD, "## Chores\n\nwrote some things")).toBe(
      "## Chores\n\nwrote some things\n- [ ] call plumber\n- [x] pay rent",
    );
  });

  it("emptying the prose still keeps the task lines", () => {
    expect(withProse(MD, "")).toBe("- [ ] call plumber\n- [x] pay rent");
  });

  it("a note without tasks passes prose through byte-for-byte", () => {
    const prose = "Watered the tomato plant.\r\nsecond line";
    expect(withProse("no tasks", prose)).toBe(prose);
    expect(withProse("", prose)).toBe(prose);
  });

  it("round-trips: proseOf(withProse(md, p)) === p, trailing newlines included", () => {
    for (const p of ["hello", "hello\n", "hello\n\n", "", "  spaced  "]) {
      expect(proseOf(withProse(MD, p))).toBe(p);
    }
  });

  it("interleaved prose and tasks consolidate: prose first, tasks in original order, verbatim", () => {
    const next = withProse("start\n- [ ] a\nmiddle\n- [x] b", "start\nmiddle edited");
    expect(next).toBe("start\nmiddle edited\n- [ ] a\n- [x] b");
    expect(parseTasks(next)).toEqual([
      { line: 2, text: "a", done: false },
      { line: 3, text: "b", done: true },
    ]);
  });

  it("a task line typed into the prose becomes a task (one source of truth)", () => {
    const next = withProse(MD, "note\n- [ ] typed in the editor");
    expect(parseTasks(next).map((t) => t.text)).toEqual([
      "typed in the editor",
      "call plumber",
      "pay rent",
    ]);
  });
});
