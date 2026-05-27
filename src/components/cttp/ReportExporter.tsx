'use client'

import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, Copy, Printer, Loader2 } from 'lucide-react'
import { generateCTTPReport } from '@/lib/pdf-generator'

interface Detection {
  label: string
  confidence: number
  severity: string
}

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

interface ReportExporterProps {
  designInput: Record<string, unknown>
  reinforcementResult: ReinforcementResult | null
  detections: Detection[]
  imageUrl: string | null
  deflectionCalc?: Record<string, unknown>
  trafficCalc?: Record<string, unknown>
}

const PRINT_STYLE_ID = 'cttp-print-style'
const REPORT_CONTAINER_ID = 'cttp-print-report'

function formatDate(): string {
  return new Date().toLocaleDateString('fr-DZ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

/**
 * CTTP Navy/Amber Themed Report HTML Generator
 * Colors match the application's navy/amber engineering palette
 */
function buildReportHTML(props: ReportExporterProps): string {
  const { designInput, reinforcementResult, detections, imageUrl, deflectionCalc, trafficCalc } = props
  const date = formatDate()

  // ─── CTTP Engineering Color Constants ──────────────────────────────────
  const C = {
    primary: '#1E293B',       // Dark navy — headers, labels
    primaryLight: '#334155',  // Medium navy — hovers, accents
    accent: '#D97706',        // Amber — progress bars, highlights
    accentHover: '#B45309',   // Darker amber — text on light bg
    accentLight: '#FCD34D',   // Light amber — backgrounds
    bgApp: '#F1F5F9',         // Light slate page background
    bgCard: '#FFFFFF',        // White card background
    bgInput: '#F8FAFC',       // Input field background
    neutral: '#334155',       // Body text
    muted: '#94A3B8',         // Muted text
    border: '#E2E8F0',        // Slate border
    borderDark: '#CBD5E1',    // Darker slate border
    good: '#10B981',          // Bon / Acceptable / Low
    fair: '#F59E0B',          // Moyen / Medium
    poor: '#EF4444',          // Mauvais / High
    critical: '#991B1B',      // Très Lourd
  }

  let html = ''

  // ─── Page wrapper with green background ────────────────────────────────
  html += `<div style="background-color:${C.bgApp}; padding:32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:${C.neutral};">`

  // ─── Header with green bar ────────────────────────────────────────────
  html += `
    <div style="background-color:${C.primary}; border-radius:8px 8px 0 0; padding:20px 24px; text-align:center;">
      <h1 style="margin:0 0 4px; font-size:22px; color:#FFFFFF; letter-spacing:0.5px;">CTTP RENFORCEMENT REPORT</h1>
      <p style="margin:0; color:${C.accentLight}; font-size:13px; font-weight:500;">Centre Technique des Travaux Publics — Pavement Reinforcement Design</p>
      <p style="margin:4px 0 0; color:${C.accent}; font-size:12px;">Generated: ${date}</p>
    </div>
  `

  // ─── Amber accent strip ───────────────────────────────────────────────
  html += `<div style="height:4px; background:linear-gradient(90deg, ${C.accent}, ${C.accentLight}, ${C.accent});"></div>`

  // ─── Input Parameters Section ──────────────────────────────────────────
  html += `
    <div style="margin-bottom:20px; background:${C.bgCard}; border:1px solid ${C.border}; border-radius:0 0 8px 8px; padding:16px 20px;">
      <h2 style="font-size:14px; color:${C.primary}; border-top:3px solid ${C.accent}; padding-top:8px; margin:0 0 12px;">1. Input Parameters</h2>
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
  `
  for (const [key, value] of Object.entries(designInput)) {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    html += `
      <tr>
        <td style="padding:6px 10px; border:1px solid ${C.border}; background:${C.bgApp}; font-weight:600; color:${C.primary}; width:40%;">${label}</td>
        <td style="padding:6px 10px; border:1px solid ${C.border}; color:${C.neutral};">${formatValue(value)}</td>
      </tr>
    `
  }
  html += `</table></div>`

  // ─── Deflection Calculation Section ─────────────────────────────────────
  if (deflectionCalc && Object.keys(deflectionCalc).length > 0) {
    html += `
      <div style="margin-bottom:20px; background:${C.bgCard}; border:1px solid ${C.border}; border-radius:8px; padding:16px 20px;">
        <h2 style="font-size:14px; color:${C.primary}; border-top:3px solid ${C.accent}; padding-top:8px; margin:0 0 12px;">2. Deflection Correction Calculation</h2>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
    `
    for (const [key, value] of Object.entries(deflectionCalc)) {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      const isDeflZone = key === 'deflection_zone'
      const valStr = formatValue(value)
      const valColor = isDeflZone
        ? (valStr === 'Low' ? C.good : valStr === 'Medium' ? C.fair : C.poor)
        : C.neutral
      html += `
        <tr>
          <td style="padding:6px 10px; border:1px solid ${C.border}; background:${C.bgApp}; font-weight:600; color:${C.primary}; width:40%;">${label}</td>
          <td style="padding:6px 10px; border:1px solid ${C.border}; color:${isDeflZone ? valColor : C.neutral}; font-weight:${isDeflZone ? '700' : '400'};">${valStr}</td>
        </tr>
      `
    }

    // Formula display
    const dc = deflectionCalc.dc as number
    const cs = deflectionCalc.cs as number
    const cr = deflectionCalc.cr as number
    const ct = deflectionCalc.ct as number
    const dCorr = deflectionCalc.d_corr as number
    html += `
      <tr>
        <td colspan="2" style="padding:10px; border:1px solid ${C.border}; background:${C.bgApp}; text-align:center;">
          <span style="font-family:'Courier New',monospace; font-size:11px; color:${C.primary}; font-weight:600;">
            d = dc × Cs × Cr × Ct = ${dc} × ${cs?.toFixed(2)} × ${cr?.toFixed(2)} × ${ct?.toFixed(3)} = <span style="color:${C.accentHover}; font-size:13px;">${dCorr?.toFixed(2)}</span> (1/100 mm)
          </span>
        </td>
      </tr>
    `
    html += `</table></div>`
  }

  // ─── Reinforcement Result Section ──────────────────────────────────────
  if (reinforcementResult) {
    const sectionNum = (deflectionCalc ? 1 : 0) + 2
    const r = reinforcementResult

    // Reinforcement type color
    const typeColor = r.reinforcement_type.includes('Très') ? C.critical
      : r.reinforcement_type.includes('Lourd') ? C.poor
      : r.reinforcement_type.includes('Moyen') ? C.fair
      : C.good

    html += `
      <div style="margin-bottom:20px; background:${C.bgCard}; border:1px solid ${C.border}; border-radius:8px; padding:16px 20px;">
        <h2 style="font-size:14px; color:${C.primary}; border-top:3px solid ${C.accent}; padding-top:8px; margin:0 0 12px;">${sectionNum}. Reinforcement Design Result</h2>
        <div style="margin-bottom:12px; padding:10px 14px; background:${C.bgApp}; border-radius:6px; border:1px solid ${C.border};">
          <span style="display:inline-block; background:${typeColor}; color:#FFFFFF; padding:4px 12px; border-radius:4px; font-size:13px; font-weight:700; margin-right:8px;">${r.reinforcement_type}</span>
          <span style="display:inline-block; background:${C.bgCard}; color:${C.primary}; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:600; border:1px solid ${C.border}; font-family:'Courier New',monospace;">${r.material}</span>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <tr><td style="padding:6px 10px; border:1px solid ${C.border}; background:${C.bgApp}; font-weight:600; color:${C.primary}; width:40%;">Structure</td><td style="padding:6px 10px; border:1px solid ${C.border};">${r.structure}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid ${C.border}; background:${C.bgApp}; font-weight:600; color:${C.primary};">Base Thickness</td><td style="padding:6px 10px; border:1px solid ${C.border};"><strong style="font-size:14px; color:${C.primary};">${r.base_thickness_cm} cm</strong></td></tr>
    `
    if (r.binder) {
      html += `<tr><td style="padding:6px 10px; border:1px solid ${C.border}; background:${C.bgApp}; font-weight:600; color:${C.primary};">Binder Grade</td><td style="padding:6px 10px; border:1px solid ${C.border};">${r.binder}</td></tr>`
    }
    html += `
          <tr><td style="padding:6px 10px; border:1px solid ${C.border}; background:${C.bgApp}; font-weight:600; color:${C.primary};">Compaction</td><td style="padding:6px 10px; border:1px solid ${C.border};">${r.compaction}</td></tr>
          <tr><td style="padding:6px 10px; border:1px solid ${C.border}; background:${C.bgApp}; font-weight:600; color:${C.primary};">Drainage Note</td><td style="padding:6px 10px; border:1px solid ${C.border}; color:${C.fair}; font-weight:500;">${r.drainage_note}</td></tr>
        </table>

        <!-- Cross-section Diagram -->
        <div style="margin-top:14px; text-align:center;">
          <p style="font-size:10px; color:${C.muted}; margin:0 0 8px; text-transform:uppercase; letter-spacing:1px;">Structure Cross-Section</p>
          <div style="display:inline-block; text-align:left;">
            <div style="background:${C.primary}; color:#FFFFFF; padding:8px 20px; font-size:11px; font-weight:600; border-radius:4px 4px 0 0; font-family:'Courier New',monospace;">BB — 5 cm</div>
            <div style="background:${C.accentLight}; color:${C.primary}; padding:8px 20px; font-size:11px; font-weight:600; border-radius:0 0 4px 4px; font-family:'Courier New',monospace;">${r.material} Base — ${r.base_thickness_cm} cm</div>
          </div>
          <p style="font-size:11px; color:${C.primary}; font-weight:700; margin:6px 0 0;">Total: ${5 + r.base_thickness_cm} cm</p>
        </div>
      </div>
    `
  }

  // ─── AI Detection Results ──────────────────────────────────────────────
  if (detections.length > 0) {
    const sectionNum = (deflectionCalc ? 1 : 0) + (reinforcementResult ? 1 : 0) + 3
    html += `
      <div style="margin-bottom:20px; background:${C.bgCard}; border:1px solid ${C.border}; border-radius:8px; padding:16px 20px;">
        <h2 style="font-size:14px; color:${C.primary}; border-top:3px solid ${C.accent}; padding-top:8px; margin:0 0 12px;">${sectionNum}. AI Visual Inspection Results</h2>
    `
    if (imageUrl) {
      html += `<div style="text-align:center; margin-bottom:10px;"><img src="${imageUrl}" alt="Pavement image" style="max-width:300px; max-height:200px; border:2px solid ${C.border}; border-radius:6px;" /></div>`
    }
    html += `
        <table style="width:100%; border-collapse:collapse; font-size:12px;">
          <tr style="background:${C.bgApp};">
            <th style="padding:8px 10px; border:1px solid ${C.border}; text-align:left; color:${C.primary}; font-size:11px;">Distress Type</th>
            <th style="padding:8px 10px; border:1px solid ${C.border}; text-align:center; color:${C.primary}; font-size:11px;">Confidence</th>
            <th style="padding:8px 10px; border:1px solid ${C.border}; text-align:center; color:${C.primary}; font-size:11px;">Severity</th>
          </tr>
    `
    for (const det of detections) {
      const sevColor = det.severity === 'high' ? C.poor : det.severity === 'medium' ? C.fair : C.good
      html += `
        <tr>
          <td style="padding:6px 10px; border:1px solid ${C.border};">${det.label}</td>
          <td style="padding:6px 10px; border:1px solid ${C.border}; text-align:center; font-family:'Courier New',monospace; font-weight:600;">${(det.confidence * 100).toFixed(1)}%</td>
          <td style="padding:6px 10px; border:1px solid ${C.border}; text-align:center; color:${sevColor}; font-weight:700; text-transform:uppercase;">${det.severity}</td>
        </tr>
      `
    }
    html += `</table></div>`
  }

  // ─── Traceability Section ──────────────────────────────────────────────
  if (reinforcementResult?.traceability) {
    const t = reinforcementResult.traceability
    const sectionNum = (deflectionCalc ? 1 : 0) + (reinforcementResult ? 1 : 0) + (detections.length > 0 ? 1 : 0) + 3
    html += `
      <div style="margin-bottom:20px; background:${C.bgApp}; border:2px solid ${C.accent}; border-radius:8px; padding:16px 20px;">
        <h2 style="font-size:14px; color:${C.primary}; margin:0 0 10px;">
          <span style="display:inline-block; background:${C.accent}; color:${C.primary}; padding:2px 8px; border-radius:4px; font-size:11px; margin-right:6px;">✓</span>
          ${sectionNum}. CTTP Rule Traceability
        </h2>
        <p style="font-size:11px; color:${C.primary}; font-weight:600; margin:0 0 8px; font-family:'Courier New',monospace;">
          ${t.rule_source} → Traffic: ${t.traffic_class_input} | Visual: ${t.visual_status_mapped} | Deflection: ${t.deflection_zone}
        </p>
        <p style="font-size:10px; color:${C.accentHover}; font-weight:700; margin:0 0 10px; font-family:'Courier New',monospace;">
          Decision: ${t.matrix_row_matched}
        </p>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <tr><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard}; font-weight:600; color:${C.primary}; width:40%;">Rule Source</td><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard};">${t.rule_source}</td></tr>
          <tr><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard}; font-weight:600; color:${C.primary};">Traffic Class</td><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard};">${t.traffic_class_input}</td></tr>
          <tr><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard}; font-weight:600; color:${C.primary};">Visual Status Mapped</td><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard};">${t.visual_status_mapped}</td></tr>
          <tr><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard}; font-weight:600; color:${C.primary};">Deflection Zone</td><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard};">${t.deflection_zone}</td></tr>
          <tr><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard}; font-weight:600; color:${C.primary};">Matrix Row Matched</td><td style="padding:5px 10px; border:1px solid ${C.border}; background:${C.bgCard}; font-family:'Courier New',monospace; font-weight:600;">${t.matrix_row_matched}</td></tr>
        </table>
      </div>
    `
  }

  // ─── Footer with green accent ──────────────────────────────────────────
  html += `
    <div style="margin-top:24px; border-top:3px solid ${C.accent}; padding-top:12px; text-align:center; color:${C.muted}; font-size:10px;">
      <p style="margin:0; color:${C.primary}; font-weight:600;">CTTP — Centre Technique des Travaux Publics — Direction des Études Techniques</p>
      <p style="margin:3px 0 0;">Reference: Guide CTTP de Renforcement des Chaussées Souples, Alger (Déc 1992)</p>
    </div>
  `

  html += `</div>` // close page wrapper

  return html
}

export default function ReportExporter(props: ReportExporterProps) {
  const printContainerRef = useRef<HTMLDivElement | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // ─── Browser print fallback ────────────────────────────────────────────
  const handlePrintPDF = useCallback(() => {
    const existingStyle = document.getElementById(PRINT_STYLE_ID)
    if (existingStyle) existingStyle.remove()

    const existingContainer = document.getElementById(REPORT_CONTAINER_ID)
    if (existingContainer) existingContainer.remove()

    const style = document.createElement('style')
    style.id = PRINT_STYLE_ID
    style.textContent = `
      @media print {
        body > *:not(#${REPORT_CONTAINER_ID}) { display: none !important; }
        #${REPORT_CONTAINER_ID} { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; }
        #${REPORT_CONTAINER_ID} table { page-break-inside: avoid; }
      }
      @media not print {
        #${REPORT_CONTAINER_ID} { display: none !important; }
      }
    `
    document.head.appendChild(style)

    const container = document.createElement('div')
    container.id = REPORT_CONTAINER_ID
    container.innerHTML = buildReportHTML(props)
    document.body.appendChild(container)
    printContainerRef.current = container

    requestAnimationFrame(() => {
      window.print()
      setTimeout(() => {
        style.remove()
        container.remove()
        printContainerRef.current = null
      }, 2000)
    })
  }, [props])

  // ─── Server-side PDF generation via /api/export ────────────────────────
  const handleDownloadPDF = useCallback(async () => {
    setIsGenerating(true)
    try {
      let imageBase64: string | null = null
      if (props.imageUrl) {
        try {
          const imgRes = await fetch(props.imageUrl)
          const imgBlob = await imgRes.blob()
          imageBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const result = reader.result as string
              resolve(result.split(',')[1] || '')
            }
            reader.readAsDataURL(imgBlob)
          })
        } catch {
          // image conversion failed, continue without
        }
      }

      const pdfBytes = generateCTTPReport({
        designInput: props.designInput,
        reinforcementResult: props.reinforcementResult as any,
        detections: props.detections as any,
        imageUrl: props.imageUrl,
        imageData: null,
        deflectionCalc: (props.deflectionCalc || null) as any,
        trafficCalc: props.trafficCalc || null,
        projectRef: 'RN120 PK70-80',
        engineer: 'CTTP Engineer',
        date: formatDate(),
      })
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CTTP_Renforcement_Report_${new Date().toISOString().slice(0, 10)}.pdf`
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
    } catch (error) {
      console.error('PDF generation error:', error)
      handlePrintPDF()
    } finally {
      setIsGenerating(false)
    }
  }, [props])

  // ─── Browser print fallback ────────────────────────────────────────────
  const handlePrintPDF = useCallback(() => {
    const existingStyle = document.getElementById(PRINT_STYLE_ID)
    if (existingStyle) existingStyle.remove()

    const existingContainer = document.getElementById(REPORT_CONTAINER_ID)
    if (existingContainer) existingContainer.remove()

    const style = document.createElement('style')
    style.id = PRINT_STYLE_ID
    style.textContent = `
      @media print {
        body > *:not(#${REPORT_CONTAINER_ID}) { display: none !important; }
        #${REPORT_CONTAINER_ID} { display: block !important; position: absolute; top: 0; left: 0; width: 100%; background: white; }
        #${REPORT_CONTAINER_ID} table { page-break-inside: avoid; }
      }
      @media not print {
        #${REPORT_CONTAINER_ID} { display: none !important; }
      }
    `
    document.head.appendChild(style)

    const container = document.createElement('div')
    container.id = REPORT_CONTAINER_ID
    container.innerHTML = buildReportHTML(props)
    document.body.appendChild(container)
    printContainerRef.current = container

    requestAnimationFrame(() => {
      window.print()
      setTimeout(() => {
        style.remove()
        container.remove()
        printContainerRef.current = null
      }, 2000)
    })
  }, [props])

  // ─── Copy JSON ─────────────────────────────────────────────────────────
  const handleCopyJSON = useCallback(() => {
    const report = {
      title: 'CTTP Renforcement Report',
      generated: new Date().toISOString(),
      design_input: props.designInput,
      deflection_calculation: props.deflectionCalc || null,
      reinforcement_result: props.reinforcementResult || null,
      ai_detections: props.detections,
      image_analyzed: !!props.imageUrl,
    }
    navigator.clipboard.writeText(JSON.stringify(report, null, 2)).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = JSON.stringify(report, null, 2)
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    })
  }, [props])

  const hasData =
    Object.keys(props.designInput).length > 0 ||
    props.reinforcementResult !== null ||
    props.detections.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!hasData || isGenerating} className="border-cttp-amber/20 text-cttp-navy hover:bg-cttp-amber/15 hover:text-cttp-navy dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
          {isGenerating ? (
            <Loader2 className="size-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="size-4 mr-1.5" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadPDF} disabled={isGenerating}>
          <FileText className="size-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handlePrintPDF}>
          <Printer className="size-4 mr-2" />
          Print PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyJSON}>
          <Copy className="size-4 mr-2" />
          Copy JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export type { ReportExporterProps, Detection, Traceability, ReinforcementResult }
