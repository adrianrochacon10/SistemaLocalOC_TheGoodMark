/**
 * Ensure Tauri sidecar exists for local dev (tauri dev). Builds only if missing or backend sources are newer.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const backendRoot = path.join(root, "backend");
const backendSrc = path.join(backendRoot, "src");
const binDir = path.join(root, "src-tauri", "binaries");
const triple = execSync("rustc --print host-tuple", {
  cwd: path.join(root, "src-tauri"),
  encoding: "utf8",
}).trim();
const ext = process.platform === "win32" ? ".exe" : "";
const sidecarFinal = path.join(binDir, `tgm-backend-${triple}${ext}`);

function pkgTarget() {
  if (process.platform === "win32") return "node18-win-x64";
  if (process.platform === "darwin") {
    return process.arch === "arm64" ? "node18-macos-arm64" : "node18-macos-x64";
  }
  return "node18-linux-x64";
}

function newestMtime(dir) {
  let max = 0;
  const walk = (d) => {
    for (const name of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, name.name);
      if (name.isDirectory()) walk(p);
      else max = Math.max(max, fs.statSync(p).mtimeMs);
    }
  };
  walk(dir);
  return max;
}

const needsBuild =
  !fs.existsSync(sidecarFinal) ||
  newestMtime(backendSrc) > fs.statSync(sidecarFinal).mtimeMs;

if (needsBuild) {
  fs.mkdirSync(binDir, { recursive: true });
  execSync(
    "npx --yes esbuild src/index.js --bundle --platform=node --target=node18 --outfile=dist/api.cjs --format=cjs",
    { cwd: backendRoot, stdio: "inherit" }
  );
  const pkgOut = path.join(binDir, `tgm-backend${ext}`);
  if (fs.existsSync(pkgOut)) fs.rmSync(pkgOut);
  execSync(
    `npx --yes pkg@5.8.1 dist/api.cjs --targets ${pkgTarget()} --output ${JSON.stringify(path.join(binDir, "tgm-backend"))}`,
    { cwd: backendRoot, stdio: "inherit", shell: true }
  );
  if (!fs.existsSync(pkgOut)) {
    console.error("ensure-backend-sidecar: pkg output missing:", pkgOut);
    process.exit(1);
  }
  fs.renameSync(pkgOut, sidecarFinal);
  console.log("ensure-backend-sidecar: built", sidecarFinal);
}

const envSrc = path.join(backendRoot, ".env");
const envDestDir = path.join(root, "src-tauri", "resources");
const envDest = path.join(envDestDir, "server.env");
if (fs.existsSync(envSrc)) {
  fs.mkdirSync(envDestDir, { recursive: true });
  fs.copyFileSync(envSrc, envDest);
}
