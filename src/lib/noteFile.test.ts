import { describe, expect, it } from "vitest";
import { isNoteDate, localDateKey, noteFileName } from "./noteFile";

describe("noteFileName (task 1.5.1 — date to file name, pure)", () => {
  it("formats a date as a zero-padded YYYY-MM-DD.md local file name", () => {
    expect(noteFileName(new Date(2026, 9, 21))).toBe("2026-10-21.md");
    expect(noteFileName(new Date(2026, 9, 21, 12, 45))).toBe("2026-10-21.md");
    expect(noteFileName(new Date(2026, 0, 5, 8, 0))).toBe("2026-01-05.md");
  });

  it("uses the LOCAL date, not UTC (local midnight edge)", () => {
    // 00:30 local time must still name the local day, even where UTC differs.
    expect(noteFileName(new Date(2026, 9, 21, 0, 30))).toBe("2026-10-21.md");
    expect(noteFileName(new Date(2026, 9, 21, 23, 59, 59))).toBe("2026-10-21.md");
  });

  it("handles the year boundary", () => {
    expect(noteFileName(new Date(2025, 11, 31, 23, 59))).toBe("2025-12-31.md");
    expect(noteFileName(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01.md");
  });
});

describe("localDateKey (used by 1.5.4 — inverse of noteDateToDate)", () => {
  it("returns the validated date string for a local Date", () => {
    expect(localDateKey(new Date(2026, 9, 21))).toBe("2026-10-21");
    expect(localDateKey(new Date(2026, 9, 21, 0, 30))).toBe("2026-10-21");
    expect(localDateKey(new Date(2026, 0, 1))).toBe("2026-01-01");
    expect(isNoteDate(localDateKey(new Date(2026, 9, 21)))).toBe(true);
  });
});

describe("isNoteDate (task 1.5.1 — strict date strings)", () => {
  it("accepts a well-formed local note date", () => {
    expect(isNoteDate("2026-10-21")).toBe(true);
  });

  it("rejects invalid dates and paths", () => {
    expect(isNoteDate("2026-13-01")).toBe(false); // month out of range
    expect(isNoteDate("../x")).toBe(false); // path traversal
    expect(isNoteDate("2026-1-1")).toBe(false); // not zero-padded
    expect(isNoteDate("2026-10-21.md")).toBe(false); // already a file name
    expect(isNoteDate("abc")).toBe(false);
    expect(isNoteDate("2026-02-30")).toBe(false); // impossible day
    expect(isNoteDate("")).toBe(false);
  });
});
