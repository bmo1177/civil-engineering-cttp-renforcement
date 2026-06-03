#!/usr/bin/env bash
# =============================================================================
# Compilation script for the CTTP Renforcement thesis chapter.
# Uses the system TeX Live 2026 (pdflatex only — thebibliography environment
# is used directly, no external bibliography backend required).
# =============================================================================
set -euo pipefail

# Use the local TeX Live installation
export PATH="/home/dev-lab/texlive/2026/bin/x86_64-linux:${PATH}"

# Enter the thesis directory (script lives in thesis/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

JOB="main"
echo "[compile] Working directory: ${SCRIPT_DIR}"
echo "[compile] pdflatex pass 1/2..."
pdflatex -interaction=nonstopmode -halt-on-error "${JOB}.tex" >/dev/null
echo "[compile] pdflatex pass 2/2 (resolves cross-references)..."
pdflatex -interaction=nonstopmode -halt-on-error "${JOB}.tex" >/dev/null

# Cleanup intermediate files
echo "[compile] Cleaning up intermediate files..."
rm -f "${JOB}.aux" "${JOB}.log" "${JOB}.out" \
      "${JOB}.toc" "${JOB}.lof" "${JOB}.lot"

echo "[compile] Done. PDF: ${SCRIPT_DIR}/${JOB}.pdf"
ls -lh "${JOB}.pdf"
