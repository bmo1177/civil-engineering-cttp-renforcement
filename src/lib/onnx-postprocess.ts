/**
 * ONNX Output Postprocessing — Parse YOLO/COCO format detections
 * Maps raw model output to the unified DetectionBox interface
 *
 * Supports YOLOv5/v8 output format: [batch, num_detections, 5+num_classes]
 * Each detection: [x_center, y_center, width, height, objectness, class_scores...]
 */

import type { DetectionBox } from './inference-types'

// Distress class labels for ONNX model (must match training)
const DISTRESS_CLASSES = [
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

// Confidence → severity mapping
function confidenceToSeverity(confidence: number): DetectionBox['severity'] {
  if (confidence >= 0.85) return 'high'
  if (confidence >= 0.6) return 'medium'
  return 'low'
}

interface InferenceOutput {
  [key: string]: {
    data: Float32Array | number[]
    dims: number[]
    type: string
  }
}

export function postprocessDetections(
  output: InferenceOutput,
  confThreshold: number = 0.5,
  imageSize: number = 1024
): DetectionBox[] {
  const detections: DetectionBox[] = []

  // Get the first output tensor (YOLO format)
  const outputKeys = Object.keys(output)
  if (outputKeys.length === 0) return detections

  const firstOutput = output[outputKeys[0]]
  if (!firstOutput || !firstOutput.data) return detections

  const data = firstOutput.data
  const dims = firstOutput.dims

  // YOLOv5/v8 format: [1, num_detections, 5+num_classes] or [1, 5+num_classes, num_detections]
  if (dims.length < 3) return detections

  const isTransposed = dims[1] < dims[2]
  const numDetections = isTransposed ? dims[1] : dims[2]
  const numValues = isTransposed ? dims[2] : dims[1]
  const numClasses = numValues - 5

  for (let i = 0; i < numDetections; i++) {
    // Extract bounding box and confidence
    let xCenter: number, yCenter: number, w: number, h: number, objectness: number

    if (isTransposed) {
      // Format: [1, 5+classes, num_detections]
      const baseIdx = i
      xCenter = getVal(data, baseIdx + numDetections * 0)
      yCenter = getVal(data, baseIdx + numDetections * 1)
      w = getVal(data, baseIdx + numDetections * 2)
      h = getVal(data, baseIdx + numDetections * 3)
      objectness = getVal(data, baseIdx + numDetections * 4)
    } else {
      // Format: [1, num_detections, 5+classes]
      const baseIdx = i * numValues
      xCenter = getVal(data, baseIdx + 0)
      yCenter = getVal(data, baseIdx + 1)
      w = getVal(data, baseIdx + 2)
      h = getVal(data, baseIdx + 3)
      objectness = getVal(data, baseIdx + 4)
    }

    if (objectness < confThreshold) continue

    // Find best class
    let bestClassIdx = 0
    let bestClassScore = 0

    for (let c = 0; c < numClasses; c++) {
      const classIdx = isTransposed
        ? i + numDetections * (5 + c)
        : i * numValues + 5 + c
      const classScore = getVal(data, classIdx)
      if (classScore > bestClassScore) {
        bestClassScore = classScore
        bestClassIdx = c
      }
    }

    const confidence = objectness * bestClassScore
    if (confidence < confThreshold) continue

    // Convert from center coordinates to top-left
    const x = Math.max(0, Math.round((xCenter - w / 2) * imageSize))
    const y = Math.max(0, Math.round((yCenter - h / 2) * imageSize))
    const width = Math.round(w * imageSize)
    const height = Math.round(h * imageSize)

    const label = bestClassIdx < DISTRESS_CLASSES.length
      ? DISTRESS_CLASSES[bestClassIdx]
      : `Distress_${bestClassIdx}`

    detections.push({
      label,
      confidence: Math.min(confidence, 1.0),
      x,
      y,
      width: Math.max(width, 10),
      height: Math.max(height, 10),
      severity: confidenceToSeverity(confidence),
    })
  }

  // Non-Maximum Suppression (simple IoU-based)
  return nms(detections, 0.45)
}

function getVal(data: Float32Array | number[], index: number): number {
  return index < data.length ? Number(data[index]) : 0
}

/** Simple Non-Maximum Suppression */
function nms(detections: DetectionBox[], iouThreshold: number): DetectionBox[] {
  const sorted = [...detections].sort((a, b) => b.confidence - a.confidence)
  const kept: DetectionBox[] = []
  const suppressed = new Set<number>()

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue
    kept.push(sorted[i])

    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue
      if (iou(sorted[i], sorted[j]) > iouThreshold) {
        suppressed.add(j)
      }
    }
  }

  return kept
}

/** Intersection over Union */
function iou(a: DetectionBox, b: DetectionBox): number {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const areaA = a.width * a.height
  const areaB = b.width * b.height
  const union = areaA + areaB - intersection

  return union > 0 ? intersection / union : 0
}
