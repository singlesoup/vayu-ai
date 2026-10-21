// Task 1.7.2: calendar sidebar navigation. Shows one month at a time
// (Monday-first grid), highlights today, marks days that already have a note
// (`list_notes` data comes from App), and hands day clicks back via onSelect.
// Clicking a day NEVER creates a file — only today's note is ensured daily.
import { useState } from "react";
import type { NoteDate } from "../lib/noteFile";
import { monthGrid } from "../lib/calendar";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Props = {
  /** Today's date, used for highlight and the initial month view. */
  today: NoteDate;
  /** Date keys (YYYY-MM-DD) that have a note, from `list_notes`. */
  noteDates: NoteDate[];
  onSelect: (date: NoteDate) => void;
};

export function Calendar({ today, noteDates, onSelect }: Props) {
  const today_ = parseNoteDate(today);
  const [view, setView] = useState({ year: today_.year, month: today_.month }); // month 0-based
  const noteSet = new Set(noteDates);

  function move(delta: number) {
    setView(({ year, month }) => {
      const m = month + delta;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  }

  const weeks = monthGrid(view.year, view.month);

  function dayNoteDate(day: number): NoteDate {
    const mm = `${view.month + 1}`.padStart(2, "0");
    const dd = `${day}`.padStart(2, "0");
    return `${view.year}-${mm}-${dd}`;
  }

  return (
    <section className="calendar" aria-label="Calendar">
      <header>
        <button aria-label="Previous month" onClick={() => move(-1)}>
          ‹
        </button>
        <h2>
          {MONTHS[view.month]} {view.year}
        </h2>
        <button aria-label="Next month" onClick={() => move(1)}>
          ›
        </button>
      </header>
      <table className="cal-grid">
        <thead>
          <tr>
            {WEEKDAYS.map((w) => (
              <th key={w} scope="col">
                {w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i} className="cal-week">
              {week.map((day, j) =>
                day === null ? (
                  <td key={i * 7 + j} className="cal-blank" />
                ) : (
                  <td key={i * 7 + j}>
                    <button
                      onClick={() => onSelect(dayNoteDate(day))}
                      aria-current={view.year === today_.year && view.month === today_.month && day === today_.day ? "date" : undefined}
                      data-note={noteSet.has(dayNoteDate(day)) ? "true" : undefined}
                    >
                      {day}
                    </button>
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function parseNoteDate(d: NoteDate): { year: number; month: number; day: number } {
  const [year, month, day] = d.split("-").map(Number) as [number, number, number];
  return { year, month: month - 1, day };
}
