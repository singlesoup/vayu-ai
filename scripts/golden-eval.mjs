#!/usr/bin/env node
/**
 * Vayu 3.9 golden-set runner — scripted pre-check for the live-model eval gates.
 *
 * Talks ONLY to the local Ollama server (127.0.0.1:11434) — no other endpoint.
 * Production parity: ollama.rs run_generate posts {model, prompt, stream} to
 * /api/generate with default options; this runner posts {model, prompt,
 * stream:false} — same sampling rules, non-streamed for simplicity.
 *
 * Evals:
 *   extract  — 20 brain dumps -> task lines, wording preservation  (>=18/20)
 *   reflect  — 10 evening reflections -> "invents nothing" check   (>=9/10)
 *   ask      — IN-APP only (needs the real embedding index). The script
 *              prints the question checklist; see docs/testing/golden-set-evals.md
 *
 * Usage:
 *   node scripts/golden-eval.mjs --eval extract [--model gemma3n:e2b] [--list]
 *   node scripts/golden-eval.mjs --eval reflect [--model ...]
 * Reports: golden/reports/<eval>-<timestamp>.md
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OLLAMA = "http://127.0.0.1:11434";
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const GOLDEN = join(repoRoot, "golden");
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const EVAL = flag("--eval");
if (!EVAL) {
  console.error("usage: node scripts/golden-eval.mjs --eval extract|reflect|ask [--model <name>]");
  process.exit(2);
}

// ── prompt templates — MUST stay byte-identical to production ────────────────
// Source: src/components/BrainDump.tsx extract() (lines 50–56). Sync-check there.
const EXTRACT_PROMPT = (dump) =>
  "Extract clear, actionable tasks from this brain dump. " +
  "Preserve the user's exact wording wherever possible. " +
  "Do not invent tasks the user didn't imply. " +
  "If nothing is actionable, reply with exactly: NO_TASKS\n" +
  "Otherwise reply with one '- [ ] task' line per task, nothing else.\n\n" +
  "Brain dump:\n" +
  dump;

// Source: src/components/EveningReflection.tsx reflect() (lines 48–54). Sync-check there.
const REFLECT_PROMPT = (content, tasksText, gaveEnergy, lettingGo) =>
  "Summarize this day in 2-3 sentences based ONLY on the note, tasks, and " +
  "the two wind-down answers below. Do not invent events.\n\n" +
  `Note:\n${content}\n\n` +
  `Tasks:\n${tasksText || "(none)"}\n\n` +
  `What gave energy: ${gaveEnergy || "(not answered)"}\n` +
  `Letting go: ${lettingGo || "(not answered)"}`;

// ── helpers ──────────────────────────────────────────────────────────────────
const norm = (s) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter(Boolean);

/** A phrase is "present" if it appears verbatim (normalised) OR all of its
 *  words appear somewhere (tolerant word-set match — wording-preservation
 *  proxy; the in-app human scoring remains the final gate). */
function phraseIn(output, phrase) {
  const hay = norm(output);
  const needle = norm(phrase);
  if (needle && hay.includes(needle)) return true;
  const ws = words(phrase);
  return ws.length > 0 && ws.every((w) => hay.split(" ").includes(w));
}

