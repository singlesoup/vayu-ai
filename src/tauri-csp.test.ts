import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type WindowConf = {
  app?: {
    security?: {
      csp?: string | null;
      devCsp?: string | null;
    };
  };
};

function readTauriConf(): WindowConf {
  const raw = readFileSync(resolve(__dirname, "../src-tauri/tauri.conf.json"), "utf8");
  return JSON.parse(raw) as WindowConf;
}

/** Tauri's own IPC origin (required for invoke; anything else remote is forbidden). */
const ALLOWED_HTTP_SOURCES = /^http:\/\/(ipc)\.localhost$/;

function directiveSources(csp: string | null | undefined, directive: string): string[] {
  if (!csp) return [];
  const parts = csp
    .split(";")
    .map((p) => p.trim().split(/\s+/))
    .filter((tokens) => tokens.length > 0 && tokens[0].toLowerCase() === directive);
  return parts.length > 0 ? parts[0].slice(1) : [];
}

function assertNoRemoteHttpSources(csp: string | null | undefined, label: string) {
  expect(csp, `${label} is set (not null)`).not.toBeNull();
  expect(csp, `${label} is a non-empty string`).toBeTruthy();
  for (const directive of ["default-src", "connect-src", "font-src", "img-src", "script-src"]) {
    const sources = directiveSources(csp, directive);
    // Directives that we explicitly need: they must exist so an absent one
    // doesn't silently fall back to a permissive default in our config.
    if (directive !== "default-src") {
      expect(sources.length, `${label}: ${directive} is present`).toBeGreaterThan(0);
    }
    for (const source of sources) {
      if (/^https?:\/\//i.test(source)) {
        expect(
          ALLOWED_HTTP_SOURCES.test(source),
          `${label}: ${directive} "${source}" is not a Tauri IPC origin`,
        ).toBe(true);
      }
    }
  }
}

describe("tauri.conf.json (task 1.2.4 — CSP / network lockdown)", () => {
  it("release CSP is set and has no remote http(s) hosts", () => {
    const csp = readTauriConf().app?.security?.csp;
    assertNoRemoteHttpSources(csp, "csp");
  });

  it("dev CSP (if set) has no remote http(s) hosts either", () => {
    const devCsp = readTauriConf().app?.security?.devCsp;
    if (devCsp != null) {
      assertNoRemoteHttpSources(devCsp, "devCsp");
    }
  });
});
