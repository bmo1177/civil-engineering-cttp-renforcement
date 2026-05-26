# ─── CTTP Inference Server Launcher (Windows) ─────────────────────────────────
# Starts the unified Python inference server (Keras + YOLO models).
# The server listens on port 5980 by default (override via $env:INFERENCE_PORT).
#
# Usage:
#   powershell -File scripts/start-inference-server.ps1
# ──────────────────────────────────────────────────────────────────────────────

$ProjectDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ModelsDir = Join-Path $ProjectDir "models"
$Port = if ($env:INFERENCE_PORT) { $env:INFERENCE_PORT } else { "5980" }

Write-Host "Starting inference server on port $Port..." -ForegroundColor Green
Set-Location $ModelsDir
python inference_server.py
