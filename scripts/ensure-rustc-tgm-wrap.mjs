/**
 * Compila `scripts/rustc-tgm-wrap` (sin RUSTC_WRAPPER) y devuelve la ruta al .exe.
 * Así Cargo invoca un .exe nativo y no cmd.exe + node con %* (límite ~8191).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function ensureRustcTgmWrapExeSync() {
  if (os.platform() !== "win32") {
    return "";
  }
  const crateDir = path.join(__dirname, "rustc-tgm-wrap");
  const exe = path.join(crateDir, "target", "release", "rustc-tgm-wrap.exe");
  if (fs.existsSync(exe)) {
    return path.resolve(exe);
  }
  const env = { ...process.env };
  delete env.RUSTC_WRAPPER;
  delete env.CARGO_BUILD_RUSTC_WORKSPACE_WRAPPER;
  console.error("ensure-rustc-tgm-wrap: compilando wrapper (solo la primera vez)…\n");
  execSync("cargo build --release", {
    cwd: crateDir,
    stdio: "inherit",
    env,
  });
  if (!fs.existsSync(exe)) {
    throw new Error(`ensure-rustc-tgm-wrap: no se generó ${exe}`);
  }
  return path.resolve(exe);
}

const print = process.argv.includes("--print");
if (print) {
  try {
    console.log(ensureRustcTgmWrapExeSync());
  } catch (e) {
    console.error(e?.message || e);
    process.exit(1);
  }
}
