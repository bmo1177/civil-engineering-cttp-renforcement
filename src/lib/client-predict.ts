export interface Detection {
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  severity: 'low' | 'medium' | 'high'
}

interface PredictResult {
  detections: Detection[]
  image_status: string
  demo_mode: boolean
  model_used: string
  processing_time_ms: number
}

const DISTRESS_TYPES = [
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

function determineStatus(detections: Detection[]): 'Bon' | 'Moyen' | 'Mauvais' {
  const highCount = detections.filter((d) => d.severity === 'high').length
  const medCount = detections.filter((d) => d.severity === 'medium').length
  if (highCount >= 2 || (highCount >= 1 && medCount >= 2)) return 'Mauvais'
  if (medCount >= 2 || highCount >= 1) return 'Moyen'
  return 'Bon'
}

function demoFallback(): PredictResult {
  return {
    detections: [
      { label: 'Fissures longitudinales', confidence: 0.87, x: 120, y: 80, width: 200, height: 15, severity: 'medium' },
      { label: 'Nids de poule', confidence: 0.92, x: 350, y: 200, width: 60, height: 55, severity: 'high' },
      { label: 'Fissures transversales', confidence: 0.78, x: 50, y: 300, width: 15, height: 150, severity: 'low' },
      { label: 'Arrachements', confidence: 0.83, x: 450, y: 100, width: 80, height: 70, severity: 'medium' },
    ],
    image_status: 'Mauvais',
    demo_mode: true,
    model_used: 'demo-fallback',
    processing_time_ms: 0,
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export async function analyzeImage(file: File, apiKey: string): Promise<PredictResult> {
  const startTime = Date.now()

  if (!apiKey) {
    return demoFallback()
  }

  try {
    const base64 = await fileToBase64(file)
    const prompt = `Analysez cette image de chaussée et identifiez les dégradations visibles. Pour chaque dégradation détectée, fournissez:
1. Le type de dégradation parmi: ${DISTRESS_TYPES.join(', ')}
2. La sévérité: low, medium, ou high
3. La position approximative (coordonnées x, y en pixels, largeur, hauteur)
4. Le niveau de confiance (0-1)

Répondez UNIQUEMENT au format JSON:
{"detections": [{"label": "...", "confidence": 0.0, "x": 0, "y": 0, "width": 0, "height": 0, "severity": "low|medium|high"}]}

Si aucune dégradation n'est détectée, retournez: {"detections": []}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: file.type || 'image/jpeg', data: base64 } },
            ],
          }],
        }),
      }
    )

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text().catch(() => '')
      let errorMessage = `Gemini API error: ${geminiRes.status}`
      try {
        const parsedErr = JSON.parse(errBody)
        errorMessage = parsedErr.error?.message || errorMessage
      } catch {
        errorMessage = errBody || errorMessage
      }
      throw new Error(errorMessage)
    }

    const geminiData = await geminiRes.json()
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

    let parsed: { detections: Detection[] }
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { detections: [] }
    } catch {
      parsed = { detections: [] }
    }

    const detections: Detection[] = Array.isArray(parsed.detections)
      ? parsed.detections.map((d: Record<string, unknown>) => ({
          label: String(d.label || 'Unknown'),
          confidence: Number(d.confidence || 0),
          x: Number(d.x || 0),
          y: Number(d.y || 0),
          width: Number(d.width || 50),
          height: Number(d.height || 50),
          severity: (['low', 'medium', 'high'].includes(String(d.severity))
            ? String(d.severity)
            : 'medium') as Detection['severity'],
        }))
      : []

    return {
      detections,
      image_status: determineStatus(detections),
      model_used: 'gemini-2.0-flash',
      demo_mode: false,
      processing_time_ms: Date.now() - startTime,
    }
  } catch (error) {
    console.error('[ClientPredict] Gemini analysis failed:', error)
    throw error
  }
}
