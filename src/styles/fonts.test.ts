import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "..");

function cssFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) cssFiles(full, acc);
    else if (entry.endsWith(".css")) acc.push(full);
  }
  return acc;
}

describe("fonts (task 1.3.2 — bundled locally)", () => {
  it("no @font-face is nested inside :root (task 1B.2)", () => {
    const css = readFileSync(resolve(__dirname, "tokens.css"), "utf8");
    // Find ":root {" and its MATCHING close brace by counting braces — a
    // regex can't do this. Nested @font-face is invalid CSS: browsers drop
    // it, so the bundled fonts would never load.
    const rootOpen = css.indexOf(":root");
    expect(rootOpen, "tokens.css declares a :root block").toBeGreaterThan(-1);
    const braceStart = css.indexOf("{", rootOpen);
    let depth = 0;
    let closeBrace = -1;
    for (let i = braceStart; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          closeBrace = i;
          break;
        }
      }
    }
    expect(closeBrace, ":root block is closed").toBeGreaterThan(-1);
    const rootBlock = css.slice(braceStart, closeBrace + 1);
    expect(rootBlock, "@font-face must sit OUTSIDE :root").not.toMatch(/@font-face/);
    // and the @font-face rules still exist at the top level (count actual
    // at-rule openers — earlier draft counted the word inside comments too)
    expect(
      (css.match(/@font-face\s*\{/g) ?? []).length,
      "all font faces survive the move",
    ).toBe(11);
  });

  it("every @font-face src points to a file that exists in the repo", () => {
    const css = readFileSync(resolve(__dirname, "tokens.css"), "utf8");
    const faces = css.match(/@font-face\s*{[^}]*}/g) ?? [];
    expect(faces.length, "tokens.css declares @font-face rules").toBeGreaterThan(0);

    for (const face of faces) {
      const srcs = face.match(/url\(([^)]+)\)/g) ?? [];
      expect(srcs.length, "each @font-face has a src url").toBeGreaterThan(0);
      for (const raw of srcs) {
        const rel = raw.replace(/^url\(["']?|["']?\)$/g, "");
        const abs = resolve(__dirname, rel);
        expect(existsSync(abs), `font file exists: ${rel}`).toBe(true);
      }
    }
  });

  it("no CSS file contains an http:// or https:// URL", () => {
    for (const file of cssFiles(SRC)) {
      const content = readFileSync(file, "utf8");
      expect(content, `${file} has no remote URL`).not.toMatch(/https?:\/\//);
    }
  });
});
