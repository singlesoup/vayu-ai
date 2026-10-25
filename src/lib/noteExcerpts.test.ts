import { describe, expect, it } from "vitest";
import { excerptsFromNotes } from "./noteExcerpts";

describe("excerptsFromNotes", () => {
  const notes = [
    { date: "2026-10-24", content: "Caring deeply is the opposite of surface level. @Foodpharma and @Trustified." },
    { date: "2026-10-22", content: "Book flights for the Berlin marathon." },
  ];

  it("always includes the open note, even when the question shares no words with it", () => {
    const hits = excerptsFromNotes(notes, "Summarize this entry", "2026-10-24");
    expect(hits[0]?.date).toBe("2026-10-24");
    expect(hits[0]?.text).toContain("Caring deeply");
  });

  it("adds another day only when it shares words with the question", () => {
    const hits = excerptsFromNotes(notes, "When did I book flights?", "2026-10-24");
    expect(hits.map((hit) => hit.date)).toContain("2026-10-22");
  });

  it("returns nothing when every note is empty", () => {
    expect(excerptsFromNotes([{ date: "2026-10-24", content: "   " }], "hello", "2026-10-24")).toEqual([]);
  });
});