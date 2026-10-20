import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readTauriConf() {
  const raw = readFileSync(resolve(__dirname, "../src-tauri/tauri.conf.json"), "utf8");
  return JSON.parse(raw) as {
    app: { windows: Array<{ title: string; backgroundColor?: string }> };
  };
}

describe("tauri.conf.json (task 1.2.3 — Ink window background)", () => {
  it("the main window has the Ink background colour #0E1116", () => {
    const conf = readTauriConf();
    const main = conf.app.windows.find((w) => w.title === "Vayu");
    expect(main).toBeDefined();
    expect(main?.backgroundColor).toBe("#0E1116");
  });
});
