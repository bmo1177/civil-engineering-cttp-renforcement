/**
 * POST /api/export — Generate CTTP-compliant PDF report
 * Accepts report data as JSON, returns PDF binary stream
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateCTTPReport, type ReportInput } from '@/lib/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Decode base64 image data if present
    let imageData: Buffer | null = null
    if (body.imageBase64) {
      try {
        imageData = Buffer.from(body.imageBase64, 'base64')
      } catch {
        // Ignore invalid image data
      }
    }

    const reportInput: ReportInput = {
      designInput: body.designInput || {},
      reinforcementResult: body.reinforcementResult || null,
      detections: body.detections || [],
      imageUrl: body.imageUrl || null,
      imageData,
      deflectionCalc: body.deflectionCalc || null,
      trafficCalc: body.trafficCalc || null,
      projectRef: body.projectRef || 'RN120 PK70-80',
      engineer: body.engineer || 'CTTP Engineer',
      date: body.date || new Date().toLocaleDateString('fr-DZ', { year: 'numeric', month: 'long', day: 'numeric' }),
    }

    // Generate PDF synchronously (jsPDF)
    const pdfBuffer = generateCTTPReport(reportInput)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CTTP_Renforcement_${reportInput.projectRef.replace(/\s+/g, '_')}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    })
  } catch (error) {
    console.error('[/api/export] PDF generation error:', error)
    return NextResponse.json(
      { error: 'PDF generation failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
