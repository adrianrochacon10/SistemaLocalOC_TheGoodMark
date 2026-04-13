/**
 * Cargo rustc-wrapper helper: reemplaza --check-cfg enormes (crate `windows`) por uno corto.
 * Evita STATUS_STACK_BUFFER_OVERRUN / stack overflow al parsear la lista de features en MSVC.
 *
 * Invocación (Cargo): rustc-wrapper.cmd <ruta-rustc> <args...>
 * Los args pueden incluir @archivo.rsp (una bandera por línea).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const THRESHOLD = 6000;
const REPLACEMENT = "cfg(feature, values())";

function readRspLines(atPath) {
  const p = atPath.startsWith("@") ? atPath.slice(1) : atPath;
  const text = fs.readFileSync(p, "utf8");
  return text.split(/\r?\n/).filter((line) => line.length > 0);
}

function flattenArgs(argvTail) {
  const out = [];
  for (const t of argvTail) {
    if (t.startsWith("@")) {
      out.push(...readRspLines(t));
    } else {
      out.push(t);
    }
  }
  return out;
}

function shrinkCheckCfg(args) {
  const out = [];
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === "--check-cfg" && args[i + 1] != null) {
      const val = args[i + 1];
      if (val.length > THRESHOLD && val.includes("cfg(feature")) {
        out.push("--check-cfg", REPLACEMENT);
        i += 2;
        continue;
      }
    }
    if (a.startsWith("--check-cfg=")) {
      const val = a.slice("--check-cfg=".length);
      if (val.length > THRESHOLD && val.includes("cfg(feature")) {
        out.push(`--check-cfg=${REPLACEMENT}`);
        i++;
        continue;
      }
    }
    out.push(a);
    i++;
  }
  return out;
}

function writeRsp(args) {
  const f = path.join(
    os.tmpdir(),
    `tgm-rustc-wrap-${process.pid}-${Date.now()}.rsp`,
  );
  const body = args.map((a) => {
    if (a.includes("\n") || a.includes("\r")) {
      throw new Error("rustc-shrink-checkcfg: argumento con salto de línea");
    }
    return a;
  });
  fs.writeFileSync(f, `${body.join("\n")}\n`, "utf8");
  return f;
}

const rustc = process.argv[2];
if (!rustc) {
  console.error("rustc-shrink-checkcfg: falta ruta a rustc");
  process.exit(1);
}

const rawTail = process.argv.slice(3);
const expanded = flattenArgs(rawTail);
const shrunk = shrinkCheckCfg(expanded);

let rspPath = null;
try {
  const useRsp =
    rawTail.some((t) => t.startsWith("@")) ||
    shrunk.reduce((n, a) => n + a.length + 1, 0) > 28000;

  if (useRsp) {
    rspPath = writeRsp(shrunk);
    const r = spawnSync(rustc, [`@${rspPath}`], {
      stdio: "inherit",
      windowsHide: true,
    });
    process.exit(r.status === null ? 1 : r.status);
  }

  const r = spawnSync(rustc, shrunk, {
    stdio: "inherit",
    windowsHide: true,
  });
  process.exit(r.status === null ? 1 : r.status);
} finally {
  if (rspPath) {
    try {
      fs.unlinkSync(rspPath);
    } catch {
      /* ignore */
    }
  }
}
