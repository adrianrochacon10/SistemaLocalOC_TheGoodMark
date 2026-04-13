/**
 * Build backend sidecar (esbuild + pkg) and copy backend/.env for Tauri bundle.
 * Run from repo root. Fails if backend/.env is missing (release builds need secrets).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const backendRoot = path.join(root, "backend");
const envSrc = path.join(backendRoot, ".env");
const envDestDir = path.join(root, "src-tauri", "resources");
const envDest = path.join(envDestDir, "server.env");
const binDir = path.join(root, "src-tauri", "binaries");
const triple = execSync("rustc --print host-tuple", {
  cwd: path.join(root, "src-tauri"),
  encoding: "utf8",
}).trim();
if (!triple) {
  console.error("prepare-tauri-bundle: could not read rustc host tuple");
  process.exit(1);
}

if (!fs.existsSync(envSrc)) {
  console.error(
    "prepare-tauri-bundle: missing backend/.env — create it with PORT, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc."
  );
  process.exit(1);
}

fs.mkdirSync(envDestDir, { recursive: true });
fs.mkdirSync(binDir, { recursive: true });
fs.copyFileSync(envSrc, envDest);

const ext = process.platform === "win32" ? ".exe" : "";
const sidecarFinal = path.join(binDir, `tgm-backend-${triple}${ext}`);

function pkgTarget() {
  if (process.platform === "win32") return "node18-win-x64";
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "node18-macos-arm64" : "node18-macos-x64";
  }
  return "node18-linux-x64";
}

execSync(
  "npx --yes esbuild src/index.js --bundle --platform=node --target=node18 --outfile=dist/api.cjs --format=cjs",
  { cwd: backendRoot, stdio: "inherit" }
);

const pkgOut = path.join(binDir, `tgm-backend${ext}`);
if (fs.existsSync(pkgOut)) fs.rmSync(pkgOut);

execSync(
  `npx --yes pkg@5.8.1 dist/api.cjs --targets ${pkgTarget()} --output ${JSON.stringify(path.join(binDir, "tgm-backend"))}`,
  {
    cwd: backendRoot,
    stdio: "inherit",
    shell: true,
  }
);

const pkgExe = path.join(binDir, `tgm-backend${ext}`);
if (!fs.existsSync(pkgExe)) {
  console.error("prepare-tauri-bundle: pkg did not produce", pkgExe);
  process.exit(1);
}
fs.renameSync(pkgExe, sidecarFinal);
console.log("prepare-tauri-bundle: sidecar ->", sidecarFinal);
