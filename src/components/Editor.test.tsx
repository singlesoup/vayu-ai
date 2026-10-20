import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { Editor } from "./Editor";

describe("Editor (task 1.6.1)", () => {
  it("renders the given content exactly", () => {
    render(<Editor value={"line one\nline two"} onChange={vi.fn()} />);
    const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
    expect(editor.value).toBe("line one\nline two");
  });

  it("updates on typing, reporting the changed text", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("start");
      return <Editor value={value} onChange={setValue} />;
    }
    render(<Wrapper />);
    const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
    await user.type(editor, "abc");
    expect(editor.value).toBe("startabc");
  });

  it("the editor styles come from tokens (body font, single column max width)", () => {
    const css = readFileSync(resolve(__dirname, "../App.css"), "utf8");
    const editorBlock = css.match(/\.note-editor\s*{[^}]*}/);
    expect(editorBlock).not.toBeNull();
    expect(editorBlock?.[0]).toMatch(/font-family:\s*var\(--font-body\)/);
    const column = css.match(/\.note-column\s*{[^}]*}/);
    expect(column).not.toBeNull();
    expect(column?.[0]).toMatch(/max-width:\s*var\(--width-note-column\)/);
  });
});
