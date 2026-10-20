import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const TOKENS_PATH = resolve(__dirname, "tokens.css");

function tokenMap(): Map<string, string> {
  const css = readFileSync(TOKENS_PATH, "utf8");
  const map = new Map<string, string>();
  const pattern = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(css)) !== null) {
    map.set(m[1].toLowerCase().trim(), m[2].trim());
  }
  return map;
}

function expectToken(tokens: Map<string, string>, name: string, value: string) {
  expect(tokens.get(name.toLowerCase()), `token ${name}`).toBe(value);
}

describe("src/styles/tokens.css (task 1.3.1 — design tokens)", () => {
  const tokens = tokenMap();

  it("defines the 8 core colour tokens with the PRD §8 values", () => {
    expectToken(tokens, "--color-ink", "#0E1116");
    expectToken(tokens, "--color-surface", "#171B22");
    expectToken(tokens, "--color-text", "#EDEFF3");
    expectToken(tokens, "--color-muted", "#9BA3AF");
    expectToken(tokens, "--color-breeze", "#5EEAD4");
    expectToken(tokens, "--color-deep-teal", "#14B8A6");
    expectToken(tokens, "--color-paper", "#FAF9F6");
    expectToken(tokens, "--color-warm", "#F5C97A");
  });

  it("defines the supporting shades from the design board as named tokens", () => {
    expectToken(tokens, "--color-border", "#262C36");
    expectToken(tokens, "--color-border-card", "#2B323E");
    expectToken(tokens, "--color-checkbox-border", "#4A5261");
    expectToken(tokens, "--color-on-accent", "#06231F");
  });

  it("defines the three font stacks", () => {
    expectToken(tokens, "--font-ui", "Inter");
    expectToken(tokens, "--font-body", "Newsreader");
    expectToken(tokens, "--font-mono", "JetBrains Mono");
  });

  it("defines the type sizes", () => {
    expectToken(tokens, "--text-display", "34px");
    expectToken(tokens, "--text-heading", "22px");
    expectToken(tokens, "--text-body", "15px");
    expectToken(tokens, "--text-small", "13px");
    expectToken(tokens, "--text-mono", "12px");
  });

  it("defines radius, spacing, and motion tokens", () => {
    expectToken(tokens, "--radius", "12px");
    expectToken(tokens, "--space-1", "8px");
    expectToken(tokens, "--space-2", "16px");
    expectToken(tokens, "--space-3", "24px");
    expectToken(tokens, "--space-4", "32px");
    expectToken(tokens, "--space-6", "48px");
    expectToken(tokens, "--motion-fade", "200ms");
  });
});
