import { describe, expect, it } from "vitest";
import { deleteBackward, renderNoteBackdrop, stepCursor } from "./noteLivePreview";

describe("renderNoteBackdrop", () => {
  it("renders a task line as a checkbox when the cursor is elsewhere", () => {
    const md = "intro\n- [ ] Some Task\n";
    const html = renderNoteBackdrop(md, 0);
    expect(html).toContain("md-task-box");
    expect(html).toContain("Some Task");
    expect(html).not.toMatch(/- \[ \] Some Task/);
  });

  it("shows raw task markdown only while the cursor is inside the checkbox syntax", () => {
    const md = "- [ ] Some Task";
    const html = renderNoteBackdrop(md, 5);
    expect(html).toContain("- [ ] Some Task");
    expect(html).not.toContain("md-task-box");
  });

  it("keeps a checkbox tight to the label when the cursor is in the task text", () => {
    const md = "- [ ] Some Task";
    const html = renderNoteBackdrop(md, md.length);
    expect(html).toContain("md-task-box");
    expect(html).toContain("Some Task");
    expect(html).not.toContain("md-task-syntax");
    expect(html).not.toContain("- [ ]");
  });

  it("renders bold and italic without leaving the markers in the layout", () => {
    const md = "line one\n**bold** and *italic*\n";
    const html = renderNoteBackdrop(md, 0);
    expect(html).toContain('class="md-bold"');
    expect(html).toContain('class="md-em"');
    expect(html).toContain(">bold<");
    expect(html).toContain(">italic<");
    expect(html).not.toContain("**bold**");
  });

  it("hides wiki brackets and paints the topic as a chip when the caret is elsewhere", () => {
    const md = "see [[Vayu]] here";
    const html = renderNoteBackdrop(md, 0);
    expect(html).toContain('class="wiki-topic"');
    expect(html).toContain(">Vayu<");
    expect(html).not.toContain("[[");
    expect(html).not.toContain("]]");
  });

  it("shows raw wiki markdown while the caret is on that link", () => {
    const md = "see [[Vayu]] here";
    const html = renderNoteBackdrop(md, 7);
    expect(html).toContain("[[Vayu]]");
    expect(html).not.toContain("wiki-topic");
  });

  it("keeps other wiki links as chips when the caret is inside a different one", () => {
    const md = "[[One]] and [[Two]]";
    const html = renderNoteBackdrop(md, 3);
    expect(html).toContain("[[One]]");
    expect(html).toContain('class="wiki-topic"');
    expect(html).toContain(">Two<");
    expect(html).not.toContain("[[Two]]");
  });

  it("steps across hidden wiki brackets and backspace keeps them", () => {
    const md = "[[Vayu]]";
    expect(stepCursor(md, 0, 1)).toBe(3);
    const next = deleteBackward(md, md.length);
    expect(next.text).toBe("[[Vay]]");
  });

  it("steps the caret across hidden bold markers one visible character at a time", () => {
    const md = "**bold**";
    expect(stepCursor(md, 0, 1)).toBe(3);
    expect(stepCursor(md, 8, -1)).toBe(5);
  });

  it("backspace deletes the visible character and keeps the bold markers", () => {
    const next = deleteBackward("**bold**", 8);
    expect(next.text).toBe("**bol**");
    expect(next.cursor).toBe(7);
  });

  it("does not treat task syntax inside a fence as a checkbox", () => {
    const md = "```\n- [ ] not a task\n```\n";
    const html = renderNoteBackdrop(md, 20);
    expect(html).not.toContain("md-task-box");
    expect(html).toContain("- [ ] not a task");
  });
});
