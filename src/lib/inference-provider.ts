/**
 * Inference Provider Abstraction — Gemini / ONNX swap pipeline
 *
 * Provides a unified interface for pavement distress detection.
 * Swappable between Gemini VLM (cloud) and ONNX Runtime (local, CPU-only).
 * Zero frontend changes required when swapping providers.
 *
 * Environment toggle: INFERENCE_BACKEND=gemini|onnx (default: gemini)
 *
 * NOTE: The ONNX provider is in a separate file (onnx-provider.ts) to avoid
 * Turbopack compile errors from the onnxruntime-node dynamic import.
 */

import type { DetectionBox, ModelResult, CombinedStatus } from './inference-types'

// ─── Abstract Provider Interface ────────────────────────────────────────────

export interface InferenceResult {
  detections: DetectionBox[]
  image_status: 'Bon' | 'Moyen' | 'Mauvais'
  model_used: string
  demo_mode: boolean
  processing_time_ms: number
  keras_result?: ModelResult
  yolo_result?: ModelResult
  combined_status?: CombinedStatus
}

export interface InferenceProvider {
  readonly name: string
  readonly isAvailable: boolean
  analyze(imageBuffer: Buffer, mimeType: string, apiKey?: string): Promise<InferenceResult>
  dispose(): void
}

// ─── Gemini Provider ────────────────────────────────────────────────────────

const DISTRESS_CATALOG = [
  'Fissures longitudinales',
  'Fissures transversales',
  'Fissures en peau de crocodile',
  'Nids de poule',
  'Arrachements',
  'Déformations',
  'Orniérage',
  'Fissures de retrait',
  'Décollement',
  'Affaissement',
]

function determineStatus(detections: DetectionBox[]): 'Bon' | 'Moyen' | 'Mauvais' {
  const highCount = detections.filter((d) => d.severity === 'high').length
  const medCount = detections.filter((d) => d.severity === 'medium').length
  if (highCount >= 2 || (highCount >= 1 && medCount >= 2)) return 'Mauvais'
  if (medCount >= 2 || highCount >= 1) return 'Moyen'
  return 'Bon'
}

export class GeminiProvider implements InferenceProvider {
  readonly name = 'gemini'
  readonly isAvailable: boolean

  constructor() {
    this.isAvailable = true // Always available (demo fallback)
  }

