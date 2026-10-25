import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const APP_CSS = resolve(__dirname, "..", "App.css");

function appCss(): string {
  return readFileSync(APP_CSS, "utf8");
}

function cssBlock(css: string, selector: string): string | null {
  return css.match(new RegExp(selector + "\\s*{[^}]*}"))?.[0] ?? null;
}

describe("first-run screen matches the design board (task 1B.3)", () => {
  it("the card is Surface on Ink, centred, 12px radius", () => {
    const block = cssBlock(appCss(), "\\.first-run");
    expect(block, ".first-run is styled").not.toBeNull();
    expect(block).toMatch(/background:\s*var\(--color-surface\)/);
    expect(block).toMatch(/border-radius:\s*var\(--radius\)/);
    expect(block).toMatch(/margin:\s*0 auto/);
  });

  it("Continue is a Breeze pill (on-accent text), Choose folder… is a ghost button", () => {
    const css = appCss();
    const primary = cssBlock(css, "\\.btn-primary");
    expect(primary, ".btn-primary exists").not.toBeNull();
    expect(primary).toMatch(/background:\s*var\(--color-breeze\)/);
    expect(primary).toMatch(/color:\s*var\(--color-on-accent\)/);
    expect(primary).toMatch(/border-radius:\s*999px/);
    const ghost = cssBlock(css, "\\.btn-ghost");
    expect(ghost, ".btn-ghost exists").not.toBeNull();
    expect(ghost).toMatch(/background:\s*transparent/);
    expect(ghost).toMatch(/var\(--color-border-card\)/);
  });

  it("the path field uses the mono font", () => {
    const block = cssBlock(appCss(), "\\.first-run input");
    expect(block).toMatch(/font-family:\s*var\(--font-mono\)/);
  });
});

describe("daily note screen matches the design board (task 1B.3)", () => {
  it("three-zone shell; right rail collapses below 1100px", () => {
    const css = appCss();
    expect(css).toMatch(/\.workspace\s*{[^}]*grid-template-columns:\s*220px/);
    const rail = cssBlock(css, "\\.app-rail");
    expect(rail, ".app-rail is styled").not.toBeNull();
    expect(rail).toMatch(/background:\s*var\(--color-surface\)/);
    const mediaIdx = css.search(/@media[^{]*max-width:\s*1100px/);
    expect(mediaIdx, "a ≤1100px collapse media query exists").toBeGreaterThan(-1);
    const collapse = css.slice(mediaIdx).match(/\.app-rail\s*{[^}]*display:\s*none/);
    expect(collapse, "the right rail hides at ≤1100px").not.toBeNull();
  });

  it("the note title is Fraunces display size in Breeze (Reflect hero date)", () => {
    const css = appCss();
    const title = cssBlock(css, "\\.note-title");
    expect(title, ".note-title is styled").not.toBeNull();
  });
});

describe("motion keyframes (item 2 — panel entrance animations)", () => {
  it("defines fadeIn, riseIn, and blink keyframes", () => {
    const css = appCss();
    expect(css).toMatch(/@keyframes\s+fadeIn\s*\{/);
    expect(css).toMatch(/@keyframes\s+riseIn\s*\{/);
    expect(css).toMatch(/@keyframes\s+blink\s*\{/);
  });

  it("wraps entrance animations in prefers-reduced-motion", () => {
    const css = appCss();
    expect(css).toMatch(/@media\s*\(\s*prefers-reduced-motion:\s*no-preference\s*\)/);
  });

  it("provides utility classes for the keyframes", () => {
    const css = appCss();
    expect(css).toMatch(/\.animate-fade-in\s*\{/);
    expect(css).toMatch(/\.animate-rise-in\s*\{/);
    expect(css).toMatch(/\.animate-blink\s*\{/);
  });
});

describe("mobile layout (item 6 — 760px fix)", () => {
  it("at 760px the sidebar becomes a fixed drawer", () => {
    const css = appCss();
    const mediaIdx = css.search(/@media[^{]*max-width:\s*760px/);
    expect(mediaIdx).toBeGreaterThan(-1);
    const block = css.slice(mediaIdx);
    expect(block).toMatch(/\.app-nav\s*\{[^}]*position:\s*fixed/);
    expect(block).toMatch(/\.app-nav\s*\{[^}]*width:\s*280px/);
  });

  it("at 760px calendar uses compact 7-col grid", () => {
    const css = appCss();
    const mediaIdx = css.search(/@media[^{]*max-width:\s*760px/);
    const block = css.slice(mediaIdx);
    expect(block).toMatch(/\.calendar-grid\s*\{[^}]*repeat\(7,\s*minmax\(32px,\s*1fr\)\)/);
  });

  it("at 760px workspace prevents horizontal scroll", () => {
    const css = appCss();
    const mediaIdx = css.search(/@media[^{]*max-width:\s*760px/);
    const block = css.slice(mediaIdx);
    expect(block).toMatch(/\.workspace\s*\{[^}]*overflow-x:\s*hidden/);
  });

  it("at 1050px sidebar labels truncate instead of clipping", () => {
    const css = appCss();
    const mediaIdx = css.search(/@media[^{]*max-width:\s*1050px/);
    expect(mediaIdx).toBeGreaterThan(-1);
    const block = css.slice(mediaIdx);
    expect(block).toMatch(/text-overflow:\s*ellipsis/);
  });
});
