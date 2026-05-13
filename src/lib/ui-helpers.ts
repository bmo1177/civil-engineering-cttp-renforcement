/**
 * CTTP UI Helpers — Status color mappers, number formatters, class merge utility
 * Single source of truth for visual representation of CTTP engineering data.
 */

import { cn } from '@/lib/utils'
import {
  type VisualStatus,
  type DeflectionZone,
  type ReinforcementType,
  type TrafficClass,
  type Acceptability,
  UNI_THRESHOLDS,
  type SurfaceType,
  classifyDeflection,
} from '@/lib/cttp-rules'

// ─── Color System (CTTP-aligned) ──────────────────────────────────────────────

export const CTTP_COLORS = {
  /** Bon / Acceptable / Low severity */
  good: {
    bg: 'bg-[var(--color-cttp-good-bg)]',
    text: 'text-[var(--color-cttp-good)]',
    border: 'border-[var(--color-cttp-good-border)]',
    dot: 'bg-[var(--color-cttp-good)]',
    bar: 'bg-[var(--color-cttp-good)]',
    ring: 'ring-[var(--color-cttp-good)]/30',
    hex: '#2e8b57', // Approximation, actual color driven by OKLCH var
  },
  /** Moyen / Fair / Medium severity */
  fair: {
    bg: 'bg-[var(--color-cttp-fair-bg)]',
    text: 'text-[var(--color-cttp-fair)]',
    border: 'border-[var(--color-cttp-fair-border)]',
    dot: 'bg-[var(--color-cttp-fair)]',
    bar: 'bg-[var(--color-cttp-fair)]',
    ring: 'ring-[var(--color-cttp-fair)]/30',
    hex: '#d97706',
  },
  /** Mauvais / Non-Acceptable / High severity */
  poor: {
    bg: 'bg-[var(--color-cttp-poor-bg)]',
    text: 'text-[var(--color-cttp-poor)]',
    border: 'border-[var(--color-cttp-poor-border)]',
    dot: 'bg-[var(--color-cttp-poor)]',
    bar: 'bg-[var(--color-cttp-poor)]',
    ring: 'ring-[var(--color-cttp-poor)]/30',
    hex: '#dc2626',
  },
  /** Très Dégradé / Very Heavy */
  critical: {
    bg: 'bg-[var(--color-cttp-poor-bg)]',
    text: 'text-[var(--color-cttp-critical)]',
    border: 'border-[var(--color-cttp-poor-border)]',
    dot: 'bg-[var(--color-cttp-critical)]',
    bar: 'bg-[var(--color-cttp-critical)]',
    ring: 'ring-[var(--color-cttp-critical)]/30',
    hex: '#991b1b',
  },
  /** Neutral / Info */
  neutral: {
    bg: 'bg-[var(--color-cttp-bg-subtle)]',
    text: 'text-[var(--color-cttp-text)]',
    border: 'border-[var(--color-cttp-border)]',
    dot: 'bg-[var(--color-cttp-amber)]',
    bar: 'bg-[var(--color-cttp-amber)]',
    ring: 'ring-[var(--color-cttp-amber)]/30',
    hex: '#64748b',
  },
} as const

type CTTPColorKey = keyof typeof CTTP_COLORS

// ─── Status → Color Mapping ───────────────────────────────────────────────────

/** Map visual status to CTTP color tier */
export function getVisualStatusColor(status: VisualStatus): typeof CTTP_COLORS[CTTPColorKey] {
  switch (status) {
    case 'Bon': return CTTP_COLORS.good
    case 'Moyen': return CTTP_COLORS.fair
    case 'Mauvais': return CTTP_COLORS.poor
  }
}

/** Map acceptability to color tier */
export function getAcceptabilityColor(acceptability: Acceptability): typeof CTTP_COLORS[CTTPColorKey] {
  return acceptability === 'Acceptable' ? CTTP_COLORS.good : CTTP_COLORS.poor
}

/** Map deflection zone to color tier */
export function getDeflectionZoneColor(zone: DeflectionZone): typeof CTTP_COLORS[CTTPColorKey] {
  switch (zone) {
    case 'Low': return CTTP_COLORS.good
    case 'Medium': return CTTP_COLORS.fair
    case 'High': return CTTP_COLORS.poor
  }
}

/** Map reinforcement type to color tier */
export function getReinforcementTypeColor(type: ReinforcementType): typeof CTTP_COLORS[CTTPColorKey] {
  switch (type) {
    case 'Léger': return CTTP_COLORS.good
    case 'Moyen': return CTTP_COLORS.fair
    case 'Lourd': return CTTP_COLORS.poor
    case 'Très Lourd': return CTTP_COLORS.critical
  }
}

/** Map traffic class to color tier (gradient from light→heavy) */
export function getTrafficClassColor(tc: TrafficClass): typeof CTTP_COLORS[CTTPColorKey] & { label: string } {
  const mapping: Record<TrafficClass, CTTPColorKey> = {
    T0: 'good', T1: 'good', T2: 'fair', T3: 'fair', T4: 'poor', T5: 'critical',
  }
  const labels: Record<TrafficClass, string> = {
    T0: 'Very Light', T1: 'Light', T2: 'Medium', T3: 'Moderate', T4: 'Heavy', T5: 'Very Heavy',
  }
  return { ...CTTP_COLORS[mapping[tc]], label: labels[tc] }
}

