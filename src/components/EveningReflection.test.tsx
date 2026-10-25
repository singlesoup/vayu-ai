// Task 3.3: Evening Reflection tests.
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { EveningReflection } from "./EveningReflection";

const today = "2026-10-21";
const tomorrow = "2026-10-22";

function mockReadNote(tauri: ReturnType<typeof mockInvoke>, content: string) {
  tauri.on("read_note", () => ({ exists: true, content }));
}

function mockGenerateSummary(tauri: ReturnType<typeof mockInvoke>, summary: string) {
  tauri.on("generate", (args) => {
    const ch = args.onEvent as { onmessage: ((e: unknown) => void) | null };
    for (const chunk of summary.split(" ")) {
      ch.onmessage?.({ event: "token", value: chunk + " " });
    }
    ch.onmessage?.({ event: "done", value: "" });
    return { status: "Done" };
  });
  tauri.on("append_note", () => null);
}

describe("EveningReflection (task 3.3)", () => {
  it("idle state shows Reflect button, disabled when the note is empty", () => {
    const tauri = mockInvoke();
    mockReadNote(tauri, "");
    render(<EveningReflection date={today} />);
    expect(screen.getByRole("button", { name: "Close the day gently" })).toBeDisabled();
    expect(tauri.ran("generate")).toBe(false);
  });

  it("reflects on today's note + tasks, shows summary, saves a seed to tomorrow", async () => {
    const tauri = mockInvoke();
    mockReadNote(tauri, "Had a good day.\n- [x] Did the thing\n- [ ] Still open");
    mockGenerateSummary(tauri, "A productive day with one thing done and one open.");
    render(<EveningReflection date={today} />);
    await act(async () => {}); // flush the async read_note

    fireEvent.click(screen.getByRole("button", { name: "Close the day gently" }));
    // generate runs synchronously within the click, so the summary is ready
    expect(
      screen.getByText(/A productive day/, { selector: "p" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Save seed to tomorrow")).toBeInTheDocument();
    expect(tauri.ran("generate")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Save seed to tomorrow" }));
    await act(async () => {});
    expect(tauri.args("append_note")).toMatchObject({
      date: tomorrow,
      appendix: expect.stringContaining("Seed from " + today),
    });
    expect(tauri.args("append_note")!.appendix).toContain("A productive day");
  });

  it("Not tonight uses the outlined skip control and does not write", () => {
    const tauri = mockInvoke();
    mockReadNote(tauri, "Had a good day.");
    const onDismiss = vi.fn();
    render(<EveningReflection date={today} onDismiss={onDismiss} />);
    const skip = screen.getByRole("button", { name: "Not tonight" });
    expect(skip.className).toContain("flow-skip-button");
    fireEvent.click(skip);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(tauri.ran("append_note")).toBe(false);
    expect(tauri.ran("generate")).toBe(false);
  });

  it("works on any day, not just today", async () => {
    const tauri = mockInvoke();
    mockReadNote(tauri, "A past day note.");
    mockGenerateSummary(tauri, "Past day summary.");
    render(<EveningReflection date="2026-10-15" />);
    await act(async () => {}); // flush the async read_note

    fireEvent.click(screen.getByRole("button", { name: "Close the day gently" }));
    await act(async () => {});
    expect(
      screen.getByText("Past day summary.", { selector: "p" }),
    ).toBeInTheDocument();
  });
});
