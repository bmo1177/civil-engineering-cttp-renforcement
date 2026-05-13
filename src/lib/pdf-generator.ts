/**
 * CTTP PDF Report Generator — Navy/Amber Engineering Theme
 * Uses jsPDF (no native dependencies, no font file resolution issues)
 * Produces thesis-defensible reports with CTTP citations, traceability, and overlay images
 * Color palette: #1E293B (primary navy), #D97706 (accent amber), #F1F5F9 (bg), #E2E8F0 (border)
 */

import { jsPDF } from 'jspdf'

// ─── Types ──────────────────────────────────────────────────────────────────

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

interface Detection {
  label: string
  confidence: number
  severity: string
}

interface DeflectionCalc {
  dc: number
  cs: number
  cr: number
  ct: number
  d_corr: number
  deflection_zone: string
  season: string
  region: string
  temperature_c: number
  thick_bitumen: boolean
}

export interface ReportInput {
  designInput: Record<string, unknown>
  reinforcementResult: ReinforcementResult | null
  detections: Detection[]
  imageUrl: string | null
  imageData: Uint8Array | null
  deflectionCalc: DeflectionCalc | null
  trafficCalc: Record<string, unknown> | null
  projectRef: string
  engineer: string
  date: string
}

// ─── CTTP Engineering Color Palette (RGB tuples for jsPDF) ─────────────────

const C = {
  primary:       [30, 41, 59] as [number, number, number],   // #1E293B navy
  primaryLight:  [51, 65, 85] as [number, number, number],   // #334155
  accent:        [217, 119, 6] as [number, number, number],  // #D97706 amber
  accentHover:   [180, 83, 9] as [number, number, number],   // #B45309
  accentLight:   [252, 211, 77] as [number, number, number], // #FCD34D
  bgApp:         [241, 245, 249] as [number, number, number],// #F1F5F9
  neutral:       [51, 65, 85] as [number, number, number],   // #334155
  muted:         [148, 163, 184] as [number, number, number],// #94A3B8
  border:        [226, 232, 240] as [number, number, number],// #E2E8F0
  good:          [16, 185, 129] as [number, number, number], // #10B981
  fair:          [245, 158, 11] as [number, number, number], // #F59E0B
  poor:          [239, 68, 68] as [number, number, number],  // #EF4444
  critical:      [153, 27, 27] as [number, number, number],  // #991B1B
  white:         [255, 255, 255] as [number, number, number],
  black:         [0, 0, 0] as [number, number, number],
}

// ─── PDF Generator ──────────────────────────────────────────────────────────

