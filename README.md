# CTTP Renforcement

**Pavement distress detection & reinforcement design tool** for civil engineers. Built for the RN120 PK70-80 project following CTTP (Algerian technical control body for public works) standards.

Upload pavement images for AI-powered distress analysis (cracking, potholes, rutting, etc.) via Google Gemini, then compute CTTP-compliant reinforcement designs with full traceability.

## How it works

```mermaid
flowchart LR
  A[Upload pavement photo] --> B[Gemini 2.0 Flash]
  B --> C[Distress detections]
  C --> D[CTTP design engine]
  D --> E[Reinforcement plan]
  E --> F[PDF report]

  style A fill:#1E293B,color:#fff,stroke:#D97706
  style B fill:#1E293B,color:#fff,stroke:#D97706
  style C fill:#1E293B,color:#fff,stroke:#D97706
  style D fill:#1E293B,color:#fff,stroke:#D97706
  style E fill:#1E293B,color:#fff,stroke:#D97706
  style F fill:#1E293B,color:#fff,stroke:#D97706
```

## Features

- **AI distress detection** — Upload pavement photos; Gemini 2.0 Flash identifies cracks, potholes, ravelling, and other distresses with severity ratings
- **Design calculator** — Validate inputs against CTTP rules, compute reinforcement strategies with full calculation traceability
- **PDF reporting** — Export professional CTTP-compliant PDF reports with overlay imagery, design parameters, and distress maps
- **Bilingual** — French (default) and English interface via next-intl
- **Offline-capable** — Service worker + PWA manifest for cache-first offline access
- **Desktop app** — Tauri v2 build target (Windows NSIS / Linux deb)

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, shadcn/ui |
| State | Zustand, TanStack React Query |
| Forms | react-hook-form + zod |
| Inference | Google Gemini 2.0 Flash API |
| PDF | jsPDF |
| i18n | next-intl (Français / English) |
| Desktop | Tauri v2 (Rust) |
| Package | Bun |

## Getting started

```bash
# Install dependencies
bun install

# Run development server
bun dev

# Open http://localhost:3000
```

### Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI distress detection |
| `NEXT_PUBLIC_GEMINI_CONFIGURED` | Yes | Set to `true` when API key is configured |
| `INFERENCE_BACKEND` | No | `gemini` (default) or `onnx` |
| `NEXT_OUTPUT` | No | Override Next.js output mode |

> **No database required.** Prisma was removed — the app uses client-side Gemini inference and a built-in CTTP rules engine. All state is ephemeral (in-memory or browser).

## Deployment

### Vercel (recommended)

```bash
# Install Vercel CLI
bun install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - GEMINI_API_KEY
# - NEXT_PUBLIC_GEMINI_CONFIGURED=true
# - INFERENCE_BACKEND=gemini
```

The project includes `vercel.json` with correct Next.js framework detection.

### Desktop (Tauri)

```bash
bash scripts/build.sh
```

Requires Rust/Cargo for the Tauri desktop build.

## Project structure

```
src/
  app/          — Next.js App Router pages & API routes
  components/   — cttp/ (app components) and ui/ (shadcn primitives)
  lib/          — Inference, CTTP engine, PDF generation, i18n
  hooks/        — Custom React hooks
scripts/        — Build & deployment scripts
```

## API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/predict` | POST | AI distress detection (image → detections) |
| `/api/design` | POST | CTTP reinforcement design computation |
| `/api/export` | POST | PDF report generation |
| `/api` | GET | Health check |
