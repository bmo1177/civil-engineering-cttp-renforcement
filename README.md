# CTTP Renforcement

**Pavement distress detection & reinforcement design tool** — an end-to-end engineering application for road condition assessment and CTTP-compliant reinforcement design.

Built for the **RN120 PK70-80** rehabilitation project in Tiaret, Algeria. Developed in collaboration with the **Direction des Études Techniques (DET)** and following the **CTTP Guide des Renforcements des Chaussées Souples (Déc. 1992)**.

---

## Overview

CTTP Renforcement solves two critical problems in pavement engineering:

1. **Condition Assessment** — Upload road surface images for automatic distress detection and classification using multiple AI models (Keras EfficientNetB0, YOLOv8-cls, or Gemini 2.0 Flash VLM).
2. **Reinforcement Design** — Computes CTTP-compliant reinforcement structures from traffic data, deflection measurements, and visual condition, with full traceability to the regulatory guide.

The application ships as both a **web app** (Next.js) and a **desktop application** (Tauri v2), with optional **local AI models** for air-gapped/field deployments.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    User Interface (Web / Tauri)               │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │
│  │ Design Tab   │  │ Analysis Tab│  │ Results Panel        │  │
│  │ • Traffic    │  │ • Image     │  │ • Detection overlay  │  │
│  │ • Deflection │  │   upload    │  │ • Metrics gauges     │  │
│  │ • Visual     │  │ • AI models │  │ • Reinforcement plan │  │
│  │   status     │  │ • Detection │  │ • PDF export         │  │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼────────────────────┼──────────────┘
          │                 │                    │
┌─────────▼─────────────────▼────────────────────▼──────────────┐
│                      API Layer (Next.js)                       │
│  /api/predict    /api/predict-local    /api/design  /api/export│
└─────────┬─────────────────┬───────────────────────────────────┘
          │                 │
┌─────────▼─────────┐ ┌────▼──────────────────────┐
│  Cloud / External  │ │  Local Python Server      │
│  ┌──────────────┐  │ │  ┌─────────────────┐     │
│  │ Gemini 2.0   │  │ │  │ Keras (TF)      │     │
│  │ Flash VLM    │  │ │  │ EfficientNetB0  │     │
│  │ (optional)   │  │ │  │ 224×224, 4-class│     │
│  └──────────────┘  │ │  ├─────────────────┤     │
│                    │ │  │ YOLOv8-cls (PT) │     │
│                    │ │  │ 224×224, 4-class│     │
│                    │ │  └─────────────────┘     │
│                    │ │  Port 5980               │
│                    │ └──────────────────────────┘
└────────────────────┘
```

### AI Models

| Model | Type | Input | Classes | Framework | Accuracy |
|-------|------|-------|---------|-----------|----------|
| Keras EfficientNetB0 | Image classification | 224×224 RGB | good, satisfactory, poor, very_poor | TensorFlow | ~96% |
| YOLOv8-cls | Image classification | 224×224 RGB | good, satisfactory, poor, very_poor | PyTorch/Ultralytics | ~98% |
| Gemini 2.0 Flash (opt.) | Visual language model | Any resolution | Distress detection + bounding boxes | Google API | — |

---

## Features

### For Civil Engineers

- **AI-Powered Condition Assessment** — Upload pavement photos and get automatic distress detection with bounding boxes (Gemini) or road condition classification (Keras/YOLO)
- **CTTP-Compliant Design Engine** — Computes reinforcement structures per the Guide des Renforcements (Déc. 1992), including:
  - Traffic class determination (T0–T5)
  - Deflection correction (seasonal, regional, temperature)
  - Reinforcement type selection (BS, BC, GB, BB, ES)
  - Structure definition with layer thicknesses
- **Full Traceability** — Every design decision links to its regulatory source (e.g., "CTTP Table 4 p.28"), enabling audit-ready project documentation
- **Professional PDF Reports** — Export complete reinforcement designs with:
  - Project metadata & input parameters
  - Deflection calculation trace
  - Distress detection overlay map
  - Final reinforcement structure
  - Bilingual output (French / English)
- **Offline-Capable** — Service worker enables field operation without internet connectivity

### For Startup Incubators

- **Production-Ready Stack** — Next.js 16 + React 19 + TypeScript + Tauri v2 = modern, maintainable codebase
- **Modular Inference Architecture** — Swap AI providers (Gemini / Keras / YOLO / ONNX) via environment variables — zero code changes
- **Deploy Anywhere** — Web (Vercel), desktop (Windows NSIS / Linux deb), or air-gapped with local models
- **PWA Ready** — Service worker, manifest, offline fallback
- **API-First Design** — All functionality accessible via REST API for integration with other systems

---

## How to Use

### 1. Quick Start (Web)

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
# Edit .env and set GEMINI_API_KEY (optional — demo mode works without it)

# Start development server
npm run dev

# Open http://localhost:3000
```

