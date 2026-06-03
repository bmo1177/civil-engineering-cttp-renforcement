'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { useToast } from '@/hooks/use-toast'
import ImageUploader from '@/components/cttp/ImageUploader'
import DetectionCanvas from '@/components/cttp/DetectionCanvas'
import MetricsPanel from '@/components/cttp/MetricsPanel'
import ReinforcementPanel from '@/components/cttp/ReinforcementPanel'
import SettingsModal from '@/components/cttp/SettingsModal'
import ReportExporter from '@/components/cttp/ReportExporter'
import { useLanguage } from '@/lib/translations'
import LicenseInput from '@/components/cttp/LicenseInput'
import ErrorBoundary from '@/components/cttp/ErrorBoundary'
import {
  type TrafficClass,
  type SurfaceType,
  type VisualStatus,
  type LaneDistributionKey,
  TRAFFIC_CLASSES,
  TRAFFIC_CLASS_BOUNDS,
  VISUAL_STATUSES,
  interpolateCt,
  classifyDeflection,
} from '@/lib/cttp-rules'
import { computeDesign, validateDesignInput, type DesignInput } from '@/lib/engine'
import { analyzeImage } from '@/lib/client-predict'
import {
  cttpStatusBadge,
  cttpDeflectionBadge,
  cttpTrafficBadge,
  getDeflectionColor,
  CTTP_COLORS,
  formatDeflection,
  formatFactor,
} from '@/lib/ui-helpers'
import {
  Calculator,
  Settings,
  Upload,
  Shield,
  AlertCircle,
  Loader2,
  Zap,
  BookOpen,
  ThermometerSun,
  Mountain,
  Gauge,
  Construction,
  BarChart3,
  WifiOff,
  CheckCircle2,
  FlaskConical,
  Menu,
  FileDown,
  HelpCircle,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface FieldError {
  field: string
  message: string
}

interface Detection {
  label: string
  confidence: number
  x: number
  y: number
  width: number
  height: number
  severity: 'low' | 'medium' | 'high'
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

// ─── Deflection Correction Defaults ─────────────────────────────────────────

const SEASON_DEFAULTS: Record<string, number> = { wet: 1.0, intermediate: 1.15, dry: 1.25 }
const REGION_DEFAULTS: Record<string, number> = { north: 1.0, hauts_plateaux: 0.8, sahara: 0.5 }
const SESSION_CACHE_KEY = 'cttp_last_design_result'

// ─── Browser-safe helpers ──────────────────────────────────────────────────

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    // localStorage may be blocked by privacy settings
  }
  return null
}

function safeSessionStorageGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    // sessionStorage may be blocked
  }
  return null
}

function safeSessionStorageSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // quota exceeded or blocked
  }
}

function safeIsOnline(): boolean {
  try {
    return navigator.onLine
  } catch {
    // navigator unavailable
  }
  return true
}

// ─── Main App (client-only, never SSR'd) ───────────────────────────────────

