/**
 * CTTP "Guide des Renforcements" (Dec 1992) - Complete Rules Data Module
 * All thresholds, matrices, formulas, lane factors, and material catalogs
 * are data-driven from this single source of truth.
 */

// ─── Traffic Enums & Types ──────────────────────────────────────────────────

export const TRAFFIC_CLASSES = ["T0", "T1", "T2", "T3", "T4", "T5"] as const;
export type TrafficClass = (typeof TRAFFIC_CLASSES)[number];

export const SURFACE_TYPES = ["BB", "ES", "GNT"] as const;
export type SurfaceType = (typeof SURFACE_TYPES)[number];

export const VISUAL_STATUSES = ["Bon", "Moyen", "Mauvais"] as const;
export type VisualStatus = (typeof VISUAL_STATUSES)[number];

export const DEFLECTION_ZONES = ["Low", "Medium", "High"] as const;
export type DeflectionZone = (typeof DEFLECTION_ZONES)[number];

export const REINFORCEMENT_TYPES = ["Léger", "Moyen", "Lourd", "Très Lourd"] as const;
export type ReinforcementType = (typeof REINFORCEMENT_TYPES)[number];

export const MATERIAL_TYPES = ["GB", "GC", "GNT"] as const;
export type MaterialType = (typeof MATERIAL_TYPES)[number];

export const ACCEPTABILITY = ["Acceptable", "Non_Acceptable"] as const;
export type Acceptability = (typeof ACCEPTABILITY)[number];

// ─── Traffic Calculation Parameters (Page 19) ───────────────────────────────

export const TRAFFIC_DEFAULTS = {
  growthRate: 0.05, // i = 5%
  serviceLifeOptions: [10, 15, 20] as const, // N in years
} as const;

export const LANE_DISTRIBUTION = {
  "2-lane_bidirectional": { factor: 0.5, description: "Tpl = TJMA / 2" },
  "3-lane_bidirectional": { factor: 0.5, description: "Tpl = 0.5 × TJMA" },
  "2x2_bidirectional": { factor: 1.0, description: "Tpl = TJMA (per direction)" },
  "2x3_bidirectional": { factor: 0.8, description: "Tpl = 0.8 × TJMA (per direction)" },
  "unidirectional_1_lane": { factor: 1.0, description: "100% TJMA" },
  "unidirectional_2_lane": { factor: 0.5, description: "50% TJMA" },
  "unidirectional_3_lane": { factor: 0.8, description: "80% TJMA" },
} as const;

export type LaneDistributionKey = keyof typeof LANE_DISTRIBUTION;

// ─── Traffic Class Boundaries (Cumulative Heavy Vehicles >5t) ───────────────

export const TRAFFIC_CLASS_BOUNDS: Record<TrafficClass, { min: number; max: number }> = {
  T0: { min: 0, max: 3.5e5 },
  T1: { min: 3.5e5, max: 7.3e5 },
  T2: { min: 7.3e5, max: 2.0e6 },
  T3: { min: 2.0e6, max: 7.3e6 },
  T4: { min: 7.3e6, max: 4.0e7 },
  T5: { min: 4.0e7, max: Infinity },
};

// ─── Visual Status Mapping (Pages 30–35) ────────────────────────────────────

export const VISUAL_STATUS_ACCEPTABILITY: Record<VisualStatus, Acceptability> = {
  Bon: "Acceptable",
  Moyen: "Non_Acceptable",
  Mauvais: "Non_Acceptable",
};

// ─── UNI Thresholds (mm/km) by Surface Type ─────────────────────────────────

export const UNI_THRESHOLDS: Record<
  SurfaceType,
  { Bon: { max: number }; Moyen: { min: number; max: number }; Mauvais: { min: number } }
> = {
  BB: {
    Bon: { max: 2000 },
    Moyen: { min: 2000, max: 3500 },
    Mauvais: { min: 3500 },
  },
  ES: {
    Bon: { max: 2500 },
    Moyen: { min: 2500, max: 4000 },
    Mauvais: { min: 4000 },
  },
  GNT: {
    Bon: { max: 2500 },
    Moyen: { min: 2500, max: 4000 },
    Mauvais: { min: 4000 },
  },
};

// ─── Deflection Correction Factors ──────────────────────────────────────────

export const SEASON_FACTORS = {
  wet: { min: 1.0, max: 1.0, default: 1.0 },
  intermediate: { min: 1.1, max: 1.2, default: 1.15 },
  dry: { min: 1.2, max: 1.3, default: 1.25 },
} as const;

export type SeasonKey = keyof typeof SEASON_FACTORS;

export const REGION_FACTORS = {
  north: { min: 1.0, max: 1.0, default: 1.0 },
  hauts_plateaux: { min: 0.7, max: 0.9, default: 0.8 },
  sahara: { min: 0.4, max: 0.6, default: 0.5 },
} as const;

export type RegionKey = keyof typeof REGION_FACTORS;

/** Ct temperature correction for ≥10cm bituminous layers (Page 33) */
export const CT_TEMPERATURE_TABLE: Record<number, number> = {
  0: 1.40,
  5: 1.25,
  10: 1.15,
  15: 1.05,
  20: 1.00,
  25: 0.95,
  30: 0.90,
};