export function generateCTTPReport(input: ReportInput): Uint8Array {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginL = 20
  const marginR = 20
  const contentWidth = pageWidth - marginL - marginR
  let y = 0

  // ─── Helper functions ───────────────────────────────────────────────────

  function checkPageBreak(needed: number): void {
    if (y + needed > pageHeight - 25) {
      addFooter(doc.getNumberOfPages())
      doc.addPage()
      addHeader()
      y = 25
    }
  }

  function addHeader(): void {
    // Dark navy header bar
    doc.setFillColor(...C.primary)
    doc.rect(0, 0, pageWidth, 18, 'F')
    // Amber accent strip
    doc.setFillColor(...C.accent)
    doc.rect(0, 18, pageWidth, 2, 'F')
    // White text on navy
    doc.setTextColor(...C.white)
    doc.setFontSize(9)
    doc.text('CTTP - Guide des Renforcements des Chaussées Souples', marginL, 8)
    doc.setFontSize(7)
    doc.setTextColor(...C.accentLight)
    doc.text('Direction des Études Techniques - Alger', marginL, 13)
  }

  function addFooter(pageNum: number): void {
    const bottom = pageHeight - 12
    // Amber accent line
    doc.setDrawColor(...C.accent)
    doc.setLineWidth(0.8)
    doc.line(marginL, bottom - 3, pageWidth - marginR, bottom - 3)
    doc.setLineWidth(0.2)
    doc.setFontSize(6)
    doc.setTextColor(...C.muted)
    doc.text('Generated according to CTTP Guide des Renforcements (Dec 1992), Algerian National Standards', marginL, bottom)
    doc.setTextColor(...C.primary)
    doc.text(`Page ${pageNum}`, pageWidth - marginR, bottom, { align: 'right' })
  }

  function sectionTitle(title: string, number: number): void {
    checkPageBreak(20)
    // Navy section bar with amber left accent
    doc.setFillColor(...C.primary)
    doc.rect(marginL, y, 3, 9, 'F')  // Left accent
    doc.setFillColor(...C.bgApp)
    doc.rect(marginL + 3, y, contentWidth - 3, 9, 'F')
    doc.setTextColor(...C.primary)
    doc.setFontSize(10)
    doc.text(`${number}. ${title}`, marginL + 7, y + 6)
    y += 14
  }

  function keyValue(key: string, value: string, valColor: [number, number, number] = C.neutral): void {
    checkPageBreak(8)
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text(key, marginL, y)
    doc.setTextColor(...valColor)
    doc.text(value, marginL + 65, y)
    y += 6
  }

  function divider(): void {
    y += 2
    doc.setDrawColor(...C.accent)
    doc.setLineWidth(0.3)
    doc.line(marginL, y, pageWidth - marginR, y)
    doc.setLineWidth(0.2)
    y += 4
  }

  // ─── Page 1: Title ────────────────────────────────────────────────────

  addHeader()
  y = 28

  // Title block with muted bg
  doc.setFillColor(...C.bgApp)
  doc.roundedRect(marginL, y, contentWidth, 30, 3, 3, 'F')
  // Amber accent bar on left
  doc.setFillColor(...C.accent)
  doc.rect(marginL, y, 4, 30, 'F')

  doc.setTextColor(...C.primary)
  doc.setFontSize(16)
  doc.text('CTTP RENFORCEMENT REPORT', pageWidth / 2, y + 8, { align: 'center' })
  doc.setTextColor(...C.primaryLight)
  doc.setFontSize(11)
  doc.text(input.projectRef, pageWidth / 2, y + 16, { align: 'center' })
  doc.setTextColor(...C.muted)
  doc.setFontSize(8)
  doc.text(`Engineer: ${input.engineer} | Date: ${input.date}`, pageWidth / 2, y + 23, { align: 'center' })
  y += 38

  // ─── Section 1: Input Parameters ──────────────────────────────────────

  sectionTitle('Input Parameters', 1)

  const di = input.designInput
  keyValue('Traffic Class', String(di.traffic_class || '-'))
  keyValue('Surface Type', String(di.surface_type || '-'))
  keyValue('UNI', `${di.uni || '-'} mm/km`)
  keyValue('Corrected Deflection', `${di.deflection_corr || '-'} (1/100 mm)`)
  keyValue('Visual Status', String(di.visual_status || '-'))

  // UNI classification per CTTP
  const uniVal = Number(di.uni) || 0
  const surfaceType = String(di.surface_type) || 'BB'
  let uniClass = ''
  let uniColor: [number, number, number] = C.neutral
  if (surfaceType === 'BB') {
    uniClass = uniVal < 2000 ? 'Bon' : uniVal < 3500 ? 'Moyen' : 'Mauvais'
    uniColor = uniClass === 'Bon' ? C.good : uniClass === 'Moyen' ? C.fair : C.poor
  } else if (surfaceType === 'ES') {
    uniClass = uniVal < 2500 ? 'Bon' : uniVal < 4000 ? 'Moyen' : 'Mauvais'
    uniColor = uniClass === 'Bon' ? C.good : uniClass === 'Moyen' ? C.fair : C.poor
  }
  if (uniClass) {
    keyValue('UNI Classification (CTTP p.30-35)', uniClass, uniColor)
  }

  const vs = String(di.visual_status)
  const mapped = vs === 'Bon' ? 'Acceptable' : 'Non Acceptable'
  const mappedColor = mapped === 'Acceptable' ? C.good : C.poor
  keyValue('Acceptability Mapping (CTTP p.30-35)', mapped, mappedColor)

  // ─── Section 2: Deflection Calculation ─────────────────────────────────

  if (input.deflectionCalc) {
    sectionTitle('Deflection Correction Calculation', 2)

    const dc = input.deflectionCalc
    keyValue('Measured Deflection (dc)', `${dc.dc} (1/100 mm)`)
    keyValue('Seasonal Correction (Cs)', `${dc.cs.toFixed(2)} (CTTP p.33, ${dc.season})`)
    keyValue('Regional Correction (Cr)', `${dc.cr.toFixed(2)} (CTTP p.33, ${dc.region})`)
    keyValue('Temperature Correction (Ct)', `${dc.ct.toFixed(3)} (CTTP p.33, ${dc.temperature_c}C, ${dc.thick_bitumen ? 'bitumen >=10cm' : 'bitumen <10cm -> Ct=1.0'})`)
    keyValue('Corrected Deflection (d)', `${dc.d_corr.toFixed(2)} = ${dc.dc} x ${dc.cs.toFixed(2)} x ${dc.cr.toFixed(2)} x ${dc.ct.toFixed(3)}`)

    const zoneColorMap: Record<string, [number, number, number]> = {
      Low: C.good, Medium: C.fair, High: C.poor,
    }
    keyValue('Deflection Zone (CTTP p.33)', dc.deflection_zone, zoneColorMap[dc.deflection_zone] || C.neutral)

    // Visual formula bar with amber accent
    y += 3
    checkPageBreak(10)
    doc.setFillColor(...C.bgApp)
    doc.roundedRect(marginL, y, contentWidth, 8, 2, 2, 'F')
    doc.setFillColor(...C.accent)
    doc.rect(marginL, y, 3, 8, 'F')
    doc.setFontSize(8)
    doc.setTextColor(...C.primary)
    doc.text(`d = dc x Cs x Cr x Ct = ${dc.dc} x ${dc.cs.toFixed(2)} x ${dc.cr.toFixed(2)} x ${dc.ct.toFixed(3)}`, marginL + 7, y + 5)
    y += 12
  }

  // ─── Section 3: Reinforcement Design ──────────────────────────────────

  if (input.reinforcementResult) {
    sectionTitle('Reinforcement Design Result', input.deflectionCalc ? 3 : 2)

    const r = input.reinforcementResult
    // Match by checking if the type includes the key
    let rTypeColor: [number, number, number] = C.neutral
    if (r.reinforcement_type.includes('Lourd') && !r.reinforcement_type.includes('Tr')) rTypeColor = C.poor
    else if (r.reinforcement_type.includes('Tr') && r.reinforcement_type.includes('Lourd')) rTypeColor = C.critical
    else if (r.reinforcement_type.includes('Moyen')) rTypeColor = C.fair
    else if (r.reinforcement_type.includes('ger') || r.reinforcement_type.includes('Leger')) rTypeColor = C.good

    // Reinforcement type badge with colored background
    y += 2
    checkPageBreak(10)
    doc.setFillColor(...rTypeColor)
    doc.roundedRect(marginL, y, 35, 7, 2, 2, 'F')
    doc.setTextColor(...C.white)
    doc.setFontSize(9)
    doc.text(r.reinforcement_type, marginL + 3, y + 5)
    // Material badge next to it
    doc.setFillColor(...C.bgApp)
    doc.roundedRect(marginL + 40, y, 25, 7, 2, 2, 'F')
    doc.setTextColor(...C.primary)
    doc.setFontSize(8)
    doc.text(r.material, marginL + 43, y + 5)
    y += 12

    keyValue('Reinforcement Type (CTTP p.45)', r.reinforcement_type, rTypeColor)
    keyValue('Material', r.material === 'GB'
      ? `${r.material} - Grave Bitume (CTTP p.48-55)`
      : r.material === 'GNT'
      ? `${r.material} - Grave Non Traitee (CTTP p.48-55)`
      : `${r.material} (CTTP p.48-55)`)
    keyValue('Structure', r.structure)

    // Base thickness in bold primary
    checkPageBreak(8)
    doc.setFontSize(8)
    doc.setTextColor(...C.muted)
    doc.text('Base Thickness', marginL, y)
    doc.setTextColor(...C.primary)
    doc.setFontSize(11)
    doc.text(`${r.base_thickness_cm} cm`, marginL + 65, y)
    y += 6

    if (r.binder) {
      keyValue('Binder Grade', `${r.binder} (CTTP p.48)`)
    }
    keyValue('Compaction Requirements', r.compaction)
    keyValue('Drainage Note (Fascicule 2, Ch.3)', r.drainage_note, C.fair)

    // Cross-section diagram with navy/amber theme
    y += 5
    checkPageBreak(40)
    doc.setTextColor(...C.muted)
    doc.setFontSize(8)
    doc.text('Cross-Section Diagram:', marginL, y)
    y += 5

    const diagX = marginL + 15
    const diagW = 80
    const bbH = 6
    const baseH = Math.min(25, (r.base_thickness_cm / (5 + r.base_thickness_cm)) * 31)
    const totalH = bbH + baseH

    // Base layer — amber tint
    doc.setFillColor(...C.accentLight)
    doc.setDrawColor(...C.accent)
    doc.roundedRect(diagX, y, diagW, baseH, 1, 1, 'FD')
    doc.setTextColor(...C.primary)
    doc.setFontSize(8)
    doc.text(`Base - ${r.base_thickness_cm} cm (${r.material})`, diagX + 3, y + baseH / 2 + 2)

    // BB layer — navy
    doc.setFillColor(...C.primary)
    doc.setDrawColor(...C.primary)
    doc.roundedRect(diagX, y + baseH, diagW, bbH, 1, 1, 'FD')
    doc.setTextColor(...C.white)
    doc.setFontSize(7)
    doc.text(`BB - 5 cm`, diagX + 3, y + baseH + 4)

    // Total thickness
    doc.setTextColor(...C.primary)
    doc.setFontSize(7)
    doc.text(`Total: ${5 + r.base_thickness_cm} cm`, diagX + diagW + 5, y + totalH / 2)

    y += totalH + 8

    // ─── Section 4: Traceability ──────────────────────────────────────────

    const traceNum = input.deflectionCalc ? 4 : 3
    sectionTitle('CTTP Rule Traceability', traceNum)

    // Always-visible traceability summary bar
    y += 2
    checkPageBreak(14)
    doc.setFillColor(...C.bgApp)
    doc.roundedRect(marginL, y, contentWidth, 10, 2, 2, 'F')
    doc.setFillColor(...C.accent)
    doc.rect(marginL, y, 3, 10, 'F')
    const t = r.traceability
    doc.setTextColor(...C.primary)
    doc.setFontSize(7)
    doc.text(`${t.rule_source}  |  Traffic: ${t.traffic_class_input}  |  Visual: ${t.visual_status_mapped}  |  Deflection: ${t.deflection_zone}`, marginL + 7, y + 4)
    doc.setTextColor(...C.accentHover)
    doc.setFontSize(7)
    doc.text(`Decision: ${t.matrix_row_matched}`, marginL + 7, y + 8)
    y += 14

    // Detailed traceability rows
    keyValue('Rule Source', t.rule_source)
    keyValue('Traffic Class Input', t.traffic_class_input)
    keyValue('Visual Status -> Acceptability', t.visual_status_mapped)
    keyValue('Deflection Zone', t.deflection_zone)
    keyValue('Matrix Row Matched (CTTP p.45)', t.matrix_row_matched)
  }

  // ─── Section 5: AI Detection Results ───────────────────────────────────

  if (input.detections.length > 0) {
    const detNum = (input.deflectionCalc ? 1 : 0) + (input.reinforcementResult ? 1 : 0) + 2
    sectionTitle('AI Visual Inspection Results', detNum)

    doc.setFontSize(7)
    doc.setTextColor(...C.muted)
    doc.text(`Defect density: ${input.detections.length} distress(es) detected`, marginL, y)
    y += 6

    // Detection table header with tinted bg
    const colWidths = [contentWidth * 0.45, contentWidth * 0.25, contentWidth * 0.3]
    doc.setFillColor(...C.bgApp)
    doc.rect(marginL, y, contentWidth, 7, 'F')
    // Amber left accent
    doc.setFillColor(...C.accent)
    doc.rect(marginL, y, 3, 7, 'F')
    doc.setTextColor(...C.primary)
    doc.setFontSize(7)
    doc.text('Distress Type', marginL + 5, y + 5)
    doc.text('Confidence', marginL + colWidths[0] + 2, y + 5)
    doc.text('Severity', marginL + colWidths[0] + colWidths[1] + 2, y + 5)
    y += 8

    for (const det of input.detections) {
      checkPageBreak(7)
      const sevColor = det.severity === 'high' ? C.poor : det.severity === 'medium' ? C.fair : C.good
      doc.setTextColor(...C.neutral)
      doc.setFontSize(7)
      doc.text(det.label, marginL + 2, y)
      doc.text(`${(det.confidence * 100).toFixed(1)}%`, marginL + colWidths[0] + 2, y)
      doc.setTextColor(...sevColor)
      doc.text(det.severity.toUpperCase(), marginL + colWidths[0] + colWidths[1] + 2, y)
      y += 6
    }
    y += 3
  }

  // ─── Section 6: CTTP References ────────────────────────────────────────

  const refNum = (input.deflectionCalc ? 1 : 0) + (input.reinforcementResult ? 2 : 0) + (input.detections.length > 0 ? 1 : 0) + 2
  sectionTitle('CTTP References & Citations', refNum)

  const refs = [
    ['Page 19', 'Traffic calculation: Tms = (1+i)^n x Tpl, Tc = 365 x Tms x ((1+i)^N - 1) / i'],
    ['Page 19', 'Lane distribution factors for bidirectional/unidirectional configurations'],
    ['Page 19', 'Traffic class boundaries (T0-T5) based on cumulative heavy vehicles >5t'],
    ['Pages 30-35', 'Visual status: Bon/Moyen/Mauvais classification'],
    ['Pages 30-35', 'UNI thresholds: BB (Bon<2000, Moyen<3500), ES (Bon<2500, Moyen<4000) mm/km'],
    ['Page 33', 'Deflection correction: d = dc x Cs x Cr x Ct'],
    ['Page 33', 'Cs seasonal: 1.0 (wet), 1.1-1.2 (intermediate), 1.2-1.3 (dry)'],
    ['Page 33', 'Cr regional: 1.0 (North), 0.7-0.9 (Hauts-Plateaux), 0.4-0.6 (Sahara)'],
    ['Page 33', 'Ct temperature table (0C->1.40 through 30C->0.90)'],
    ['Page 33', 'Deflection zones: Low <=50, Medium 51-120, High >120 (1/100 mm)'],
    ['Page 45', 'Reinforcement matrix (TrafficClass x VisualStatus x DeflectionZone)'],
    ['Pages 48-55', 'Material catalogs: GB for T3-T5, GNT for T0-T2'],
    ['Fascicule 2 Ch.3', 'Drainage requirements for reinforced structures'],
  ]

  for (const [page, desc] of refs) {
    checkPageBreak(8)
    doc.setFontSize(7)
    doc.setTextColor(...C.primary)
    doc.text(page, marginL, y)
    doc.setTextColor(...C.neutral)
    doc.text(`  ${desc}`, marginL + 25, y, { maxWidth: contentWidth - 27 })
    y += 5
  }

  addFooter(doc.getNumberOfPages())

  const pdfOutput = doc.output('arraybuffer')
  return new Uint8Array(pdfOutput)
}
