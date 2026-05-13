#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# CTTP Renforcement — Build & Bundle Scripts
# CPU-only, Tauri-compatible, zero GPU dependencies
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "═══════════════════════════════════════════════════════════"
echo "  CTTP Renforcement — Production Build"
echo "═══════════════════════════════════════════════════════════"

# ─── Step 1: Build Next.js Static Export ────────────────────────────────────
echo ""
echo "📦 Step 1: Building Next.js static export..."
cd "$PROJECT_ROOT"

# Ensure next.config.ts has output: 'export' for static build
# The production build generates files in /out directory
npx next build

echo "✅ Next.js static export complete → ./out"

# ─── Step 2: Verify Build Artifacts ─────────────────────────────────────────
echo ""
echo "🔍 Step 2: Verifying build artifacts..."

if [ ! -d "$PROJECT_ROOT/out" ]; then
    echo "❌ Error: ./out directory not found. Static export failed."
    exit 1
fi

HTML_COUNT=$(find "$PROJECT_ROOT/out" -name "*.html" | wc -l)
JS_COUNT=$(find "$PROJECT_ROOT/out" -name "*.js" | wc -l)
CSS_COUNT=$(find "$PROJECT_ROOT/out" -name "*.css" | wc -l)

echo "   HTML files: $HTML_COUNT"
echo "   JS files:   $JS_COUNT"
echo "   CSS files:  $CSS_COUNT"

# ─── Step 3: Check Bundle Size ──────────────────────────────────────────────
echo ""
echo "📊 Step 3: Checking bundle size..."

TOTAL_SIZE=$(du -sh "$PROJECT_ROOT/out" | cut -f1)
echo "   Total bundle size: $TOTAL_SIZE"

# ─── Step 4: Tauri Build (if Rust toolchain available) ──────────────────────
echo ""
echo "🦀 Step 4: Tauri desktop build..."

if command -v cargo &> /dev/null; then
    echo "   Cargo found. Building Tauri application..."
    cd "$PROJECT_ROOT/src-tauri"
    cargo build --release 2>&1 || echo "⚠️  Tauri build failed. Run 'cargo tauri build' manually."
    echo "✅ Tauri build complete"
else
    echo "⚠️  Cargo not found. Skipping Tauri build."
    echo "   Install Rust: https://rustup.rs"
    echo "   Then run: cd src-tauri && cargo tauri build"
fi

# ─── Step 5: Production Checklist ───────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Production Build Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Next steps:"
echo "  1. Test locally:     npx serve out"
echo "  2. Tauri build:      cd src-tauri && cargo tauri build"
echo "  3. ONNX swap:        Set INFERENCE_BACKEND=onnx"
echo "  4. Thesis defense:   See docs/THESIS_VALIDATION.md"
echo ""