/** If bituminous layer < 10cm, Ct = 1.0 always */
export const CT_THIN_BITUMEN = 1.0;
export const THICK_BITUMEN_THRESHOLD_CM = 10;

// ─── Deflection Zone Boundaries (1/100 mm) ──────────────────────────────────

export const DEFLECTION_ZONE_BOUNDS = {
  Low: { max: 50 },
  Medium: { min: 51, max: 120 },
  High: { min: 121 },
} as const;

// ─── Reinforcement Decision Matrix (Page 45) ────────────────────────────────

export interface MatrixRow {
  trafficGroup: string;
  acceptability: Acceptability;
  deflectionZone: DeflectionZone;
  reinforcementType: ReinforcementType;
}

export const REINFORCEMENT_MATRIX: MatrixRow[] = [
  // T0-T1
  { trafficGroup: "T0-T1", acceptability: "Acceptable", deflectionZone: "Low", reinforcementType: "Léger" },
  { trafficGroup: "T0-T1", acceptability: "Acceptable", deflectionZone: "Medium", reinforcementType: "Léger" },
  { trafficGroup: "T0-T1", acceptability: "Acceptable", deflectionZone: "High", reinforcementType: "Moyen" },
  { trafficGroup: "T0-T1", acceptability: "Non_Acceptable", deflectionZone: "Low", reinforcementType: "Moyen" },
  { trafficGroup: "T0-T1", acceptability: "Non_Acceptable", deflectionZone: "Medium", reinforcementType: "Lourd" },
  { trafficGroup: "T0-T1", acceptability: "Non_Acceptable", deflectionZone: "High", reinforcementType: "Lourd" },
  // T2-T3
  { trafficGroup: "T2-T3", acceptability: "Acceptable", deflectionZone: "Low", reinforcementType: "Léger" },
  { trafficGroup: "T2-T3", acceptability: "Acceptable", deflectionZone: "Medium", reinforcementType: "Moyen" },
  { trafficGroup: "T2-T3", acceptability: "Acceptable", deflectionZone: "High", reinforcementType: "Lourd" },
  { trafficGroup: "T2-T3", acceptability: "Non_Acceptable", deflectionZone: "Low", reinforcementType: "Moyen" },
  { trafficGroup: "T2-T3", acceptability: "Non_Acceptable", deflectionZone: "Medium", reinforcementType: "Lourd" },
  { trafficGroup: "T2-T3", acceptability: "Non_Acceptable", deflectionZone: "High", reinforcementType: "Très Lourd" },
  // T4-T5
  { trafficGroup: "T4-T5", acceptability: "Acceptable", deflectionZone: "Low", reinforcementType: "Moyen" },
  { trafficGroup: "T4-T5", acceptability: "Acceptable", deflectionZone: "Medium", reinforcementType: "Moyen" },
  { trafficGroup: "T4-T5", acceptability: "Acceptable", deflectionZone: "High", reinforcementType: "Lourd" },
  { trafficGroup: "T4-T5", acceptability: "Non_Acceptable", deflectionZone: "Low", reinforcementType: "Lourd" },
  { trafficGroup: "T4-T5", acceptability: "Non_Acceptable", deflectionZone: "Medium", reinforcementType: "Très Lourd" },
  { trafficGroup: "T4-T5", acceptability: "Non_Acceptable", deflectionZone: "High", reinforcementType: "Très Lourd" },
];

// ─── Traffic Group Mapping ──────────────────────────────────────────────────

export const TRAFFIC_CLASS_TO_GROUP: Record<TrafficClass, string> = {
  T0: "T0-T1",
  T1: "T0-T1",
  T2: "T2-T3",
  T3: "T2-T3",
  T4: "T4-T5",
  T5: "T4-T5",
};

// ─── Material Catalogs (Pages 48–55) ────────────────────────────────────────

export interface CatalogEntry {
  reinforcementType: ReinforcementType;
  structure: string;
  baseThicknessCm: number;
  material: MaterialType;
  binder: string | null;
  compaction: string;
  trafficRange: string;
}

/** High Traffic (T3–T5) → Default material: GB (Grave Bitume) */
export const HIGH_TRAFFIC_CATALOG: CatalogEntry[] = [
  {
    reinforcementType: "Léger",
    structure: "5cm BB + 10cm GB",
    baseThicknessCm: 10,
    material: "GB",
    binder: "40/50",
    compaction: "92–96% LCPC",
    trafficRange: "T3–T5",
  },
  {
    reinforcementType: "Moyen",
    structure: "5cm BB + 15cm GB",
    baseThicknessCm: 15,
    material: "GB",
    binder: "40/50",
    compaction: "92–96% LCPC",
    trafficRange: "T3–T5",
  },
  {
    reinforcementType: "Lourd",
    structure: "5cm BB + 20cm GB",
    baseThicknessCm: 20,
    material: "GB",
    binder: "40/50",
    compaction: "92–96% LCPC",
    trafficRange: "T3–T5",
  },
  {
    reinforcementType: "Très Lourd",
    structure: "5cm BB + 25cm GB",
    baseThicknessCm: 25,
    material: "GB",
    binder: "40/50",
    compaction: "92–96% LCPC",
    trafficRange: "T3–T5",
  },
];

