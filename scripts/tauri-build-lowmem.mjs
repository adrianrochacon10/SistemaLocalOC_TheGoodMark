/**
 * Igual que tauri-build.mjs pero con menos paralelismo de Cargo (menor pico de RAM en Windows).
 * Uso: npm run tauri:build:lowmem
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const env = {
  ...process.env,
  TGM_LOW_MEM_BUILD: "1",
};
if (!env.CARGO_BUILD_JOBS?.trim()) {
  env.CARGO_BUILD_JOBS = "1";
}

const r = spawnSync(process.execPath, [path.join(__dirname, "tauri-build.mjs")], {
  cwd: root,
  stdio: "inherit",
  env,
});

process.exit(r.status ?? 1);
