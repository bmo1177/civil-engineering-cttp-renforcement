'use client'

import dynamic from 'next/dynamic'

const CalculatorApp = dynamic(() => import('@/components/cttp/CalculatorApp'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex flex-col bg-cttp-bg-app dark:bg-cttp-navy">
      <header className="sticky top-0 z-50 border-b border-cttp-border bg-cttp-bg-card/95 dark:border-cttp-navy-mid dark:bg-cttp-navy/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-cttp-navy">
                            <svg className="size-4.5 text-cttp-amber" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                {/* Perspective road */}
                <path d="M7 21l3-14" />
                <path d="M17 21l-3-14" />
                <path d="M12 21v-3M12 15v-2M12 9v-2" />
                
                {/* Bottom Metric */}
                <path d="M3 21h18" />
                <path d="M3 20v2M21 20v2" />
                <circle cx="12" cy="21" r="0.6" fill="currentColor" />

                {/* Top Metric */}
                <path d="M9 7h6" />
                <path d="M9 6v2M15 6v2" />
                <circle cx="12" cy="7" r="0.6" fill="currentColor" />

                {/* Left Gauge */}
                <path d="M4 18l1-10" />
                <circle cx="4.2" cy="17" r="0.4" fill="currentColor" />
                <circle cx="4.7" cy="13" r="0.4" fill="currentColor" />
                <circle cx="5.2" cy="9" r="0.4" fill="currentColor" />

                {/* Right Diamond Target */}
                <path d="M18 10l3 3-3 3-3-3z" strokeWidth="1" fill="currentColor" fillOpacity="0.1" />
                <path d="M18 10v6M15 13h6" strokeWidth="1" />
              </svg>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-cttp-navy dark:text-cttp-amber-light">
              CTTP Renforcement
            </h1>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-cttp-text-muted">
            <svg className="size-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <span className="text-sm font-medium">Loading calculator...</span>
          </div>
        </div>
      </main>
      <footer className="mt-auto border-t border-cttp-border bg-cttp-bg-card dark:border-cttp-navy-mid dark:bg-cttp-navy">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="text-xs text-cttp-text-faint">CTTP — Guide des Renforcements des Chaussées Souples (Déc 1992)</p>
        </div>
      </footer>
    </div>
  ),
})

export default function Home() {
  return <CalculatorApp />
}
