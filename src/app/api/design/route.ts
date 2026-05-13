/**
 * POST /api/design - CTTP Reinforcement Design API Route
 * Validates input, computes design, returns CTTP-compliant output with traceability
 */

import { NextRequest, NextResponse } from "next/server";
import { computeDesign, validateDesignInput, type DesignInput } from "@/lib/engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const input: DesignInput = {
      traffic_class: body.traffic_class,
      surface_type: body.surface_type,
      uni: body.uni,
      deflection_corr: body.deflection_corr,
      visual_status: body.visual_status,
    };

    const errors = validateDesignInput(input);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: errors.map((e) => ({
            field: e.field,
            message: e.message,
            value: e.value,
          })),
        },
        { status: 422 }
      );
    }

    // Compute design
    const result = computeDesign(input);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "CTTPValidationError") {
      return NextResponse.json(
        { error: "Validation error", message: error.message },
        { status: 422 }
      );
    }

    console.error("[/api/design] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
