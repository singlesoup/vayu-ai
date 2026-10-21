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
  return css.match(new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*{[^}]*}"))?.[0] ?? null;
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
  it("Surface sidebar rail beside the Ink main column; stacked below 700px", () => {
    const css = appCss();
    const rail = cssBlock(css, "\\.calendar-rail");
    expect(rail, ".calendar-rail is styled").not.toBeNull();
    expect(rail).toMatch(/background:\s*var\(--color-surface\)/);
    expect(rail).toMatch(/width:\s*var\(--width-calendar-rail\)/);
    const mediaIdx = css.search(/@media[^{]*max-width:\s*700px/);
    expect(mediaIdx, "a ≤700px stacking media query exists").toBeGreaterThan(-1);
    const stackRule = css
      .slice(mediaIdx)
      .match(/\.workspace\s*{[^}]*flex-direction:\s*column/);
    expect(stackRule, "the workspace stacks vertically at ≤700px").not.toBeNull();
  });

  it("the date line is mono 12px uppercase muted; the title is Inter", () => {
    const css = appCss();
    const date = cssBlock(css, "\\.note-date");
    expect(date, ".note-date is styled").not.toBeNull();
    expect(date).toMatch(/font-family:\s*var\(--font-mono\)/);
    expect(date).toMatch(/font-size:\s*var\(--text-mono\)/);
    expect(date).toMatch(/text-transform:\s*uppercase/);
    expect(date).toMatch(/color:\s*var\(--color-muted\)/);
    const title = cssBlock(css, "\\.note-title");
    expect(title, ".note-title is styled").not.toBeNull();
    expect(title).toMatch(/font-family:\s*var\(--font-ui\)/);
  });

  it("the note body is Newsreader at the note size", () => {
    const block = cssBlock(appCss(), "\\.note-editor");
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
  it("the checkbox is a custom 16px square, 5px radius, checkbox-border token", () => {
    const block = cssBlock(appCss(), '\\.task-list input\\[type="checkbox"\\]');
    expect(block, "custom checkbox rule exists").not.toBeNull();
    expect(block).toMatch(/appearance:\s*none/);
    expect(block).toMatch(/width:\s*16px/);
    expect(block).toMatch(/height:\s*16px/);
    expect(block).toMatch(/border-radius:\s*5px/);
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
