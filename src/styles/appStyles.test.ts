// Phase 1B — the styles must actually LOAD, not merely exist on disk (1B.1).
// The verifier found that the previous generation of tests only read file
// text: `App.css` existed but `main.tsx` never imported it, so every layout
// style was dead in the running app. This test pins the import itself.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(__dirname, "..");

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
