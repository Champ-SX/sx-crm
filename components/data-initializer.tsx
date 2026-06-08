'use client'

import { useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'

/**
 * DataInitializer Component
 *
 * Initializes all CRM data from Supabase on app startup (once, at the app level).
 * This prevents redundant data loading when users navigate between pages.
 *
 * - Should be placed in app/layout.tsx to load ONCE per app session
 * - Shows loading overlay while data is fetching
 * - Handles missing environment variables gracefully
 */
export function DataInitializer() {
  const { isInitialized, isLoading, error, initializeData } = useCRMStore()

  useEffect(() => {
    // Only initialize once, on first mount
    if (!isInitialized && !isLoading) {
      console.log('[DataInitializer] Triggering data initialization')
      void initializeData()
    }
  }, [isInitialized, isLoading, initializeData])

  // Show loading overlay during initialization
  if (isLoading && !isInitialized) {
    return <LoadingOverlay />
  }

  // Show error if initialization failed
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background border border-destructive rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-lg font-semibold text-destructive mb-2">Initialization Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">
            The app will reload automatically in a few seconds...
          </p>
        </div>
      </div>
    )
  }

  // Initialization complete, render nothing (children already show)
  return null
}

/**
 * LoadingOverlay Component
 * Shows a skeleton loading screen while data is being fetched from Supabase.
 */
function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated skeleton background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent animate-pulse" />

      {/* Loading content */}
      <div className="relative z-10 text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center">
            <div className="w-12 h-12 rounded-lg border-2 border-muted-foreground/20 border-t-blue-500 animate-spin" />
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-foreground mb-2">Loading CRM Data</h2>
        <p className="text-sm text-muted-foreground mb-6">Connecting to database...</p>

        {/* Skeleton cards */}
        <div className="space-y-3 w-64">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
