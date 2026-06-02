'use client'

import { useEffect } from 'react'

/**
 * Registers the CTTP Service Worker on mount (client-only).
 * Skips registration in Tauri environment where SW is not needed.
 */
export function SWRegistrar() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      ((window as any).__TAURI__ !== undefined ||
        (window as any).__TAURI_INTERNALS__ !== undefined ||
        window.navigator.userAgent.toLowerCase().includes('tauri'))
    ) {
      return
    }

    // Skip if SW not supported
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    // Register service worker
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check for updates on load
        registration.update()

        // Detect new SW version and reload when it activates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })
      })
      .catch(() => {
        // SW registration failed — app still works without it
      })

    // Reload when a new SW takes over
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  }, [])

  return null
}
