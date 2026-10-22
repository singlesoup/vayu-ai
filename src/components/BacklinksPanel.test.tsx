// Task 3.5: BacklinksPanel component tests.
import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { mockInvoke } from "../test/mocks";
import { BacklinksPanel } from "./BacklinksPanel";

const NOTES = [
  { date: "2026-10-20", content: "Started [[reading]]." },
  { date: "2026-10-21", content: "Still into [[Reading]], and [[garden]]." },
  { date: "2026-10-19", content: "Nothing here." },
];

describe("BacklinksPanel (task 3.5)", () => {
  it("lists topics with day chips; clicking a chip opens that day", async () => {
    const tauri = mockInvoke();
    tauri.on("read_all_notes", () => NOTES);
    const onOpenDay = vi.fn();
    render(<BacklinksPanel onOpenDay={onOpenDay} />);

    await act(async () => {});
    expect(screen.getByText("reading")).toBeInTheDocument();
    expect(screen.getByText("garden")).toBeInTheDocument();
    // `Reading` appears on two days → two chips
    const gardenChip = screen.getByRole("button", { name: "Tue, Oct 20" });
    fireEvent.click(gardenChip);
    expect(onOpenDay).toHaveBeenCalledWith("2026-10-20");
  });

  it("shows the empty state when no note has a [[topic]]", async () => {
    const tauri = mockInvoke();
    tauri.on("read_all_notes", () => [
      { date: "2026-10-21", content: "Plain note, no topics." },
    ]);
    render(<BacklinksPanel onOpenDay={vi.fn()} />);
    await act(async () => {});
    expect(
      screen.getByText(/Type \[\[something\]\] in a note to link topics/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /, / })).not.toBeInTheDocument();
  });

  it("shows a calm error when reads fail, not a crash", async () => {
    const tauri = mockInvoke();
    tauri.on("read_all_notes", () => {
      throw new Error("boom");
    });
    render(<BacklinksPanel onOpenDay={vi.fn()} />);
    await act(async () => {});
    expect(screen.getByText(/Couldn't load backlinks/)).toBeInTheDocument();
  });
});
