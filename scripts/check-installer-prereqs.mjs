/**
 * Antes de `tauri build` / instalador: valida que existan las variables mínimas
 * para que el frontend (Vite) y el API (sidecar) hablen con Supabase.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function parseEnv(content) {
  const out = {};
  for (const line of content.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return parseEnv(fs.readFileSync(filePath, "utf8"));
}

const rootEnv = loadEnv(path.join(root, ".env"));
const backendEnv = loadEnv(path.join(root, "backend", ".env"));

const errors = [];

if (!backendEnv) {
  errors.push('Falta backend/.env (obligatorio). Copia backend/.env.example y rellena SUPABASE_* .');
} else {
  if (!backendEnv.SUPABASE_URL?.trim()) {
    errors.push("backend/.env: SUPABASE_URL vacío o ausente.");
  }
  if (!backendEnv.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    errors.push("backend/.env: SUPABASE_SERVICE_ROLE_KEY vacío o ausente (el API lo necesita).");
  }
}

if (!rootEnv) {
  errors.push(
    'Falta .env en la RAÍZ del repo. Vite incrusta VITE_* solo al compilar; sin .env el instalador no tendrá URL/clave anon en el cliente.'
  );
} else {
  if (!rootEnv.VITE_SUPABASE_URL?.trim()) {
    errors.push("Raíz .env: VITE_SUPABASE_URL vacío o ausente.");
  }
  if (!rootEnv.VITE_SUPABASE_ANON_KEY?.trim()) {
    errors.push("Raíz .env: VITE_SUPABASE_ANON_KEY vacío o ausente.");
  }
}

if (errors.length) {
  console.error("\ncheck-installer-prereqs: no se puede generar un instalador con BD configurada:\n");
  for (const e of errors) console.error("  · " + e);
  console.error(
    "\nPlantillas: .env.example (raíz) y backend/.env.example\n" +
      "Luego: npm run build:installer\n"
  );
  process.exit(1);
}

console.log("check-installer-prereqs: OK (.env raíz + backend/.env con Supabase)\n");
process.exit(0);
