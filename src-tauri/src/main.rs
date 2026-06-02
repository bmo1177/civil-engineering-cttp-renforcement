#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;

/// CTTP Renforcement — Tauri Desktop Application
/// Launches Next.js frontend in a native webview.
/// Also spawns the Python inference server (Keras + YOLO) as a sidecar process.

struct SidecarChild(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

impl Drop for SidecarChild {
    fn drop(&mut self) {
        if let Some(mut child) = self.0.lock().unwrap().take() {
            let _ = child.kill();
            println!("Inference server stopped");
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // ─── Launch Python inference server as sidecar ───────────────────
            //
            // The inference server loads both Keras and YOLO models for
            // road condition classification. The server must be bundled
            // with the application or available on the system PATH.
            //
            // Bundling approaches:
            // 1. PyInstaller — package the server as a standalone binary
            //    (see scripts/build-inference-server.sh)
            // 2. Python runtime — require Python 3.10+ installed on the system
            //
            // For development, run manually:
            //   bash scripts/start-inference-server.sh

            #[cfg(not(debug_assertions))]
            {
                // In production, try to launch the bundled inference engine
                // as a sidecar process. The binary must be listed in
                // tauri.conf.json → bundle → externalBin.
                if let Ok(sidecar_command) = app.shell().sidecar("inference-server") {
                    let sidecar_command = if let Ok(res_dir) = app.path().resource_dir() {
                        sidecar_command.env("TAURI_RESOURCE_DIR", res_dir.to_string_lossy().to_string())
                    } else {
                        sidecar_command
                    };
                    if let Ok((mut rx, child)) = sidecar_command.spawn() {
                        app.manage(SidecarChild(Mutex::new(Some(child))));
                        tauri::async_runtime::spawn(async move {
                            while let Some(event) = rx.recv().await {
                                match event {
                                    tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                                        println!("[inference-server] {}", String::from_utf8_lossy(&line));
                                    }
                                    tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                                        eprintln!("[inference-server] {}", String::from_utf8_lossy(&line));
                                    }
                                    _ => {}
                                }
                            }
                        });
                    } else {
                        eprintln!("Warning: Failed to spawn inference-server sidecar");
                    }
                } else {
                    eprintln!("Warning: inference-server sidecar not found");
                }
            }

            println!("CTTP Renforcement application started");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
