#!/usr/bin/env bash
# ─── CTTP Inference Server Launcher ──────────────────────────────────────────
# Starts the unified Python inference server (Keras + YOLO models).
# The server listens on port 5980 by default (override via INFERENCE_PORT).
#
# Usage:
#   bash scripts/start-inference-server.sh
#   INFERENCE_PORT=5981 bash scripts/start-inference-server.sh
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MODELS_DIR="$PROJECT_DIR/models"
PORT="${INFERENCE_PORT:-5980}"

# Check required Python packages
python3 -c "
import importlib
for mod in ['flask', 'tensorflow', 'ultralytics', 'PIL', 'numpy']:
    try:
        importlib.import_module(mod)
    except ImportError:
        print(f'Missing: {mod}')
        exit(1)
print('All dependencies OK')
" 2>/dev/null || {
    echo "Installing required Python packages..."
    pip install -q flask tensorflow ultralytics Pillow numpy 2>&1 | tail -3
}

echo "Starting inference server on port $PORT..."
cd "$MODELS_DIR"
python3 inference_server.py
