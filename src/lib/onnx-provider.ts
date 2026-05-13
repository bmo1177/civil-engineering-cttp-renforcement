/**
 * ONNX Inference Provider — loaded dynamically only when INFERENCE_BACKEND=onnx
 *
 * This file is in a separate module so that Turbopack doesn't try to resolve
 * onnxruntime-node when building the predict API route. The dynamic import
 * of this file in inference-provider.ts ensures it's only loaded on demand.
 */

import type { InferenceProvider, InferenceResult } from './inference-provider'
import type { DetectionBox } from './inference-types'

function determineStatus(detections: DetectionBox[]): 'Bon' | 'Moyen' | 'Mauvais' {
  const highCount = detections.filter((d) => d.severity === 'high').length
  const medCount = detections.filter((d) => d.severity === 'medium').length
  if (highCount >= 2 || (highCount >= 1 && medCount >= 2)) return 'Mauvais'
  if (medCount >= 2 || highCount >= 1) return 'Moyen'
  return 'Bon'
}

export class ONNXProvider implements InferenceProvider {
  readonly name = 'onnx'
  readonly isAvailable: boolean
  private session: unknown = null
  private modelPath: string | null = null

  constructor(modelPath?: string) {
    this.modelPath = modelPath || process.env.ONNX_MODEL_PATH || null
    this.isAvailable = !!this.modelPath
  }

  async initialize(): Promise<void> {
    if (!this.modelPath) {
      console.warn('[ONNXProvider] No model path configured. Set ONNX_MODEL_PATH env variable.')
      return
    }

    try {
      // Dynamic import of onnxruntime-node (optional dependency)
      // This file is only loaded when INFERENCE_BACKEND=onnx, so onnxruntime-node
      // must be installed in that case.
      let ort: any
      try {
        ort = await import('onnxruntime-node')
      } catch {
        console.warn('[ONNXProvider] onnxruntime-node is not installed. ONNX inference disabled.')
        this.isAvailable = false
        return
      }
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
      })
      console.log(`[ONNXProvider] Model loaded: ${this.modelPath}`)
    } catch (error) {
      console.warn('[ONNXProvider] Failed to load ONNX model:', error)
      this.isAvailable = false
    }
  }

  async analyze(imageBuffer: Buffer, _mimeType: string): Promise<InferenceResult> {
    const startTime = Date.now()

    if (!this.session) {
      return {
        detections: [],
        image_status: 'Bon',
        model_used: 'onnx-unavailable',
        demo_mode: true,
        processing_time_ms: Date.now() - startTime,
      }
    }

    try {
      let ort: any
      try {
        ort = await import('onnxruntime-node')
      } catch {
        return {
          detections: [],
          image_status: 'Bon',
          model_used: 'onnx-unavailable',
          demo_mode: true,
          processing_time_ms: Date.now() - startTime,
        }
      }

      // Preprocess: resize to max 1024px, normalize to [0,1]
      const { preprocessImage } = await import('./onnx-preprocess')
      const { tensor, inputName } = await preprocessImage(imageBuffer)

      // Run inference
      const results = await (this.session as any).run({ [inputName]: tensor })

      // Postprocess: parse YOLO/COCO format output
      const { postprocessDetections } = await import('./onnx-postprocess')
      const detections = postprocessDetections(results, 0.5, 1024)

      // Cleanup tensors
      tensor.dispose()

      return {
        detections,
        image_status: determineStatus(detections),
        model_used: 'onnx-cpu',
        demo_mode: false,
        processing_time_ms: Date.now() - startTime,
      }
    } catch (error) {
      console.error('[ONNXProvider] Inference error:', error)
      return {
        detections: [],
        image_status: 'Bon',
        model_used: 'onnx-error',
        demo_mode: true,
        processing_time_ms: Date.now() - startTime,
      }
    }
  }

  dispose(): void {
    if (this.session) {
      try {
        (this.session as { release?: () => void }).release?.()
      } catch {
        // Ignore cleanup errors
      }
      this.session = null
    }
  }
}
