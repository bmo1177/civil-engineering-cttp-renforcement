/**
 * Shared types for inference providers
 */

export interface DetectionBox {
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  severity: 'low' | 'medium' | 'high'
}
