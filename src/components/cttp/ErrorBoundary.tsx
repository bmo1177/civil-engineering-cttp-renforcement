'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CTTP ErrorBoundary]', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[320px] items-center justify-center p-8">
          <div className="max-w-md space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
              <AlertCircle className="size-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-cttp-primary dark:text-cttp-accent-light">
              Something went wrong
            </h2>
            <p className="text-sm text-cttp-neutral/70 dark:text-slate-400">
              The CTTP calculator encountered an unexpected error. This is likely a hydration or rendering issue.
            </p>
            {this.state.error && (
              <pre className="mx-auto max-w-full overflow-x-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {this.state.error.message}
              </pre>
            )}
            <Button
              onClick={this.handleReset}
              className="cttp-btn-primary"
            >
              Try Again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