### 2. Using the Application

#### Step 1: Enter Design Parameters
Navigate to the **Design** tab and input:
- **Traffic Class** — Select T0–T5 based on cumulative heavy truck traffic
- **Surface Type** — BB (Béton Bitumineux), ES (Enduit Superficiel), or GNT (Grave Non Traitée)
- **Visual Status** — Bon, Moyen, or Mauvais (or set automatically via AI analysis)
- **UNI** — Uniformity Index (0–5000)
- **Deflection Parameters** — Measured deflection (d_c), season, region, temperature, bitumen thickness

The corrected deflection and zone are computed in real time.

#### Step 2: AI Analysis (Optional)
Switch to the **Analysis** tab:
1. Upload a pavement photo (drag & drop or click to browse)
2. Click **"Analyze with AI"** for Gemini-powered distress detection with bounding boxes
3. Click **"Classify with Local Models (Keras + YOLO)"** for local road condition classification
4. The visual status is automatically updated based on AI results

#### Step 3: Compute Design
Click **"Compute Reinforcement"** to generate the CTTP-compliant design. Results include:
- Reinforcement type and material
- Layer structure with thicknesses
- Compaction and drainage requirements
- Full traceability to CTTP guide sections

#### Step 4: Export Report
Click the **export button** in the header to generate a professional PDF report.

### 3. Using Local AI Models (Air-Gapped Deployment)

The project bundles two trained models for offline classification:

```bash
# Start the Python inference server
bash scripts/start-inference-server.sh

# In .env, set:
INFERENCE_BACKEND=python
INFERENCE_SERVER_URL=http://localhost:5980

# Restart the dev server
npm run dev
```

The inference server loads both Keras and YOLO models, runs classification, and returns a combined ensemble prediction.

### 4. Desktop Application (Tauri)

```bash
# Build the desktop app
bash scripts/build.sh

# Or manually:
cd src-tauri && cargo tauri build
```

Output: `.deb` (Linux) or `.exe` (Windows NSIS installer).

---

## Testing the Application

### End-to-End Test Walkthrough

1. **Start the application:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

2. **Test the design calculator:**
   - Traffic class: `T3`
   - Surface type: `BB`
   - UNI: `3200`
   - Visual status: `Moyen`
   - Deflection: `70` 1/100mm, Season: `Dry`, Region: `North`, Temp: `20°C`
   - Click **"Compute Reinforcement"**
   - ✅ Expected: Reinforcement plan displays with structure, materials, and CTTP traceability

3. **Test AI distress detection (Gemini):**
   - Switch to **Analysis** tab, upload a road photo
   - Click **"Analyze with AI"**
   - ✅ Expected: Detection bounding boxes appear on the image with severity and confidence

4. **Test local model classification:**
   ```bash
   # In a separate terminal:
   bash scripts/start-inference-server.sh
   ```
   - Upload a pavement photo, click **"Classify with Local Models (Keras + YOLO)"**
   - ✅ Expected: Keras and YOLO results display with class labels, confidence scores, and probability distributions

5. **Test PDF export:**
   - After computing a design, click the export button
   - ✅ Expected: PDF downloads with full design traceability