async function generate(model, prompt) {
  const res = await fetch(`${OLLAMA}/api/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  return String(data.response ?? "");
}

async function pickModel() {
  const given = flag("--model");
  if (given) return given;
  const res = await fetch(`${OLLAMA}/api/tags`);
  if (!res.ok) throw new Error(`Ollama not reachable at ${OLLAMA} (HTTP ${res.status})`);
  const names = (await res.json()).models?.map((m) => m.name) ?? [];
  const gemma = names.find((n) => n.toLowerCase().includes("gemma"));
  const chosen = gemma ?? names[0];
  if (!chosen) throw new Error("No models installed — run ollama pull first.");
  return chosen;
}

const parseTasksFromNote = (content) =>
  content
    .split("\n")
    .filter((l) => /^\s*[-*]\s*\[[ xX]\]/.test(l))
    .map((l) => l.replace(/^\s*[-*]\s*\[[ xX]\]\s*/, "").trim())
    .join("\n");

// ── eval: extract ────────────────────────────────────────────────────────────
async function runExtract(model) {
  const { dumps } = JSON.parse(readFileSync(join(GOLDEN, "brain-dumps.json"), "utf8"));
  const rows = [];
  for (const d of dumps) {
    const out = await generate(model, EXTRACT_PROMPT(d.dump));
    const taskLines = out.split("\n").filter((l) => /\[\s*( |x|X)\s*\]/.test(l));
    const noTasks = Boolean(d.expectNoTasks);
    let pass;
    let note = "";
    if (noTasks) {
      pass = out.toUpperCase().includes("NO_TASKS") || taskLines.length === 0;
      if (!pass) note = "expected NO_TASKS/empty, got " + taskLines.length + " task line(s)";
    } else {
      const missing = d.tokens.filter((t) => !phraseIn(out, t));
      pass = taskLines.length > 0 && missing.length === 0;
      if (!pass) {
        if (taskLines.length === 0) note = "no task lines in output";
        else note = "missing tokens: " + missing.join(" | ");
      }
      const extra = d.optionalGroups ?? [];
      for (const group of extra) {
        if (!group.some((t) => phraseIn(out, t))) {
          note += (note ? "; " : "") + "advisory: none of [" + group.join(" | ") + "] present";
        }
      }
    }
    rows.push({ id: d.id, pass, note, out: out.trim().replace(/\n{2,}/g, "\n").slice(0, 400) });
    console.log(`${pass ? "PASS" : "FAIL"}  ${d.id}${note ? "  — " + note : ""}`);
  }
  return { title: "Extractor golden eval", threshold: ">= 18 / 20 wording preserved", rows };
}

// ── eval: reflect ────────────────────────────────────────────────────────────
async function runReflect(model) {
  const { evals } = JSON.parse(readFileSync(join(GOLDEN, "reflect-evals.json"), "utf8"));
  const rows = [];
  for (const ev of evals) {
    const notePath = join(GOLDEN, "journal", `${ev.date}.md`);
    const content = existsSync(notePath) ? readFileSync(notePath, "utf8") : "";
    const out = await generate(
      model,
      REFLECT_PROMPT(content, parseTasksFromNote(content), ev.gaveEnergy, ev.lettingGo),
    );
    const mustMissing = ev.must.filter((group) => !group.some((t) => phraseIn(out, t)));
    const invented = ev.invent.filter((t) => phraseIn(out, t));
    const pass = mustMissing.length === 0 && invented.length === 0;
    let note = "";
    if (mustMissing.length) note += "missing: " + mustMissing.map((g) => g.join("|")).join(" + ") + " ";
    if (invented.length) note += "INVENTED: " + invented.join(", ");
    if (!content && !note) note = "empty day — summary should reflect that";
    rows.push({ id: ev.id, pass, note, out: out.trim().replace(/\n{2,}/g, "\n").slice(0, 400) });
    console.log(`${pass ? "PASS" : "FAIL"}  ${ev.id}${note ? "  — " + note : ""}`);
  }
  return { title: "Reflection 'invents nothing' golden eval", threshold: ">= 9 / 10 clean", rows };
}

// ── eval: ask (in-app checklist) ─────────────────────────────────────────────
function askChecklist() {
  const { questions } = JSON.parse(readFileSync(join(GOLDEN, "ask-evals.json"), "utf8"));
  console.log("Ask Your Notes is an IN-APP eval (real embedding index + source chips):");
  console.log("1. install golden/journal/*.md into the configured notes dir (see golden/README.md)");
  console.log("2. rebuild the index (app Settings or open the app — it indexes on start)");
  console.log("3. ask each question in the Ask panel, record answer + source day + chip");
  for (const q of questions) {
    console.log(`  ${q.id}: "${q.question}"  -> expect day ${q.expectDay}, keywords: ${q.keywordSets.map((s) => s.join(" | ")).join(" / ")}${q.note ? "  (note: " + q.note + ")" : ""}`);
  }
  console.log("Threshold: >= 9 / 10 citing real days. Record results in docs/testing/golden-set-evals.md.");
}

// ── run + report ─────────────────────────────────────────────────────────────
const model = await pickModel();
console.log(`model: ${model}\n`);
let result;
if (EVAL === "extract") result = await runExtract(model);
else if (EVAL === "reflect") result = await runReflect(model);
else if (EVAL === "ask") { askChecklist(); process.exit(0); }
else { console.error("unknown eval: " + EVAL); process.exit(2); }

const passed = result.rows.filter((r) => r.pass).length;
console.log(`\n${result.title}: ${passed}/${result.rows.length}  (${result.threshold})`);

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const reportsDir = join(GOLDEN, "reports");
mkdirSync(reportsDir, { recursive: true });
const reportPath = join(reportsDir, `${EVAL}-${stamp}.md`);
const md =
  `# ${result.title}\n\n` +
  `- model: \`${model}\`\n- date: ${new Date().toISOString()}\n- score: **${passed}/${result.rows.length}** (threshold: ${result.threshold})\n\n` +
  result.rows
    .map((r) => `## ${r.pass ? "PASS" : "FAIL"} ${r.id}${r.note ? "\n\n" + r.note : ""}\n\n\`\`\`\n${r.out}\n\`\`\``)
    .join("\n\n") +
  "\n";
writeFileSync(reportPath, md, "utf8");
console.log(`report: ${reportPath}`);
process.exit(passed === result.rows.length ? 0 : 1);
