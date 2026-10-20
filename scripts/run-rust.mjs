// Runs the Rust test step for `npm run check`.
// When the Rust toolchain is not installed yet, reports a clear SKIPPED line
// (never a silent pass) and exits 0 so the frontend part of `check` can run.
// When cargo runs, its exit code is propagated verbatim.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "cargo",
  ["test", "--manifest-path", "src-tauri/Cargo.toml"],
  {
    stdio: "inherit",
  },
);

if (result.error) {
  if (result.error.code === "ENOENT") {
    console.log(
      "SKIPPED: cargo not installed — Rust test step pending the Rust toolchain install.",
    );
    process.exit(0);
  }
  console.error(`Rust step failed to launch: ${result.error}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
