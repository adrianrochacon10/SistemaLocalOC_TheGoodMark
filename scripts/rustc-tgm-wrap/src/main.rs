//! Invocado por Cargo como: `rustc-tgm-wrap.exe <ruta-rustc> <args...>` o con `@rsp`.
//! Sustituye --check-cfg enormes del crate `windows` (MSVC / stack + línea de comandos).

use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};

const THRESHOLD: usize = 6000;
const REPLACEMENT: &str = "cfg(feature, values())";

fn read_rsp(path: &str) -> Vec<String> {
    let p = path.strip_prefix('@').unwrap_or(path);
    let f = fs::File::open(p).unwrap_or_else(|e| panic!("rustc-tgm-wrap: abrir rsp {p}: {e}"));
    BufReader::new(f)
        .lines()
        .map_while(Result::ok)
        .filter(|l| !l.is_empty())
        .collect()
}

fn flatten_argv(argv: Vec<String>) -> Vec<String> {
    let mut out = Vec::new();
    for a in argv {
        if let Some(rest) = a.strip_prefix('@') {
            out.extend(read_rsp(rest));
        } else {
            out.push(a);
        }
    }
    out
}

fn shrink_check_cfg(args: Vec<String>) -> Vec<String> {
    let mut out = Vec::new();
    let mut i = 0;
    while i < args.len() {
        if args[i] == "--check-cfg" && i + 1 < args.len() {
            let val = &args[i + 1];
            if val.len() > THRESHOLD && val.contains("cfg(feature") {
                out.push("--check-cfg".into());
                out.push(REPLACEMENT.into());
                i += 2;
                continue;
            }
        }
        if let Some(rest) = args[i].strip_prefix("--check-cfg=") {
            if rest.len() > THRESHOLD && rest.contains("cfg(feature") {
                out.push(format!("--check-cfg={REPLACEMENT}"));
                i += 1;
                continue;
            }
        }
        out.push(args[i].clone());
        i += 1;
    }
    out
}

fn argv_char_weight(args: &[String]) -> usize {
    args.iter().map(|s| s.len().saturating_add(1)).sum()
}

fn write_rsp_file(args: &[String]) -> PathBuf {
    let p = env::temp_dir().join(format!("tgm-rustc-wrap-{}.rsp", std::process::id()));
    let mut f = fs::File::create(&p).expect("rustc-tgm-wrap: crear rsp");
    for a in args {
        assert!(
            !a.contains('\n') && !a.contains('\r'),
            "rustc-tgm-wrap: argumento con salto de línea"
        );
        writeln!(f, "{a}").unwrap();
    }
    p
}

fn main() {
    let raw: Vec<String> = env::args().skip(1).collect();
    if raw.is_empty() {
        eprintln!("rustc-tgm-wrap: falta ruta a rustc");
        std::process::exit(1);
    }

    let expanded = flatten_argv(raw);
    let shrunk = shrink_check_cfg(expanded);
    if shrunk.is_empty() {
        eprintln!("rustc-tgm-wrap: sin argumentos");
        std::process::exit(1);
    }

    let rustc = &shrunk[0];
    let tail = &shrunk[1..];

    let use_rsp = argv_char_weight(tail) > 24_000 || tail.iter().any(|s| s.len() > 12_000);

    let status = if use_rsp {
        let rsp = write_rsp_file(tail);
        let at = format!("@{}", rsp.display());
        let st = Command::new(rustc)
            .arg(&at)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status();
        let _ = fs::remove_file(&rsp);
        st
    } else {
        Command::new(rustc)
            .args(tail)
            .stdin(Stdio::inherit())
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()
    };

    match status {
        Ok(s) => std::process::exit(s.code().unwrap_or(1)),
        Err(e) => {
            eprintln!("rustc-tgm-wrap: no se pudo ejecutar rustc: {e}");
            std::process::exit(1);
        }
    }
}
