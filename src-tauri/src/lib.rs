// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::sync::{Arc, Mutex};

use tauri::{Manager, RunEvent};
#[cfg(desktop)]
use tauri_plugin_shell::process::CommandEvent;
#[cfg(desktop)]
use tauri_plugin_shell::ShellExt;

#[cfg(desktop)]
type BackendChild = Arc<Mutex<Option<tauri_plugin_shell::process::CommandChild>>>;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(desktop)]
fn parse_env_file(content: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((k, v)) = line.split_once('=') else {
            continue;
        };
        let mut v = v.trim().to_string();
        if (v.starts_with('"') && v.ends_with('"')) || (v.starts_with('\'') && v.ends_with('\'')) {
            v = v[1..v.len().saturating_sub(1)].to_string();
        }
        out.push((k.trim().to_string(), v));
    }
    out
}

#[cfg(desktop)]
fn server_env_path(handle: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let root = handle.path().resource_dir().ok()?;
    let a = root.join("resources").join("server.env");
    if a.exists() {
        return Some(a);
    }
    let b = root.join("server.env");
    if b.exists() {
        return Some(b);
    }
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(desktop)]
    let backend_child: BackendChild = Arc::new(Mutex::new(None));
    #[cfg(desktop)]
    let backend_for_setup = backend_child.clone();

    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init());

    #[cfg(desktop)]
    {
        builder = builder.manage(backend_child);
    }

    let app = builder
        .setup(move |app| {
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                let mut cmd = match handle.shell().sidecar("tgm-backend") {
                    Ok(c) => c,
                    Err(e) => {
                        eprintln!("tgm-backend: no se pudo preparar el sidecar: {e}");
                        return Ok(());
                    }
                };
                if let Some(env_path) = server_env_path(&handle) {
                    match std::fs::read_to_string(&env_path) {
                        Ok(text) => {
                            for (k, v) in parse_env_file(&text) {
                                cmd = cmd.env(k, v);
                            }
                        }
                        Err(e) => eprintln!("tgm-backend: no se pudo leer {}: {e}", env_path.display()),
                    }
                } else {
                    eprintln!(
                        "tgm-backend: server.env no encontrado junto a recursos; el API puede fallar sin variables"
                    );
                }
                match cmd.spawn() {
                    Ok((rx, child)) => {
                        eprintln!("tgm-backend: iniciado (pid {})", child.pid());
                        if let Ok(mut slot) = backend_for_setup.lock() {
                            *slot = Some(child);
                        }
                        tauri::async_runtime::spawn(async move {
                            let mut rx = rx;
                            while let Some(event) = rx.recv().await {
                                match event {
                                    CommandEvent::Stdout(line) => {
                                        eprint!("[tgm-backend] {}", String::from_utf8_lossy(&line));
                                    }
                                    CommandEvent::Stderr(line) => {
                                        eprint!("[tgm-backend] {}", String::from_utf8_lossy(&line));
                                    }
                                    CommandEvent::Terminated(payload) => {
                                        eprintln!(
                                            "tgm-backend: terminó (code {:?})",
                                            payload.code
                                        );
                                        break;
                                    }
                                    CommandEvent::Error(e) => {
                                        eprintln!("tgm-backend: error de proceso: {e}");
                                        break;
                                    }
                                    _ => {}
                                }
                            }
                        });
                    }
                    Err(e) => eprintln!("tgm-backend: falló el spawn: {e}"),
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    #[cfg(desktop)]
    app.run(move |app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<BackendChild>() {
                if let Ok(mut guard) = state.lock() {
                    if let Some(child) = guard.take() {
                        let _ = child.kill();
                    }
                }
            }
        }
    });

    #[cfg(not(desktop))]
    app.run(|_, _| {});
}
