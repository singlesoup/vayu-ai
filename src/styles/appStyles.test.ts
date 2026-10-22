// Phase 1B — the styles must actually LOAD, not merely exist on disk (1B.1).
// The verifier found that the previous generation of tests only read file
// text: `App.css` existed but `main.tsx` never imported it, so every layout
// style was dead in the running app. This test pins the import itself.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "..");
const APP_CSS = resolve(__dirname, "..", "App.css");

function appCss(): string {
  return readFileSync(APP_CSS, "utf8");
}

function cssBlock(css: string, selector: string): string | null {
  // `selector` is regex SOURCE (callers escape it), e.g. "\\.first-run input".
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

  it("the note title is Inter display size in Breeze (Reflect hero date)", () => {
    const css = appCss();
    const title = cssBlock(css, "\\.note-title");
    expect(title, ".note-title is styled").not.toBeNull();
    expect(title).toMatch(/font-family:\s*var\(--font-ui\)/);
    expect(title).toMatch(/font-size:\s*var\(--text-display\)/);
    expect(title).toMatch(/color:\s*var\(--color-breeze\)/);
  });

  it("the note body is Newsreader at the note size", () => {
    const block = cssBlock(appCss(), "\\.note-editor");
    expect(block).not.toBeNull();
    expect(block).toMatch(/font-family:\s*var\(--font-body\)/);
    expect(block).toMatch(/font-size:\s*var\(--text-note\)/);
  });

  it("today's calendar cell is Deep Teal with on-accent text", () => {
    const css = appCss();
    const today = css.match(
      /\.cal-grid td button\[aria-current="date"\]\s*{[^}]*}/,
    )?.[0];
    expect(today, "today cell rule exists").not.toBeNull();
    expect(today).toMatch(/background:\s*var\(--color-deep-teal\)/);
    expect(today).toMatch(/color:\s*var\(--color-on-accent\)/);
  });

  it("calendar days are mono; noted days bold Text, empty days Muted", () => {
    const css = appCss();
    const day = cssBlock(css, "\\.cal-grid td button");
    expect(day).toMatch(/font-family:\s*var\(--font-mono\)/);
    expect(day).toMatch(/color:\s*var\(--color-muted\)/);
    const noted = cssBlock(css, '\\.cal-grid td button\\[data-note="true"\\]');
    expect(noted).not.toBeNull();
    expect(noted).toMatch(/font-weight:\s*(bold|700)/);
    expect(noted).toMatch(/color:\s*var\(--color-text\)/);
  });
});

describe("task rows match the design board (task 1B.3)", () => {
  it("the checkbox is a custom 16px circle (Reflect), checkbox-border token", () => {
    const block = cssBlock(appCss(), '\\.task-list input\\[type="checkbox"\\]');
    expect(block, "custom checkbox rule exists").not.toBeNull();
    expect(block).toMatch(/appearance:\s*none/);
    expect(block).toMatch(/width:\s*16px/);
    expect(block).toMatch(/height:\s*16px/);
    expect(block).toMatch(/border-radius:\s*999px/);
    expect(block).toMatch(/var\(--color-checkbox-border\)/);
  });

  it("a checked box is Deep Teal; done text is struck through at ~55% opacity", () => {
    const css = appCss();
    const checked = css.match(
      /\.task-list input\[type="checkbox"\]:checked\s*{[^}]*}/,
    )?.[0];
    expect(checked, "checked checkbox rule exists").not.toBeNull();
    expect(checked).toMatch(/background:\s*var\(--color-deep-teal\)/);
    const done = css.match(/\.task-list li\.task-done[^{]*{[^}]*}/)?.[0];
    expect(done, "done-row rule exists").not.toBeNull();
    expect(done).toMatch(/line-through/);
    expect(done).toMatch(/opacity:\s*0\.55/);
  });
});

describe("settings matches the design board (task 1B.3)", () => {
  it("the gear is quiet and muted; the panel is a Surface card", () => {
    const css = appCss();
    const gear = cssBlock(css, "\\.settings-open");
    expect(gear).toMatch(/color:\s*var\(--color-muted\)/);
    expect(gear).toMatch(/background:\s*transparent/);
    const panel = cssBlock(css, "\\.settings");
    expect(panel).toMatch(/background:\s*var\(--color-surface\)/);
    expect(panel).toMatch(/border-radius:\s*var\(--radius\)/);
  });
});

describe("app entry actually imports the styles (task 1B.1)", () => {
  it("main.tsx (or App.tsx) imports ./App.css", () => {
    const candidates = ["main.tsx", "App.tsx"].map((f) => resolve(SRC, f));
    const importsAppCss = (file: string): boolean =>
      /import\s+["']\.\/App\.css["'];?/.test(readFileSync(file, "utf8"));
    expect(
      candidates.some(importsAppCss),
      "App.css must be imported by the app entry point (main.tsx or App.tsx)",
    ).toBe(true);
  });
});

describe("daily note header and editor never overlap (task 1D.1)", () => {
  it("the header paints above the editor; the editor is a clear block below it", () => {
    const css = appCss();
    const header = cssBlock(css, "\\.daily-note header");
    expect(header, ".daily-note header is styled").not.toBeNull();
    // stacking guarantee: the header always paints over anything below it
    expect(header).toMatch(/position:\s*relative/);
    expect(header).toMatch(/z-index:\s*1/);
    // the editor stack sits below the title; textarea is a clear block
    const stack = cssBlock(css, "\\.note-editor-stack");
    expect(stack, ".note-editor-stack is styled").not.toBeNull();
    expect(stack).toMatch(/margin-top:\s*var\(--space-\d+\)/);
    const editor = cssBlock(css, "\\.note-editor");
    expect(editor, ".note-editor is styled").not.toBeNull();
    expect(editor).toMatch(/display:\s*block/);
  });
});

describe("calendar rail fits the weekday labels and day cells (task 1D.2)", () => {
  it("--width-calendar-rail is wide enough for 7 padded mono cells", () => {
    // 7 cells × (2-digit mono text + 2 × 8px button padding) + 2 × 8px rail
    // padding ≈ 238px, so anything below ~220 clips the right-hand column.
    const tokens = readFileSync(resolve(__dirname, "tokens.css"), "utf8");
    const rail = tokens.match(/--width-calendar-rail:\s*(\d+)px/);
    expect(rail, "--width-calendar-rail exists in tokens.css").not.toBeNull();
    expect(Number(rail?.[1])).toBeGreaterThanOrEqual(220);
  });
});
