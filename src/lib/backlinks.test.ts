// Task 3.5: [[topic]] backlink parsing tests.
import { describe, expect, it } from "vitest";
import { backlinksForNote, buildBacklinkIndex, noteLinkLabel, parseBacklinks } from "./backlinks";

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

describe("backlinksForNote", () => {
  const notes = [
    { date: "2026-10-24", content: "# Morning pages\n\nFocus on [[Vayu]]." },
    { date: "2026-10-23", content: "Left the next step in [[Morning pages]]." },
    { date: "2026-10-20", content: "Back to [[2026-10-24]] after the walk." },
    { date: "2026-10-19", content: "```\n[[Morning pages]]\n```\nUnrelated." },
  ];

  it("names the open note from its heading", () => {
    expect(noteLinkLabel(notes[0])).toBe("Morning pages");
  });

  it("lists other notes that link to the heading or the date, newest first", () => {
    expect(backlinksForNote(notes, "2026-10-24")).toEqual([
      {
        date: "2026-10-23",
        title: "Oct 23 · Daily note",
        excerpt: "Left the next step in [[Morning pages]].",
      },
      {
        date: "2026-10-20",
        title: "Oct 20 · Daily note",
        excerpt: "Back to [[2026-10-24]] after the walk.",
      },
    ]);
  });

  it("does not list the open note or a fenced mention", () => {
    const hits = backlinksForNote(notes, "2026-10-24");
    expect(hits.map((hit) => hit.date)).not.toContain("2026-10-24");
    expect(hits.map((hit) => hit.date)).not.toContain("2026-10-19");
  });

  it("uses the source heading in the row title when there is one", () => {
    const hits = backlinksForNote(
      [
        { date: "2026-10-24", content: "Plain day." },
        { date: "2026-10-22", content: "# Berlin\n\nSee [[2026-10-24]]." },
      ],
      "2026-10-24",
    );
    expect(hits[0]?.title).toBe("Oct 22 · Berlin");
  });
});
