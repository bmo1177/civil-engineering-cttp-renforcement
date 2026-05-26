/**
 * POST /api/predict — Distress Detection API Route
 * Uses InferenceProvider abstraction for Gemini/ONNX swap
 * Falls back to demo detections when no provider is available
 */

import { NextRequest, NextResponse } from 'next/server'
import { getInferenceProvider, GeminiProvider } from '@/lib/inference-provider'
import type { DetectionBox } from '@/lib/inference-types'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const apiKey = request.headers.get('X-Gemini-Key')

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image file provided. Send "image" field in multipart form data.' },
        { status: 422 }
      )
    }

    const bytes = await imageFile.arrayBuffer()
    const imageBuffer = Buffer.from(bytes)
    const mimeType = imageFile.type || 'image/jpeg'

    // Get the appropriate provider based on INFERENCE_BACKEND env
    const backend = (process.env.INFERENCE_BACKEND || 'gemini').toLowerCase()

    let provider
    if (backend === 'gemini') {
      provider = new GeminiProvider()
    } else {
      provider = await getInferenceProvider()
    }

    const result = await provider.analyze(imageBuffer, mimeType, apiKey || undefined)

    // Clean up provider (don't reset the cached singleton)
    provider.dispose()

    const response = {
      detections: result.detections,
      image_status: result.image_status,
      demo_mode: result.demo_mode,
      model_used: result.model_used,
      processing_time_ms: result.processing_time_ms,
      keras_result: result.keras_result,
      yolo_result: result.yolo_result,
      combined_status: result.combined_status,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('[/api/predict] Error:', error)

    // Demo fallback on any unexpected error
    const fallbackDetections: DetectionBox[] = [
      { label: 'Fissures longitudinales', confidence: 0.87, x: 120, y: 80, width: 200, height: 15, severity: 'medium' },
      { label: 'Nids de poule', confidence: 0.92, x: 350, y: 200, width: 60, height: 55, severity: 'high' },
      { label: 'Fissures transversales', confidence: 0.78, x: 50, y: 300, width: 15, height: 150, severity: 'low' },
      { label: 'Arrachements', confidence: 0.83, x: 450, y: 100, width: 80, height: 70, severity: 'medium' },
    ]

    return NextResponse.json({
      detections: fallbackDetections,
      image_status: 'Mauvais' as const,
      demo_mode: true,
      model_used: 'demo-fallback',
      processing_time_ms: 0,
    }, { status: 200 })
  }
}