export default function CalculatorApp() {
  const { toast } = useToast()
  const { t, lang, setLang } = useLanguage()

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // ─── Design inputs ──────────────────────────────────────────────────────
  const [trafficClass, setTrafficClass] = useState<TrafficClass>('T2')
  const [surfaceType, setSurfaceType] = useState<SurfaceType>('BB')
  const [uni, setUni] = useState<number>(3200)
  const [visualStatus, setVisualStatus] = useState<VisualStatus>('Moyen')

  // ─── Deflection correction inputs ───────────────────────────────────────
  const [dc, setDc] = useState<number>(70)
  const [season, setSeason] = useState<'wet' | 'intermediate' | 'dry'>('dry')
  const [region, setRegion] = useState<'north' | 'hauts_plateaux' | 'sahara'>('north')
  const [temperature, setTemperature] = useState<number>(20)
  const [thickBitumen, setThickBitumen] = useState<boolean>(true)

  // ─── Real-time deflection computation ───────────────────────────────────
  const cs = useMemo(() => SEASON_DEFAULTS[season], [season])
  const cr = useMemo(() => REGION_DEFAULTS[region], [region])
  const ct = useMemo(
    () => (thickBitumen ? interpolateCt(temperature, true) : 1.0),
    [temperature, thickBitumen]
  )
  const deflectionCorr = useMemo(
    () => Math.round(dc * cs * cr * ct * 100) / 100,
    [dc, cs, cr, ct]
  )
  const deflectionZone = useMemo(
    () => classifyDeflection(deflectionCorr),
    [deflectionCorr]
  )

  // ─── Result state ───────────────────────────────────────────────────────
  const [isComputing, setIsComputing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [reinforcementResult, setReinforcementResult] = useState<ReinforcementResult | null>(() => {
    if (typeof window === 'undefined') return null
    const cached = safeSessionStorageGet(SESSION_CACHE_KEY)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        return null
      }
    }
    return null
  })
  const [validationErrors, setValidationErrors] = useState<FieldError[]>([])
  const [activeTab, setActiveTab] = useState('design')

  // ─── Image analysis state ───────────────────────────────────────────────
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [detections, setDetections] = useState<Detection[]>([])
  const [demoMode, setDemoMode] = useState(false)

  // ─── Local model classification state (Keras + YOLO) ─────────────────────
  const [kerasResult, setKerasResult] = useState<{
    status: string; confidence: number; probabilities?: Record<string, number>; error?: string
  } | null>(null)
  const [yoloResult, setYoloResult] = useState<{
    status: string; confidence: number; probabilities?: Record<string, number>; error?: string
  } | null>(null)
  const [isClassifying, setIsClassifying] = useState(false)
  const [classifyStatus, setClassifyStatus] = useState<string>('')

  // ─── Connectivity & status state ───────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' && safeIsOnline())
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)
  const geminiKeyMissing = useMemo(() => {
    if (typeof window === 'undefined') return true
    const key = localStorage.getItem('cttp_gemini_key')
    const isServerConfigured = process.env.NEXT_PUBLIC_GEMINI_CONFIGURED === 'true'
    return !key && !isServerConfigured
  }, [settingsOpen])

  const fileUrlRef = useRef<string | null>(null)

  // ─── Online/offline tracking ────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // ─── Restore cached result from sessionStorage on mount ────────────────

  // ─── File handling ──────────────────────────────────────────────────────

  const handleFileSelect = useCallback((file: File | null) => {
    setUploadedFile(file)
    if (fileUrlRef.current) {
      try { URL.revokeObjectURL(fileUrlRef.current) } catch { /* ignore */ }
    }
    if (file) {
      const url = URL.createObjectURL(file)
      fileUrlRef.current = url
      setPreviewUrl(url)
    } else {
      fileUrlRef.current = null
      setPreviewUrl(null)
    }
    setDetections([])
    setDemoMode(false)
    setKerasResult(null)
    setYoloResult(null)
  }, [])

  // ─── AI Analysis handler ────────────────────────────────────────────────

  const handleAnalyzeImage = useCallback(async () => {
    if (!uploadedFile) return
    setIsAnalyzing(true)

    try {
      const apiKey = safeLocalStorageGet('cttp_gemini_key') || ''

      const result = await analyzeImage(uploadedFile, apiKey)
      setDetections(result.detections)
      setDemoMode(result.demo_mode)

      if (result.image_status && VISUAL_STATUSES.includes(result.image_status as any)) {
        setVisualStatus(result.image_status as VisualStatus)
      }

      toast({
        title: result.demo_mode ? 'Demo Analysis Complete' : 'AI Analysis Complete',
        description: result.demo_mode
          ? 'Using demo detections. Add a Gemini API key in Settings for real analysis.'
          : `Found ${result.detections?.length || 0} detections`,
      })
    } catch (error) {
      toast({
        title: 'Analysis Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [uploadedFile, toast])


  // ─── Local model classification handler (Keras + YOLO) ──────────────────

  const handleClassifyLocal = useCallback(async () => {
    if (!uploadedFile) return
    setIsClassifying(true)
    setKerasResult(null)
    setYoloResult(null)

    try {
      // withGlobalTauri:true injects window.__TAURI__ — use it directly.
      // Dynamic import('@tauri-apps/api/core') is unreliable in static builds.
      const tauriInvoke: (<T>(cmd: string, args?: Record<string, unknown>) => Promise<T>) | undefined =
        (window as any)?.__TAURI__?.core?.invoke

      const isTauri = typeof tauriInvoke === 'function'

      let bodyText: string

      if (isTauri) {
        // ── Tauri path: ALL HTTP goes through Rust (bypasses WebKitGTK CORS) ──
        //
        // Poll the inference server via Rust's check_server_health command
        // (never touches 127.0.0.1 from the WebView).
        const MAX_ATTEMPTS = 60  // 60 × 2 s = 2 min ceiling
        let attempt = 0
        let serverReady = false

        while (!serverReady && attempt < MAX_ATTEMPTS) {
          attempt++
          const elapsed = attempt * 2
          setClassifyStatus(
            attempt <= 3  ? 'Starting inference engine…' :
            attempt <= 15 ? `Loading YOLO model… (${elapsed}s)` :
                            `Loading Keras model… (~40 s on CPU, ${elapsed}s elapsed)`
          )

          try {
            const health = await tauriInvoke<{ ready: boolean; keras: boolean; yolo: boolean }>(
              'check_server_health'
            )
            if (health.keras || health.yolo) {
              serverReady = true
              break
            }
          } catch {
            // Server not up yet — keep polling
          }

          await new Promise((r) => setTimeout(r, 2000))
        }

        if (!serverReady) {
          throw new Error(
            'AI models did not load within 2 minutes. ' +
            'Ensure python3, tensorflow, ultralytics and flask are installed.'
          )
        }

        setClassifyStatus('Classifying…')

        // Send image bytes through Rust — no WebView HTTP at all
        const arrayBuffer = await uploadedFile.arrayBuffer()
        const imageBytes = Array.from(new Uint8Array(arrayBuffer))

        bodyText = await tauriInvoke<string>('proxy_predict', {
          imageBytes,
          filename: uploadedFile.name || 'image.jpg',
        })

      } else {
        // ── Web path: route through Next.js API ──
        const formData = new FormData()
        formData.append('image', uploadedFile)
        const res = await fetch('/api/predict-local', { method: 'POST', body: formData })
        bodyText = await res.text()
        if (!res.ok) {
          let msg = bodyText
          try { msg = (JSON.parse(bodyText) as { error?: string }).error || bodyText } catch {}
          throw new Error(msg || `Server error: ${res.status}`)
        }
      }

      // ── Parse response (same format for both paths) ──
      let rawData: {
        success: boolean
        keras?: { status: string; confidence: number; probabilities?: Record<string, number>; error?: string }
        yolo?: { status: string; confidence: number; probabilities?: Record<string, number>; error?: string }
        combined?: { status: string; confidence: number }
        processing_time_ms?: number
        error?: string
        // web API may nest differently
        keras_result?: { status: string; confidence: number; probabilities?: Record<string, number>; error?: string } | null
        yolo_result?: { status: string; confidence: number; probabilities?: Record<string, number>; error?: string } | null
        image_status?: string
        combined_status?: { status: string; confidence: number }
      }
      try {
        rawData = JSON.parse(bodyText)
      } catch {
        throw new Error(`Invalid response: ${bodyText.slice(0, 200)}`)
      }

      if (!rawData.success) {
        throw new Error(rawData.error || 'Inference failed')
      }

      const normalizeStatus = (s: string) => {
        const n = s.trim().toLowerCase().replace(/\s+/g, '_')
        return ['good', 'poor', 'satisfactory', 'very_poor'].includes(n) ? n : s
      }

      const STATUS_RANK: Record<string, number> = { good: 1, satisfactory: 2, poor: 3, very_poor: 4 }
      const determineImageStatus = (a?: string, b?: string): 'Bon' | 'Moyen' | 'Mauvais' => {
        const ranks = [a, b].filter(Boolean).map((s) => STATUS_RANK[s!] || 0)
        if (!ranks.length) return 'Bon'
        const max = Math.max(...ranks)
        return max >= 4 ? 'Mauvais' : max >= 3 ? 'Moyen' : 'Bon'
      }

      // Normalise — handle both { keras: ... } (server format) and { keras_result: ... } (web API format)
      const kerasRaw = rawData.keras || rawData.keras_result || undefined
      const yoloRaw  = rawData.yolo  || rawData.yolo_result  || undefined
      const combinedRaw = rawData.combined || rawData.combined_status || undefined

      const kerasResult = kerasRaw?.status
        ? { status: normalizeStatus(kerasRaw.status), confidence: kerasRaw.confidence, probabilities: kerasRaw.probabilities }
        : undefined
      const yoloResult = yoloRaw?.status
        ? { status: normalizeStatus(yoloRaw.status), confidence: yoloRaw.confidence, probabilities: yoloRaw.probabilities }
        : undefined

      if (kerasResult) setKerasResult(kerasResult)
      if (yoloResult)  setYoloResult(yoloResult)

      const imageStatus = rawData.image_status || determineImageStatus(kerasResult?.status, yoloResult?.status)
      if (VISUAL_STATUSES.includes(imageStatus as typeof VISUAL_STATUSES[number])) {
        setVisualStatus(imageStatus as VisualStatus)
      }

      toast({
        title: 'Classification Complete',
        description: combinedRaw
          ? `Combined: ${combinedRaw.status} (${combinedRaw.confidence}%)`
          : 'Local models finished',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not reach local models'
      toast({ title: 'Classification Failed', description: message, variant: 'destructive' })
    } finally {
      setClassifyStatus('')
      setIsClassifying(false)
    }
  }, [uploadedFile, toast])

  // ─── Design computation handler ─────────────────────────────────────────

  const handleComputeDesign = useCallback(async () => {
    setIsComputing(true)
    setValidationErrors([])

    const inputData = {
      traffic_class: trafficClass,
      surface_type: surfaceType,
      uni,
      deflection_corr: deflectionCorr,
      visual_status: visualStatus,
    }

    try {
      const errors = validateDesignInput(inputData as DesignInput)
      if (errors.length > 0) {
        setValidationErrors(
          errors.map((e) => ({
            field: e.field,
            message: e.message,
          }))
        )
        throw new Error('Validation failed: ' + errors.map((e) => e.message).join(', '))
      }

      const result = computeDesign(inputData as DesignInput)
      setReinforcementResult(result)

      // Cache successful result in sessionStorage for offline fallback
      safeSessionStorageSet(SESSION_CACHE_KEY, JSON.stringify(result))

      // Show success banner briefly
      setShowSuccessBanner(true)
      setTimeout(() => setShowSuccessBanner(false), 4000)

      // On mobile, auto-switch to Results tab so user sees the output
      if (window.innerWidth < 1024) {
        setActiveTab('results')
      }

      toast({
        title: 'Design Computed',
        description: `Reinforcement: ${result.reinforcement_type} — ${result.structure}`,
      })
    } catch (error) {
      // Try loading from sessionStorage cache if offline
      if (!safeIsOnline()) {
        const cached = safeSessionStorageGet(SESSION_CACHE_KEY)
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            setReinforcementResult(parsed)
            toast({
              title: 'Offline — Using Cached Result',
              description: 'Last successful design loaded from local cache.',
            })
            return
          } catch {
            // Cache read failed
          }
        }
      }
      toast({
        title: 'Computation Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsComputing(false)
    }
  }, [trafficClass, surfaceType, uni, deflectionCorr, visualStatus, toast])

  // ─── Deflection calc data for report ────────────────────────────────────
  const deflectionCalcData = useMemo(() => ({
    dc,
    cs,
    cr,
    ct,
    d_corr: deflectionCorr,
    deflection_zone: deflectionZone,
    season,
    region,
    temperature_c: temperature,
    thick_bitumen: thickBitumen,
  }), [dc, cs, cr, ct, deflectionCorr, deflectionZone, season, region, temperature, thickBitumen])

  // ─── Computed deflection color info ──────────────────────────────────────
  const deflColorInfo = useMemo(() => getDeflectionColor(deflectionCorr), [deflectionCorr])

  // ─── Input change handlers ─────────────────────────────────────────────
  const handleUniChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUni(e.target.value === '' ? 0 : Number(e.target.value))
  }, [])

  const handleDcChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDc(e.target.value === '' ? 0 : Number(e.target.value))
  }, [])

  const handleTemperatureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTemperature(e.target.value === '' ? 0 : Number(e.target.value))
  }, [])

  const handleThickBitumenChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setThickBitumen(e.target.checked)
  }, [])

  const handleTrafficClassChange = useCallback((v: string) => {
    setTrafficClass(v as TrafficClass)
  }, [])

  const handleSurfaceTypeChange = useCallback((v: string) => {
    setSurfaceType(v as SurfaceType)
  }, [])

  const handleVisualStatusChange = useCallback((v: string) => {
    setVisualStatus(v as VisualStatus)
  }, [])

  const handleSeasonChange = useCallback((v: string) => {
    setSeason(v as 'wet' | 'intermediate' | 'dry')
  }, [])

  const handleRegionChange = useCallback((v: string) => {
    setRegion(v as 'north' | 'hauts_plateaux' | 'sahara')
  }, [])

  const handleTabChange = useCallback((v: string) => {
    setActiveTab(v)
  }, [])

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true)
  }, [])

  const handleOpenMobileMenu = useCallback(() => {
    setMobileMenuOpen(true)
  }, [])

  const handleCloseMobileMenu = useCallback((open: boolean) => {
    setMobileMenuOpen(open)
  }, [])

  const handleMobileSettingsClick = useCallback(() => {
    setMobileMenuOpen(false)
    setTimeout(() => setSettingsOpen(true), 300)
  }, [])

  const handleDetectionClick = useCallback((det: Detection) => {
    toast({
      title: det.label,
      description: `Severity: ${det.severity} | Confidence: ${Math.round(det.confidence * 100)}%`,
    })
  }, [toast])

  // ─── Full interactive page (client-only, no hydration guard needed) ────
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-cttp-bg-app">
        {/* ─── Header ──────────────────────────────────────────────────── */}
        <header className="cttp-header">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-cttp-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  {/* Perspective road */}
                  <path d="M7 21l3-14" />
                  <path d="M17 21l-3-14" />
                  <path d="M12 21v-3M12 15v-2M12 9v-2" />

                  {/* Bottom Metric */}
                  <path d="M3 21h18" />
                  <path d="M3 20v2M21 20v2" />
                  <circle cx="12" cy="21" r="0.6" fill="var(--color-cttp-amber)" />

                  {/* Top Metric */}
                  <path d="M9 7h6" />
                  <path d="M9 6v2M15 6v2" />
                  <circle cx="12" cy="7" r="0.6" fill="var(--color-cttp-amber)" />

                  {/* Left Gauge */}
                  <path d="M4 18l1-10" />
                  <circle cx="4.2" cy="17" r="0.4" fill="var(--color-cttp-amber)" />
                  <circle cx="4.7" cy="13" r="0.4" fill="var(--color-cttp-amber)" />
                  <circle cx="5.2" cy="9" r="0.4" fill="var(--color-cttp-amber)" />

                  {/* Right Diamond Target */}
                  <path d="M18 10l3 3-3 3-3-3z" strokeWidth="1" fill="var(--color-cttp-amber)" fillOpacity="0.1" />
                  <path d="M18 10v6M15 13h6" strokeWidth="1" />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-medium tracking-tight text-white">
                  {t('app.title')}
                </h1>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex rounded border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/60"
                >
                  {t('app.subtitle')}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Offline Badge */}
              {!isOnline && (
                <Badge
                  variant="outline"
                  className="gap-1 rounded-md border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                >
                  <WifiOff className="size-3" />
                  {t('status.offline')}
                </Badge>
              )}

              {/* ─── Desktop-only header actions (>= sm) ──────────────────── */}
              <div className="hidden sm:flex items-center gap-1.5">
                {/* AI Status Badge */}
                {!geminiKeyMissing ? (
                  <Badge
                    variant="outline"
                    className="gap-1.5 rounded border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
                  >
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {safeLocalStorageGet('cttp_gemini_key') ? t('status.ai_active_user') : t('status.ai_active_system')}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1.5 rounded border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500"
                  >
                    <FlaskConical className="size-3" />
                    Demo Mode
                  </Badge>
                )}

                {/* License Badge */}
                <LicenseInput />

                <ReportExporter
                  designInput={{
                    traffic_class: trafficClass,
                    surface_type: surfaceType,
                    uni,
                    deflection_corr: deflectionCorr,
                    visual_status: visualStatus,
                  }}
                  reinforcementResult={reinforcementResult}
                  detections={detections}
                  imageUrl={previewUrl}
                  deflectionCalc={deflectionCalcData}
                  trafficCalc={undefined}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => window.open('https://www.scribd.com/document/252214023/Guide-Des-Renforcements-CTTP', '_blank', 'noopener')}
                  aria-label="CTTP Guide documentation"
                  className="rounded text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <HelpCircle className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
                  aria-label="Toggle language"
                  className="rounded text-white/70 hover:bg-white/10 hover:text-white text-xs font-bold"
                >
                  {lang === 'en' ? 'FR' : 'EN'}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={handleOpenSettings}
                  aria-label={t('status.settings')}
                  className="rounded text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <Settings className="size-4" />
                </Button>
              </div>

              {/* ─── Mobile menu button (< sm) ─────────────────────────── */}
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={handleOpenMobileMenu}
                aria-label="Open menu"
                className="sm:hidden rounded-lg text-cttp-neutral hover:bg-cttp-accent/10 hover:text-cttp-primary dark:hover:bg-slate-800 dark:hover:text-cttp-accent-light"
              >
                <Menu className="size-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* ─── Main Content ────────────────────────────────────────────── */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* ─── Left Column: Input + Upload ──────────────────────── */}
            <div className="lg:col-span-5 space-y-6">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-2 rounded-lg bg-cttp-primary/5 p-1 dark:bg-slate-800 sticky top-14 z-40 lg:static lg:z-auto">
                  <TabsTrigger
                    value="design"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-cttp-text-primary text-xs sm:text-sm text-cttp-text-muted"
                  >
                    <Calculator className="size-3.5" />
                    {t('tab.design')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="analysis"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-cttp-text-primary text-xs sm:text-sm text-cttp-text-muted"
                  >
                    <Upload className="size-3.5" />
                    {t('tab.analysis')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="results"
                    className="flex items-center justify-center gap-1 sm:gap-1.5 rounded-md data-[state=active]:bg-cttp-bg-card data-[state=active]:shadow-sm data-[state=active]:text-cttp-primary dark:data-[state=active]:bg-slate-700 dark:data-[state=active]:text-cttp-accent-light text-xs sm:text-sm lg:hidden"
                  >
                    <BarChart3 className="size-3.5" />
                    {t('tab.results')}
                  </TabsTrigger>
                </TabsList>

                {/* ─── Design Tab ──────────────────────────────────── */}
                <TabsContent value="design" className="space-y-4 mt-4">
                  <Card className="rounded border bg-white shadow-sm border-cttp-border">
                    <CardHeader className="pb-4">
                      <CardTitle className="cttp-section-header">
                        <BookOpen className="size-4 text-cttp-amber" />
                        {t('design.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Traffic Class */}
                      <div className="space-y-2">
                        <Label htmlFor="traffic-class" className="cttp-detail-label">
                          {t('design.traffic_class')}
                        </Label>
                        {/* Enforce re-render with a key or simple HMR trigger */}
                        <Select value={trafficClass} onValueChange={handleTrafficClassChange}>
                          <SelectTrigger id="traffic-class" className="cttp-select-trigger">
                            <SelectValue placeholder="Select traffic class" />
                          </SelectTrigger>
                          <SelectContent>
                            {TRAFFIC_CLASSES.map((tc) => {
                              const bounds = TRAFFIC_CLASS_BOUNDS[tc]
                              const label = tc === 'T0'
                                ? '<3.5\u00D710\u2075'
                                : tc === 'T5'
                                  ? '>4.0\u00D710\u2077'
                                  : `${bounds.min.toExponential(1)}-${bounds.max.toExponential(1)}`
                              return (
                                <SelectItem key={tc} value={tc}>
                                  {tc} - {label} PL cumulés
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Surface Type */}
                      <div className="space-y-2">
                        <Label htmlFor="surface-type" className="cttp-detail-label">
                          {t('design.surface_type')}
                        </Label>
                        <Select value={surfaceType} onValueChange={handleSurfaceTypeChange}>
                          <SelectTrigger id="surface-type" className="cttp-select-trigger">
                            <SelectValue placeholder="Select surface type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BB">BB - Béton Bitumineux</SelectItem>
                            <SelectItem value="ES">ES - Enduit Superficiel</SelectItem>
                            <SelectItem value="GNT">GNT - Grave Non Traitée</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Visual Status */}
                      <div className="space-y-2">
                        <Label htmlFor="visual-status" className="cttp-detail-label">
                          {t('design.visual_status')}
                        </Label>
                        <Select value={visualStatus} onValueChange={handleVisualStatusChange}>
                          <SelectTrigger id="visual-status" className="cttp-select-trigger">
                            <SelectValue placeholder="Select visual status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Bon">Bon - Acceptable</SelectItem>
                            <SelectItem value="Moyen">Moyen - Non Acceptable</SelectItem>
                            <SelectItem value="Mauvais">Mauvais - Non Acceptable</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator className="bg-cttp-border" />

                      {/* UNI */}
                      <div className="space-y-2">
                        <Label htmlFor="uni" className="cttp-detail-label" title={t('design.uni_tooltip')}>
                          {t('design.uni')} <span className="text-xs text-cttp-muted">{t('design.uni_hint')}</span>
                        </Label>
                        <Input
                          id="uni"
                          type="number"
                          min={0}
                          max={5000}
                          step={1}
                          value={uni}
                          onChange={handleUniChange}
                          className="cttp-input"
                        />
                      </div>

                      <Separator className="bg-cttp-border" />

                      {/* ─── Deflection Correction Calculator ────────── */}
                      <div className="space-y-3">
                        <div className="cttp-section-header">
                          <Gauge className="size-4 text-cttp-amber" />
                          {t('deflection.title')}
                        </div>
                        <p className="text-xs text-cttp-neutral/70 dark:text-slate-400">
                          {t('deflection.formula')}
                        </p>

                        {/* Measured Deflection */}
                        <div className="space-y-2">
                          <Label htmlFor="dc" className="cttp-detail-label text-xs">
                            {t('deflection.measured')} <span className="text-cttp-muted">{t('deflection.measured_hint')}</span>
                          </Label>
                          <Input
                            id="dc"
                            type="number"
                            min={0.01}
                            step={0.1}
                            value={dc}
                            onChange={handleDcChange}
                            className="cttp-input"
                          />
                        </div>

                        {/* Season & Region */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="season" className="cttp-detail-label text-xs flex items-center gap-1" title={t('deflection.season_tooltip')}>
                              <ThermometerSun className="size-3" />
                              {t('deflection.season')}
                            </Label>
                            <Select value={season} onValueChange={handleSeasonChange}>
                              <SelectTrigger id="season" className="cttp-select-trigger text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="wet">{t('deflection.season_wet')}</SelectItem>
                                <SelectItem value="intermediate">{t('deflection.season_intermediate')}</SelectItem>
                                <SelectItem value="dry">{t('deflection.season_dry')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="region" className="cttp-detail-label text-xs flex items-center gap-1" title={t('deflection.region_tooltip')}>
                              <Mountain className="size-3" />
                              {t('deflection.region')}
                            </Label>
                            <Select value={region} onValueChange={handleRegionChange}>
                              <SelectTrigger id="region" className="cttp-select-trigger text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="north">{t('deflection.region_north')}</SelectItem>
                                <SelectItem value="hauts_plateaux">{t('deflection.region_hauts_plateaux')}</SelectItem>
                                <SelectItem value="sahara">{t('deflection.region_sahara')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Temperature & Bitumen thickness */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="temp" className="cttp-detail-label text-xs" title={t('deflection.temperature_tooltip')}>
                              {t('deflection.temperature')} <span className="text-cttp-muted">{t('deflection.temperature_hint')}</span>
                            </Label>
                            <Input
                              id="temp"
                              type="number"
                              min={-10}
                              max={60}
                              step={1}
                              value={temperature}
                              onChange={handleTemperatureChange}
                              disabled={!thickBitumen}
                              className="cttp-input"
                            />
                            {!thickBitumen && (
                              <p className="text-[10px] text-cttp-muted">
                                {t('deflection.bitumen_disabled')}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label className="cttp-detail-label text-xs">{t('deflection.bitumen')}</Label>
                            <div className="flex items-center gap-2 h-9">
                              <Label className="flex items-center gap-2 text-xs cursor-pointer text-cttp-neutral dark:text-slate-400">
                                <input
                                  type="checkbox"
                                  checked={thickBitumen}
                                  onChange={handleThickBitumenChange}
                                  className="size-4 rounded border-cttp-border text-cttp-amber focus:ring-cttp-amber/30"
                                />
                                &ge; 10 cm (Ct varies)
                              </Label>
                            </div>
                            <p className="text-[10px] text-cttp-neutral/70 dark:text-slate-400">
                              {thickBitumen ? `Ct = ${ct.toFixed(3)} at ${temperature}\u00B0C` : 'Ct = 1.00 (thin bitumen)'}
                            </p>
                          </div>
                        </div>

                        {/* Real-time result */}
                        <div className="relative overflow-hidden rounded border bg-white p-3 shadow-sm border-cttp-border">
                          <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-cttp-amber" />
                          <div className="pl-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="cttp-mono text-xs text-cttp-text-muted">
                                d = {dc} &times; {cs.toFixed(2)} &times; {cr.toFixed(2)} &times; {ct.toFixed(3)}
                              </span>
                              <div className="text-right">
                                <span className="cttp-metric-value text-xl leading-none">
                                  {formatDeflection(deflectionCorr)}
                                </span>
                                <span className="ml-1 text-[11px] text-cttp-text-muted">
                                  1/100mm
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                              <span className="text-cttp-text-muted">Zone:</span>
                              <span className={cttpDeflectionBadge(deflectionZone)}>
                                {deflectionZone}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Validation Errors */}
                      {validationErrors.length > 0 && (
                        <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40">
                          <AlertCircle className="size-4" />
                          <AlertDescription>
                            <ul className="list-disc pl-4 space-y-1">
                              {validationErrors.map((err, i) => (
                                <li key={i} className="text-sm text-red-700 dark:text-red-300">
                                  <strong>{err.field}:</strong> {err.message}
                                </li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Compute Button */}
                      <Button
                        type="button"
                        className="cttp-btn-primary w-full"
                        onClick={handleComputeDesign}
                        disabled={isComputing}
                      >
                        {isComputing ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            {t('compute.computing')}
                          </>
                        ) : (
                          <>
                            <Calculator className="size-4" />
                            {t('compute.button')}
                          </>
                        )}
                      </Button>
                      <p className="hidden lg:block mt-2 text-xs text-cttp-text-faint text-center">
                        {t('compute.results_hint')}
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ─── AI Analysis Tab ──────────────────────────────── */}
                <TabsContent value="analysis" className="space-y-4 mt-4">
                  <ImageUploader
                    onFileSelect={handleFileSelect}
                    isProcessing={isAnalyzing}
                  />

                  {uploadedFile && (
                    <div className="space-y-2">
                      <Button
                        type="button"
                        className="cttp-btn-secondary w-full"
                        onClick={handleAnalyzeImage}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            {t('analysis.analyzing')}
                          </>
                        ) : (
                          <>
                            <Zap className="size-4" />
                            {t('analysis.analyze')}
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
                        onClick={handleClassifyLocal}
                        disabled={isClassifying}
                      >
                        {isClassifying ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            {classifyStatus || 'Classifying…'}
                          </>
                        ) : (
                          <>
                            <FlaskConical className="size-4" />
                            Classify with Local Models (Keras + YOLO)
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Local model classification results */}
                  {(kerasResult || yoloResult) && (
                    <Card className="rounded border border-blue-200 bg-white shadow-sm dark:border-blue-800">
                      <CardHeader className="pb-3">
                        <CardTitle className="cttp-section-header text-sm">
                          <FlaskConical className="size-4 text-blue-600" />
                          Local Model Classification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {kerasResult && !kerasResult.error && (
                          <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 dark:border-blue-900 dark:bg-blue-950/20">
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-blue-500" />
                              <span className="text-sm font-medium">Keras</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-bold uppercase ${kerasResult.status === 'good' || kerasResult.status === 'satisfactory' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {kerasResult.status.replace('_', ' ')}
                              </span>
                              <Badge variant="outline" className="cttp-mono text-[10px] font-bold">
                                {kerasResult.confidence.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        )}
                        {kerasResult?.error && (
                          <div className="text-xs text-red-500">Keras: {kerasResult.error}</div>
                        )}

                        {yoloResult && !yoloResult.error && (
                          <div className="flex items-center justify-between rounded-lg border border-purple-100 bg-purple-50/50 px-3 py-2 dark:border-purple-900 dark:bg-purple-950/20">
                            <div className="flex items-center gap-2">
                              <span className="size-2 rounded-full bg-purple-500" />
                              <span className="text-sm font-medium">YOLOv8</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-sm font-bold uppercase ${yoloResult.status === 'good' || yoloResult.status === 'satisfactory' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {yoloResult.status.replace('_', ' ')}
                              </span>
                              <Badge variant="outline" className="cttp-mono text-[10px] font-bold">
                                {yoloResult.confidence.toFixed(1)}%
                              </Badge>
                            </div>
                          </div>
                        )}
                        {yoloResult?.error && (
                          <div className="text-xs text-red-500">YOLO: {yoloResult.error}</div>
                        )}

                        {(kerasResult?.status || yoloResult?.status) && (
                          <div className="relative overflow-hidden rounded border bg-white p-3 shadow-sm border-cttp-border">
                            <div className="absolute bottom-0 left-0 top-0 w-[3px] bg-cttp-amber" />
                            <div className="pl-2">
                              <span className="text-xs text-cttp-text-muted">Combined Status</span>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-lg font-bold uppercase tracking-wide">
                                  {kerasResult?.status || yoloResult?.status}
                                </span>
                                <span className="text-xs text-cttp-text-muted">
                                  Auto-set visual status
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {demoMode && (
                    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
                      <AlertCircle className="size-4 text-amber-600" />
                      <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                        {t('analysis.demo_notice')}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Detection results list */}
                  {detections.length > 0 && (
                    <Card className="rounded border bg-white shadow-sm border-cttp-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="cttp-section-header text-sm">
                          <BarChart3 className="size-4 text-cttp-amber" />
                          Detected Distresses ({detections.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-48 overflow-y-auto cttp-scrollbar">
                          {detections.map((det, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between rounded-lg border border-cttp-accent/10 bg-white px-3 py-2 text-sm transition-all hover:border-cttp-accent/25 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`cttp-status-dot ${det.severity === 'high'
                                    ? CTTP_COLORS.poor.dot
                                    : det.severity === 'medium'
                                      ? CTTP_COLORS.fair.dot
                                      : CTTP_COLORS.good.dot
                                    }`}
                                />
                                <span className="font-medium text-cttp-neutral dark:text-slate-200">{det.label}</span>
                              </div>
                              <Badge
                                variant="outline"
                                className="cttp-mono text-[10px] font-bold rounded-md"
                              >
                                {Math.round(det.confidence * 100)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ─── Results Tab (mobile only) ────────────────────────── */}
                <TabsContent value="results" className="space-y-6 mt-4 lg:hidden">
                  {/* Detection Canvas */}
                  {previewUrl && detections.length > 0 && (
                    <Card className="cttp-card overflow-hidden p-0">
                      <CardContent className="p-3">
                        <DetectionCanvas
                          imageUrl={previewUrl}
                          detections={detections}
                          onDetectionClick={handleDetectionClick}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Metrics Panel */}
                  <MetricsPanel
                    trafficClass={trafficClass}
                    surfaceType={surfaceType}
                    uni={uni}
                    deflectionCorr={deflectionCorr}
                    visualStatus={visualStatus}
                    cs={cs}
                    cr={cr}
                    ct={ct}
                  />

                  {/* Success Banner */}
                  {showSuccessBanner && reinforcementResult && (
                    <div className="flex items-center gap-2.5 rounded-lg border border-cttp-good-border bg-cttp-good-bg px-4 py-3">
                      <CheckCircle2 className="size-4 shrink-0 text-cttp-good" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-cttp-good">
                          {t('compute.success_title')}
                        </p>
                        <p className="text-xs text-cttp-good/80">
                          {reinforcementResult.traceability.rule_source} &rarr; {reinforcementResult.reinforcement_type} reinforcement, {reinforcementResult.structure}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reinforcement Result */}
                  <ReinforcementPanel result={reinforcementResult} isComputing={isComputing} />
                </TabsContent>
              </Tabs>
            </div>

            {/* ─── Right Column: Results (desktop only) ────────────────── */}
            <div className="hidden lg:block lg:col-span-7 space-y-6">
              {/* Detection Canvas */}
              {previewUrl && detections.length > 0 && (
                <Card className="cttp-card overflow-hidden p-0">
                  <CardContent className="p-3">
                    <DetectionCanvas
                      imageUrl={previewUrl}
                      detections={detections}
                      onDetectionClick={handleDetectionClick}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Metrics Panel */}
              <MetricsPanel
                trafficClass={trafficClass}
                surfaceType={surfaceType}
                uni={uni}
                deflectionCorr={deflectionCorr}
                visualStatus={visualStatus}
                cs={cs}
                cr={cr}
                ct={ct}
              />

              {/* Success Banner */}
              {showSuccessBanner && reinforcementResult && (
                <div className="flex items-center gap-2.5 rounded-lg border border-cttp-good-border bg-cttp-good-bg px-4 py-3">
                  <CheckCircle2 className="size-4 shrink-0 text-cttp-good" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-cttp-good">
                      Design computed successfully per CTTP p.45
                    </p>
                    <p className="text-xs text-cttp-good/80">
                      {reinforcementResult.traceability.rule_source} &rarr; {reinforcementResult.reinforcement_type} reinforcement, {reinforcementResult.structure}
                    </p>
                  </div>
                </div>
              )}

              {/* Reinforcement Result */}
              <ReinforcementPanel result={reinforcementResult} isComputing={isComputing} />
            </div>
          </div>
        </main>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <footer className="mt-auto border-t border-cttp-border bg-cttp-bg-card">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <p className="text-xs text-cttp-text-muted">
              CTTP - Guide des Renforcements des Chaussées Souples (Déc 1992)
            </p>
            <p className="text-xs text-cttp-text-muted/70">
              Direction des Études Techniques - Tiaret, Algeria
            </p>
          </div>
        </footer>

        {/* ─── Settings Modal ──────────────────────────────────────────── */}
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />

        {/* ─── Mobile Menu Sheet (< sm) ──────────────────────────────────── */}
        <Sheet open={mobileMenuOpen} onOpenChange={handleCloseMobileMenu}>
          <SheetContent side="right" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-cttp-primary dark:text-cttp-accent-light">
                <Construction className="size-4" />
                CTTP Menu
              </SheetTitle>
              <SheetDescription>
                Access export, license, and settings options
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6">
              {/* Demo Mode Notice */}
              {geminiKeyMissing && (
                <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
                  <FlaskConical className="size-4 text-amber-600" />
                  <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                    {t('analysis.demo_notice')}
                  </AlertDescription>
                </Alert>
              )}

              {/* License */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-cttp-primary dark:text-cttp-accent-light flex items-center gap-2">
                  <Shield className="size-4" />
                  License
                </h3>
                <LicenseInput />
              </div>

              <Separator className="bg-cttp-accent/15 dark:bg-slate-700" />

              {/* Export */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-cttp-primary dark:text-cttp-accent-light flex items-center gap-2">
                  <FileDown className="size-4" />
                  Export Report
                </h3>
                <ReportExporter
                  designInput={{
                    traffic_class: trafficClass,
                    surface_type: surfaceType,
                    uni,
                    deflection_corr: deflectionCorr,
                    visual_status: visualStatus,
                  }}
                  reinforcementResult={reinforcementResult}
                  detections={detections}
                  imageUrl={previewUrl}
                  deflectionCalc={deflectionCalcData}
                  trafficCalc={undefined}
                />
              </div>

              <Separator className="bg-cttp-accent/15 dark:bg-slate-700" />

              {/* Settings */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-cttp-primary dark:text-cttp-accent-light flex items-center gap-2">
                  <Settings className="size-4" />
                  Settings
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 border-cttp-accent/20 text-cttp-primary hover:bg-cttp-accent/10 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={handleMobileSettingsClick}
                >
                  <Settings className="size-4" />
                  Configure Gemini API Key
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </ErrorBoundary>
  )
}
