#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "═══════════════════════════════════════════════════════════"
echo "  CTTP Renforcement — Tauri Static Export Build"
echo "═══════════════════════════════════════════════════════════"

# Backup API routes outside src/app/ (incompatible with output: 'export')
API_BAK="/tmp/cttp-api-bak-$$"
if [ -d "src/app/api" ]; then
    echo "→ Backing up API routes to $API_BAK..."
    rm -rf "$API_BAK"
    cp -r "src/app/api" "$API_BAK"
    rm -rf "src/app/api"
fi

# Build Next.js static export
echo "→ Building Next.js static export..."
TAURI=true npx next build 2>&1

# Restore API routes
if [ -d "$API_BAK" ]; then
    echo "→ Restoring API routes..."
    cp -r "$API_BAK" "src/app/api"
    rm -rf "$API_BAK"
fi

echo "✅ Tauri static export complete — out/ ready"
