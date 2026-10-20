// Pure token parsing + derived lists for the dev-only TokenPage (task 1.3.4).
// Kept out of TokenPage.tsx so that file exports only components.

import tokensCss from "../styles/tokens.css?raw";

export type Token = { name: string; value: string };

/** Pure: extracts `--name: value` custom properties from CSS text. */
export function parseTokens(css: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /--([a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m = pattern.exec(css);
  while (m !== null) {
    tokens.push({ name: `--${m[1]}`, value: m[2].trim() });
    m = pattern.exec(css);
  }
  return tokens;
}

const parsed = parseTokens(tokensCss);

export const allTokens: Token[] = parsed;

export const tokenSwatches: Token[] = parsed.filter((t) => t.name.startsWith("--color-"));
export const fontTokens: Token[] = parsed.filter(
  (t) => t.name.startsWith("--font-") && t.value !== "",
);
export const sizeTokens: Token[] = parsed.filter((t) => t.name.startsWith("--text-"));

export const FONT_PROPERTY_BY_NAME: Record<string, string> = {
  "--font-ui": "var(--font-ui)",
  "--font-body": "var(--font-body)",
  "--font-mono": "var(--font-mono)",
};
