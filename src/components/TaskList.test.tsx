import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TaskList } from "./TaskList";

const START = "## Chores\n- [ ] call plumber\n- [x] pay rent";

/** Renders TaskList over editable window state and previews the markdown. */
function Harness({ md }: { md: string }) {
  const [content, setContent] = useState(md);
  return (
    <>
      <code data-testid="preview">{content}</code>
      <TaskList markdown={content} onChange={setContent} />
    </>
  );
}

describe("TaskList (task 1.8.3)", () => {
  it("renders task lines as a checkbox plus their text", () => {
    render(<TaskList markdown={START} onChange={() => {}} />);
    const unchecked = screen.getByRole("checkbox", { name: "Task: call plumber" });
    expect(unchecked).not.toBeChecked();
    const text = screen.getByRole("textbox", { name: "Task: call plumber" }) as HTMLInputElement;
    expect(text.value).toBe("call plumber");
    expect(text.readOnly).toBe(false);
  });

  it("a checked task is checked and has the done style", () => {
    const { container } = render(<TaskList markdown={START} onChange={() => {}} />);
    expect(screen.getByRole("checkbox", { name: "Task: pay rent" })).toBeChecked();
    // (li.textContent does not include input values — match via the aria-label)
    const rowByLabel = (label: string): string | undefined =>
      [...container.querySelectorAll("li.task")]
        .find((r) => r.querySelector(`input[aria-label="${label}"]`) !== null)
        ?.className;
    expect(rowByLabel("Task: pay rent")).toContain("task-done");
    expect(rowByLabel("Task: call plumber")).not.toContain("task-done");
  });
});

describe("TaskList toggling (task 1.8.3, stateful)", () => {
  it("clicking a checkbox replaces the note with the toggled markdown", () => {
    render(<Harness md={START} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Task: call plumber" }));
    expect(
      screen.getByTestId("preview").textContent,
    ).toBe("## Chores\n- [x] call plumber\n- [x] pay rent");
  });

  it("editing a task's text changes only that line", () => {
    render(<Harness md={START} />);
    const input = screen.getByRole("textbox", { name: "Task: call plumber" });
    fireEvent.change(input, { target: { value: "call the plumber NOW" } });
    expect(
      screen.getByTestId("preview").textContent,
    ).toBe("## Chores\n- [ ] call the plumber NOW\n- [x] pay rent");
  });

  it("add: typing a new task and pressing Enter appends it to the task block", () => {
    render(<Harness md={START} />);
    const add = screen.getByLabelText("New task") as HTMLInputElement;
    fireEvent.change(add, { target: { value: "buy milk" } });
    fireEvent.keyDown(add, { key: "Enter" });
    expect(
      screen.getByTestId("preview").textContent,
    ).toBe("## Chores\n- [ ] call plumber\n- [x] pay rent\n- [ ] buy milk");
    expect(add.value).toBe(""); // the input clears after adding
  });

  it("delete removes only that line", () => {
    render(<Harness md={START} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete task: call plumber" }));
    expect(screen.getByTestId("preview").textContent).toBe("## Chores\n- [x] pay rent");
  });
});
