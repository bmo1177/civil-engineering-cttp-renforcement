#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_shell::ShellExt;

/// CTTP Renforcement — Tauri Desktop Application
/// Launches Next.js frontend in a native webview.
/// For future sidecar integration (e.g., bundled inference engine),
/// use tauri_plugin_shell to spawn and manage child processes.

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // ─── Sidecar Lifecycle Management ─────────────────────────────
            //
            // To launch a bundled inference engine (e.g., ONNX runtime server)
            // as a sidecar process:
            //
            // 1. Add to tauri.conf.json → bundle → externalBin:
            //    ["binaries/rn120-engine"]
            //
            // 2. Uncomment the code below to launch the sidecar on startup:
            //
            // let sidecar_command = app.shell().sidecar("rn120-engine").unwrap();
            // let (mut rx, child) = sidecar_command.spawn().unwrap();
            //
            // // Store child handle for cleanup on app exit
            // app.manage(SidecarChild(Mutex::new(Some(child))));
            //
            // // Monitor sidecar output
            // tauri::async_runtime::spawn(async move {
            //     while let Some(event) = rx.recv().await {
            //         match event {
            //             tauri_plugin_shell::ShellEvent::Stdout(line) => {
            //                 println!("[sidecar stdout] {}", String::from_utf8_lossy(&line));
            //             }
            //             tauri_plugin_shell::ShellEvent::Stderr(line) => {
            //                 eprintln!("[sidecar stderr] {}", String::from_utf8_lossy(&line));
            //             }
            //             _ => {}
            //         }
            //     }
            // });

            println!("CTTP Renforcement application started");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// ─── Sidecar State Management (for future use) ─────────────────────────────
//
// use std::sync::Mutex;
// use tauri_plugin_shell::process::CommandChild;
//
// struct SidecarChild(Mutex<Option<CommandChild>>);
//
// impl Drop for SidecarChild {
//     fn drop(&mut self) {
//         // Kill the sidecar process when the app exits
//         if let Some(mut child) = self.0.lock().unwrap().take() {
//             let _ = child.kill();
//             println!("Sidecar process terminated");
//         }
//     }
// }
