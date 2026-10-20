// DEV-ONLY setup script (task 1.3.2): downloads woff2 font files and OFL
// licences into src/assets/fonts so the app never loads fonts from the network.
// It exists for the overnight setup only; it is not part of the app and never
// ships to users. Retrying it after deleting the folder is harmless.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const OUT = resolve("src/assets/fonts");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const FAMILIES = [
  ...[400, 500, 600, 700, 800].map((w) => ({ name: "Inter", weight: w, italic: false })),
  ...[400, 500].map((w) => ({ name: "Newsreader", weight: w, italic: false })),
  ...[400, 500].map((w) => ({ name: "Newsreader", weight: w, italic: true })),
  ...[400, 500].map((w) => ({ name: "JetBrains Mono", weight: w, italic: false })),
];

function cssUrl(name, weight, italic) {
  const family = name.replace(/ /g, "+");
  const suffix = italic ? "ital,wght@1," + weight : "wght@" + weight;
  return `https://fonts.googleapis.com/css2?family=${family}:${suffix}&display=swap`;
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return await res.text();
}

async function download(url, file) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} downloading ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  console.log(`${file}  (${buf.length} bytes)`);
}

/** latin subset block: unicode-range starts at U+0000-00FF */
function latinWoff2Url(css) {
  const blocks = css.split("@font-face").slice(1);
  for (const block of blocks) {
    if (!/unicode-range:[^;]*U\+0000-00FF/.test(block)) continue;
    const m = block.match(/src:\s*url\((https:[^)]+\.woff2)\)/);
    if (m) return m[1];
  }
  throw new Error("no latin woff2 block found");
}

const licences = {
  "Inter-OFL.txt": "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt",
  "Newsreader-OFL.txt":
    "https://raw.githubusercontent.com/google/fonts/main/ofl/newsreader/OFL.txt",
  "JetBrainsMono-OFL.txt":
    "https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/OFL.txt",
};

mkdirSync(OUT, { recursive: true });

for (const { name, weight, italic } of FAMILIES) {
  const css = await fetchText(cssUrl(name, weight, italic));
  const url = latinWoff2Url(css);
  const file = join(
    OUT,
    `${name.replace(/ /g, "")}-${weight}${italic ? "Italic" : ""}.woff2`,
  );
  if (!existsSync(file)) await download(url, file);
  else console.log(`${file} already present`);
}

for (const [file, url] of Object.entries(licences)) {
  const target = join(OUT, file);
  if (!existsSync(target)) await download(url, target);
  else console.log(`${target} already present`);
}

console.log("done: fonts in", dirname(OUT));
