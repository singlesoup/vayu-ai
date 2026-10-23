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

  it("defines the Emergent primary / accent / semantic ramps", () => {
    expectToken(tokens, "--color-primary-950", "#152019");
    expectToken(tokens, "--color-accent-300", "#a9d9bc");
    expectToken(tokens, "--color-accent-400", "#77c596");
    expectToken(tokens, "--color-neutral-100", "#eef0f1");
    expectToken(tokens, "--color-neutral-400", "#959da7");
    expectToken(tokens, "--color-secondary-950", "#15191e");
    expectToken(tokens, "--color-success", "#22c55e");
    expectToken(tokens, "--color-error", "#ef4444");
  });

  it("aliases app colour names onto the Emergent scale", () => {
    expectToken(tokens, "--color-ink", "#0b0d10");
    expectToken(tokens, "--color-surface", "var(--color-secondary-950)");
    expectToken(tokens, "--color-text", "var(--color-neutral-100)");
    expectToken(tokens, "--color-muted", "var(--color-neutral-400)");
    expectToken(tokens, "--color-breeze", "var(--color-accent-300)");
    expectToken(tokens, "--color-deep-teal", "var(--color-accent-400)");
    expectToken(tokens, "--color-paper", "var(--color-primary-50)");
    expectToken(tokens, "--color-warm", "#F5C97A");
    expectToken(tokens, "--color-border", "var(--color-secondary-900)");
    expectToken(tokens, "--color-border-card", "var(--color-secondary-800)");
    expectToken(tokens, "--color-checkbox-border", "var(--color-secondary-600)");
    expectToken(tokens, "--color-on-accent", "var(--color-accent-950)");
    expectToken(tokens, "--color-elevated", "var(--color-primary-950)");
    expectToken(tokens, "--color-soft", "var(--color-secondary-300)");
    expectToken(tokens, "--color-companion", "#0E1216");
    expectToken(tokens, "--color-context-card", "#161c1a");
    expectToken(tokens, "--color-context-card-border", "#2a3b31");
    expectToken(tokens, "--color-eyebrow", "#71917e");
    expectToken(tokens, "--color-daily-lede", "#7e8993");
    expectToken(tokens, "--color-flow-kicker", "#84c09a");
    expectToken(tokens, "--color-flow-number", "#5d6872");
    expectToken(tokens, "--color-flow-question", "#aeb8c1");
    expectToken(tokens, "--color-flow-save", "#b5dcc0");
    expectToken(tokens, "--color-flow-save-rest", "#20382a");
    expectToken(tokens, "--color-flow-save-bg", "#2c513a");
    expectToken(tokens, "--color-flow-save-border", "#41674f");
    expectToken(tokens, "--color-flow-kicker-gold", "#d8bb74");
    expectToken(tokens, "--color-flow-kicker-lavender", "#bbaed2");
    expectToken(tokens, "--color-flow-input", "#e2e7e9");
    expectToken(tokens, "--color-flow-input-bg", "#101419");
    expectToken(tokens, "--color-flow-input-border", "#2a333b");
    expectToken(tokens, "--color-flow-highlight-bg", "#1b2820");
    expectToken(tokens, "--color-flow-focus", "#6da883");
    expectToken(tokens, "--color-flow-copy", "#84909a");
    expectToken(tokens, "--color-flow-card-flat", "#171b21");
    expectToken(tokens, "--color-flow-action", "#dfca8f");
    expectToken(tokens, "--color-reflection-save", "#d0c6df");
    expectToken(tokens, "--color-empty-tasks", "#66717c");
    expectToken(tokens, "--color-flow-card-border", "#2b4135");
    expectToken(tokens, "--color-context-label", "#73917e");
    expectToken(tokens, "--color-context-body", "#89958d");
    expectToken(tokens, "--color-context-tag", "#8db89c");
    expectToken(tokens, "--color-context-tag-bg", "#26352c");
    expectToken(tokens, "--color-privacy-note", "#56625b");
    expectToken(tokens, "--color-chat-muted", "#9ca7b0");
    expectToken(tokens, "--color-message-icon", "#77a187");
    expectToken(tokens, "--color-statusbar-text", "#5e6873");
    expectToken(tokens, "--color-statusbar-bg", "#0d1013");
    expectToken(tokens, "--color-statusbar-border", "#20252d");
    expectToken(tokens, "--color-topbar-label", "#eef1f4");
    expectToken(tokens, "--color-journal-surface", "#111419");
    expectToken(tokens, "--color-format-icon", "#eef1f4");
    expectToken(tokens, "--color-heading", "#eef1f4");
    expectToken(tokens, "--color-note-body", "#dce1e5");
    expectToken(tokens, "--color-accent-strong", "#78be99");
    expectToken(tokens, "--color-suggestion-bg", "#15191e");
    expectToken(tokens, "--color-suggestion-border-idle", "#222A31");
    expectToken(tokens, "--color-suggestion-border", "#3b5445");
    expectToken(tokens, "--color-composer-bg", "#171b20");
    expectToken(tokens, "--color-composer-border", "#2b3239");
    expectToken(tokens, "--color-new-entry-bg", "var(--color-context-card)");
    expectToken(tokens, "--color-nav-item-text", "#e0e5ea");
    expectToken(tokens, "--color-nav-item-bg", "#1a2026");
    expectToken(tokens, "--color-section-kicker", "#69737f");
    expectToken(tokens, "--color-settings-link", "#77818c");
    expectToken(tokens, "--color-entry-count-bg", "#1d242b");
    expectToken(tokens, "--color-entry-selected-bg", "#1a2420");
    expectToken(tokens, "--color-entry-selected-border", "#273d31");
    expectToken(tokens, "--color-entry-snippet", "#7f8994");
    expectToken(tokens, "--color-new-entry-border", "#334239");
    expectToken(tokens, "--color-search-text", "#707986");
    expectToken(tokens, "--color-search-bg", "#171b21");
    expectToken(tokens, "--color-search-border", "#20262e");
    expectToken(tokens, "--color-send-idle", "#222A31");
    expectToken(tokens, "--color-send-idle-icon", "#5a6b62");
  });

  it("defines the three font stacks", () => {
    expectToken(tokens, "--font-ui", '"DM Sans"');
    expectToken(tokens, "--font-body", "Fraunces");
    expectToken(tokens, "--font-mono", '"DM Mono"');
  });

  it("defines the Emergent type sizes and app aliases", () => {
    expectToken(tokens, "--font-size-xs", "0.563rem");
    expectToken(tokens, "--font-size-sm", "0.625rem");
    expectToken(tokens, "--font-size-base", "0.688rem");
    expectToken(tokens, "--font-size-lg", "0.75rem");
    expectToken(tokens, "--font-size-xl", "0.813rem");
    expectToken(tokens, "--font-size-2xl", "1rem");
    expectToken(tokens, "--font-size-3xl", "1.125rem");
    expectToken(tokens, "--font-size-4xl", "1.25rem");
    expectToken(tokens, "--font-weight-medium", "500");
    expectToken(tokens, "--font-weight-bold", "700");
    expectToken(tokens, "--text-display", "2.125rem");
    expectToken(tokens, "--text-heading", "var(--font-size-4xl)");
    expectToken(tokens, "--text-body", "var(--font-size-2xl)");
    expectToken(tokens, "--text-small", "var(--font-size-xl)");
    expectToken(tokens, "--text-mono", "var(--font-size-lg)");
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
