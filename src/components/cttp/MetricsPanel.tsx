'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Activity, Thermometer, Gauge, Route, Layers } from 'lucide-react'
import { UNI_THRESHOLDS, classifyDeflection, type SurfaceType, type VisualStatus } from '@/lib/cttp-rules'
import {
  getDeflectionColor,
  getUNIColor,
  getDeflectionZoneColor,
  getAcceptabilityColor,
  cttpStatusBadge,
  cttpDeflectionBadge,
  cttpTrafficBadge,
  formatDeflection,
  formatUNI,
  formatFactor,
  getUNIProgressWidth,
  getDeflectionProgressWidth,
  getUNIThresholdMarkers,
  CTTP_COLORS,
} from '@/lib/ui-helpers'

interface MetricsPanelProps {
  trafficClass: string
  surfaceType: SurfaceType
  uni: number
  deflectionCorr: number
  visualStatus: VisualStatus
  /** Computed Cs value from deflection calculator */
  cs?: number
  /** Computed Cr value from deflection calculator */
  cr?: number
  /** Computed Ct value from deflection calculator */
  ct?: number
}

// ─── CTTP-Correct Classifications (preserved logic) ──────────────────────────

/** UNI classification using CTTP thresholds per surface type (Pages 30–35) */
function getUniClassification(uni: number, surfaceType: SurfaceType): {
  label: string
  color: string
  threshold: { bon: number; moyen: number }
} {
  const thresholds = UNI_THRESHOLDS[surfaceType]
  if (uni < thresholds.Bon.max) {
    return { label: 'Bon', color: 'text-emerald-700 dark:text-emerald-300', threshold: { bon: thresholds.Bon.max, moyen: thresholds.Moyen.max } }
  }
  if (uni < thresholds.Moyen.max) {
    return { label: 'Moyen', color: 'text-amber-700 dark:text-amber-300', threshold: { bon: thresholds.Bon.max, moyen: thresholds.Moyen.max } }
  }
  return { label: 'Mauvais', color: 'text-red-700 dark:text-red-300', threshold: { bon: thresholds.Bon.max, moyen: thresholds.Moyen.max } }
}

function getUniBarColor(uni: number, surfaceType: SurfaceType): string {
  const thresholds = UNI_THRESHOLDS[surfaceType]
  if (uni < thresholds.Bon.max) return CTTP_COLORS.good.bar
  if (uni < thresholds.Moyen.max) return CTTP_COLORS.fair.bar
  return CTTP_COLORS.poor.bar
}

/** Deflection zone using CTTP thresholds: Low ≤50, Medium 51–120, High >120 (1/100 mm) */
function getDeflectionZoneInfo(d: number): { label: string; color: string; zone: string } {
  const zone = classifyDeflection(d)
  const zoneColor = getDeflectionZoneColor(zone)
  const mapping: Record<string, { label: string }> = {
    Low: { label: 'Faible (≤50)' },
    Medium: { label: 'Moyenne (51–120)' },
    High: { label: 'Élevée (>120)' },
  }
  return { ...mapping[zone], color: zoneColor.text, zone }
}

function getDeflectionBarColor(d: number): string {
  const deflColor = getDeflectionColor(d)
  return deflColor.bar
}

/** Traffic class descriptions using CTTP cumulative HV ranges */
const TRAFFIC_CLASS_INFO: Record<string, string> = {
  T0: '< 3.5×10⁵ PL cumulés',
  T1: '3.5×10⁵ – 7.3×10⁵ PL cumulés',
  T2: '7.3×10⁵ – 2.0×10⁶ PL cumulés',
  T3: '2.0×10⁶ – 7.3×10⁶ PL cumulés',
  T4: '7.3×10⁶ – 4.0×10⁷ PL cumulés',
  T5: '> 4.0×10⁷ PL cumulés',
}

/** Visual status badge using CTTP Acceptable/Non-Acceptable mapping */
function getVisualStatusStyle(status: string): { bg: string; mapped: string; mappedKey: 'Acceptable' | 'Non_Acceptable' } {
  const s = status.toLowerCase()
  if (s === 'bon') return { bg: cttpStatusBadge('Bon'), mapped: 'Acceptable', mappedKey: 'Acceptable' }
  if (s === 'moyen') return { bg: cttpStatusBadge('Moyen'), mapped: 'Non Acceptable', mappedKey: 'Non_Acceptable' }
  if (s === 'mauvais') return { bg: cttpStatusBadge('Mauvais'), mapped: 'Non Acceptable', mappedKey: 'Non_Acceptable' }
  return { bg: 'bg-muted text-muted-foreground', mapped: '-', mappedKey: 'Non_Acceptable' }
}

const SURFACE_DESCRIPTIONS: Record<string, string> = {
  BB: 'Béton Bitumineux - Hot-mix asphalt wearing course',
  ES: 'Enduit Superficiel - Surface dressing / chip seal',
  GNT: 'Grave Non Traitée - Untreated granular base',
}