6. **Test offline mode:**
   - Disconnect from the network
   - The page should display an offline badge
   - Previously computed results load from cache

### Running Local Model Tests

```bash
# Test the Python inference server directly
curl http://localhost:5980/health

# Test with a sample image
python3 -c "
import requests
resp = requests.post('http://localhost:5980/predict',
    files={'file': open('test_image.jpg', 'rb')})
print(resp.json())
"
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | No* | — | Google Gemini API key for VLM distress detection |
| `NEXT_PUBLIC_GEMINI_CONFIGURED` | No | `false` | Set to `true` when Gemini key is configured in env |
| `INFERENCE_BACKEND` | No | `gemini` | AI backend: `gemini`, `onnx`, or `python` |
| `INFERENCE_SERVER_URL` | No | `http://localhost:5980` | URL of the Python inference server |
| `ONNX_MODEL_PATH` | No | — | Path to ONNX model for `onnx` backend |
| `NEXT_OUTPUT` | No | `standalone` | Override Next.js output mode |

*Without a Gemini key, the app runs in demo mode with simulated detections.

---

## Project Structure

```
.
├── models/                          # Trained AI models
│   ├── inference_server.py          # Unified Keras + YOLO API server
│   ├── road_condition_model_finetuned.keras
│   ├── Yolo-Road-Condition-main/
│   │   └── yolo_road_model.pt
│   └── requirements.txt
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── predict/route.ts     # Gemini/ONNX inference endpoint
│   │   │   ├── predict-local/route.ts # Local model proxy endpoint
│   │   │   ├── design/route.ts      # CTTP design computation
│   │   │   └── export/route.ts      # PDF report generation
│   │   └── page.tsx                 # Main application page
│   ├── components/cttp/             # Application UI components
│   │   ├── CalculatorApp.tsx        # Main SPA container
│   │   ├── DetectionCanvas.tsx      # SVG detection overlay
│   │   ├── ImageUploader.tsx        # File upload zone
│   │   ├── MetricsPanel.tsx         # Engineering metrics display
│   │   └── ReinforcementPanel.tsx   # Design results panel
│   ├── lib/
│   │   ├── engine.ts                # CTTP rule engine
│   │   ├── cttp-rules.ts            # Design matrices (SOT)
│   │   ├── inference-provider.ts    # Provider abstraction layer
│   │   ├── python-inference.ts      # Python backend client
│   │   ├── client-predict.ts        # Browser-side Gemini client
│   │   ├── pdf-generator.ts         # PDF report builder
│   │   └── translations.tsx         # i18n (FR/EN)
│   └── hooks/
├── src-tauri/                       # Tauri desktop shell
│   └── src/main.rs                  # Entry point with sidecar support
├── scripts/
│   ├── build.sh                     # Production build
│   ├── start-inference-server.sh    # Python server launcher
│   └── build-inference-server.sh    # PyInstaller bundler
└── docs/
    └── THESIS_VALIDATION.md         # Thesis defense checklist
```

---

## API Reference

| Route | Method | Input | Output |
|-------|--------|-------|--------|
| `/api/predict` | POST | multipart `image` | `{ detections, image_status, model_used }` |
| `/api/predict-local` | POST | multipart `image` | `{ keras_result, yolo_result, combined_status, image_status }` |
| `/api/design` | POST | JSON `DesignInput` | `{ reinforcement_type, structure, traceability }` |
| `/api/export` | POST | JSON `ExportInput` | PDF binary |
| `/api` | GET | — | Health check |

---

## License

CTTP Renforcement — Direction des Études Techniques, Tiaret, Algeria.

Built for the RN120 PK70-80 pavement rehabilitation project. This application implements the **CTTP Guide des Renforcements des Chaussées Souples** (December 1992), the official Algerian technical standard for flexible pavement reinforcement design.

---

## Acknowledgments

- **Direction des Études Techniques (DET)** — Tiaret, Algeria
- **CTTP** — Contrôle Technique des Travaux Publics, Algiers
- **CTTP Guide des Renforcements des Chaussées Souples** (Déc. 1992)
