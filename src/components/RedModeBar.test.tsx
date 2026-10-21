// Task 3.7: Red mode tests (plain line + keyword search, no AI anywhere).
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { RedModeBar, AI_OFF_LINE } from "./RedModeBar";

const NOTES = [
  { date: "2026-10-20", content: "Went for a run before lunch." },
  { date: "2026-10-21", content: "Quiet day. Mail answered." },
];

describe("RedModeBar (task 3.7)", () => {
  it("shows the one plain line about no AI", () => {
    const tauri = mockInvoke();
    tauri.on("read_all_notes", () => NOTES);
    render(<RedModeBar onOpenDay={vi.fn()} />);
    expect(screen.getByText(AI_OFF_LINE)).toBeInTheDocument();
    // the line must not mention models, technical name-dropping or steps
    expect(AI_OFF_LINE).not.toMatch(/ollama|gemma|model/i);
  });

  it("keyword search finds the days that mention the words", async () => {
    const tauri = mockInvoke();
    tauri.on("read_all_notes", () => NOTES);
    const onOpenDay = vi.fn();
    render(<RedModeBar onOpenDay={onOpenDay} />);
    await act(async () => {});

    fireEvent.input(screen.getByLabelText("Keyword search"), {
      target: { value: "run" },
    });
    expect(screen.getByRole("button", { name: "Tue, Oct 20" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tue, Oct 20" }));
    expect(onOpenDay).toHaveBeenCalledWith("2026-10-20");
  });

  it("no match shows a calm 'no days' line, never a crash", async () => {
    const tauri = mockInvoke();
    tauri.on("read_all_notes", () => NOTES);
    render(<RedModeBar onOpenDay={vi.fn()} />);
    await act(async () => {});

    fireEvent.input(screen.getByLabelText("Keyword search"), {
      target: { value: "zebra" },
    });
    expect(screen.getByText(/No days mention.{0,2}zebra/)).toBeInTheDocument();
  });

  it("a failed notes read shows one calm line", async () => {
    const tauri = mockInvoke();
    tauri.on("read_all_notes", () => {
      throw new Error("boom");
    });
    render(<RedModeBar onOpenDay={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByText(/Couldn't load the notes list/)).toBeInTheDocument();
  });
});
