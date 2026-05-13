'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  SEVERITY_STROKE_COLORS,
  SEVERITY_FILL_COLORS,
  getSeverityColor,
  CTTP_COLORS,
  formatPercent,
  type Severity,
} from '@/lib/ui-helpers'

interface Detection {
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  severity: 'low' | 'medium' | 'high'
}

interface DetectionCanvasProps {
  imageUrl: string
  detections: Detection[]
  onDetectionClick?: (detection: Detection) => void
}

const SEVERITY_LABELS: Record<Detection['severity'], string> = {
  low: 'Faible',
  medium: 'Moyen',
  high: 'Élevé',
}

export default function DetectionCanvas({
  imageUrl,
  detections,
  onDetectionClick,
}: DetectionCanvasProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [imageNatural, setImageNatural] = useState({ width: 1, height: 1 })
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  // Observe container resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect
        if (width > 0) {
          setContainerWidth(width)
        }
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Compute displayed height based on image aspect ratio and container width
  const aspectRatio = imageNatural.width / imageNatural.height || 1
  const displayHeight = useMemo(
    () => (containerWidth > 0 ? containerWidth / aspectRatio : 0),
    [containerWidth, aspectRatio]
  )

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current
    if (img) {
      setImageNatural({ width: img.naturalWidth, height: img.naturalHeight })
    }
  }, [])

  const handleDetectionClick = useCallback(
    (index: number) => {
      setSelectedIndex((prev) => (prev === index ? null : index))
      if (onDetectionClick) {
        onDetectionClick(detections[index])
      }
    },
    [detections, onDetectionClick]
  )

  // Click on empty area deselects
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on the container (not a detection)
      if (e.target === e.currentTarget) {
        setSelectedIndex(null)
      }
    },
    []
  )

  // Convert normalized detection coordinates to pixel values
  const scale = containerWidth / imageNatural.width || 1
  const scaleY = displayHeight / imageNatural.height || 1

  return (
    <div
      ref={containerRef}
      className="cttp-card relative w-full overflow-hidden rounded-xl border-cttp-primary/30 bg-cttp-bg-dark"
      onClick={handleCanvasClick}
      style={{ height: displayHeight > 0 ? displayHeight : undefined }}
    >
      {/* Base image */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Image analysée pour la détection de défauts"
        onLoad={handleImageLoad}
        className="absolute inset-0 h-full w-full object-fill"
        draggable={false}
      />

      {/* Dark vignette overlay for better contrast on bright images */}
      {containerWidth > 0 && displayHeight > 0 && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/10" />
      )}

      {/* SVG overlay for detections */}
      {containerWidth > 0 && displayHeight > 0 && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${containerWidth} ${displayHeight}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Defs for filter effects */}
          <defs>
            <filter id="glow-low" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-medium" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-high" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {detections.map((det, index) => {
            const strokeColor = SEVERITY_STROKE_COLORS[det.severity]
            const fillColor = SEVERITY_FILL_COLORS[det.severity]
            const px = det.x * scale
            const py = det.y * scaleY
            const pw = det.width * scale
            const ph = det.height * scaleY
            const isSelected = selectedIndex === index
            const severityInfo = getSeverityColor(det.severity)

            return (
              <g key={index}>
                {/* Bounding box — solid border, no dashes */}
                <rect
                  x={px}
                  y={py}
                  width={pw}
                  height={ph}
                  fill={isSelected ? fillColor.replace('0.10', '0.20') : fillColor}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3.5 : 2}
                  rx={3}
                  className="cursor-pointer transition-all duration-150"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDetectionClick(index)
                  }}
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 6px ${strokeColor}) drop-shadow(0 0 12px ${strokeColor}40)` : undefined,
                  }}
                />

                {/* Corner accents for selected box */}
                {isSelected && (
                  <>
                    {/* Top-left corner */}
                    <path
                      d={`M${px},${py + 10} L${px},${py} L${px + 10},${py}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={4}
                      strokeLinecap="square"
                      className="pointer-events-none"
                    />
                    {/* Top-right corner */}
                    <path
                      d={`M${px + pw - 10},${py} L${px + pw},${py} L${px + pw},${py + 10}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={4}
                      strokeLinecap="square"
                      className="pointer-events-none"
                    />
                    {/* Bottom-left corner */}
                    <path
                      d={`M${px},${py + ph - 10} L${px},${py + ph} L${px + 10},${py + ph}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={4}
                      strokeLinecap="square"
                      className="pointer-events-none"
                    />
                    {/* Bottom-right corner */}
                    <path
                      d={`M${px + pw - 10},${py + ph} L${px + pw},${py + ph} L${px + pw},${py + ph - 10}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={4}
                      strokeLinecap="square"
                      className="pointer-events-none"
                    />
                  </>
                )}

                {/* Label background — more prominent pill shape */}
                <rect
                  x={px - 1}
                  y={py - 26}
                  width={Math.max(pw + 2, 110)}
                  height={24}
                  fill={strokeColor}
                  rx={4}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDetectionClick(index)
                  }}
                />

                {/* Severity indicator dot on label */}
                <circle
                  cx={px + 10}
                  cy={py - 14}
                  r={4}
                  fill="white"
                  fillOpacity={0.9}
                  className="pointer-events-none"
                />

                {/* Label text — bolder, larger for civil-engineering readability */}
                <text
                  x={px + 20}
                  y={py - 9}
                  fill="white"
                  fontSize={12}
                  fontFamily="ui-monospace, 'Geist Mono', monospace"
                  fontWeight={700}
                  className="pointer-events-none select-none"
                  letterSpacing="0.02em"
                >
                  {det.label}
                </text>

                {/* Confidence value — prominent, right-aligned on label pill */}
                <text
                  x={px + Math.max(pw + 2, 110) - 8}
                  y={py - 9}
                  fill="white"
                  fillOpacity={0.95}
                  fontSize={11}
                  fontFamily="ui-monospace, 'Geist Mono', monospace"
                  fontWeight={700}
                  textAnchor="end"
                  className="pointer-events-none select-none"
                >
                  {formatPercent(det.confidence)}
                </text>
              </g>
            )
          })}
        </svg>
      )}

      {/* Detail tooltip for selected detection */}
      <TooltipProvider>
        {selectedIndex !== null && detections[selectedIndex] && (
          <div
            className="absolute"
            style={{
              left: Math.min(
                detections[selectedIndex].x * scale + detections[selectedIndex].width * scale + 12,
                containerWidth - 256
              ),
              top: Math.max(detections[selectedIndex].y * scaleY - 8, 4),
            }}
          >
            <Tooltip open={true}>
              <TooltipTrigger asChild>
                <span className="inline-block size-1" />
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={4}
                className="w-60 border-0 p-0 shadow-xl"
              >
                <div className="rounded-lg border border-cttp-primary/30 bg-cttp-bg-dark p-4 text-slate-100 shadow-2xl">
                  {/* Header with severity badge */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-bold tracking-tight text-white">
                      {detections[selectedIndex].label}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: SEVERITY_STROKE_COLORS[detections[selectedIndex].severity],
                        color: '#fff',
                      }}
                    >
                      <span className="cttp-status-dot bg-white/80" />
                      {SEVERITY_LABELS[detections[selectedIndex].severity]}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="mb-3 h-px bg-cttp-primary/30" />

                  {/* Detail rows */}
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-cttp-muted">Confiance</span>
                      <span className="cttp-mono font-bold text-white">
                        {formatPercent(detections[selectedIndex].confidence)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cttp-muted">Position</span>
                      <span className="cttp-mono font-semibold text-slate-200">
                        ({Math.round(detections[selectedIndex].x)}, {Math.round(detections[selectedIndex].y)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-cttp-muted">Dimensions</span>
                      <span className="cttp-mono font-semibold text-slate-200">
                        {Math.round(detections[selectedIndex].width)} × {Math.round(detections[selectedIndex].height)}
                      </span>
                    </div>

                    {/* Confidence bar */}
                    <div className="pt-1">
                      <div className="cttp-gauge-track h-1.5 bg-cttp-primary/40">
                        <div
                          className="cttp-gauge-fill"
                          style={{
                            width: `${detections[selectedIndex].confidence * 100}%`,
                            backgroundColor: SEVERITY_STROKE_COLORS[detections[selectedIndex].severity],
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </TooltipProvider>

      {/* Empty state when no detections */}
      {detections.length === 0 && containerWidth > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-cttp-bg-dark/60 backdrop-blur-sm">
          <div className="rounded-lg border border-cttp-primary/30 bg-cttp-bg-dark/90 px-4 py-2.5 text-xs font-medium text-cttp-muted">
            Aucune détection
          </div>
        </div>
      )}

      {/* Detection count badge — high contrast on dark bg */}
      {detections.length > 0 && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md border border-cttp-accent/30 bg-cttp-bg-dark/90 px-3 py-1.5 text-xs font-bold text-cttp-accent-light shadow-lg backdrop-blur-sm">
          <span
            className="cttp-status-dot"
            style={{ backgroundColor: CTTP_COLORS.neutral.hex }}
          />
          <span className="cttp-mono">{detections.length}</span>
          <span className="text-cttp-muted">détection{detections.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Severity legend — bottom-left, always visible when detections present */}
      {detections.length > 0 && (
        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-md border border-cttp-accent/20 bg-cttp-bg-dark/85 px-3 py-1.5 backdrop-blur-sm">
          {(['low', 'medium', 'high'] as Severity[]).map((sev) => (
            <div key={sev} className="flex items-center gap-1.5">
              <span
                className="cttp-status-dot"
                style={{ backgroundColor: SEVERITY_STROKE_COLORS[sev] }}
              />
              <span className="text-[10px] font-medium text-cttp-muted">
                {SEVERITY_LABELS[sev]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
