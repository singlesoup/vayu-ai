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

// CSS resolves duplicate custom properties with last-wins (theme blocks
// legitimately redefine tokens). Keep the effective definition so the page
// shows one swatch per token name.
function lastWins(tokens: Token[]): Token[] {
  const byName = new Map<string, Token>();
  for (const t of tokens) byName.set(t.name, t);
  return [...byName.values()];
}

const parsed = lastWins(parseTokens(tokensCss));

export const allTokens: Token[] = parsed;

export const tokenSwatches: Token[] = parsed.filter((t) => t.name.startsWith("--color-"));
export const fontTokens: Token[] = parsed.filter(
  (t) => t.name === "--font-ui" || t.name === "--font-body" || t.name === "--font-mono",
);
export const sizeTokens: Token[] = parsed.filter(
  (t) => t.name.startsWith("--text-") || t.name.startsWith("--font-size-"),
);

export const FONT_PROPERTY_BY_NAME: Record<string, string> = {
  "--font-ui": "var(--font-ui)",
  "--font-body": "var(--font-body)",
  "--font-mono": "var(--font-mono)",
};
