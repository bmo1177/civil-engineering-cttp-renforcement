/**
 * Python Inference Provider — calls the local Python inference server
 * that runs both Keras (EfficientNetB0) and YOLO (YOLOv8-cls) models.
 *
 * The server must be running at INFERENCE_SERVER_URL (default: http://localhost:5980).
 * Set INFERENCE_BACKEND=python in .env to use this provider.
 */

import type { InferenceProvider, InferenceResult } from './inference-provider'
import type { DetectionBox } from './inference-types'

const DEFAULT_SERVER_URL = process.env.INFERENCE_SERVER_URL || 'http://127.0.0.1:5980'

export interface ModelResult {
  status: string
  confidence: number
  probabilities?: Record<string, number>
  error?: string
}

export interface PythonInferenceResponse {
  success: boolean
  class_names: string[]
  keras?: ModelResult
  yolo?: ModelResult
  combined?: {
    status: string
    confidence: number
  }
  processing_time_ms: number
  error?: string
}

function determineStatus(
  kerasResult?: ModelResult,
  yoloResult?: ModelResult,
): 'Bon' | 'Moyen' | 'Mauvais' {
  const statusRank: Record<string, number> = {
    good: 1,
    satisfactory: 2,
    poor: 3,
    very_poor: 4,
  }

  const statuses: string[] = []
  if (kerasResult?.status) statuses.push(kerasResult.status)
  if (yoloResult?.status) statuses.push(yoloResult.status)

  if (statuses.length === 0) return 'Bon'

  const maxRank = Math.max(...statuses.map((s) => statusRank[s] || 0))
  if (maxRank >= 4) return 'Mauvais'
  if (maxRank >= 3) return 'Moyen'
  return 'Bon'
}

function getCombinedStatus(
  kerasResult?: ModelResult,
  yoloResult?: ModelResult,
): { status: string; confidence: number } {
  if (!kerasResult || !kerasResult.status) {
    return { status: yoloResult?.status || 'unknown', confidence: yoloResult?.confidence || 0 }
  }
  if (!yoloResult || !yoloResult.status) {
    return { status: kerasResult.status, confidence: kerasResult.confidence }
  }

  const combinedConf = Math.round(((kerasResult.confidence || 0) + (yoloResult.confidence || 0)) / 2)
  const votes: Record<string, number> = {}
  votes[kerasResult.status] = (votes[kerasResult.status] || 0) + (kerasResult.confidence || 0)
  votes[yoloResult.status] = (votes[yoloResult.status] || 0) + (yoloResult.confidence || 0)
  const winner = Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0]
  return { status: winner, confidence: combinedConf }
}

export class PythonInferenceProvider implements InferenceProvider {
  readonly name = 'python-models'
  readonly isAvailable: boolean
  private serverUrl: string

  constructor(serverUrl?: string) {
    this.serverUrl = serverUrl || DEFAULT_SERVER_URL
    this.isAvailable = true
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.serverUrl}/health`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return false
      const data = await res.json()
      return data.keras_loaded || data.yolo_loaded
    } catch {
      return false
    }
  }

  async analyze(imageBuffer: Buffer, _mimeType: string): Promise<InferenceResult> {
    const startTime = Date.now()

    try {
      const blob = new Blob([imageBuffer], { type: 'application/octet-stream' })
      const formData = new FormData()
      formData.append('file', blob, 'image.jpg')

      const res = await fetch(`${this.serverUrl}/predict`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(60000),
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        throw new Error(`Python inference server error (${res.status}): ${errBody}`)
      }

      const data: PythonInferenceResponse = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Unknown inference error')
      }

      const detections: DetectionBox[] = []
      const combinedStatus = data.combined || getCombinedStatus(data.keras, data.yolo)
      const status = determineStatus(data.keras, data.yolo)

      return {
        detections,
        image_status: status,
        keras_result: data.keras || undefined,
        yolo_result: data.yolo || undefined,
        combined_status: combinedStatus,
        model_used: 'keras+yolo',
        demo_mode: false,
        processing_time_ms: data.processing_time_ms || (Date.now() - startTime),
      }
    } catch (error) {
      console.error('[PythonInferenceProvider] Error:', error)
      throw error
    }
  }

  dispose(): void {
    // No cleanup needed for HTTP-based provider
  }
}
