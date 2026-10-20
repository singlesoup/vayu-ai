import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockInvoke } from "../test/mocks";
import { DailyNote } from "./DailyNote";

describe("DailyNote (task 1.5.4 — open to today)", () => {
  it("ensures then reads the day's note, in that order, and shows the content", async () => {
    const tauri = mockInvoke();
    tauri.given("ensure_note", null);
    tauri.given("read_note", {
      exists: true,
      content: "Watered the tomato plant.\n- [x] repot it",
    });
    render(<DailyNote date="2026-10-21" isToday create />);
    const editor = (await screen.findByLabelText("Note")) as HTMLTextAreaElement;
    // exact value comparison (findByDisplayValue collapses newlines in RTL)
    expect(editor.value).toBe("Watered the tomato plant.\n- [x] repot it");
    expect(tauri.ran("ensure_note")).toBe(true);
    expect(tauri.ran("read_note")).toBe(true);
  });

  it("header shows the mono date and 'Today' on today's note", async () => {
    const tauri = mockInvoke();
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: false, content: "" });
    render(<DailyNote date="2026-10-21" isToday create />);
    expect(await screen.findByText("WED 21 OCT 2026")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("other days get their weekday/date as the title", async () => {
    const tauri = mockInvoke();
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "hi" });
    render(<DailyNote date="2026-10-20" isToday={false} create={false} />);
    expect(((await screen.findByLabelText("Note")) as HTMLTextAreaElement).value).toBe("hi");
    // header keeps the mono uppercase date; the title is the weekday + date
    expect(screen.getByText("TUE 20 OCT 2026")).toBeInTheDocument();
    expect(screen.getByText("Tuesday, 20 October 2026")).toBeInTheDocument();
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
  });

  it("without create, an empty day shows the empty state and writes nothing", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { exists: false, content: "" });
    render(<DailyNote date="2026-11-02" isToday={false} create={false} />);
    expect(await screen.findByText("Nothing written on this day yet")).toBeInTheDocument();
    expect(tauri.ran("read_note")).toBe(true);
    expect(tauri.ran("ensure_note")).toBe(false);
    expect(tauri.ran("write_note")).toBe(false);
  });
});