export default function MetricsPanel({
  trafficClass,
  surfaceType,
  uni,
  deflectionCorr,
  visualStatus,
  cs,
  cr,
  ct,
}: MetricsPanelProps) {
  const uniClassification = useMemo(() => getUniClassification(uni, surfaceType), [uni, surfaceType])
  const uniBarColorClass = useMemo(() => getUniBarColor(uni, surfaceType), [uni, surfaceType])
  const deflInfo = useMemo(() => getDeflectionZoneInfo(deflectionCorr), [deflectionCorr])
  const deflBarColorClass = useMemo(() => getDeflectionBarColor(deflectionCorr), [deflectionCorr])
  const trafficInfo = TRAFFIC_CLASS_INFO[trafficClass.toUpperCase()] || ''
  const visualStyle = getVisualStatusStyle(visualStatus)
  const surfaceDesc = SURFACE_DESCRIPTIONS[surfaceType] || surfaceType

  // UNI gauge: use ui-helpers for progress width and threshold markers
  const uniPercent = useMemo(() => getUNIProgressWidth(uni, surfaceType), [uni, surfaceType])
  const uniMarkers = useMemo(() => getUNIThresholdMarkers(surfaceType), [surfaceType])

  // Deflection gauge: use ui-helpers for progress width
  const deflPercent = useMemo(() => getDeflectionProgressWidth(deflectionCorr), [deflectionCorr])

  // Deflection zone markers (as % on 0-200 scale)
  const deflMarker50 = (50 / 200) * 100
  const deflMarker120 = (120 / 200) * 100

  // Acceptability badge color
  const acceptabilityColor = useMemo(() => getAcceptabilityColor(visualStyle.mappedKey), [visualStyle.mappedKey])

  // UNI color info for hex color and status
  const uniColorInfo = useMemo(() => getUNIColor(uni, surfaceType), [uni, surfaceType])

  // Deflection color info
  const deflColorInfo = useMemo(() => getDeflectionColor(deflectionCorr), [deflectionCorr])

  // Determine the CTTP color key for UNI status dot
  const uniDotKey = uni < UNI_THRESHOLDS[surfaceType].Bon.max ? 'good' : uni < UNI_THRESHOLDS[surfaceType].Moyen.max ? 'fair' : 'poor'

  return (
    <Card className="cttp-card w-full">
      <CardHeader className="pb-4">
        <CardTitle className="cttp-section-header">
          <Activity className="size-4 text-cttp-accent" />
          Input Parameters &amp; Computed Values
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* ─── UNI Value ─────────────────────────────────────────────── */}
          <div className="cttp-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <Label className="cttp-detail-label flex items-center gap-1.5">
                <Thermometer className="size-3.5" />
                UNI
              </Label>
              <div className="flex items-center gap-2">
                <span className={cttpStatusBadge(uniColorInfo.status)}>
                  <span className={`cttp-status-dot ${CTTP_COLORS[uniDotKey].dot}`} />
                  {uniClassification.label}
                </span>
              </div>
            </div>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span className="cttp-metric-value" style={{ color: uniColorInfo.hex }}>
                {formatUNI(uni)}
              </span>
              <span className="cttp-detail-label text-xs">mm/km</span>
            </div>
            {/* UNI gauge with threshold markers */}
            <div className="relative">
              <div className="cttp-gauge-track">
                <div
                  className={`cttp-gauge-fill ${uniBarColorClass}`}
                  style={{ width: `${uniPercent}%` }}
                />
              </div>
              {/* Bon threshold marker */}
              <div
                className="cttp-threshold-marker"
                style={{ left: `${uniMarkers.bon}%` }}
                title={`Bon < ${uniClassification.threshold.bon}`}
              />
              {/* Moyen threshold marker */}
              <div
                className="cttp-threshold-marker"
                style={{ left: `${uniMarkers.moyen}%` }}
                title={`Moyen < ${uniClassification.threshold.moyen}`}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px]">
              <span className="text-cttp-muted">0</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Bon &lt;{uniClassification.threshold.bon}</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">Moy &lt;{uniClassification.threshold.moyen}</span>
            </div>
          </div>

          {/* ─── Deflection Value ──────────────────────────────────────── */}
          <div className="cttp-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <Label className="cttp-detail-label flex items-center gap-1.5">
                <Gauge className="size-3.5" />
                Déflexion corrigée
              </Label>
              <span className={cttpDeflectionBadge(deflColorInfo.zone)}>
                <span className={`cttp-status-dot ${deflColorInfo.dot}`} />
                {deflInfo.zone}
              </span>
            </div>
            <div className="mb-2 flex items-baseline gap-1.5">
              <span className="cttp-metric-value" style={{ color: deflColorInfo.hex }}>
                {formatDeflection(deflectionCorr)}
              </span>
              <span className="cttp-detail-label text-xs">1/100 mm</span>
            </div>
            {/* Deflection gauge with zone markers */}
            <div className="relative">
              <div className="cttp-gauge-track">
                <div
                  className={`cttp-gauge-fill ${deflBarColorClass}`}
                  style={{ width: `${deflPercent}%` }}
                />
              </div>
              {/* Zone marker: ≤50 (Low/Medium boundary) */}
              <div
                className="cttp-threshold-marker"
                style={{ left: `${deflMarker50}%` }}
                title="Faible ≤50"
              />
              {/* Zone marker: ≤120 (Medium/High boundary) */}
              <div
                className="cttp-threshold-marker"
                style={{ left: `${deflMarker120}%` }}
                title="Moyenne ≤120"
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px]">
              <span className="text-cttp-muted">0</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Faible ≤50</span>
              <span className="text-amber-600 dark:text-amber-400 font-medium">Moy 120</span>
            </div>
          </div>

          {/* ─── Traffic Class ─────────────────────────────────────────── */}
          <div className="cttp-card p-4">
            <Label className="cttp-detail-label mb-2 flex items-center gap-1.5">
              <Route className="size-3.5" />
              Classe de trafic
            </Label>
            <div className="mt-1">
              <span className={cttpTrafficBadge(trafficClass.toUpperCase() as 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5')}>
                {trafficClass.toUpperCase()}
              </span>
            </div>
            {trafficInfo && (
              <p className="cttp-detail-label mt-2 text-xs">{trafficInfo}</p>
            )}
          </div>

          {/* ─── Visual Status ─────────────────────────────────────────── */}
          <div className="cttp-card p-4">
            <Label className="cttp-detail-label mb-2 flex items-center gap-1.5">
              <Layers className="size-3.5" />
              État visuel
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <span className={visualStyle.bg}>
                {visualStatus}
              </span>
              <span className="text-cttp-muted">→</span>
              <Badge
                variant="outline"
                className={`gap-1.5 rounded-full border ${acceptabilityColor.bg} ${acceptabilityColor.text} ${acceptabilityColor.border}`}
              >
                <span className={`cttp-status-dot ${acceptabilityColor.dot}`} />
                {visualStyle.mapped}
              </Badge>
            </div>
          </div>

          {/* ─── Surface Type ──────────────────────────────────────────── */}
          <div className="cttp-card p-4 sm:col-span-2">
            <Label className="cttp-detail-label mb-2 flex items-center gap-1.5">
              <Layers className="size-3.5" />
              Type de surface
            </Label>
            <div className="cttp-detail-row">
              <span className="cttp-detail-label">{surfaceType}</span>
              <span className="cttp-detail-value">{surfaceDesc}</span>
            </div>
          </div>
        </div>

        {/* ─── Correction Factors ────────────────────────────────────────── */}
        <Separator className="my-4" />

        <div>
          <Label className="cttp-section-header mb-3">
            <Activity className="size-3.5 text-cttp-accent" />
            Coefficients de correction de la déflexion
          </Label>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {/* Cs - Season */}
            <div className="cttp-factor-card">
              <p className="cttp-detail-label text-xs">
                C<sub>s</sub> <span className="text-[9px] opacity-60">(Saison)</span>
              </p>
              <p className={`cttp-metric-value mt-1 text-xl ${cs != null ? '' : 'text-slate-300 dark:text-slate-600'}`}>
                {cs != null ? formatFactor(cs) : '-'}
              </p>
            </div>
            {/* Cr - Region */}
            <div className="cttp-factor-card">
              <p className="cttp-detail-label text-xs">
                C<sub>r</sub> <span className="text-[9px] opacity-60">(Région)</span>
              </p>
              <p className={`cttp-metric-value mt-1 text-xl ${cr != null ? '' : 'text-slate-300 dark:text-slate-600'}`}>
                {cr != null ? formatFactor(cr) : '-'}
              </p>
            </div>
            {/* Ct - Temperature */}
            <div className="cttp-factor-card">
              <p className="cttp-detail-label text-xs">
                C<sub>t</sub> <span className="text-[9px] opacity-60">(Temp.)</span>
              </p>
              <p className={`cttp-metric-value mt-1 text-xl ${ct != null ? '' : 'text-slate-300 dark:text-slate-600'}`}>
                {ct != null ? formatFactor(ct) : '-'}
              </p>
            </div>
          </div>
          {cs != null && cr != null && ct != null && (
            <div className="mt-3 rounded-lg border border-dashed border-cttp-accent/20 bg-cttp-accent/5 px-3 py-2 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <p className="cttp-mono text-xs text-cttp-neutral dark:text-slate-400">
                d = dc × Cs × Cr × Ct = <span className="font-semibold text-cttp-primary dark:text-cttp-accent-light">{formatDeflection(deflectionCorr)}</span> (1/100 mm)
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
