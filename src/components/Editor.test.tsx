import { render, screen, fireEvent } from "@testing-library/react";
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

  it("paints live preview on the backdrop for tasks off the active line", () => {
    const { container } = render(
      <Editor value={"intro\n- [ ] Some Task"} onChange={vi.fn()} />,
    );
    const backdrop = container.querySelector(".note-editor-backdrop");
    expect(backdrop?.innerHTML).toContain("md-task-box");
    expect(backdrop?.innerHTML).toContain("Some Task");
  });

  it("the editor styles come from tokens (body font, single column max width)", () => {
    const css = readFileSync(resolve(__dirname, "../App.css"), "utf8");
    const editorBlock = css.match(/\.note-editor\s*{[^}]*}/);
    expect(editorBlock).not.toBeNull();
    expect(editorBlock?.[0]).toMatch(/font-family:\s*var\(--font-body\)/);
    const body = css.match(/\.note-body\s*,|\.note-body\s*{[^}]*}/);
    expect(css).toMatch(/\.note-body/);
    expect(css).toMatch(/max-width:\s*var\(--width-note-column\)/);
    expect(body).not.toBeNull();
  });

  it("toggles bold and italic with Ctrl, and leaves Ctrl+K for search", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("hello");
      return <Editor value={value} onChange={setValue} formatBar />;
    }
    render(<Wrapper />);
    const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
    await user.click(editor);
    await user.keyboard("{Control>}a{/Control}");
    await user.keyboard("{Control>}b{/Control}");
    expect(editor.value).toBe("**hello**");
    await user.keyboard("{Control>}a{/Control}");
    await user.keyboard("{Control>}b{/Control}");
    expect(editor.value).toBe("hello");
    await user.keyboard("{Control>}a{/Control}");
    await user.keyboard("{Control>}i{/Control}");
    expect(editor.value).toBe("*hello*");
    await user.keyboard("{Control>}a{/Control}");
    await user.keyboard("{Control>}k{/Control}");
    expect(editor.value).toBe("*hello*");
  });

  it("toggles bold and italic with Ctrl even without a format bar", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("hello");
      return <Editor value={value} onChange={setValue} />;
    }
    render(<Wrapper />);
    const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
    await user.click(editor);
    await user.keyboard("{Control>}a{/Control}");
    await user.keyboard("{Control>}b{/Control}");
    expect(editor.value).toBe("**hello**");
    await user.keyboard("{Control>}a{/Control}");
    await user.keyboard("{Control>}i{/Control}");
    expect(editor.value).toBe("*hello*");
  });

  it("undoes and redoes text changes with Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("hello");
      return <Editor value={value} onChange={setValue} />;
    }
    render(<Wrapper />);
    const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
    await user.click(editor);
    // Move the caret to the end via the arrow handler so `range` stays fresh.
    for (let i = 0; i < 5; i++) fireEvent.keyDown(editor, { key: "ArrowRight" });
    await user.type(editor, "x");
    expect(editor.value).toBe("hellox");
    expect(editor.selectionStart).toBe(6);

    await user.keyboard("{Control>}z{/Control}");
    expect(editor.value).toBe("hello");
    expect(editor.selectionStart).toBe(5);

    await user.keyboard("{Control>}y{/Control}");
    expect(editor.value).toBe("hellox");

    await user.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(editor.value).toBe("hellox");

    await user.keyboard("{Control>}z{/Control}");
    expect(editor.value).toBe("hello");
  });

  it("toggles a quote with Ctrl+Shift+' and a list with Ctrl+Shift+8", async () => {
    const user = userEvent.setup();
    function Wrapper({ initial }: { initial: string }) {
      const [value, setValue] = useState(initial);
      return <Editor value={value} onChange={setValue} formatBar />;
    }
    const quote = render(<Wrapper initial="note" />);
    const quoteEditor = screen.getByLabelText("Note") as HTMLTextAreaElement;
    await user.click(quoteEditor);
    await user.keyboard("{Control>}{Shift>}'{/Shift}{/Control}");
    expect(quoteEditor.value).toBe("> note");
    quote.unmount();

    render(<Wrapper initial="note" />);
    const listEditor = screen.getByLabelText("Note") as HTMLTextAreaElement;
    await user.click(listEditor);
    await user.keyboard("{Control>}{Shift>}8{/Shift}{/Control}");
    expect(listEditor.value).toBe("- note");
  });

  describe("wiki [[ autocomplete]", () => {
    function WikiWrapper({ wikiTargets }: { wikiTargets?: string[] }) {
      const [value, setValue] = useState("");
      return <Editor value={value} onChange={setValue} wikiTargets={wikiTargets ?? []} />;
    }

    function typeTrigger(editor: HTMLTextAreaElement, value: string, caret: number) {
      fireEvent.change(editor, {
        target: { value, selectionStart: caret, selectionEnd: caret },
      });
    }

    it("shows matching targets after [[", async () => {
      render(
        <WikiWrapper wikiTargets={["vault"]} />,
      );
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      typeTrigger(editor, "[[vau", 5);
      expect(screen.getByTestId("wiki-dropdown")).toBeInTheDocument();
      expect(screen.getByTestId("wiki-option-0").textContent).toBe("vault");

      // closing the trigger with ]] hides the dropdown
      typeTrigger(editor, "[[vault]]", 8);
      expect(screen.queryByTestId("wiki-dropdown")).toBeNull();
      expect(editor.value).toBe("[[vault]]");
    });

    it("inserts the active match on Enter and closes", async () => {
      render(<WikiWrapper wikiTargets={["apple", "banana"]} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      typeTrigger(editor, "[[a", 3);
      expect(screen.getByTestId("wiki-option-0")).toHaveAttribute("aria-selected", "true");

      fireEvent.keyDown(editor, { key: "Enter" });
      expect(editor.value).toBe("[[apple]]");
      expect(screen.queryByTestId("wiki-dropdown")).toBeNull();
    });

    it("closes on Escape without inserting", async () => {
      render(<WikiWrapper wikiTargets={["vault"]} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      typeTrigger(editor, "[[vau", 5);
      expect(screen.getByTestId("wiki-dropdown")).toBeInTheDocument();

      fireEvent.keyDown(editor, { key: "Escape" });
      expect(screen.queryByTestId("wiki-dropdown")).toBeNull();
      expect(editor.value).toBe("[[vau");
    });

    it("cycles matches with ArrowUp/ArrowDown and prevents caret escape", async () => {
      render(<WikiWrapper wikiTargets={["ant", "apple"]} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      typeTrigger(editor, "[[a", 3);

      fireEvent.keyDown(editor, { key: "ArrowDown" });
      expect(screen.getByTestId("wiki-option-1")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByTestId("wiki-option-0")).not.toHaveAttribute("aria-selected", "true");

      fireEvent.keyDown(editor, { key: "ArrowUp" });
      expect(screen.getByTestId("wiki-option-0")).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("single selection / caret render path", () => {
    it("paints the selection on the backdrop only (single render path)", () => {
      const { container } = render(<Editor value={"hello world"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      fireEvent.keyDown(editor, { key: "ArrowRight", shiftKey: true });
      const backdrop = container.querySelector(".note-editor-backdrop");
      expect(backdrop?.innerHTML).toContain("md-selected");
      expect(backdrop?.innerHTML).toContain(">h<");
    });

    it("hides the drawn caret while a selection is active", () => {
      const { container } = render(<Editor value={"hello world"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      fireEvent.keyDown(editor, { key: "ArrowRight", shiftKey: true });
      const caret = container.querySelector(".note-caret");
      expect(caret).toHaveAttribute("hidden", "");
    });

    it("shows the drawn caret again once the selection collapses", () => {
      const { container } = render(<Editor value={"hello world"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      fireEvent.keyDown(editor, { key: "ArrowRight", shiftKey: true });
      expect(container.querySelector(".note-caret")?.hasAttribute("hidden")).toBe(true);
      fireEvent.keyDown(editor, { key: "ArrowRight" });
      expect(container.querySelector(".note-caret")?.hasAttribute("hidden")).toBe(false);
    });
  });

  describe("arrow keys", () => {
    function caretAt(editor: HTMLTextAreaElement) {
      return editor.selectionStart;
    }

    it("moves right one visible character through prose", () => {
      render(<Editor value={"hello world"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      editor.setSelectionRange(0, 0);
      fireEvent.keyDown(editor, { key: "ArrowRight" });
      expect(caretAt(editor)).toBe(1);
      fireEvent.keyDown(editor, { key: "ArrowRight" });
      expect(caretAt(editor)).toBe(2);
    });

    it("moves left one visible character through prose", () => {
      render(<Editor value={"hello world"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      editor.setSelectionRange(5, 5);
      fireEvent.keyDown(editor, { key: "ArrowLeft" });
      expect(caretAt(editor)).toBe(4);
    });

    it("jumps over hidden task syntax so arrows cross rendered task-widget lines", () => {
      render(<Editor value={"- [ ] Buy milk"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      editor.setSelectionRange(0, 0);
      fireEvent.keyDown(editor, { key: "ArrowRight" });
      expect(caretAt(editor)).toBeGreaterThanOrEqual(6); // past the "- [ ] " widget, on "Buy milk"
      fireEvent.keyDown(editor, { key: "ArrowLeft" });
      expect(caretAt(editor)).toBeLessThanOrEqual(6); // back at the widget boundary
    });

    it("does not move past the start or end of the document", () => {
      render(<Editor value={"hi"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      editor.setSelectionRange(0, 0);
      fireEvent.keyDown(editor, { key: "ArrowLeft" });
      expect(caretAt(editor)).toBe(0);
      editor.setSelectionRange(2, 2);
      fireEvent.keyDown(editor, { key: "ArrowRight" });
      expect(caretAt(editor)).toBe(2);
    });

    it("stays on the document when ArrowUp/ArrowDown have no caret box", () => {
      render(<Editor value={"hi"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      editor.setSelectionRange(1, 1);
      expect(() => {
        fireEvent.keyDown(editor, { key: "ArrowUp" });
        fireEvent.keyDown(editor, { key: "ArrowDown" });
      }).not.toThrow();
    });

    it("ArrowDown moves the caret; ArrowUp runs without throwing", () => {
      // jsdom stubs document.elementFromPoint to null, so geometric Up/Down cannot be
      // directionally asserted here; the live-editor geometry is covered by the
      // findCaretBox(range.end) refresh and the handler's preventDefault.
      render(<Editor value={"line one\nline two"} onChange={vi.fn()} />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      for (let i = 0; i < 4; i++) fireEvent.keyDown(editor, { key: "ArrowRight" });
      expect(caretAt(editor)).toBe(4);
      fireEvent.keyDown(editor, { key: "ArrowDown" });
      expect(caretAt(editor)).not.toBe(4); // caret moved off position 4
      expect(() => fireEvent.keyDown(editor, { key: "ArrowUp" })).not.toThrow();
    });
  });

  describe("Enter auto-continue", () => {
    async function pressEnter(initial: string, caret: number) {
      const user = userEvent.setup();
      function Wrapper() {
        const [value, setValue] = useState(initial);
        return <Editor value={value} onChange={setValue} />;
      }
      render(<Wrapper />);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      await user.click(editor);
      editor.setSelectionRange(caret, caret);
      await user.keyboard("{Enter}");
      return editor;
    }

    it("continues a bullet line with '- '", async () => {
      const editor = await pressEnter("- foo", 5);
      expect(editor.value).toBe("- foo\n- ");
    });

    it("continues a numbered list with the next number", async () => {
      const editor = await pressEnter("1. foo", 6);
      expect(editor.value).toBe("1. foo\n2. ");
    });

    it("continues a task line with '- [ ] '", async () => {
      const editor = await pressEnter("- [ ] Buy milk", 15);
      expect(editor.value).toBe("- [ ] Buy milk\n- [ ] ");
    });

    it("removes the marker on an empty bullet line", async () => {
      const editor = await pressEnter("- ", 2);
      expect(editor.value).toBe("");
    });

    it("removes the marker on an empty task line", async () => {
      const editor = await pressEnter("- [ ] ", 6);
      expect(editor.value).toBe("");
    });

    it("inserts a plain newline on a non-list line", async () => {
      const editor = await pressEnter("hello world", 5);
      expect(editor.value).toBe("hello\n world");
    });

    it("does not continue when the caret is mid-line", async () => {
      const editor = await pressEnter("- foo", 2);
      expect(editor.value).toBe("- \nfoo");
    });
  });
});
