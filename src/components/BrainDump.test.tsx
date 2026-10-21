// Task 2.10: Brain Dump → Tasks — streamed extraction → preview/edit → insert;
// nothing written unconfirmed.
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { BrainDump } from "./BrainDump";

const date = "2026-10-21";

function streamTasks(tauri: ReturnType<typeof mockInvoke>) {
  tauri.on("generate", () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const ch = {
          onmessage: null as ((e: unknown) => void) | null,
        };
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        const send = (e: unknown) => ch.onmessage?.(e);
        send({ event: "token", value: "- [ ] Revise physics formulas\n" });
        send({ event: "token", value: "- [ ] Mock test at 4 pm\n" });
        send({ event: "done", value: "" });
        resolve({ status: "Done" });
      }, 20);
    });
  });
  tauri.on("append_note", () => null);
  tauri.on("mark_intention", () => null);
}

describe("BrainDump (task 2.10)", () => {
  it("extracts tasks from a dump, previews them, inserts only after confirm", async () => {
    const tauri = mockInvoke();
    streamTasks(tauri);
    const onFinish = vi.fn();
    render(<BrainDump date={date} onFinish={onFinish} />);

    expect(screen.getByPlaceholderText(/brain dump/i)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/brain dump/i) as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "I need to revise physics and take the mock test" } });
    fireEvent.click(screen.getByRole("button", { name: "Extract tasks" }));
    expect(screen.getByText(/extracting/i)).toBeInTheDocument();

    await act(async () => {});
    expect(screen.getByText(/Revise physics formulas/)).toBeInTheDocument();
    expect(screen.getByText(/Mock test at 4 pm/)).toBeInTheDocument();
    // nothing written before confirm
    expect(tauri.args("append_note")).toBeUndefined();

    // edit a task row in the preview
    const rows = screen.getAllByRole("textbox", { name: /task/i });
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
    tauri.on("generate", () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const ch = {
            onmessage: null as ((e: unknown) => void) | null,
          };
          const send = (e: unknown) => ch.onmessage?.(e);
          send({ event: "token", value: "NO_TASKS\n" });
          send({ event: "done", value: "" });
          resolve({ status: "Done" });
        }, 20);
      });
    });
    tauri.on("append_note", () => null);
    render(<BrainDump date={date} onFinish={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/brain dump/i) as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "I feel kind of anxious today, nothing specific" } });
    fireEvent.click(screen.getByRole("button", { name: "Extract tasks" }));

    await act(async () => {});
    expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
    expect(tauri.args("append_note")).toBeUndefined();
  });
});
