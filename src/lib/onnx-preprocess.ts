/**
 * ONNX Image Preprocessing — CPU-only, no native dependencies
 * Resizes images to max 1024px, normalizes to [0,1], returns NHWC tensor
 *
 * Uses Sharp (already installed) for image resizing and pixel extraction
 */

import sharp from 'sharp'

const MAX_DIMENSION = 1024

export interface PreprocessResult {
  tensor: {
    data: Float32Array
    dims: number[]
    type: string
    dispose: () => void
  }
  inputName: string
  scaleRatio: number
  paddedWidth: number
  paddedHeight: number
}

export async function preprocessImage(imageBuffer: Buffer): Promise<PreprocessResult> {
  // Get image metadata
  const metadata = await sharp(imageBuffer).metadata()
  const origWidth = metadata.width || 640
  const origHeight = metadata.height || 480

  // Calculate resize dimensions (max 1024px on longest side, maintain aspect ratio)
  const maxDim = Math.max(origWidth, origHeight)
  const scaleRatio = maxDim > MAX_DIMENSION ? MAX_DIMENSION / maxDim : 1
  const targetWidth = Math.round(origWidth * scaleRatio)
  const targetHeight = Math.round(origHeight * scaleRatio)

  // Resize and extract raw pixels
  const rawPixels = await sharp(imageBuffer)
    .resize(targetWidth, targetHeight, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()

  // Convert to Float32 NHWC tensor normalized to [0, 1]
  const pixelCount = targetWidth * targetHeight * 3
  const float32Data = new Float32Array(pixelCount)

  for (let i = 0; i < pixelCount; i++) {
    float32Data[i] = rawPixels[i] / 255.0
  }

  return {
    tensor: {
      data: float32Data,
      dims: [1, targetHeight, targetWidth, 3],
      type: 'float32',
      dispose: () => {
        // Float32Array is garbage collected, no manual disposal needed
      },
    },
    inputName: 'images',
    scaleRatio,
    paddedWidth: targetWidth,
    paddedHeight: targetHeight,
  }
}
