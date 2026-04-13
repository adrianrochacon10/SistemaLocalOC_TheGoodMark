/**
 * Ejecuta `tauri build` desde la raíz del repo.
 * Si no defines CARGO_TARGET_DIR, usa %USERPROFILE%\.cargo-target-tgm para evitar
 * errores "Acceso denegado" al compilar en carpetas sincronizadas (OneDrive, etc.).
 * Tras un build OK, copia .exe (NSIS) y .msi a la carpeta `installer/` del repo.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

if (!process.env.CARGO_TARGET_DIR?.trim()) {
  process.env.CARGO_TARGET_DIR = path.join(os.homedir(), ".cargo-target-tgm");
}

const r = spawnSync("npx", ["tauri", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: process.env,
});

const code = r.status ?? 1;
if (code !== 0) {
  process.exit(code);
}

const targetDir = process.env.CARGO_TARGET_DIR;
const bundleRoot = path.join(targetDir, "release", "bundle");
const destRoot = path.join(root, "installer");

try {
  fs.mkdirSync(destRoot, { recursive: true });
  let copied = 0;
  for (const sub of ["nsis", "msi"]) {
    const srcDir = path.join(bundleRoot, sub);
    if (!fs.existsSync(srcDir)) continue;
    for (const name of fs.readdirSync(srcDir)) {
      const src = path.join(srcDir, name);
      if (!fs.statSync(src).isFile()) continue;
      fs.copyFileSync(src, path.join(destRoot, name));
      copied += 1;
    }
  }
  if (copied > 0) {
    console.log(`\nInstaladores copiados a: ${destRoot} (${copied} archivo(s))`);
  }
} catch (e) {
  console.error("tauri-build: no se pudieron copiar instaladores a installer/:", e);
  process.exit(1);
}

process.exit(0);
