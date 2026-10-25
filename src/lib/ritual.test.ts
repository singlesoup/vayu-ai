import { beforeEach, describe, expect, it } from "vitest";
import { closeEvening, eveningClosed, ritualFor } from "./ritual";

describe("ritualFor", () => {
  it("is morning from 5 until noon", () => {
    expect(ritualFor(new Date(2026, 9, 24, 5, 0))).toBe("morning");
    expect(ritualFor(new Date(2026, 9, 24, 11, 59))).toBe("morning");
  });

  it("is evening from 17:00 through 23:59", () => {
    expect(ritualFor(new Date(2026, 9, 24, 17, 0))).toBe("evening");
    expect(ritualFor(new Date(2026, 9, 24, 23, 59))).toBe("evening");
  });

  it("shows nothing in the afternoon or before 5", () => {
    expect(ritualFor(new Date(2026, 9, 24, 4, 59))).toBeNull();
    expect(ritualFor(new Date(2026, 9, 24, 12, 0))).toBeNull();
    expect(ritualFor(new Date(2026, 9, 24, 16, 59))).toBeNull();
  });
});

describe("eveningClosed", () => {
  beforeEach(() => localStorage.clear());

  it("stays closed only for the date that was saved or dismissed", () => {
    expect(eveningClosed("2026-10-21")).toBe(false);
    closeEvening("2026-10-21");
    expect(eveningClosed("2026-10-21")).toBe(true);
    expect(eveningClosed("2026-10-22")).toBe(false);
  });
});
