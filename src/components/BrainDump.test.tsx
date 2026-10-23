// Task 2.10: Brain Dump → Tasks — streamed extraction → preview/edit → insert;
// nothing written unconfirmed.
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { BrainDump } from "./BrainDump";

const date = "2026-10-21";

function streamTasks(tauri: ReturnType<typeof mockInvoke>) {
  tauri.on("generate", (args) => {
    const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
    ch.onmessage?.({ event: "token", value: "- [ ] Revise physics formulas\n" });
    ch.onmessage?.({ event: "token", value: "- [ ] Mock test at 4 pm\n" });
    ch.onmessage?.({ event: "done", value: "" });
    return { status: "Done" };
  });
  tauri.on("append_note", () => null);
  tauri.on("mark_intention", () => null);
}

function streamNoTasks(tauri: ReturnType<typeof mockInvoke>) {
  tauri.on("generate", (args) => {
    const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
    ch.onmessage?.({ event: "token", value: "NO_TASKS\n" });
    ch.onmessage?.({ event: "done", value: "" });
    return { status: "Done" };
  });
  tauri.on("append_note", () => null);
}

describe("BrainDump (task 2.10)", () => {
  it("extracts tasks from a dump, previews them, inserts only after confirm", async () => {
    const tauri = mockInvoke();
    streamTasks(tauri);
    const onFinish = vi.fn();
    render(<BrainDump date={date} onFinish={onFinish} />);

    expect(screen.getByPlaceholderText(/revise physics/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/revise physics/i) as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "I need to revise physics and take the mock test" } });
    fireEvent.click(screen.getByRole("button", { name: "Extract actionable tasks" }));

    await act(async () => {});
    const rows = screen.getAllByRole("textbox", { name: /task/i });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveValue("Revise physics formulas");
    expect(rows[1]).toHaveValue("Mock test at 4 pm");
    // nothing written before confirm
    expect(tauri.args("append_note")).toBeUndefined();

    // edit a task row in the preview
    fireEvent.input(rows[0], { target: { value: "Revise physics formulas, 2 pages" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Insert" }));
    });
    expect(tauri.args("append_note")).toMatchObject({
      date,
      appendix: expect.stringContaining("Revise physics formulas, 2 pages"),
    });
    expect(onFinish).toHaveBeenCalled();
    expect(screen.queryByPlaceholderText(/brain dump/i)).not.toBeInTheDocument();
  });

  it("NO_TASKS shows 'no tasks found' and writes nothing", async () => {
    const tauri = mockInvoke();
    streamNoTasks(tauri);
    render(<BrainDump date={date} onFinish={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/revise physics/i) as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "I feel kind of anxious today, nothing specific" } });
    fireEvent.click(screen.getByRole("button", { name: "Extract actionable tasks" }));

    await act(async () => {});
    expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
    expect(tauri.args("append_note")).toBeUndefined();
  });
});
