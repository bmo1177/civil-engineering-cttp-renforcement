#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use std::sync::Mutex;

/// CTTP Renforcement — Tauri Desktop Application
/// Launches Next.js frontend in a native webview.
/// Also spawns the Python inference server (Keras + YOLO) as a sidecar process.
///
/// All HTTP communication with the inference server is done from Rust (via reqwest
/// bundled in tauri-plugin-http) to bypass WebKitGTK's cross-origin restrictions
/// when the app is served from the tauri:// custom protocol.

struct SidecarChild(Mutex<Option<tauri_plugin_shell::process::CommandChild>>);

impl Drop for SidecarChild {
    fn drop(&mut self) {
        if let Some(child) = self.0.lock().unwrap().take() {
            let _ = child.kill();
            println!("Inference server stopped");
        }
    }
}

const INFERENCE_URL: &str = "http://127.0.0.1:5980";

/// Poll /health from Rust until models are loaded, then emit an event to the frontend.
async fn wait_for_inference_server(app: AppHandle) {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .expect("failed to build reqwest client");

    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(120);
    let mut attempt: u32 = 0;

    loop {
        if std::time::Instant::now() >= deadline {
            eprintln!("[inference-server] Timed out waiting for server to start");
            let _ = app.emit("inference_server_ready", serde_json::json!({ "ready": false }));
            return;
        }

        attempt += 1;

        // Emit progress so the frontend can show a status message
        let msg = if attempt <= 3 {
            "Starting AI engine…"
        } else if attempt <= 12 {
            "Loading YOLO model…"
        } else {
            "Loading Keras model… (may take ~40 s on CPU)"
        };
        let _ = app.emit("inference_server_status", serde_json::json!({ "message": msg }));

        match client.get(format!("{}/health", INFERENCE_URL)).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(body) = resp.json::<serde_json::Value>().await {
                    let keras_ok = body["keras_loaded"].as_bool().unwrap_or(false);
                    let yolo_ok  = body["yolo_loaded"].as_bool().unwrap_or(false);
                    if keras_ok || yolo_ok {
                        println!("[inference-server] Ready — keras={keras_ok} yolo={yolo_ok}");
                        let _ = app.emit(
                            "inference_server_ready",
                            serde_json::json!({ "ready": true, "keras": keras_ok, "yolo": yolo_ok }),
                        );
                        return;
                    }
                }
            }
            _ => {} // server not up yet
        }

        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    }
}

/// Proxy a multipart image upload to the inference server from Rust.
/// This avoids WebKit cross-origin restrictions entirely.
#[tauri::command]
async fn proxy_predict(image_bytes: Vec<u8>, filename: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let part = reqwest::multipart::Part::bytes(image_bytes)
        .file_name(filename)
        .mime_str("application/octet-stream")
        .map_err(|e| e.to_string())?;

    let form = reqwest::multipart::Form::new().part("file", part);

    let resp = client
        .post(format!("{}/predict", INFERENCE_URL))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Server error {status}: {body}"));
    }

    resp.text().await.map_err(|e| e.to_string())
}

/// Health-check the inference server from Rust.
/// Returns { ready, keras, yolo } — the frontend polls this in a loop
/// instead of fetching 127.0.0.1 from the WebView (which WebKitGTK blocks).
#[tauri::command]
async fn check_server_health() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(format!("{}/health", INFERENCE_URL))
        .send()
        .await
        .map_err(|e| format!("not ready: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("not ready: HTTP {}", resp.status()));
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let keras = body["keras_loaded"].as_bool().unwrap_or(false);
    let yolo  = body["yolo_loaded"].as_bool().unwrap_or(false);

    Ok(serde_json::json!({
        "ready": keras || yolo,
        "keras": keras,
        "yolo":  yolo,
    }))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![proxy_predict, check_server_health])
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                if let Ok(sidecar_command) = app.shell().sidecar("inference-server") {
                    let sidecar_command = if let Ok(res_dir) = app.path().resource_dir() {
                        sidecar_command.env(
                            "TAURI_RESOURCE_DIR",
                            res_dir.to_string_lossy().to_string(),
                        )
                    } else {
                        sidecar_command
                    };

                    match sidecar_command.spawn() {
                        Ok((mut rx, child)) => {
                            app.manage(SidecarChild(Mutex::new(Some(child))));

                            // Log sidecar output
                            let app_handle = app.handle().clone();
                            tauri::async_runtime::spawn(async move {
                                while let Some(event) = rx.recv().await {
                                    match event {
                                        tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                                            println!(
                                                "[inference-server] {}",
                                                String::from_utf8_lossy(&line)
                                            );
                                        }
                                        tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                                            eprintln!(
                                                "[inference-server] {}",
                                                String::from_utf8_lossy(&line)
                                            );
                                        }
                                        _ => {}
                                    }
                                }
                                // Sidecar exited — notify frontend
                                let _ = app_handle.emit(
                                    "inference_server_ready",
                                    serde_json::json!({ "ready": false, "exited": true }),
                                );
                            });

                            // Poll from Rust until healthy, then emit ready event
                            let app_for_poll = app.handle().clone();
                            tauri::async_runtime::spawn(async move {
                                wait_for_inference_server(app_for_poll).await;
                            });
                        }
                        Err(e) => {
                            eprintln!("Warning: Failed to spawn inference-server sidecar: {e}");
                        }
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
