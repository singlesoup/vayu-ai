import { describe, expect, it } from "vitest";
import type { NoteSummary } from "./backlinks";
import { collectWikiTargets, insertWikiLink, wikiTriggerAt } from "./wikiAutocomplete";

describe("collectWikiTargets", () => {
  it("returns nothing for no notes", () => {
    expect(collectWikiTargets([])).toEqual([]);
  });

  it("collects note dates and [[topic]] topics, deduplicated and sorted", () => {
    const notes: NoteSummary[] = [
      { date: "2026-10-21", content: "Focus on [[Vayu]] and [[reading]] today." },
      { date: "2026-10-22", content: "Still into [[Reading]], and [[vayu]] too." },
    ];
    // [[Vayu]] and [[vayu]] dedupe case-insensitively to "vayu"; [[reading]] and [[Reading]] to "reading"
    expect(collectWikiTargets(notes)).toEqual([
      "2026-10-21",
      "2026-10-22",
      "reading",
      "vayu",
    ]);
  });

  it("a topic equal to a date dedupes with the date", () => {
    const notes: NoteSummary[] = [
      { date: "2026-10-21", content: "See [[2026-10-21]] again." },
    ];
    expect(collectWikiTargets(notes)).toEqual(["2026-10-21"]);
  });

  it("notes without links still contribute their date", () => {
    const notes: NoteSummary[] = [{ date: "2026-10-05", content: "Plain text." }];
    expect(collectWikiTargets(notes)).toEqual(["2026-10-05"]);
  });
});

describe("wikiTriggerAt", () => {
  it("returns null when there is no open [[", () => {
    expect(wikiTriggerAt("plain text", 5)).toBeNull();
    expect(wikiTriggerAt("[[closed]] here", 10)).toBeNull();
  });

  it("detects an open [[ reachable before the caret", () => {
    const t = wikiTriggerAt("see [[Vayu", 10);
    expect(t).toEqual({ start: 4, prefix: "Vayu" });
  });

  it("treats prefix as empty when caret sits right after [[", () => {
    expect(wikiTriggerAt("see [[", 8)).toEqual({ start: 4, prefix: "" });
  });

  it("ignores an already-closed [[ ... ]]", () => {
    expect(wikiTriggerAt("see [[Vayu]] now", 14)).toBeNull();
  });

  it("uses the most recent unclosed [[ when several exist", () => {
    // "[[b" opens at index 10 ([[ at 10, b at 12); caret=16 is past the end
    const t = wikiTriggerAt("[[a]] and [[b", 16);
    expect(t).toEqual({ start: 10, prefix: "b" });
  });

  it("stops at the caret; a [[ after the caret is ignored", () => {
    // caret is before the closing ]], so [[V is still open
    expect(wikiTriggerAt("see [[Vayu]] now", 8)).toEqual({ start: 4, prefix: "Va" });
    // caret after the full closed link → null
    expect(wikiTriggerAt("see [[Vayu]] now", 13)).toBeNull();
    expect(wikiTriggerAt("see [[V", 7)).toEqual({ start: 4, prefix: "V" });
  });
});

describe("insertWikiLink", () => {
  it("replaces [start, caret) with [[topic]] and places the caret after", () => {
    const out = insertWikiLink("see [[Vayu", 10, 4, "Vayu");
    expect(out.text).toBe("see [[Vayu]]");
    expect(out.caret).toBe(12);
  });

  it("keeps text before the trigger and after the caret untouched", () => {
    // caret sits at the space after "Wo" (index 7), so " world" survives after [[World]]
    const out = insertWikiLink("hi [[Wo world", 7, 3, "World");
    expect(out.text).toBe("hi [[World]] world");
    expect(out.caret).toBe(12);
  });
});
