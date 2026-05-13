'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Shield,
  Layers,
  Droplets,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import {
  cttpReinforcementBadge,
  formatThickness,
  formatFactor,
  CTTP_COLORS,
} from '@/lib/ui-helpers'

interface Traceability {
  rule_source: string
  traffic_class_input: string
  visual_status_mapped: string
  deflection_zone: string
  matrix_row_matched: string
}

interface ReinforcementResult {
  reinforcement_type: string
  material: string
  structure: string
  base_thickness_cm: number
  binder: string | null
  compaction: string
  drainage_note: string
  traceability: Traceability
}

interface ReinforcementPanelProps {
  result: ReinforcementResult | null
  /** Whether the design is currently being computed */
  isComputing?: boolean
}

const MATERIAL_DESCRIPTIONS: Record<string, string> = {
  GB: 'Grave Bitume - Hot-mix asphalt base course with bituminous binder',
  GC: 'Grave Ciment - Cement-treated base course with hydraulic binder',
  GNT: 'Grave Non Traitée - Untreated granular base course (unbound)',
}

function CrossSectionDiagram({ baseThickness }: { baseThickness: number }) {
  const bbThickness = 5
  const totalThickness = bbThickness + baseThickness
  const svgHeight = 200
  const baseHeightPx = Math.min(160, (baseThickness / totalThickness) * svgHeight)
  const bbHeightPx = Math.min(40, (bbThickness / totalThickness) * svgHeight)
  const yBase = svgHeight - baseHeightPx
  const yBB = yBase - bbHeightPx

  return (
    <div className="w-full flex flex-col items-center">
      <svg
        viewBox={`0 0 300 ${svgHeight}`}
        className="w-full max-w-xs"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Pavement cross-section: ${bbThickness}cm BB over ${baseThickness}cm base, total ${totalThickness}cm`}
      >
        {/* BB Layer (top) */}
        <rect
          x={40}
          y={yBB}
          width={220}
          height={bbHeightPx}
          className="cttp-layer-bb"
        />
        <text
          x={150}
          y={yBB + bbHeightPx / 2 + 4}
          fill="white"
          fontSize={12}
          className="cttp-layer-label"
        >
          BB - {bbThickness} cm
        </text>

        {/* Base Layer (bottom) */}
        <rect
          x={40}
          y={yBase}
          width={220}
          height={baseHeightPx}
          className="cttp-layer-base"
        />
        <text
          x={150}
          y={yBase + baseHeightPx / 2 + 4}
          fill="#14532D"
          fontSize={13}
          className="cttp-layer-label"
        >
          Base - {baseThickness} cm
        </text>

        {/* Total thickness bracket */}
        <line x1={275} y1={yBB} x2={275} y2={svgHeight} stroke="#64748b" strokeWidth={1} />
        <line x1={270} y1={yBB} x2={280} y2={yBB} stroke="#64748b" strokeWidth={1} />
        <line x1={270} y1={svgHeight} x2={280} y2={svgHeight} stroke="#64748b" strokeWidth={1} />
        <text
          x={290}
          y={(yBB + svgHeight) / 2 + 3}
          textAnchor="start"
          fill="#64748b"
          fontSize={10}
          className="cttp-layer-label"
          style={{ textAnchor: 'start' }}
        >
          {totalThickness} cm
        </text>
      </svg>
      <p className="cttp-mono text-xs text-cttp-neutral/70 dark:text-slate-400 mt-1">
        Total: {formatThickness(totalThickness)}
      </p>
    </div>
  )
}

export default function ReinforcementPanel({ result, isComputing }: ReinforcementPanelProps) {
  const [traceOpen, setTraceOpen] = useState(false)

  // ─── Loading State ──────────────────────────────────────────────────────
  if (isComputing && !result) {
    return (
      <div className="cttp-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex items-center justify-center size-12 rounded-full bg-cttp-accent/15 mb-4">
            <Loader2 className="size-6 animate-spin text-cttp-accent" />
          </div>
          <p className="text-sm font-semibold text-cttp-primary dark:text-cttp-accent-light">
            Calculating per CTTP p.45…
          </p>
          <p className="text-xs text-cttp-muted mt-1">
            Applying reinforcement decision matrix
          </p>
        </div>
      </div>
    )
  }

  // ─── Empty State ────────────────────────────────────────────────────────
  if (!result) {
    return (
      <div className="cttp-card">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Layers className="size-12 text-cttp-accent/30 dark:text-slate-600 mb-4" />
          <p className="text-sm text-cttp-neutral/60 dark:text-slate-400">
            No reinforcement design yet. Configure inputs and run the calculation.
          </p>
        </div>
      </div>
    )
  }

  const materialDesc = MATERIAL_DESCRIPTIONS[result.material] || result.material

  return (
    <div className="cttp-card">
      <CardHeader className="pb-3">
        <CardTitle className="cttp-section-header text-base">
          <Shield className="size-5 text-cttp-primary dark:text-cttp-accent-light" />
          Reinforcement Design
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-6 pb-6">
        {/* Reinforcement Type Badge & Material Badge */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={cttpReinforcementBadge(result.reinforcement_type as any)}>
            {result.reinforcement_type}
          </span>
          <Badge variant="outline" className="cttp-mono text-xs">
            {result.material}
          </Badge>
        </div>

        <p className="text-sm text-cttp-neutral/70 dark:text-slate-400 leading-relaxed">
          {materialDesc}
        </p>

        <Separator />

        {/* Cross-section Diagram */}
        <div>
          <h3 className="cttp-section-header mb-3">
            <Layers className="size-4 text-cttp-accent" />
            Structure Cross-Section
          </h3>
          <CrossSectionDiagram baseThickness={result.base_thickness_cm} />
        </div>

        <Separator />

        {/* Engineering Detail Rows */}
        <div className="space-y-1">
          {/* Structure */}
          <div className="cttp-detail-row">
            <span className="cttp-detail-label">Structure</span>
            <span className="cttp-detail-value cttp-mono">{result.structure}</span>
          </div>

          {/* Base Thickness */}
          <div className="cttp-detail-row">
            <span className="cttp-detail-label">Base Thickness</span>
            <span className="cttp-detail-value text-lg font-bold">
              {formatThickness(result.base_thickness_cm)}
            </span>
          </div>

          {/* Binder */}
          {result.binder && (
            <div className="cttp-detail-row">
              <span className="cttp-detail-label">Binder Grade</span>
              <span className="cttp-detail-value cttp-mono">{result.binder}</span>
            </div>
          )}

          {/* Compaction */}
          <div className="cttp-detail-row items-start">
            <span className="cttp-detail-label">Compaction</span>
            <span className="cttp-mono text-sm text-cttp-neutral dark:text-slate-100 text-right max-w-[60%]">
              {result.compaction}
            </span>
          </div>
        </div>

        {/* Drainage Note - amber/warning color scheme */}
        <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${CTTP_COLORS.fair.bg} ${CTTP_COLORS.fair.border}`}>
          <AlertTriangle className={`size-4 mt-0.5 shrink-0 ${CTTP_COLORS.fair.text}`} />
          <div>
            <span className={`text-sm font-semibold ${CTTP_COLORS.fair.text}`}>Drainage</span>
            <p className={`text-sm mt-0.5 ${CTTP_COLORS.fair.text} opacity-80`}>{result.drainage_note}</p>
          </div>
        </div>

        <Separator />

        {/* ─── Always-Visible Traceability Footer (Fix 3) ──────────────── */}
        <div className="rounded-lg border border-cttp-accent/15 bg-cttp-accent/5 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/30">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="size-3.5 text-cttp-accent" />
            <span className="text-xs font-semibold text-cttp-primary dark:text-cttp-accent-light">
              CTTP Traceability
            </span>
          </div>
          <p className="cttp-mono text-[11px] leading-relaxed text-cttp-neutral dark:text-slate-300">
            {result.traceability.rule_source} → Traffic: <span className="font-semibold text-cttp-primary dark:text-cttp-accent-light">{result.traceability.traffic_class_input}</span> | Visual: <span className="font-semibold text-cttp-primary dark:text-cttp-accent-light">{result.traceability.visual_status_mapped}</span> | Deflection: <span className="font-semibold text-cttp-primary dark:text-cttp-accent-light">{result.traceability.deflection_zone}</span>
          </p>
          <p className="cttp-mono text-[10px] mt-1.5 text-cttp-muted dark:text-slate-500">
            Decision: {result.traceability.matrix_row_matched}
          </p>
        </div>

        {/* Traceability Detail Section (Collapsible — expanded detail) */}
        <Collapsible open={traceOpen} onOpenChange={setTraceOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md hover:bg-cttp-accent/5 dark:hover:bg-slate-800/50 px-2 py-1.5 transition-colors">
            <span className="cttp-section-header text-xs uppercase tracking-wider">
              <Info className="size-3.5 text-cttp-neutral/60 dark:text-slate-400" />
              Full Traceability Record
            </span>
            {traceOpen ? (
              <ChevronUp className="size-4 text-cttp-muted" />
            ) : (
              <ChevronDown className="size-4 text-cttp-muted" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2 pl-2">
            <div className="rounded-lg border border-cttp-accent/15 bg-cttp-accent/5 dark:border-slate-700 dark:bg-slate-800/30 p-3 overflow-x-auto cttp-scrollbar">
              <pre className="cttp-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                {JSON.stringify({
                  rule_source: result.traceability.rule_source,
                  traffic_class_input: result.traceability.traffic_class_input,
                  visual_status_mapped: result.traceability.visual_status_mapped,
                  deflection_zone: result.traceability.deflection_zone,
                  matrix_row_matched: result.traceability.matrix_row_matched,
                }, null, 2)}
              </pre>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="cttp-detail-row flex-col !items-start gap-0.5 py-1">
                <span className="cttp-detail-label text-xs">Rule Source</span>
                <span className="cttp-mono text-xs text-cttp-neutral dark:text-slate-100">{result.traceability.rule_source}</span>
              </div>
              <div className="cttp-detail-row flex-col !items-start gap-0.5 py-1">
                <span className="cttp-detail-label text-xs">Traffic Class</span>
                <span className="cttp-mono text-xs text-cttp-neutral dark:text-slate-100">{result.traceability.traffic_class_input}</span>
              </div>
              <div className="cttp-detail-row flex-col !items-start gap-0.5 py-1">
                <span className="cttp-detail-label text-xs">Visual Status Mapped</span>
                <span className="cttp-mono text-xs text-cttp-neutral dark:text-slate-100">{result.traceability.visual_status_mapped}</span>
              </div>
              <div className="cttp-detail-row flex-col !items-start gap-0.5 py-1">
                <span className="cttp-detail-label text-xs">Deflection Zone</span>
                <span className="cttp-mono text-xs text-cttp-neutral dark:text-slate-100">{result.traceability.deflection_zone}</span>
              </div>
              <div className="cttp-detail-row flex-col !items-start gap-0.5 py-1 sm:col-span-2">
                <span className="cttp-detail-label text-xs">Matrix Row Matched</span>
                <span className="cttp-mono text-xs text-cttp-neutral dark:text-slate-100">{result.traceability.matrix_row_matched}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </div>
  )
}

export type { ReinforcementResult, Traceability, ReinforcementPanelProps }
