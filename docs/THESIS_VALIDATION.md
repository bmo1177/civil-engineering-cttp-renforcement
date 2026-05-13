# CTTP Renforcement — Thesis Validation & Defense Checklist

## 1. CTTP Rule Traceability Matrix

Every application output maps to a specific CTTP Guide page. Use this table to defend each computation during jury evaluation.

| Application Feature | CTTP Reference | Implementation | Verification |
|---|---|---|---|
| Traffic class boundaries (T0–T5) | Page 19 | `TRAFFIC_CLASS_BOUNDS` in `cttp-rules.ts` | T0 < 3.5×10⁵, T1 < 7.3×10⁵, T2 < 2.0×10⁶, T3 < 7.3×10⁶, T4 < 4.0×10⁷, T5 > 4.0×10⁷ |
| Tms formula | Page 19 | `calculateTraffic()` | Tms = (1+i)^n × Tpl |
| Tc formula | Page 19 | `calculateTraffic()` | Tc = 365 × Tms × ((1+i)^N - 1) / i |
| Lane distribution factors | Page 19 | `LANE_DISTRIBUTION` | 2-lane: 0.5, 2×2: 1.0, 2×3: 0.8, uni-1: 1.0, uni-2: 0.5, uni-3: 0.8 |
| Visual status mapping | Pages 30–35 | `VISUAL_STATUS_ACCEPTABILITY` | Bon → Acceptable, Moyen → Non_Acceptable, Mauvais → Non_Acceptable |
| UNI thresholds (BB) | Pages 30–35 | `UNI_THRESHOLDS.BB` | Bon < 2000, Moyen 2000–3500, Mauvais > 3500 mm/km |
| UNI thresholds (ES) | Pages 30–35 | `UNI_THRESHOLDS.ES` | Bon < 2500, Moyen 2500–4000, Mauvais > 4000 mm/km |
| Deflection formula | Page 33 | `correctDeflection()` | d = dc × Cs × Cr × Ct |
| Cs (seasonal) | Page 33 | `SEASON_FACTORS` | Wet: 1.0, Intermediate: 1.1–1.2, Dry: 1.2–1.3 |
| Cr (regional) | Page 33 | `REGION_FACTORS` | North: 1.0, Hauts-Plateaux: 0.7–0.9, Sahara: 0.4–0.6 |
| Ct (temperature) | Page 33 | `CT_TEMPERATURE_TABLE` + `interpolateCt()` | 0°C→1.40, 5→1.25, 10→1.15, 15→1.05, 20→1.00, 25→0.95, 30→0.90 |
| Ct thin bitumen override | Page 33 | `CT_THIN_BITUMEN = 1.0` | If bitumen layer < 10cm → Ct = 1.0 |
| Deflection zones | Page 33 | `DEFLECTION_ZONE_BOUNDS` | Low ≤ 50, Medium 51–120, High > 120 (1/100 mm) |
| Reinforcement matrix | Page 45 | `REINFORCEMENT_MATRIX` (18 rows) | Full TrafficGroup × Acceptability × DeflectionZone → ReinforcementType |
| High traffic materials (T3–T5) | Pages 48–55 | `HIGH_TRAFFIC_CATALOG` | Default: GB (Grave Bitume), binder 40/50, compaction 92–96% LCPC |
| Low traffic materials (T0–T2) | Pages 48–55 | `LOW_TRAFFIC_CATALOG` | Default: GNT (Grave Non Traitée), compaction 95–100% OPM |
| Drainage requirement | Fascicule 2, Ch.3 | `DRAINAGE_NOTE` | "Prévoir assainissement conforme au Chapitre 3 du Fascicule 2" |

## 2. Defense Talking Points

### 2.1 Why CTTP Guide (Dec 1992)?
- The CTTP Guide is the official Algerian national standard for pavement reinforcement design
- Published by the Direction des Études Techniques, it provides the only legally binding methodology for road rehabilitation projects in Algeria
- All thresholds, matrices, and formulas are derived from field calibration on Algerian pavement conditions

### 2.2 Deflection Correction Logic
- **Cs (Seasonal)**: Accounts for subgrade moisture variation between wet/intermediate/dry seasons in Algeria's climate zones
- **Cr (Regional)**: Reflects geological differences — North (Tellian clay), Hauts-Plateaux (semi-arid), Sahara (granular desert)
- **Ct (Temperature)**: Bituminous layers soften at higher temperatures, increasing deflection readings. The correction normalizes to a 20°C reference. For thin layers (<10cm), the thermal effect is negligible → Ct = 1.0
- **Interpolation**: Linear interpolation between CTTP table values provides continuous correction for any temperature