/** Low/Medium Traffic (T0–T2) → Default material: GNT (Grave Non Traitée) */
export const LOW_TRAFFIC_CATALOG: CatalogEntry[] = [
  // T0/T1
  {
    reinforcementType: "Léger",
    structure: "ES + 10cm GNT",
    baseThicknessCm: 10,
    material: "GNT",
    binder: null,
    compaction: "95–100% OPM",
    trafficRange: "T0–T1",
  },
  {
    reinforcementType: "Moyen",
    structure: "ES + 12cm GNT",
    baseThicknessCm: 12,
    material: "GNT",
    binder: null,
    compaction: "95–100% OPM",
    trafficRange: "T0–T1",
  },
  {
    reinforcementType: "Lourd",
    structure: "ES + 16cm GNT",
    baseThicknessCm: 16,
    material: "GNT",
    binder: null,
    compaction: "95–100% OPM",
    trafficRange: "T0–T1",
  },
  // T2
  {
    reinforcementType: "Léger",
    structure: "5cm BB + 10cm GNT",
    baseThicknessCm: 10,
    material: "GNT",
    binder: null,
    compaction: "95–100% OPM",
    trafficRange: "T2",
  },
  {
    reinforcementType: "Moyen",
    structure: "5cm BB + 16cm GNT",
    baseThicknessCm: 16,
    material: "GNT",
    binder: null,
    compaction: "95–100% OPM",
    trafficRange: "T2",
  },
  {
    reinforcementType: "Lourd",
    structure: "5cm BB + 20cm GNT",
    baseThicknessCm: 20,
    material: "GNT",
    binder: null,
    compaction: "95–100% OPM",
    trafficRange: "T2",
  },
];

export const DRAINAGE_NOTE = "Prévoir assainissement conforme au Chapitre 3 du Fascicule 2";

// ─── Helper: Traffic Class from Cumulative HV ───────────────────────────────

export function classifyTraffic(tc: number): TrafficClass {
  for (const cls of TRAFFIC_CLASSES) {
    const bounds = TRAFFIC_CLASS_BOUNDS[cls];
    if (tc >= bounds.min && tc < bounds.max) return cls;
  }
  return "T5";
}

// ─── Helper: UNI Status from value and surface type ─────────────────────────

export function classifyUNI(uni: number, surfaceType: SurfaceType): VisualStatus {
  const thresholds = UNI_THRESHOLDS[surfaceType];
  if (uni < thresholds.Bon.max) return "Bon";
  if (uni < thresholds.Moyen.max) return "Moyen";
  return "Mauvais";
}

// ─── Helper: Deflection Zone ────────────────────────────────────────────────

export function classifyDeflection(d: number): DeflectionZone {
  if (d <= 50) return "Low";
  if (d <= 120) return "Medium";
  return "High";
}

// ─── Helper: Interpolate Ct ─────────────────────────────────────────────────

export function interpolateCt(temperatureC: number, thickBitumen: boolean): number {
  if (!thickBitumen) return CT_THIN_BITUMEN;

  const temps = Object.keys(CT_TEMPERATURE_TABLE)
    .map(Number)
    .sort((a, b) => a - b);

  if (temperatureC <= temps[0]) return CT_TEMPERATURE_TABLE[temps[0]];
  if (temperatureC >= temps[temps.length - 1]) return CT_TEMPERATURE_TABLE[temps[temps.length - 1]];

  for (let i = 0; i < temps.length - 1; i++) {
    if (temperatureC >= temps[i] && temperatureC <= temps[i + 1]) {
      const t0 = temps[i];
      const t1 = temps[i + 1];
      const c0 = CT_TEMPERATURE_TABLE[t0];
      const c1 = CT_TEMPERATURE_TABLE[t1];
      const fraction = (temperatureC - t0) / (t1 - t0);
      return c0 + fraction * (c1 - c0);
    }
  }

  return 1.0;
}

// ─── Helper: Calculate Tms and Tc ───────────────────────────────────────────

export function calculateTraffic(
  tjma: number,
  laneConfig: LaneDistributionKey,
  growthRate: number,
  yearsToService: number,
  serviceLife: number
): { tms: number; tc: number; tpl: number } {
  const laneFactor = LANE_DISTRIBUTION[laneConfig].factor;
  const tpl = tjma * laneFactor;
  const tms = Math.pow(1 + growthRate, yearsToService) * tpl;
  const i = growthRate;
  const tc = i === 0 ? 365 * tms * serviceLife : 365 * tms * (Math.pow(1 + i, serviceLife) - 1) / i;
  return { tms, tc, tpl };
}

// ─── Helper: Corrected Deflection ───────────────────────────────────────────

export function correctDeflection(
  dc: number,
  cs: number,
  cr: number,
  ct: number
): number {
  return dc * cs * cr * ct;
}
