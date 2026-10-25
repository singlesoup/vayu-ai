import { describe, expect, it } from "vitest";
import { entryReadyForSuggestions, parseSuggestions } from "./suggestions";

describe("companion suggestions", () => {
  it("keeps a short note on the generic chips", () => {
    expect(entryReadyForSuggestions("A quiet morning.")).toBe(false);
  });

  it("treats a paragraph as ready", () => {
    expect(entryReadyForSuggestions("word ".repeat(40))).toBe(true);
  });

  it("reads two question lines and ignores a preamble", () => {
    const parsed = parseSuggestions("Here you go:\nWhat made this feel costly?\n2. Who did you want to tell?");
    expect(parsed).toEqual(["What made this feel costly?", "Who did you want to tell?"]);
  });

  it("rejects a reply that is not two questions", () => {
    expect(parseSuggestions("Caring deeply is the point.")).toBeNull();
  });
});