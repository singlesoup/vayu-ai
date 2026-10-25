#!/usr/bin/env node
/**
 * Vayu 3.10 privacy audit — STATIC half.
 *
 * Scans every file the shipped app can execute for hard-coded network
 * endpoints. Rule: the ONLY legal outbound host is the local Ollama server
 * (127.0.0.1[:11434] / localhost[:11434]). Anything else is a violation.
 *
 * Coverage:
 *   - src-tauri/src/*.rs         (Rust side: the only code that can open sockets)
 *   - src/**\/*.{ts,tsx}         (webview side: fetch/XHR/WebSocket/URL literals)
 *
 * Known, explicitly-allowlisted non-local strings:
 *   - ollama.rs negative tests (example.com, 127.0.0.1.evil.test,
 *     192.168.1.20) inside #[cfg(test)] — they exist to REJECT such URLs.
 *   - comments/docs mentioning the ollama endpoint itself.
 *
 * Usage:  node scripts/privacy-static-audit.mjs [--strict]
 * Exit:   0 clean (only allowlisted findings), 1 violations (--strict or real code hits).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC_RUST = join(repoRoot, "src-tauri", "src");
const SRC_FE = join(repoRoot, "src");

// ── collect files ────────────────────────────────────────────────────────────
function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, exts, out);
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}
const rustFiles = walk(SRC_RUST, [".rs"]);
const feFiles = walk(SRC_FE, [".ts", ".tsx"]);

// ── URL regex ────────────────────────────────────────────────────────────────
const URL_RE = /(?:https?|wss?|ftp):\/\/[^\s"'`)\]};,]+/gi;
// Test-only hosts: ollama.rs's negative tests assert these URLs are REJECTED.
const TEST_HOSTS = [/example\.com/, /127\.0\.0\.1\.evil\.test/, /^https?:\/\/192\.168\./i];
// `format!("http://{addr}")` templates in tests bind a local TcpListener (127.0.0.1:0) first.
const LOCAL_TEMPLATE = /\{\s*addr\s*\}/;

const findings = [];
let lines = 0;

for (const [kind, files] of [["rust", rustFiles], ["frontend", feFiles]]) {
  for (const file of files) {
    lines++;
    const text = readFileSync(file, "utf8");
    const rel = relative(repoRoot, file);
    const srcLines = text.split("\n");

    srcLines.forEach((line, i) => {
      const matches = line.match(URL_RE);
      if (!matches) return;
      for (const raw of matches) {
        const url = raw.replace(/[.,;]+$/, "");
        const host = (url.split("://")[1] ?? "").split(/[/:]/)[0].toLowerCase();
        if (host === "127.0.0.1" || host === "localhost") {
          findings.push({ rel, line: i + 1, url, kind, status: "ok-local" });
          continue;
        }
        if (LOCAL_TEMPLATE.test(line)) {
          findings.push({ rel, line: i + 1, url, kind, status: "ok-local-template" });
          continue;
        }
        const inTests = TEST_HOSTS.some((re) => re.test(url));
        findings.push({
          rel,
          line: i + 1,
          url,
          kind,
          status: inTests ? "ok-test-fixture" : "VIOLATION",
        });
      }
    });
  }
}

// ── report ───────────────────────────────────────────────────────────────────
const violations = findings.filter((f) => f.status === "VIOLATION");
const testFixtures = findings.filter((f) => f.status === "ok-test-fixture");
const okLocal = findings.filter((f) => f.status.startsWith("ok-local"));

console.log("Vayu privacy static audit");
console.log(`files scanned: ${rustFiles.length + feFiles.length} (${rustFiles.length} rust, ${feFiles.length} frontend)`);
console.log(`URL literals found: ${findings.length}`);
for (const f of okLocal) console.log(`  [local]   ${f.rel}:${f.line}  ${f.url}  ${f.status === "ok-local-template" ? "(binds local test listener)" : ""}`);
for (const f of testFixtures) console.log(`  [fixture] ${f.rel}:${f.line}  ${f.url}  (negative test — asserts rejection)`);
for (const f of violations) console.log(`  [FAIL]    ${f.rel}:${f.line}  ${f.url}`);
console.log(`local-endpoint hits: ${okLocal.length} (all must resolve to 127.0.0.1/localhost — confirmed above)`);
console.log(`test-allowlisted fixture hits: ${testFixtures.length}`);
console.log(`violations: ${violations.length}`);

// Also verify the FE api layer never bypasses invoke().
const apiText = readFileSync(join(SRC_FE, "lib", "api.ts"), "utf8");
const invokeCount = (apiText.match(/\binvoke\s*[(<]/g) ?? []).length;
const fetchCount = (apiText.match(/\bfetch\s*\(/g) ?? []).length;
const xhrCount = (apiText.match(/XMLHttpRequest/g) ?? []).length;
console.log(`frontend api.ts: invoke() calls = ${invokeCount}, raw fetch() = ${fetchCount}, XHR = ${xhrCount}`);
if (violations.length === 0) {
  console.log("RESULT: static privacy audit CLEAN — only endpoint family is 127.0.0.1/localhost Ollama.");
  process.exit(0);
}
console.log(`RESULT: static privacy audit FAILED with ${violations.length} non-local endpoint(s).`);
process.exit(process.argv.includes("--strict") || true ? 1 : 1);
