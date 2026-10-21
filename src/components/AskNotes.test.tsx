// Task 3.6: Ask Your Notes (RAG) tests.
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { AskNotes } from "./AskNotes";

const HITS = [
  { date: "2026-10-20", text: "Reading two chapters of the design book.", score: 0.91 },
  { date: "2026-10-14", text: "Finished the design book notes.", score: 0.85 },
];

describe("AskNotes (task 3.6)", () => {
  it("retrieves hits, answers with context, and shows clickable source chips", async () => {
    const tauri = mockInvoke();
    tauri.on("search_index", () => HITS);
    tauri.on("generate", (args) => {
      const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
      ch.onmessage?.({ event: "token", value: "You read two chapters on Oct 20." });
      ch.onmessage?.({ event: "done", value: "" });
      return { status: "Done" };
    });
    const onOpenDay = vi.fn();
    render(<AskNotes onOpenDay={onOpenDay} />);

    fireEvent.input(screen.getByPlaceholderText(/Ask about your past days/), {
      target: { value: "What did I read this month?" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await act(async () => {});

    // generate was fed the retrieved excerpts
    expect(tauri.ran("generate")).toBe(true);
    expect(String(tauri.args("generate")!.prompt)).toContain("Reading two chapters of the design book.");
    expect(screen.getByText(/You read two chapters on Oct 20/)).toBeInTheDocument();

    // source chips: two distinct days, clicking opens the day
    fireEvent.click(screen.getByRole("button", { name: "Tue, Oct 20" }));
    expect(onOpenDay).toHaveBeenCalledWith("2026-10-20");
  });

  it("abstains without calling generate when the index has nothing", async () => {
    const tauri = mockInvoke();
    tauri.on("search_index", () => []);
    render(<AskNotes onOpenDay={vi.fn()} />);

    fireEvent.input(screen.getByPlaceholderText(/Ask about your past days/), {
      target: { value: "gibberish waffle question" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await act(async () => {});

    expect(screen.getByText(/couldn't find anything in your notes/)).toBeInTheDocument();
    expect(tauri.ran("generate")).toBe(false);
    expect(screen.queryByRole("button", { name: /, / })).not.toBeInTheDocument();
  });

  it("shows a calm error when the index search fails", async () => {
    const tauri = mockInvoke();
    tauri.on("search_index", () => {
      throw new Error("boom");
    });
    render(<AskNotes onOpenDay={vi.fn()} />);

    fireEvent.input(screen.getByPlaceholderText(/Ask about your past days/), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    await act(async () => {});
    expect(screen.getByText(/Ask failed\. Try again\./)).toBeInTheDocument();
  });
});
