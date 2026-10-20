import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CSS_COLOUR_NAMES } from "./guard-colour-names";

const SRC = resolve(__dirname, "..");
// tokens.css owns the colours; test files may assert/paste hex values freely.
const ALLOWED_FILE = /tokens\.css$|\.test\.(ts|tsx)$/;

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(css|ts|tsx)$/.test(entry)) acc.push(full);
  }
  return acc;
}

function violationsFor(content: string): string[] {
  const found: string[] = [];
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    const rel = `${i + 1}`;
    // hex colours (3–8 hex digits, must be a full word)
    if (/(^|[^0-9a-zA-Z])#[0-9a-fA-F]{3,8}([^0-9a-zA-Z]|$)/.test(line)) {
      found.push(`line ${rel}: hex colour`);
    }
    // rgb/rgba/hsl/hsl functions
    if (/\b(rgba?|hsla?)\(/i.test(line)) {
      found.push(`line ${rel}: rgb/hsl function`);
    }
    // named colours used as a style value, e.g. style={{ color: "teal" }} or color: red;
    for (const name of CSS_COLOUR_NAMES) {
      const pattern = new RegExp(
        `(?:${[
          "color",
          "backgroundColor",
          "background",
          "borderColor",
          "fill",
          "stroke",
          "fillColor",
          "strokeColor",
        ].join("|")})\\s*[:=]\\s*["']?${name}(?![a-zA-Z])(?:\\s*;|["'])`,
        "i",
      );
      if (pattern.test(line)) {
        found.push(`line ${rel}: named colour "${name}" in a style value`);
        break;
      }
    }
  });
  return found;
}

describe("colour guard (task 1.3.3 — tokens.css is the only colour source)", () => {
  it("no file outside tokens.css hard-codes a colour", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (ALLOWED_FILE.test(file)) continue;
      const content = readFileSync(file, "utf8");
      const rel = relative(SRC, file);
      for (const v of violationsFor(content)) {
        offenders.push(`${rel}: ${v}`);
      }
    }
    expect(offenders, "hard-coded colours found").toEqual([]);
  });
});
