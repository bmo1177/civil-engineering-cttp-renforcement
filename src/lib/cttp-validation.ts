/**
 * CTTP Client-Side Validation Module
 * Zod schemas matching exact CTTP ranges + error formatting
 */

import { z } from "zod";

// ─── Enum Schemas ───────────────────────────────────────────────────────────

export const TrafficClassSchema = z.enum(["T0", "T1", "T2", "T3", "T4", "T5"], {
  message: "Traffic class must be T0, T1, T2, T3, T4, or T5",
});

export const SurfaceTypeSchema = z.enum(["BB", "ES", "GNT"], {
  message: "Surface type must be BB, ES, or GNT",
});

export const VisualStatusSchema = z.enum(["Bon", "Moyen", "Mauvais"], {
  message: "Visual status must be Bon, Moyen, or Mauvais",
});

// ─── Design Input Schema ────────────────────────────────────────────────────

export const DesignInputSchema = z.object({
  traffic_class: TrafficClassSchema,
  surface_type: SurfaceTypeSchema,
  uni: z
    .number({ message: "UNI must be a number" })
    .min(0, "UNI must be ≥ 0 mm/km")
    .max(5000, "UNI must be ≤ 5000 mm/km"),
  deflection_corr: z
    .number({ message: "Corrected deflection must be a number" })
    .gt(0, "Corrected deflection must be > 0 (1/100 mm)")
    .max(500, "Corrected deflection must be ≤ 500 (1/100 mm)"),
  visual_status: VisualStatusSchema,
});

export type ValidatedDesignInput = z.infer<typeof DesignInputSchema>;

// ─── Traffic Calculation Schema ─────────────────────────────────────────────

export const LaneConfigSchema = z.enum([
  "2-lane_bidirectional",
  "3-lane_bidirectional",
  "2x2_bidirectional",
  "2x3_bidirectional",
  "unidirectional_1_lane",
  "unidirectional_2_lane",
  "unidirectional_3_lane",
]);

export const TrafficCalcSchema = z.object({
  tjma: z.number().positive("TJMA must be > 0"),
  lane_config: LaneConfigSchema,
  growth_rate: z.number().min(0).max(0.2, "Growth rate must be ≤ 20%"),
  years_to_service: z.number().int().min(0).max(50, "Years to service must be ≤ 50"),
  service_life: z.number().int().min(1).max(50, "Service life must be between 1 and 50 years"),
});

// ─── Deflection Calculation Schema ──────────────────────────────────────────

export const SeasonSchema = z.enum(["wet", "intermediate", "dry"]);
export const RegionSchema = z.enum(["north", "hauts_plateaux", "sahara"]);

export const DeflectionCalcSchema = z.object({
  dc: z.number().positive("Measured deflection must be > 0"),
  season: SeasonSchema,
  region: RegionSchema,
  temperature_c: z.number().min(-10, "Temperature must be ≥ -10°C").max(60, "Temperature must be ≤ 60°C"),
  thick_bitumen: z.boolean(),
  custom_cs: z.number().min(0.8).max(1.5).optional(),
  custom_cr: z.number().min(0.3).max(1.5).optional(),
  custom_ct: z.number().min(0.5).max(2.0).optional(),
});

// ─── Error Formatting ───────────────────────────────────────────────────────

export interface FieldError {
  field: string;
  message: string;
}

export function formatZodErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: Array.isArray(issue.path) ? issue.path.join(".") : String(issue.path ?? ""),
    message: issue.message,
  }));
}

export function validateDesignInput(data: unknown): {
  success: boolean;
  data?: ValidatedDesignInput;
  errors?: FieldError[];
} {
  const result = DesignInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: formatZodErrors(result.error) };
}

// ─── Local Inference Response Schema ─────────────────────────────────────────

const ModelResultSchema = z.object({
  status: z.string().optional(),
  confidence: z.number().optional(),
  probabilities: z.record(z.string(), z.number()).optional(),
  error: z.string().optional(),
});

export const LocalInferenceResponseSchema = z.object({
  success: z.boolean(),
  keras_result: ModelResultSchema.nullable().optional(),
  yolo_result: ModelResultSchema.nullable().optional(),
  image_status: z.enum(["Bon", "Moyen", "Mauvais"]),
  combined_status: z.object({
    status: z.string(),
    confidence: z.number(),
  }).optional(),
  model_used: z.string().optional(),
  processing_time_ms: z.number().optional(),
  error: z.string().optional(),
});
