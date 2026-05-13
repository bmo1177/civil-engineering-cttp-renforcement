/**
 * CTTP Rule Engine - Core business logic for pavement reinforcement design
 * Implements: traffic calculation, deflection zoning, matrix lookup, catalog selection, traceability
 */

import {
  type TrafficClass,
  type SurfaceType,
  type VisualStatus,
  type DeflectionZone,
  type ReinforcementType,
  type MaterialType,
  type Acceptability,
  type CatalogEntry,
  type LaneDistributionKey,
  REINFORCEMENT_MATRIX,
  TRAFFIC_CLASS_TO_GROUP,
  VISUAL_STATUS_ACCEPTABILITY,
  HIGH_TRAFFIC_CATALOG,
  LOW_TRAFFIC_CATALOG,
  DRAINAGE_NOTE,
  classifyDeflection,
  classifyTraffic,
  calculateTraffic,
  correctDeflection,
  interpolateCt,
  TRAFFIC_CLASS_BOUNDS,
} from "./cttp-rules";

// ─── Input / Output Types ───────────────────────────────────────────────────

export interface DesignInput {
  traffic_class: TrafficClass;
  surface_type: SurfaceType;
  uni: number;
  deflection_corr: number;
  visual_status: VisualStatus;
}

export interface TrafficCalcInput {
  tjma: number;
  lane_config: LaneDistributionKey;
  growth_rate: number;
  years_to_service: number;
  service_life: number;
}

export interface DeflectionCalcInput {
  dc: number;
  season: "wet" | "intermediate" | "dry";
  region: "north" | "hauts_plateaux" | "sahara";
  temperature_c: number;
  thick_bitumen: boolean;
  custom_cs?: number;
  custom_cr?: number;
  custom_ct?: number;
}

export interface Traceability {
  rule_source: string;
  traffic_class_input: TrafficClass;
  visual_status_mapped: Acceptability;
  deflection_zone: DeflectionZone;
  matrix_row_matched: string;
}

export interface DesignOutput {
  reinforcement_type: ReinforcementType;
  material: MaterialType;
  structure: string;
  base_thickness_cm: number;
  binder: string | null;
  compaction: string;
  drainage_note: string;
  traceability: Traceability;
}

export interface TrafficCalcOutput {
  tpl: number;
  tms: number;
  tc: number;
  traffic_class: TrafficClass;
}

export interface DeflectionCalcOutput {
  dc: number;
  cs: number;
  cr: number;
  ct: number;
  d_corr: number;
  deflection_zone: DeflectionZone;
}

// ─── Validation Errors ──────────────────────────────────────────────────────

export class CTTPValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public value: unknown
  ) {
    super(`CTTP Validation Error [${field}]: ${message}`);
    this.name = "CTTPValidationError";
  }
}

// ─── Engine Functions ───────────────────────────────────────────────────────

/**
 * Validate design input against CTTP ranges
 */
export function validateDesignInput(input: DesignInput): CTTPValidationError[] {
  const errors: CTTPValidationError[] = [];

  if (input.uni < 0 || input.uni > 5000) {
    errors.push(new CTTPValidationError("uni", "UNI must be between 0 and 5000 mm/km", input.uni));
  }

  if (input.deflection_corr <= 0 || input.deflection_corr > 500) {
    errors.push(
      new CTTPValidationError("deflection_corr", "Corrected deflection must be > 0 and ≤ 500 (1/100 mm)", input.deflection_corr)
    );
  }

  const validTrafficClasses: TrafficClass[] = ["T0", "T1", "T2", "T3", "T4", "T5"];
  if (!validTrafficClasses.includes(input.traffic_class)) {
    errors.push(
      new CTTPValidationError("traffic_class", `Traffic class must be one of: ${validTrafficClasses.join(", ")}`, input.traffic_class)
    );
  }

  const validSurfaceTypes: SurfaceType[] = ["BB", "ES", "GNT"];
  if (!validSurfaceTypes.includes(input.surface_type)) {
    errors.push(
      new CTTPValidationError("surface_type", `Surface type must be one of: ${validSurfaceTypes.join(", ")}`, input.surface_type)
    );
  }

  const validVisualStatuses: VisualStatus[] = ["Bon", "Moyen", "Mauvais"];
  if (!validVisualStatuses.includes(input.visual_status)) {
    errors.push(
      new CTTPValidationError("visual_status", `Visual status must be one of: ${validVisualStatuses.join(", ")}`, input.visual_status)
    );
  }

  return errors;
}

/**
 * Map visual status to acceptability
 */
export function mapVisualStatus(status: VisualStatus): Acceptability {
  return VISUAL_STATUS_ACCEPTABILITY[status];
}

/**
 * Map deflection value to zone
 */
export function mapDeflectionZone(d: number): DeflectionZone {
  return classifyDeflection(d);
}

/**
 * Look up reinforcement type from the decision matrix (Page 45)
 */
