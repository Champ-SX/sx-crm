'use client'

import { useEffect, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'

/**
 * DataInitializer Component
 *
 * Initializes all CRM data from Supabase on app startup (once, at the app level).
 * This prevents redundant data loading when users navigate between pages.
 *
 * - Should be placed in app/layout.tsx to load ONCE per app session
 * - Shows loading overlay while data is fetching
 * - Handles missing environment variables gracefully (falls back to mock data)
 * - Only initializes when user is authenticated
 * - Middleware handles route protection, so we only check session status
 */
export function DataInitializer() {
  const { session } = useAuth()
  const { isInitialized, isLoading, error, initializeData } = useCRMStore()
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  useEffect(() => {
    // Only initialize if authenticated and not already initialized
    if (session && !isInitialized && !isLoading) {
      console.log('[DataInitializer] Triggering data initialization')
      void initializeData()
    }
  }, [session, isInitialized, isLoading, initializeData])

  // Safety timeout: if still loading after 15 seconds, assume Supabase isn't available
  // and fall back to mock data (which should already be loaded by store)
  // Increased from 5s to 15s to handle slower network/cold starts in production
  useEffect(() => {
    if (isLoading && !isInitialized) {
      const timer = setTimeout(() => {
        console.warn('[DataInitializer] Loading timeout - likely using mock data')
        setLoadingTimeout(true)
      }, 15000)
      return () => clearTimeout(timer)
    }
  }, [isLoading, isInitialized])

  // Show loading overlay during initialization
  if (isLoading && !isInitialized && !loadingTimeout) {
    return <LoadingOverlay />
  }

  // If we timed out, show a warning and let app continue with mock data
  if (loadingTimeout && !isInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background border border-amber-600/50 rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-lg font-semibold text-amber-600 mb-2">Using Mock Data</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Unable to connect to database. The app will use sample data for testing.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Check your Supabase configuration in .env.local or Vercel environment settings.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-600 rounded font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // Show error if initialization failed with a critical error (not just mock data fallback)
  if (error && !error.includes('mock data') && !error.includes('USE_SUPABASE is false')) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background border border-destructive rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-lg font-semibold text-destructive mb-2">Database Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">
            Contact support if the problem persists.
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
