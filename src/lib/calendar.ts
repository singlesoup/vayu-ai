// Task 1.7.2: pure calendar math. Weeks are Monday-first (the design
// requirement); `monthGrid` returns complete 7-cell weeks with `null` where a
// day does not belong to the shown month.
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 (Monday) … 6 (Sunday) for a given date. */
export function mondayFirstIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Complete Monday-first weeks for a month (month is 0-based). */
export function monthGrid(year: number, month: number): Array<Array<number | null>> {
  const lead = mondayFirstIndex(new Date(year, month, 1, 12));
  const count = daysInMonth(year, month);
  const cells: Array<number | null> = [
    ...Array<number | null>(lead).fill(null),
    ...Array.from({ length: count }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<number | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
