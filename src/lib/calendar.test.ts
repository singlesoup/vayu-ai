import { describe, expect, it } from "vitest";
import { daysInMonth, mondayFirstIndex, monthGrid } from "./calendar";

describe("calendar helpers (task 1.7.2 — pure)", () => {
  it("daysInMonth handles month lengths, leap and non-leap Februaries", () => {
    expect(daysInMonth(2026, 1)).toBe(28); // Feb 2026
    expect(daysInMonth(2028, 1)).toBe(29); // leap Feb
    expect(daysInMonth(2026, 8)).toBe(30); // September
    expect(daysInMonth(2026, 9)).toBe(31); // October
  });

  it("mondayFirstIndex: Mon=0 … Sun=6", () => {
    expect(mondayFirstIndex(new Date(2026, 9, 19, 12))).toBe(0); // Monday
    expect(mondayFirstIndex(new Date(2026, 9, 25, 12))).toBe(6); // Sunday
  });

  it("October 2026 starts on a Thursday → mondayFirstIndex(Oct 1) = 3", () => {
    expect(mondayFirstIndex(new Date(2026, 9, 1, 12))).toBe(3);
  });

  it("monthGrid: October 2026 has 3 leading blanks, 31 days, complete final week", () => {
    const grid = monthGrid(2026, 9);
    expect(grid[0][0]).toBeNull();
    expect(grid[0][1]).toBeNull();
    expect(grid[0][2]).toBeNull();
    expect(grid[0][3]).toBe(1); // day 1 lands after 3 blanks (Monday-first)
    expect(grid[0][6]).toBe(4);
    // flatten: all day numbers 1..31 appear once, in order
    const days = grid.flat().filter((v): v is number => v !== null);
    expect(days).toEqual(Array.from({ length: 31 }, (_, i) => i + 1));
    // every row is a full 7-cell week
    for (const row of grid) expect(row.length).toBe(7);
  });

  it("monthGrid: September 2025 starts on a Monday → no leading blanks", () => {
    const grid = monthGrid(2025, 8);
    expect(grid[0][0]).toBe(1);
  });
});
