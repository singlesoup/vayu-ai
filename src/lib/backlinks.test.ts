// Task 3.5: [[topic]] backlink parsing tests.
import { describe, expect, it } from "vitest";
import { buildBacklinkIndex, parseBacklinks } from "./backlinks";

describe("parseBacklinks (task 3.5)", () => {
  it("finds topics, normalises case and whitespace, dedupes", () => {
    const md = [
      "Saw [[Running Club]] today.",
      "Also wrote [[running club]] yesterday.",
      "And [[  Dinner plan  ]].",
    ].join("\n");
    expect(parseBacklinks(md)).toEqual(["running club", "dinner plan"]);
  });

  it("ignores empty and malformed links", () => {
    expect(parseBacklinks("Empty [[]] here, half [[open, plain [brackets].")).toEqual([]);
  });

  it("skips fenced code blocks", () => {
    const md = "Real [[topic]].\n```\nfenced [[not-a-topic]]\n```\nBack [[other]].";
    expect(parseBacklinks(md)).toEqual(["topic", "other"]);
  });

  it("no links → empty list", () => {
    expect(parseBacklinks("Just a plain note.")).toEqual([]);
  });
});

describe("buildBacklinkIndex (task 3.5)", () => {
  it("maps every topic to the dates it appears on", () => {
    const index = buildBacklinkIndex([
      { date: "2026-10-20", content: "Started [[reading]]." },
      { date: "2026-10-21", content: "Still into [[Reading]]." },
      { date: "2026-10-19", content: "Nothing here." },
    ]);
    expect(index.get("reading")).toEqual(["2026-10-20", "2026-10-21"]);
    expect([...index.keys()].sort()).toEqual(["reading"]);
  });

  it("typos create no phantom entries beyond where they were typed", () => {
    const index = buildBacklinkIndex([
      { date: "2026-10-21", content: "Typo [[book clubk]] here." },
    ]);
    // The typo only maps to the day it was typed on; nothing else exists.
    expect(index.get("book clubk")).toEqual(["2026-10-21"]);
    expect(index.size).toBe(1);
  });

  it("empty input → empty index", () => {
    expect(buildBacklinkIndex([]).size).toBe(0);
  });
});
