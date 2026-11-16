'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { boardOfPath } from '@/lib/boards-nav'
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
  const { session, loading: authLoading } = useAuth()
  const { isInitialized, isLoading, error, initializeData } = useCRMStore()
  const refreshTeamMembers = useCRMStore((s) => s.refreshTeamMembers)
  const [loadingTimeout, setLoadingTimeout] = useState(false)

  // A direct link (notification, bookmark) to another board's page switches the
  // board too, so the sidebar menu always matches the page.
  const pathname = usePathname()
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const boards = useCRMStore((s) => s.boards)
  const setActiveBoard = useCRMStore((s) => s.setActiveBoard)
  useEffect(() => {
    const b = pathname ? boardOfPath(pathname) : null
    if (b && activeBoardId && b !== activeBoardId && boards.some((x) => x.board_id === b)) setActiveBoard(b)
  }, [pathname, activeBoardId, boards, setActiveBoard])

  useEffect(() => {
    // Only initialize if authenticated and not already initialized
    if (session && !isInitialized && !isLoading) {
      console.log('[DataInitializer] Triggering data initialization')
      void initializeData()
    }
  }, [session, isInitialized, isLoading, initializeData])

  // Keep the team roster fresh: re-pull the users table when the tab regains
  // focus, so teammates who joined after this session loaded appear in the
  // @mention / owner pickers without a manual reload.
  useEffect(() => {
    if (!session) return
    const onFocus = () => { void refreshTeamMembers() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [session, refreshTeamMembers])

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
  // One continuous loader from first paint until data is in (auth check → data load),
  // instead of page → loader → page jumps. Fades out when done.
  const busy = !loadingTimeout && !isInitialized && !error && (authLoading || !!session)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    if (busy) return
    const t = setTimeout(() => setGone(true), 260)
    return () => clearTimeout(t)
  }, [busy])
  if (!gone) return <LoadingOverlay leaving={!busy} />

  // If we timed out, show a warning and let app continue with mock data
  if (loadingTimeout && !isInitialized) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background border border-[#FF5B3F]/50 rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-lg font-semibold text-[#FF5B3F] mb-2">Using Mock Data</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Unable to connect to database. The app will use sample data for testing.
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Check your Supabase configuration in .env.local or Vercel environment settings.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-[#FF5B3F]/10 hover:bg-[#FF5B3F]/20 text-[#FF5B3F] rounded font-medium transition-colors"
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
function LoadingOverlay({ leaving }: { leaving: boolean }) {
  return (
    <div role="status" aria-busy={!leaving}
      className={`fixed inset-0 z-50 grid place-items-center bg-background transition-opacity duration-250 ease-out ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
      <div className="sx-loader-card rounded-2xl border border-border bg-card px-10 py-7 text-center shadow-lg">
        <div className="relative mx-auto h-[72px] w-[72px]">
          {/* GPU-only spin (transform) — stays smooth while the app is busy loading data */}
          <span className="absolute inset-0 rounded-full border-[3px] border-muted border-t-[#FF5B3F] will-change-transform animate-[spin_0.9s_linear_infinite]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={40} height={40} decoding="sync" className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 object-contain dark:invert" />
        </div>
        <h2 className="mt-4 text-[17px] font-semibold text-foreground">Loading CRM Data</h2>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">Connecting to database…</p>
      </div>
    </div>
  )
}
