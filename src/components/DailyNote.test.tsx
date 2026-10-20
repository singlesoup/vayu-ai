import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInvokeMock, mockInvoke } from "../test/mocks";
import { DailyNote } from "./DailyNote";

// Task 1.6.3: fake window-close wiring (vi.mock must live at module top level).
const closeState = vi.hoisted(() => ({
  handlers: [] as Array<(e: { isPreventDefault: () => boolean }) => Promise<void> | void>,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onCloseRequested: async (handler: (e: { isPreventDefault: () => boolean }) => Promise<void> | void) => {
      closeState.handlers.push(handler);
      return () => {
        const i = closeState.handlers.indexOf(handler);
        if (i >= 0) closeState.handlers.splice(i, 1);
      };
    },
  }),
}));

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

  it("without create, another empty (FUTURE) day behaves the same", async () => {
    const tauri = mockInvoke();
    tauri.given("read_note", { exists: false, content: "" });
    render(<DailyNote date="2027-01-05" isToday={false} create={false} />);
    expect(await screen.findByText("Nothing written on this day yet")).toBeInTheDocument();
    expect(tauri.ran("ensure_note")).toBe(false);
    expect(tauri.ran("write_note")).toBe(false);
  });

  it("typing on an empty past/future day saves THAT date on the first save (file created on save)", async () => {
    vi.useFakeTimers();
    try {
      const tauri = mockInvoke();
      tauri.given("read_note", { exists: false, content: "" });
      render(<DailyNote date="2026-11-02" isToday={false} create={false} />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(screen.getByText("Nothing written on this day yet")).toBeInTheDocument();

      // the editor is available without any file existing yet
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      expect(editor.value).toBe("");

      fireEvent.change(editor, { target: { value: "first entry" } });
      // the placeholder clears as soon as there is something to save
      expect(screen.queryByText("Nothing written on this day yet")).not.toBeInTheDocument();
      // still no file-creation command: the SAVE (below) creates the file
      expect(tauri.ran("ensure_note")).toBe(false);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(800);
      });
      expect(tauri.callCount("write_note")).toBe(1);
      expect(tauri.args("write_note")).toEqual({ date: "2026-11-02", content: "first entry" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("with create (today), ensure runs BEFORE the save", async () => {
    vi.useFakeTimers();
    try {
      const tauri = mockInvoke();
      tauri.given("ensure_note", null);
      tauri.given("read_note", { exists: false, content: "" });
      render(<DailyNote date="2026-10-21" isToday create />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      // ensure_note ran, its file IS reported existing-free anyway: read said no.
      expect(tauri.ran("ensure_note")).toBe(true);
      const editor = screen.getByLabelText("Note") as HTMLTextAreaElement;
      fireEvent.change(editor, { target: { value: "today words" } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(800);
      });
      expect(tauri.callCount("write_note")).toBe(1);
      expect(tauri.args("write_note")).toEqual({ date: "2026-10-21", content: "today words" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("DailyNote autosave (task 1.6.2)", () => {
  // Fake timers + fireEvent (not userEvent): userEvent's event delays deadlock
  // under fake timers in this setup. fireEvent.change is synchronous and the
  // debounce timers/quiet-window are exactly what we want to control here.
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Arms mocks and renders with a loaded empty note (flushes load promises). */
  async function renderLoaded() {
    const tauri = mockInvoke();
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    render(<DailyNote date="2026-10-21" isToday create />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    return { tauri, editor: screen.getByLabelText("Note") as HTMLTextAreaElement };
  }

  it("typing does not write immediately; ONE write arrives after the quiet window", async () => {
    const { tauri, editor } = await renderLoaded();

    fireEvent.change(editor, { target: { value: "hello" } });
    expect(tauri.ran("write_note")).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(tauri.callCount("write_note")).toBe(1);
    expect(tauri.args("write_note")).toEqual({ date: "2026-10-21", content: "hello" });
  });

  it("10 rapid keystrokes collapse into one write of the final text", async () => {
    const { tauri, editor } = await renderLoaded();

    for (const word of ["a", "ab", "abc", "abcd", "abcde", "abcdef", "abcdefg", "abcdefgh", "abcdefghi", "abcdefghij"]) {
      fireEvent.change(editor, { target: { value: word } });
    }
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(tauri.callCount("write_note")).toBe(1);
    expect(tauri.args("write_note")?.["content"]).toBe("abcdefghij");
  });

  it("a save error shows a calm retrying note and never loses the text; success clears it", async () => {
    const { tauri, editor } = await renderLoaded();
    tauri.givenError("write_note", { kind: "Io", message: "disk hiccup" });

    fireEvent.change(editor, { target: { value: "keep me" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(screen.getByText("Couldn't save — retrying")).toBeInTheDocument();
    expect(editor.value).toBe("keep me");

    // the write starts succeeding again; the retry clears the note
    tauri.on("write_note", () => null);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    expect(screen.queryByText(/Couldn't save/)).not.toBeInTheDocument();
    expect(editor.value).toBe("keep me");
  });
});

describe("DailyNote save on close / day switch (task 1.6.3)", () => {
  // Fake timers + fireEvent (see the 1.6.2 describe note above).
  beforeEach(() => {
    vi.useFakeTimers();
    closeState.handlers.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Arms mocks and renders with a loaded empty note (flushes load promises). */
  async function renderLoaded() {
    const tauri = mockInvoke();
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    render(<DailyNote date="2026-10-21" isToday create />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    return { tauri, editor: screen.getByLabelText("Note") as HTMLTextAreaElement };
  }

  /** Fires the window close request handlers (as the OS would). */
  async function fireWindowClose() {
    const event = { isPreventDefault: () => false };
    for (const handler of [...closeState.handlers]) await handler(event);
  }

  it("a pending edit is written when the window closes", async () => {
    const { tauri, editor } = await renderLoaded();

    fireEvent.change(editor, { target: { value: "written at the last second" } });
    await act(async () => {
      await fireWindowClose();
    });
    expect(tauri.args("write_note")).toEqual({
      date: "2026-10-21",
      content: "written at the last second",
    });
  });

  it("switching days flushes the edit into the OLD day's file, never the new one", async () => {
    const tauri = mockInvoke();
    tauri.given("ensure_note", null);
    tauri.given("read_note", { exists: true, content: "" });
    let switchTo: (date: string) => void = () => {};
    function Harness() {
      const [date, setDate] = useState("2026-10-21");
      switchTo = setDate;
      return <DailyNote key={date} date={date} isToday create />;
    }
    render(<Harness />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    fireEvent.change(screen.getByLabelText("Note"), { target: { value: "old day text" } });
    await act(async () => {
      switchTo("2026-10-10");
    });

    const writes = getInvokeMock().mock.calls.filter(([cmd]) => cmd === "write_note");
    expect(writes.length).toBe(1);
    expect(writes[0]?.[1]).toEqual({ date: "2026-10-21", content: "old day text" });
  });
});