export function lookupReinforcementType(
  trafficClass: TrafficClass,
  acceptability: Acceptability,
  deflectionZone: DeflectionZone
): { reinforcementType: ReinforcementType; matchedRow: string } {
  const trafficGroup = TRAFFIC_CLASS_TO_GROUP[trafficClass];

  const match = REINFORCEMENT_MATRIX.find(
    (row) =>
      row.trafficGroup === trafficGroup &&
      row.acceptability === acceptability &&
      row.deflectionZone === deflectionZone
  );

  if (!match) {
    throw new Error(
      `No matrix match for trafficGroup=${trafficGroup}, acceptability=${acceptability}, deflectionZone=${deflectionZone}`
    );
  }

  const matchedRow = `${trafficGroup} + ${acceptability === "Acceptable" ? "Acceptable" : "Non Acceptable"} + ${deflectionZone} → ${match.reinforcementType}`;

  return {
    reinforcementType: match.reinforcementType,
    matchedRow,
  };
}

/**
 * Select catalog entry based on traffic class and reinforcement type
 */
export function selectCatalog(
  trafficClass: TrafficClass,
  reinforcementType: ReinforcementType
): CatalogEntry {
  const isHighTraffic = ["T3", "T4", "T5"].includes(trafficClass);
  const catalog = isHighTraffic ? HIGH_TRAFFIC_CATALOG : LOW_TRAFFIC_CATALOG;

  // For low traffic, differentiate T0-T1 vs T2
  let entry: CatalogEntry | undefined;

  if (!isHighTraffic) {
    const isT2 = trafficClass === "T2";
    const trafficRange = isT2 ? "T2" : "T0–T1";
    entry = catalog.find(
      (e) => e.reinforcementType === reinforcementType && e.trafficRange === trafficRange
    );
  } else {
    entry = catalog.find((e) => e.reinforcementType === reinforcementType);
  }

  if (!entry) {
    // Fallback: try to find any match for the reinforcement type
    entry = catalog.find((e) => e.reinforcementType === reinforcementType);
  }

  if (!entry) {
    throw new Error(
      `No catalog entry for trafficClass=${trafficClass}, reinforcementType=${reinforcementType}`
    );
  }

  return entry;
}

/**
 * Main design computation: full CTTP-compliant reinforcement design
 */
export function computeDesign(input: DesignInput): DesignOutput {
  // Step 1: Validate
  const errors = validateDesignInput(input);
  if (errors.length > 0) {
    throw errors[0];
  }

  // Step 2: Map visual status → acceptability
  const acceptability = mapVisualStatus(input.visual_status);

  // Step 3: Map deflection → zone
  const deflectionZone = mapDeflectionZone(input.deflection_corr);

  // Step 4: Look up reinforcement type from matrix
  const { reinforcementType, matchedRow } = lookupReinforcementType(
    input.traffic_class,
    acceptability,
    deflectionZone
  );

  // Step 5: Select material catalog entry
  const catalogEntry = selectCatalog(input.traffic_class, reinforcementType);

  // Step 6: Build output with traceability
  return {
    reinforcement_type: catalogEntry.reinforcementType,
    material: catalogEntry.material,
    structure: catalogEntry.structure,
    base_thickness_cm: catalogEntry.baseThicknessCm,
    binder: catalogEntry.binder,
    compaction: catalogEntry.compaction,
    drainage_note: DRAINAGE_NOTE,
    traceability: {
      rule_source: "CTTP Guide p.45 Table 3",
      traffic_class_input: input.traffic_class,
      visual_status_mapped: acceptability,
      deflection_zone: deflectionZone,
      matrix_row_matched: matchedRow,
    },
  };
}

/**
 * Compute traffic calculations (Tms, Tc, classification)
 */
export function computeTraffic(input: TrafficCalcInput): TrafficCalcOutput {
  const { tpl, tms, tc } = calculateTraffic(
    input.tjma,
    input.lane_config,
    input.growth_rate,
    input.years_to_service,
    input.service_life
  );

  const trafficClass = classifyTraffic(tc);

  return { tpl, tms, tc, traffic_class: trafficClass };
}

/**
 * Compute corrected deflection with all correction factors
 */
export function computeDeflection(input: DeflectionCalcInput): DeflectionCalcOutput {
  const SEASON_DEFAULTS = { wet: 1.0, intermediate: 1.15, dry: 1.25 };
  const REGION_DEFAULTS = { north: 1.0, hauts_plateaux: 0.8, sahara: 0.5 };

  const cs = input.custom_cs ?? SEASON_DEFAULTS[input.season];
  const cr = input.custom_cr ?? REGION_DEFAULTS[input.region];
  const ct = input.custom_ct ?? interpolateCt(input.temperature_c, input.thick_bitumen);

  const d_corr = correctDeflection(input.dc, cs, cr, ct);
  const deflectionZone = classifyDeflection(d_corr);

  return { dc: input.dc, cs, cr, ct, d_corr, deflection_zone: deflectionZone };
}
