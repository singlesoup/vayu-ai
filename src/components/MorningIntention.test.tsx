// Task 2.8/2.9: Morning Intention tests.
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { MorningIntention, parseIntention } from "./MorningIntention";

const date = "2026-10-21";

const QUESTIONS = [
  "How's your energy today?",
  "What's the one thing that matters today?",
  "Anything blocking you?",
];

function streamIntention(tauri: ReturnType<typeof mockInvoke>) {
  tauri.on("generate", (args) => {
    const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
    ch.onmessage?.({ event: "token", value: "Intention: Steady, not perfect.\n" });
    ch.onmessage?.({ event: "token", value: "Top 3:\n- [ ] Revise physics formulas, 2 pages\n- [ ] Mock test at 4 pm\n" });
    ch.onmessage?.({ event: "done", value: "" });
    return { status: "Done" };
  });
  tauri.on("append_note", () => null);
  tauri.on("mark_intention", () => null);
}

describe("parseIntention", () => {
  it("parses the intention line and the Top 3 tasks", () => {
    expect(
      parseIntention("Intro noise\nIntention: Steady, not perfect.\n\nTop 3:\n- [ ] Revise physics formulas, 2 pages\n- [ ] Mock test at 4 pm\n- [x] something else\n"),
    ).toEqual({
      intention: "Steady, not perfect.",
      tasks: ["Revise physics formulas, 2 pages", "Mock test at 4 pm", "something else"],
    });
  });

  it("returns empty for junk", () => {
    expect(parseIntention("blah blah")).toEqual({ intention: "", tasks: [] });
  });
});

describe("MorningIntention (task 2.8/2.9)", () => {
  it("walks the three questions, plans, and saves the intention once", async () => {
    const tauri = mockInvoke();
    streamIntention(tauri);
    const onFinish = vi.fn();
    render(<MorningIntention date={date} onFinish={onFinish} />);

    expect(screen.getByText(QUESTIONS[0])).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip today" })).toBeInTheDocument();

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "tired" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(QUESTIONS[1])).toBeInTheDocument();

    fireEvent.input(screen.getByRole("textbox") as HTMLTextAreaElement, { target: { value: "the mock" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText(QUESTIONS[2])).toBeInTheDocument();

    fireEvent.input(screen.getByRole("textbox") as HTMLTextAreaElement, { target: { value: "nothing" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Plan my day" }));
    });
    expect(tauri.ran("generate")).toBe(true);
    // drive the channel's done event manually
    const genArgs = tauri.args("generate")!;
    (genArgs.onEvent as { onmessage: (e: unknown) => void }).onmessage!({ event: "done", value: "" });
    await act(async () => {});
    expect(screen.getByText(/Your intention for/)).toBeInTheDocument();
    expect(screen.getByText("Steady, not perfect.")).toBeInTheDocument();
    expect(screen.getByText(/Revise physics formulas, 2 pages/)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save to today's note" }));
    });
    expect(tauri.args("append_note")).toMatchObject({
      date,
      appendix: expect.stringContaining("Revise physics formulas, 2 pages"),
    });
    expect(tauri.args("mark_intention")).toEqual({ date, status: "done" });
    expect(onFinish).toHaveBeenCalledWith("done");
    expect(screen.queryByText("Morning Intention")).not.toBeInTheDocument();
  });

  it("Skip today marks the date skipped and hides the card (no re-nag)", async () => {
    const tauri = mockInvoke();
    tauri.on("mark_intention", () => null);
    const onFinish = vi.fn();
    render(<MorningIntention date={date} onFinish={onFinish} />);

    fireEvent.click(screen.getByRole("button", { name: "Skip today" }));
    expect(tauri.args("mark_intention")).toEqual({ date, status: "skipped" });
    expect(onFinish).toHaveBeenCalledWith("skipped");
    expect(screen.queryByText("Morning Intention")).not.toBeInTheDocument();
    expect(tauri.ran("generate")).toBe(false);
  });
});