  async analyze(imageBuffer: Buffer, mimeType: string, apiKey?: string): Promise<InferenceResult> {
    const startTime = Date.now()
    const effectiveKey = apiKey || process.env.GEMINI_API_KEY

    if (!effectiveKey) {
      return this.demoFallback(startTime)
    }

    try {
      const base64 = imageBuffer.toString('base64')
      const prompt = `Analysez cette image de chaussée et identifiez les dégradations visibles. Pour chaque dégradation détectée, fournissez:
1. Le type de dégradation parmi: ${DISTRESS_CATALOG.join(', ')}
2. La sévérité: low, medium, ou high
3. La position approximative (coordonnées x, y en pixels, largeur, hauteur)
4. Le niveau de confiance (0-1)

Répondez UNIQUEMENT au format JSON:
{"detections": [{"label": "...", "confidence": 0.0, "x": 0, "y": 0, "width": 0, "height": 0, "severity": "low|medium|high"}]}

Si aucune dégradation n'est détectée, retournez: {"detections": []}`

      const makeRequest = async (model: string) => {
        return fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': effectiveKey,
            },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { text: prompt },
                  { inlineData: { mimeType, data: base64 } },
                ],
              }],
            }),
          }
        )
      }

      let modelUsed = 'gemini-2.0-flash'
      let geminiRes = await makeRequest(modelUsed)

      if (!geminiRes.ok) {
        console.warn(`[GeminiProvider] gemini-2.0-flash failed (HTTP ${geminiRes.status}), attempting fallback to gemini-flash-latest...`)
        modelUsed = 'gemini-flash-latest'
        geminiRes = await makeRequest(modelUsed)
      }

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text().catch(() => '')
        let errorMessage = `Gemini API error: ${geminiRes.status}`
        try {
          const parsedErr = JSON.parse(errBody)
          errorMessage = parsedErr.error?.message || errorMessage
        } catch {
          errorMessage = errBody || errorMessage
        }
        throw new Error(errorMessage)
      }

      const geminiData = await geminiRes.json()
      const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      let parsed: { detections: DetectionBox[] }
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { detections: [] }
      } catch {
        parsed = { detections: [] }
      }

      const detections: DetectionBox[] = Array.isArray(parsed.detections)
        ? parsed.detections.map((d: Record<string, unknown>) => ({
            label: String(d.label || 'Unknown'),
            confidence: Number(d.confidence || 0),
            x: Number(d.x || 0),
            y: Number(d.y || 0),
            width: Number(d.width || 50),
            height: Number(d.height || 50),
            severity: (['low', 'medium', 'high'].includes(String(d.severity))
              ? String(d.severity)
              : 'medium') as DetectionBox['severity'],
          }))
        : []

      return {
        detections,
        image_status: determineStatus(detections),
        model_used: 'gemini-2.0-flash',
        demo_mode: false,
        processing_time_ms: Date.now() - startTime,
      }
    } catch (error) {
      console.error('[GeminiProvider] Gemini analysis failed:', error)
      // Throw the error if we had a key - don't silently fallback to demo
      // unless the user explicitly wants demo mode (by providing no key).
      throw error
    }
  }

  private demoFallback(startTime: number): InferenceResult {
    return {
      detections: [
        { label: 'Fissures longitudinales', confidence: 0.87, x: 120, y: 80, width: 200, height: 15, severity: 'medium' },
        { label: 'Nids de poule', confidence: 0.92, x: 350, y: 200, width: 60, height: 55, severity: 'high' },
        { label: 'Fissures transversales', confidence: 0.78, x: 50, y: 300, width: 15, height: 150, severity: 'low' },
        { label: 'Arrachements', confidence: 0.83, x: 450, y: 100, width: 80, height: 70, severity: 'medium' },
      ],
      image_status: 'Mauvais',
      model_used: 'demo-fallback',
      demo_mode: true,
      processing_time_ms: Date.now() - startTime,
    }
  }

  dispose(): void {
    // No cleanup needed for Gemini HTTP-based provider
  }
}

// ─── ONNX Provider Stub ───────────────────────────────────────────────────
// The ONNX provider is loaded from a separate file to avoid Turbopack
// compile errors from onnxruntime-node. It's only loaded when
// INFERENCE_BACKEND=onnx is set.

class ONNXProviderStub implements InferenceProvider {
  readonly name = 'onnx-stub'
  readonly isAvailable = false

  async analyze(_imageBuffer: Buffer, _mimeType: string): Promise<InferenceResult> {
    return {
      detections: [],
      image_status: 'Bon',
      model_used: 'onnx-unavailable',
      demo_mode: true,
      processing_time_ms: 0,
    }
  }

  dispose(): void {}
}

// ─── Provider Factory ───────────────────────────────────────────────────────

let activeProvider: InferenceProvider | null = null

export async function getInferenceProvider(): Promise<InferenceProvider> {
  if (activeProvider) return activeProvider

  const backend = (process.env.INFERENCE_BACKEND || 'gemini').toLowerCase()

  switch (backend) {
    case 'python': {
      try {
        const { PythonInferenceProvider } = await import('./python-inference')
        const provider = new PythonInferenceProvider()
        activeProvider = provider
        const healthy = await provider.checkHealth()
        if (!healthy) {
          console.warn('[InferenceProvider] Python inference server not available at INFERENCE_SERVER_URL.')
        }
        return provider
      } catch (error) {
        console.warn('[InferenceProvider] Python inference provider not available:', error)
        activeProvider = new GeminiProvider()
        return activeProvider
      }
    }
    case 'onnx': {
      try {
        // Load ONNX provider dynamically to avoid compile-time resolution
        const { ONNXProvider } = await import('./onnx-provider')
        const provider = new ONNXProvider()
        activeProvider = provider
        await provider.initialize()
        return provider
      } catch {
        console.warn('[InferenceProvider] ONNX provider not available. Install onnxruntime-node and set ONNX_MODEL_PATH.')
        activeProvider = new ONNXProviderStub()
        return activeProvider
      }
    }
    case 'gemini':
    default:
      activeProvider = new GeminiProvider()
      return activeProvider
  }
}

export function resetProvider(): void {
  if (activeProvider) {
    activeProvider.dispose()
    activeProvider = null
  }
}