### 2.3 Reinforcement Decision Matrix
- The 3-dimensional matrix (TrafficGroup × Acceptability × DeflectionZone) produces 18 discrete design decisions
- This covers all practical field combinations encountered in Algerian pavement assessment
- The matrix is deterministic — no subjective interpretation required, ensuring reproducibility

### 2.4 Material Catalog Selection
- High traffic (T3–T5) defaults to GB (Grave Bitume) for structural capacity under heavy loads
- Low traffic (T0–T2) defaults to GNT (Grave Non Traitée) for cost-effectiveness
- Each reinforcement level (Léger → Très Lourd) increases base thickness in 5cm increments

### 2.5 AI Distress Detection
- Currently uses Gemini Vision API for cloud-based inference
- Architecture supports ONNX swap for offline/local deployment via `InferenceProvider` abstraction
- Demo mode provides realistic fallback when no API key is available
- Detection results feed into the visual status assessment (Bon/Moyen/Mauvais)

## 3. Limitations (Must Acknowledge)

1. **UNI values are manually entered** — future work should integrate automated profilometer data import
2. **Deflection values are estimated** — Benkelman beam or FWD data should be directly imported
3. **Gemini demo ≠ production CV model** — the demo detections are static placeholders; a trained ONNX model is required for field deployment
4. **Single-section analysis** — the current tool analyzes one road section at a time; batch processing for entire corridors is future work
5. **No GIS integration** — spatial visualization of reinforcement recommendations along road alignments (e.g., RN120 PK70-80) is not yet implemented
6. **Ct interpolation is linear** — the CTTP Guide doesn't specify interpolation method; linear is assumed between table entries

## 4. Future Work

1. **ONNX model quantization**: Deploy INT8-quantized YOLOv8 model for CPU-only inference at >5 FPS
2. **Field sensor integration**: Direct import from Benkelman beam, FWD, and GPR devices via serial/USB
3. **GIS routing**: Map reinforcement recommendations to QGIS/ArcGIS layers for RN120 corridor
4. **Batch processing**: Process multiple sections with varying parameters in a single session
5. **Multi-language support**: French/Arabic UI for field engineers
6. **Version control**: Track design iterations with full audit trail

## 5. Test Verification Checklist

### Pre-Defense Testing
- [ ] T0+Bon+Low → Léger, GNT (ES+10cm GNT)
- [ ] T2+Moyen+Medium → Lourd, GNT (5cm BB+20cm GNT)
- [ ] T3+Bon+Medium → Moyen, GB (5cm BB+15cm GB)
- [ ] T4+Mauvais+High → Très Lourd, GB (5cm BB+25cm GB)
- [ ] UNI=6000 returns HTTP 422 validation error
- [ ] Deflection=0 returns validation error
- [ ] Ct=1.0 when bitumen <10cm
- [ ] Ct interpolates correctly at 12°C → ~1.10
- [ ] AI Analysis returns demo_mode=true when no API key
- [ ] PDF export includes all CTTP citations and traceability
- [ ] Application runs on CPU-only laptop with <500MB RAM

### Performance Targets
- [ ] Page load < 2s on 3G connection
- [ ] Design computation < 100ms
- [ ] PDF generation < 3s
- [ ] AI inference (Gemini) < 10s per image
- [ ] AI inference (ONNX) < 2s per image (when model available)

## 6. Architecture Diagram

```
┌──────────────────────────────────────────────┐
│                Tauri Desktop Shell            │
│  ┌─────────────────────────────────────────┐ │
│  │         Next.js Frontend (SPA)          │ │
│  │  ┌───────────┐  ┌──────────────────┐   │ │
│  │  │  Design    │  │  AI Analysis     │   │ │
│  │  │  Tab       │  │  Tab             │   │ │
│  │  └─────┬─────┘  └───────┬──────────┘   │ │
│  │        │                │               │ │
│  │  ┌─────▼──────┐  ┌─────▼──────────┐    │ │
│  │  │ /api/design│  │ /api/predict   │    │ │
│  │  │ CTTP Engine│  │ Inference      │    │ │
│  │  └────────────┘  │ Provider       │    │ │
│  │                   │ ┌────────────┐ │    │ │
│  │                   │ │Gemini|ONNX │ │    │ │
│  │                   │ └────────────┘ │    │ │
│  │                   └────────────────┘    │ │
│  │  ┌──────────────────────────────────┐   │ │
│  │  │  /api/export → PDF Generator     │   │ │
│  │  └──────────────────────────────────┘   │ │
│  └─────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────┐ │
│  │  cttp-rules.ts (Single Source of Truth) │ │
│  │  engine.ts (CTTP Rule Engine)           │ │
│  │  inference-provider.ts (Swap Layer)     │ │
│  └─────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```
