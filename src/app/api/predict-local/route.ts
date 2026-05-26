/**
 * POST /api/predict-local — Local Python Model Classification
 * Proxies image classification requests to the local Python inference server
 * that runs both Keras (EfficientNetB0) and YOLO (YOLOv8-cls) models.
 *
 * The Python server must be running at INFERENCE_SERVER_URL (default: http://localhost:5980).
 */

import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_SERVER_URL = process.env.INFERENCE_SERVER_URL || 'http://localhost:5980'

function determineStatus(status: string): 'Bon' | 'Moyen' | 'Mauvais' {
  const rank: Record<string, number> = {
    good: 1, satisfactory: 2, poor: 3, very_poor: 4,
  }
  const r = rank[status] || 1
  if (r >= 4) return 'Mauvais'
  if (r >= 3) return 'Moyen'
  return 'Bon'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided. Send "image" field in multipart form data.' },
        { status: 422 },
      )
    }

    const pythonFormData = new FormData()
    pythonFormData.append('file', imageFile)

    const res = await fetch(`${DEFAULT_SERVER_URL}/predict`, {
      method: 'POST',
      body: pythonFormData,
      signal: AbortSignal.timeout(60000),
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return NextResponse.json(
        { error: `Python server error (${res.status}): ${errBody}` },
        { status: 502 },
      )
    }

    const data = await res.json()

    if (!data.success) {
      return NextResponse.json(
        { error: data.error || 'Python inference failed', keras_result: data.keras, yolo_result: data.yolo },
        { status: 500 },
      )
    }

    const combined = data.combined || { status: 'good', confidence: 0 }

    return NextResponse.json({
      image_status: determineStatus(combined.status),
      keras_result: data.keras || null,
      yolo_result: data.yolo || null,
      combined_status: combined,
      model_used: 'keras+yolo',
      processing_time_ms: data.processing_time_ms || 0,
      demo_mode: false,
    })
  } catch (error) {
    console.error('[/api/predict-local] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}
