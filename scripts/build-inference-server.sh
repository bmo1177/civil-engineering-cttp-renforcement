#!/usr/bin/env bash
# ─── Build Inference Server Binary ───────────────────────────────────────────
# Uses PyInstaller to package the Python inference server into a standalone
# binary for distribution with the Tauri application.
#
# Prerequisites:
#   pip install pyinstaller
#
# Output:
#   src-tauri/binaries/inference-server  (Linux/macOS)
#   src-tauri/binaries/inference-server.exe  (Windows)
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MODELS_DIR="$PROJECT_DIR/models"
OUTPUT_DIR="$PROJECT_DIR/src-tauri/binaries"

echo "Building inference server binary..."
mkdir -p "$OUTPUT_DIR"

cd "$MODELS_DIR"

pyinstaller \
    --onefile \
    --name inference-server \
    --add-data "road_condition_model_finetuned.keras:." \
    --add-data "Yolo-Road-Condition-main/yolo_road_model.pt:Yolo-Road-Condition-main" \
    --add-data "class_names.txt:." \
    --hidden-import tensorflow \
    --hidden-import ultralytics \
    --hidden-import PIL \
    --hidden-import numpy \
    inference_server.py

# Move binary to Tauri binaries directory
PLATFORM=""
case "$(uname -s)" in
    Linux*)   PLATFORM="x86_64-unknown-linux-gnu" ;;
    Darwin*)  PLATFORM="x86_64-apple-darwin" ;;
    CYGWIN*|MINGW*|MSYS*) PLATFORM="x86_64-pc-windows-msvc" ;;
esac

if [ -n "$PLATFORM" ]; then
    mkdir -p "$OUTPUT_DIR/$PLATFORM"
    if [ -f "dist/inference-server.exe" ]; then
        mv dist/inference-server.exe "$OUTPUT_DIR/$PLATFORM/"
    else
        mv dist/inference-server "$OUTPUT_DIR/$PLATFORM/"
    fi
    echo "Binary placed in $OUTPUT_DIR/$PLATFORM/"
fi

# Clean up build artifacts
rm -rf build dist inference-server.spec

echo "Done! Inference server binary built successfully."
