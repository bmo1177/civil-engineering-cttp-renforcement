'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon, X, Film, AlertCircle, FileText, Loader2 } from 'lucide-react'

interface ImageUploaderProps {
  onFileSelect: (file: File | null) => void
  isProcessing?: boolean
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const ACCEPTED_TYPES = ['image/*', 'video/*']

export default function ImageUploader({ onFileSelect, isProcessing = false }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)

  // Clean up object URL on unmount or when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const validateFile = useCallback((file: File): string | null => {
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      return 'Type de fichier non supporté. Veuillez sélectionner une image ou une vidéo.'
    }

    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux. Taille maximale : 20 Mo (votre fichier : ${(file.size / (1024 * 1024)).toFixed(1)} Mo)`
    }

    return null
  }, [])

  const handleFile = useCallback(
    (selectedFile: File) => {
      setError(null)
      const validationError = validateFile(selectedFile)
      if (validationError) {
        setError(validationError)
        return
      }

      // Revoke previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }

      const url = URL.createObjectURL(selectedFile)
      setFile(selectedFile)
      setPreviewUrl(url)
      onFileSelect(selectedFile)
    },
    [validateFile, onFileSelect, previewUrl]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current += 1
    if (dragCounterRef.current === 1) {
      setIsDragging(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current -= 1
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      dragCounterRef.current = 0

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFile(droppedFile)
      }
    },
    [handleFile]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFile(selectedFile)
      }
      // Reset input value so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFile]
  )

  const handleClear = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(null)
    setPreviewUrl(null)
    setError(null)
    onFileSelect(null)
  }, [previewUrl, onFileSelect])

  const handleClickZone = useCallback(() => {
    if (!isProcessing) {
      fileInputRef.current?.click()
    }
  }, [isProcessing])

  const isVideo = file?.type.startsWith('video/')

  return (
    <div className="cttp-card w-full overflow-hidden">
      {file && previewUrl ? (
        /* ── File Preview ──────────────────────────────────────────── */
        <div className="relative">
          {/* Media container */}
          <div className="relative w-full overflow-hidden bg-cttp-accent/5 dark:bg-slate-800">
            {isVideo ? (
              <video
                src={previewUrl}
                className="max-h-80 w-full object-contain"
                controls
                muted
              />
            ) : (
              <img
                src={previewUrl}
                alt="Aperçu du fichier téléchargé"
                className="max-h-80 w-full object-contain"
              />
            )}

            {/* Processing overlay on media */}
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-cttp-bg-dark/70 backdrop-blur-sm">
                <div className="flex items-center justify-center size-12 rounded-full bg-cttp-accent/20">
                  <Loader2 className="size-6 animate-spin text-cttp-accent" />
                </div>
                <span className="text-sm font-semibold text-white">Traitement en cours…</span>
                <span className="text-xs text-slate-300">Analyse CTTP en progression</span>
              </div>
            )}
          </div>

          {/* File info bar */}
          <div className="flex items-center justify-between gap-3 border-t border-cttp-accent/15 bg-cttp-accent/5 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/80">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-cttp-primary/10 dark:bg-cttp-accent/20">
                {isVideo ? (
                  <Film className="size-4 text-cttp-primary dark:text-cttp-accent" />
                ) : (
                  <ImageIcon className="size-4 text-cttp-primary dark:text-cttp-accent" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-cttp-neutral dark:text-slate-200">
                  {file.name}
                </p>
                <p className="text-xs text-cttp-muted dark:text-slate-400">
                  {(file.size / (1024 * 1024)).toFixed(2)} Mo · {isVideo ? 'Vidéo' : 'Image'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isProcessing}
              className="shrink-0 gap-1.5 text-cttp-text-muted hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <X className="size-3.5" />
              <span className="hidden sm:inline">Supprimer</span>
            </Button>
          </div>
        </div>
      ) : (
        /* ── Drop Zone ─────────────────────────────────────────────── */
        <div
          role="button"
          tabIndex={0}
          aria-label="Zone de dépôt de fichier. Cliquez ou glissez-déposez un fichier image ou vidéo."
          className={`
            relative flex cursor-pointer flex-col items-center justify-center rounded-xl
            border-2 border-dashed px-4 py-10 transition-all duration-200 sm:py-14
            ${isDragging
              ? 'border-cttp-accent bg-cttp-accent/10 shadow-[0_0_0_3px_rgba(132,204,22,0.15)] dark:border-cttp-accent dark:bg-cttp-accent/5'
              : 'border-cttp-accent/25 bg-cttp-accent/5 hover:border-cttp-accent/50 hover:bg-cttp-accent/10 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-cttp-accent/40 dark:hover:bg-cttp-accent/5'
            }
            ${isProcessing ? 'pointer-events-none opacity-50' : ''}
          `}
          onClick={handleClickZone}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleClickZone()
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            aria-hidden="true"
          />

          {/* Icon */}
          <div className={`
            mb-4 flex size-14 items-center justify-center rounded-xl transition-all duration-200
            ${isDragging
              ? 'bg-cttp-accent/20 text-cttp-primary shadow-sm dark:bg-cttp-accent/30 dark:text-cttp-accent-light'
              : 'bg-cttp-accent/10 text-cttp-primary/60 dark:bg-slate-800 dark:text-slate-500'
            }
          `}>
            {isDragging ? (
              <Upload className="size-6" />
            ) : (
              <ImageIcon className="size-6" />
            )}
          </div>

          {/* Primary text */}
          <p className={`mb-1 text-sm font-semibold transition-colors duration-200 ${isDragging
              ? 'text-cttp-primary dark:text-cttp-accent-light'
              : 'text-cttp-neutral dark:text-slate-300'
            }`}>
            {isDragging
              ? 'Déposez le fichier ici'
              : 'Glissez-déposez une image ou vidéo'}
          </p>

          {/* Secondary text */}
          <p className={`text-xs transition-colors duration-200 ${isDragging
              ? 'text-cttp-accent dark:text-cttp-accent/80'
              : 'text-cttp-muted dark:text-slate-400'
            }`}>
            ou cliquez pour parcourir
          </p>

          {/* Format hint */}
          <div className="mt-4 flex items-center gap-1.5">
            <FileText className="size-3 text-cttp-muted dark:text-slate-500" />
            <span className="text-xs text-cttp-muted dark:text-slate-500">
              Images et vidéos · 20 Mo max
            </span>
          </div>

          {/* Drag-active pulsing ring */}
          {isDragging && (
            <div className="pointer-events-none absolute inset-2 rounded-lg border-2 border-cttp-accent/40 animate-pulse" />
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-cttp-bg-dark/60 backdrop-blur-sm">
              <div className="flex items-center justify-center size-12 rounded-full bg-cttp-accent/20">
                <Loader2 className="size-6 animate-spin text-cttp-accent" />
              </div>
              <span className="text-sm font-semibold text-white">Traitement en cours…</span>
              <span className="text-xs text-slate-300">Analyse CTTP en progression</span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mx-4 mb-4 mt-3 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500 dark:text-red-400" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}
