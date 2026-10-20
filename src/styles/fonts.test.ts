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
