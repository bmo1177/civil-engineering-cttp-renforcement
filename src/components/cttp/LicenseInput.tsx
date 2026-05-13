'use client'

import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Key, CheckCircle2, XCircle } from 'lucide-react'

const LICENSE_KEY = 'cttp_license'
const LICENSE_PATTERN = /^CTTP-[A-Z0-9]{8}$/

function readLicense(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(LICENSE_KEY) || ''
}

function validateLicense(key: string): boolean {
  return LICENSE_PATTERN.test(key.trim())
}

export default function LicenseInput() {
  const [inputValue, setInputValue] = useState('')
  // IMPORTANT: Always initialize as false for SSR/client consistency.
  // The actual license state is read in useEffect after mount.
  const [licensed, setLicensed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Hydration-safe: read license from localStorage after mount ──────────
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydration-safe: must read localStorage after mount to avoid SSR/client mismatch
    setLicensed(validateLicense(readLicense()))
    setMounted(true)
  }, [])

  const handleActivate = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      setError('Enter a license key')
      return
    }
    if (!validateLicense(trimmed)) {
      setError('Format: CTTP-XXXXXXXX (8 uppercase alphanumeric)')
      return
    }
    localStorage.setItem(LICENSE_KEY, trimmed)
    setLicensed(true)
    setError(null)
    setInputValue('')
    setOpen(false)
  }, [inputValue])

  const handleRemove = useCallback(() => {
    localStorage.removeItem(LICENSE_KEY)
    setLicensed(false)
    setError(null)
  }, [])

  // ─── Before mount: render a neutral placeholder to avoid hydration mismatch ──
  // Both SSR and initial client render produce identical output.
  if (!mounted) {
    return (
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-default"
        aria-label="License status"
        disabled
      >
        <Badge
          variant="outline"
          className="gap-1 rounded-md border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500"
        >
          <Key className="size-3" />
          License
        </Badge>
      </button>
    )
  }

  // ─── After mount: render full Popover with correct license state ──────────
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold transition-colors cursor-pointer"
          aria-label={licensed ? 'Licensed' : 'Trial mode — click to activate'}
        >
          {licensed ? (
            <Badge
              variant="outline"
              className="gap-1 rounded-md border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              <CheckCircle2 className="size-3" />
              Licensed
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 rounded-md border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            >
              <XCircle className="size-3" />
              Trial
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-cttp-primary dark:text-cttp-accent-light" />
            <span className="text-sm font-semibold text-cttp-primary dark:text-cttp-accent-light">
              License Activation
            </span>
          </div>

          {licensed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
                <span className="text-sm font-medium">Active License</span>
              </div>
              <p className="cttp-mono text-xs text-cttp-neutral dark:text-slate-400">
                {readLicense().slice(0, 5)}•••••••
              </p>
              <button
                type="button"
                onClick={handleRemove}
                className="cttp-btn-secondary w-full text-xs mt-2"
              >
                Deactivate
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-cttp-neutral/70 dark:text-slate-400">
                Enter your CTTP license key to activate. Format: CTTP-XXXXXXXX
              </p>
              <div className="space-y-2">
                <Input
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  placeholder="CTTP-XXXXXXXX"
                  className="cttp-input cttp-mono text-center text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleActivate()
                  }}
                />
                {error && (
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleActivate}
                className="cttp-btn-primary w-full text-xs"
              >
                Activate
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
