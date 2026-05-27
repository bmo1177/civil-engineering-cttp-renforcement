'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Key,
  Eye,
  EyeOff,
  Trash2,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Languages,
  Shield,
} from 'lucide-react'
import { useLanguage, type Lang } from '@/lib/translations'

const STORAGE_KEY = 'cttp_gemini_key'

function readStoredKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(STORAGE_KEY) || ''
}

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SettingsModalContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { t, lang, setLang } = useLanguage()
  // Initialize with safe defaults (no localStorage read during render)
  const [apiKey, setApiKey] = useState(() => readStoredKey())
  const [showKey, setShowKey] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const hasStoredKey = apiKey !== ''

  const isServerConfigured = process.env.NEXT_PUBLIC_GEMINI_CONFIGURED === 'true'

  const handleSave = useCallback(() => {
    if (apiKey.trim()) {
      localStorage.setItem(STORAGE_KEY, apiKey.trim())
    }
    onOpenChange(false)
  }, [apiKey, onOpenChange])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
  }, [onOpenChange])

  const handleClear = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    localStorage.removeItem(STORAGE_KEY)
    setApiKey('')
    setConfirmClear(false)
  }, [confirmClear])

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-cttp-text-primary">
          <Key className="size-5 text-cttp-amber" />
          Settings
        </DialogTitle>
        <DialogDescription className="text-cttp-text-muted">
          Configure your API key for AI-powered pavement analysis.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-2">
        {/* API Key Status */}
        <div className="flex flex-col gap-2">
          {hasStoredKey ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              <span className="text-sm font-medium">Personal API Key is set</span>
            </div>
          ) : isServerConfigured ? (
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <Shield className="size-4" />
              <span className="text-sm font-medium">Server-side Key Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <XCircle className="size-4" />
              <span className="text-sm font-medium">No API Key configured</span>
            </div>
          )}
          
          {isServerConfigured && !hasStoredKey && (
            <p className="text-[10px] text-cttp-text-muted italic">
              * The application is using a pre-configured server key. You can still provide your own below to override it.
            </p>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <Label htmlFor="gemini-key" className="text-sm font-medium">
            Gemini API Key
          </Label>
          <div className="relative">
            <Input
              id="gemini-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setConfirmClear(false)
              }}
              placeholder="Enter your Gemini API key"
              className="pr-10"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowKey(!showKey)}
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Language Toggle */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Languages className="size-4" />
            {t('settings.language')}
          </Label>
          <div className="flex gap-2">
            <Button
              variant={lang === 'fr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLang('fr')}
              className="flex-1"
            >
              {t('settings.french')}
            </Button>
            <Button
              variant={lang === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLang('en')}
              className="flex-1"
            >
              {t('settings.english')}
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3">
          <HelpCircle className="size-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            The Gemini API key is used to power AI-based visual inspection of pavement distress
            images. Your key is stored locally in your browser and never sent to our servers.
            You can obtain a key from the{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              Google AI Studio
            </a>
            .
          </p>
        </div>

        {/* Show/Hide Key Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="show-key-toggle" className="text-sm cursor-pointer">
            Show key characters
          </Label>
          <Switch
            id="show-key-toggle"
            checked={showKey}
            onCheckedChange={setShowKey}
          />
        </div>

        {/* Clear Key */}
        <div className="pt-1">
          {confirmClear ? (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
              <p className="text-sm text-red-700 dark:text-red-300 flex-1">
                Are you sure you want to delete your API key?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleClear}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasStoredKey}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4 mr-1.5" />
              Clear API Key
            </Button>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!apiKey.trim()}>
          Save Key
        </Button>
      </DialogFooter>
    </>
  )
}

export default function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && <SettingsModalContent onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  )
}

export type { SettingsModalProps }
