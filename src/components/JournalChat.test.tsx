// Task 3.1/3.2: Journal chat tests.
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mockInvoke } from "../test/mocks";
import { JournalChat } from "./JournalChat";

const date = "2026-10-21";

function mockGenerateStream(tauri: ReturnType<typeof mockInvoke>, replies: string[]) {
  let i = 0;
  tauri.on("generate", (args) => {
    const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
    if (i >= replies.length) {
      ch.onmessage?.({ event: "done", value: "" });
      return { status: "Done" };
    }
    const reply = replies[i];
    i += 1;
    let j = 0;
    const next = () => {
      if (j >= reply.length) {
        ch.onmessage?.({ event: "done", value: "" });
        return;
      }
      ch.onmessage?.({ event: "token", value: reply[j] });
      j += 1;
      setTimeout(next, 10);
    };
    next();
    return { status: "Done" };
  });
  tauri.on("append_note", () => null);
}

describe("JournalChat (task 3.1/3.2)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Gemma asks one opening question on mount, streamed", async () => {
    const tauri = mockInvoke();
    mockGenerateStream(tauri, ["How are you feeling today?"]);
    render(<JournalChat date={date} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText(/How are you feeling today?/)).toBeInTheDocument();
    expect(screen.getByText("Gemma")).toBeInTheDocument();
  });

  it("user reply streams a Gemma follow-up with full context; no double-fire", async () => {
    const tauri = mockInvoke();
    mockGenerateStream(tauri, ["How are you feeling today?", "What's making you tired?"]);
    render(<JournalChat date={date} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText(/How are you feeling today?/)).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Write your reply/i) as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "I feel tired" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    // while streaming, the button is disabled (no double-fire)
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText(/What's making you tired?/)).toBeInTheDocument();
    expect(screen.getByText("I feel tired")).toBeInTheDocument();
  });

  it("deleting a turn removes it from the transcript", async () => {
    const tauri = mockInvoke();
    mockGenerateStream(tauri, ["First question?", "Follow-up?"]);
    render(<JournalChat date={date} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const textarea = screen.getByPlaceholderText(/Write your reply/i) as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "answer one" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getAllByText("Gemma")).toHaveLength(2);
    // delete the first (Gemma) turn
    fireEvent.click(screen.getAllByRole("button", { name: /Delete turn/ })[0]);
    expect(screen.queryByText("First question?")).not.toBeInTheDocument();
  });

  it("saving appends a Journal block to the note via append_note", async () => {
    const tauri = mockInvoke();
    mockGenerateStream(tauri, ["Only question?"]);
    render(<JournalChat date={date} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    const textarea = screen.getByPlaceholderText(/Write your reply/i) as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "my answer" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    fireEvent.click(screen.getByRole("button", { name: "Save to today's note" }));
    await act(async () => {});
    expect(tauri.args("append_note")).toMatchObject({
      date,
      appendix: expect.stringContaining("my answer"),
    });
    expect(tauri.args("append_note")!.appendix).toContain("## Journal");
  });
});
