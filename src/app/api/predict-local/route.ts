import { NextRequest, NextResponse } from 'next/server'

const INFERENCE_SERVER_URL = process.env.INFERENCE_SERVER_URL || 'http://127.0.0.1:5980'
const CLASS_NAMES = ['good', 'poor', 'satisfactory', 'very_poor']

function normalizeStatus(status: string): string {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, '_')
  if (CLASS_NAMES.includes(normalized)) return normalized
  return status
}

const STATUS_RANK: Record<string, number> = {
  good: 1,
  satisfactory: 2,
  poor: 3,
  very_poor: 4,
}

function determineImageStatus(
  kerasStatus?: string,
  yoloStatus?: string,
): 'Bon' | 'Moyen' | 'Mauvais' {
  const statuses = [kerasStatus, yoloStatus].filter(Boolean) as string[]
  if (statuses.length === 0) return 'Bon'
  const maxRank = Math.max(...statuses.map((s) => STATUS_RANK[s] || 0))
  if (maxRank >= 4) return 'Mauvais'
  if (maxRank >= 3) return 'Moyen'
  return 'Bon'
}

function getCombinedStatus(
  kerasResult?: { status: string; confidence: number },
  yoloResult?: { status: string; confidence: number },
): { status: string; confidence: number } {
  if (!kerasResult?.status) {
    return { status: yoloResult?.status || 'unknown', confidence: yoloResult?.confidence || 0 }
  }
  if (!yoloResult?.status) {
    return { status: kerasResult.status, confidence: kerasResult.confidence }
  }
  const votes: Record<string, number> = {}
  votes[kerasResult.status] = (votes[kerasResult.status] || 0) + (kerasResult.confidence || 0)
  votes[yoloResult.status] = (votes[yoloResult.status] || 0) + (yoloResult.confidence || 0)
  const winner = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0]
  const combinedConf = Math.round(((kerasResult.confidence || 0) + (yoloResult.confidence || 0)) / 2)
  return { status: winner, confidence: combinedConf }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image')

    if (!imageFile || !(imageFile instanceof File)) {
      return NextResponse.json(
        { error: 'No image file uploaded', success: false },
        { status: 400 },
      )
    }

    const proxyFormData = new FormData()
    proxyFormData.append('file', imageFile, imageFile.name)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    const res = await fetch(`${INFERENCE_SERVER_URL}/predict`, {
      method: 'POST',
      body: proxyFormData,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId))

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`Inference server error (${res.status}): ${errBody}`)
    }

    const data = await res.json()

    if (!data.success) {
      throw new Error(data.error || 'Inference failed')
    }

    const kerasResult = data.keras?.status
      ? { status: normalizeStatus(data.keras.status), confidence: data.keras.confidence, probabilities: data.keras.probabilities }
      : undefined

    const yoloResult = data.yolo?.status
      ? { status: normalizeStatus(data.yolo.status), confidence: data.yolo.confidence, probabilities: data.yolo.probabilities }
      : undefined

    const imageStatus = determineImageStatus(kerasResult?.status, yoloResult?.status)
    const combinedStatus = getCombinedStatus(kerasResult, yoloResult)

    return NextResponse.json({
      success: true,
      keras_result: kerasResult || null,
      yolo_result: yoloResult || null,
      image_status: imageStatus,
      combined_status: combinedStatus,
      model_used: 'keras+yolo',
      processing_time_ms: data.processing_time_ms || 0,
    })
  } catch (error) {
    console.error('[predict-local] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message, success: false },
      { status: 500 },
    )
  }
}