/** Classify UNI value and return color info */
export function getUNIColor(uni: number, surfaceType: SurfaceType): typeof CTTP_COLORS[CTTPColorKey] & { status: VisualStatus } {
  const thresholds = UNI_THRESHOLDS[surfaceType]
  if (uni < thresholds.Bon.max) return { ...CTTP_COLORS.good, status: 'Bon' }
  if (uni < thresholds.Moyen.max) return { ...CTTP_COLORS.fair, status: 'Moyen' }
  return { ...CTTP_COLORS.poor, status: 'Mauvais' }
}

/** Classify deflection and return color info */
export function getDeflectionColor(d: number): typeof CTTP_COLORS[CTTPColorKey] & { zone: DeflectionZone } {
  const zone = classifyDeflection(d)
  return { ...getDeflectionZoneColor(zone), zone }
}

// ─── Badge Styling Helpers ────────────────────────────────────────────────────

/** CTTP status badge: rounded-full pill with border */
export function cttpStatusBadge(status: VisualStatus): string {
  const c = getVisualStatusColor(status)
  return cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
    c.bg, c.text, c.border,
  )
}

/** Reinforcement type badge */
export function cttpReinforcementBadge(type: ReinforcementType): string {
  const c = getReinforcementTypeColor(type)
  return cn(
    'inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-semibold border',
    c.bg, c.text, c.border,
  )
}

/** Deflection zone badge */
export function cttpDeflectionBadge(zone: DeflectionZone): string {
  const c = getDeflectionZoneColor(zone)
  return cn(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
    c.bg, c.text, c.border,
  )
}

/** Traffic class badge */
export function cttpTrafficBadge(tc: TrafficClass): string {
  const c = getTrafficClassColor(tc)
  return cn(
    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-bold border',
    c.bg, c.text, c.border,
  )
}

// ─── Number Formatters ────────────────────────────────────────────────────────

/** Format deflection value (1/100 mm) */
export function formatDeflection(value: number): string {
  return value.toFixed(1)
}

/** Format UNI value (mm/km) */
export function formatUNI(value: number): string {
  return Math.round(value).toLocaleString('fr-FR')
}

/** Format correction factor (dimensionless) */
export function formatFactor(value: number): string {
  return value.toFixed(3)
}

/** Format percentage */
export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** Format thickness (cm) */
export function formatThickness(value: number): string {
  return `${value} cm`
}

/** Format scientific notation for traffic values */
export function formatScientific(value: number): string {
  if (value === Infinity) return '> 4.0×10⁷'
  if (value === 0) return '0'
  const exp = Math.floor(Math.log10(value))
  const mantissa = value / Math.pow(10, exp)
  return `${mantissa.toFixed(1)}×10${superscript(exp)}`
}

function superscript(n: number): string {
  const superscripts: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' }
  return String(n).split('').map(c => superscripts[c] || c).join('')
}

// ─── Progress Bar Helpers ─────────────────────────────────────────────────────

/** Get progress bar width clamped to 0-100 */
export function getProgressWidth(value: number, max: number): number {
  return Math.min(Math.max((value / max) * 100, 0), 100)
}

/** UNI progress bar: scale relative to surface type max threshold */
export function getUNIProgressWidth(uni: number, surfaceType: SurfaceType): number {
  const maxScale = UNI_THRESHOLDS[surfaceType].Moyen.max * 1.5
  return getProgressWidth(uni, maxScale)
}

/** Deflection progress bar: scale 0-200 */
export function getDeflectionProgressWidth(d: number): number {
  return getProgressWidth(d, 200)
}

/** Get threshold markers for UNI gauge */
export function getUNIThresholdMarkers(surfaceType: SurfaceType): { bon: number; moyen: number; max: number } {
  const thresholds = UNI_THRESHOLDS[surfaceType]
  const maxScale = thresholds.Moyen.max * 1.5
  return {
    bon: (thresholds.Bon.max / maxScale) * 100,
    moyen: (thresholds.Moyen.max / maxScale) * 100,
    max: 100,
  }
}

// ─── Severity Color (for AI detections) ───────────────────────────────────────

export type Severity = 'low' | 'medium' | 'high'

export function getSeverityColor(severity: Severity): typeof CTTP_COLORS[CTTPColorKey] {
  switch (severity) {
    case 'low': return CTTP_COLORS.good
    case 'medium': return CTTP_COLORS.fair
    case 'high': return CTTP_COLORS.poor
  }
}

export const SEVERITY_STROKE_COLORS: Record<Severity, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
}

export const SEVERITY_FILL_COLORS: Record<Severity, string> = {
  low: 'rgba(16, 185, 129, 0.10)',
  medium: 'rgba(245, 158, 11, 0.10)',
  high: 'rgba(239, 68, 68, 0.10)',
}
