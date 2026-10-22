import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { NoteDate } from "../lib/noteFile";
import { Calendar } from "./Calendar";

/** Wraps the calendar with selection display so clicks can be observed. */
function Harness({ today, noteDates = [] }: { today: NoteDate; noteDates?: NoteDate[] }) {
  const [chosen, setChosen] = useState<NoteDate | null>(null);
  return (
    <>
      <Calendar today={today} noteDates={noteDates} onSelect={setChosen} />
      {chosen !== null && <p>{`CHOSEN:${chosen}`}</p>}
    </>
  );
}

describe("Calendar sidebar (task 1.7.2)", () => {
  it("shows the current month heading, Monday-first weekday headers, and 3 lead blanks", () => {
    const { container } = render(<Harness today="2026-10-21" />);
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();

    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual([
      "Mo", "Tu", "We", "Th", "Fr", "Sa", "Su",
    ]);

    // October 2026 starts on a Thursday → the first week has 3 blanks, then day 1
    const firstRow = container.querySelectorAll("tbody tr")[0];
    expect(firstRow).not.toBeNull();
    const leadingBlanks = firstRow.querySelectorAll("td.cal-blank");
    expect(leadingBlanks.length).toBe(3);
    expect(firstRow.querySelector("button")?.textContent).toBe("1");
    // the month's last day is present
    expect(screen.getByRole("button", { name: "31" })).toBeInTheDocument();
  });

  it("today is highlighted with aria-current=date", () => {
    render(<Harness today="2026-10-21" />);
    expect(screen.getByRole("button", { name: "21" })).toHaveAttribute("aria-current", "date");
  });

  it("days with a note are marked", () => {
    render(<Harness today="2026-10-21" noteDates={["2026-10-05"]} />);
    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("data-note", "true");
    expect(screen.getByRole("button", { name: "6" })).not.toHaveAttribute("data-note");
  });

  it("previous and next month navigation works", () => {
    render(<Harness today="2026-10-21" />);
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByRole("heading", { name: "September 2026" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeInTheDocument();
  });

  it("clicking a day selects that date", () => {
    render(<Harness today="2026-10-21" />);
    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(screen.getByText("CHOSEN:2026-10-05")).toBeInTheDocument();
  });

  it("yesterday is reachable in one click — no month navigation needed", () => {
    render(<Harness today="2026-10-21" noteDates={["2026-10-20"]} />);
    fireEvent.click(screen.getByRole("button", { name: "20" }));
    expect(screen.getByText("CHOSEN:2026-10-20")).toBeInTheDocument();
  });

  // Task 1B.4: every week row used the SAME key — React logged a duplicate-key
  // error for every month with more than one week row. This render-level test
  // catches what the file-text tests could not.
  it("week rows have unique React keys (no duplicate-key warning)", () => {
    const errors: string[] = [];
    const spy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => errors.push(args.map(String).join(" ")));
    try {
      render(<Harness today="2026-10-21" />);
    } finally {
      spy.mockRestore();
    }
    expect(
      errors.filter((e) => /same key|unique "key" prop/i.test(e)),
      "React duplicate-key warnings",
    ).toEqual([]);
  });
});
