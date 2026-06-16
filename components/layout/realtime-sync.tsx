'use client'

import { useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

// How often to poll for new activity while the app is visible. This is the
// iOS safety net: iOS suspends a backgrounded PWA's JS (killing the Realtime
// WebSocket) and doesn't reliably resume the socket on foreground, so we can't
// depend on Realtime there. Polling keeps an open app fresh regardless.
const POLL_INTERVAL_MS = 20_000

/**
 * Mounts once in the root layout. Keeps the activity feed up-to-date across
 * users and devices via three layered mechanisms (most → least instant):
 *
 * 1. Supabase Realtime — instant push when another user logs a note. Works on
 *    desktop and active mobile, but the socket dies when an iOS PWA backgrounds.
 * 2. Foreground refetch — pageshow / focus / visibilitychange all trigger a
 *    refetch. iOS often restores a PWA from bfcache WITHOUT firing
 *    visibilitychange, so we listen to pageshow + focus as well.
 * 3. Visible-interval poll — every 20s while the tab is visible. The reliable
 *    floor for iOS where the WebSocket is suspended.
 */
export function RealtimeSync() {
  const refreshActivities = useCRMStore((s) => s.refreshActivities)
  const isInitialized = useCRMStore((s) => s.isInitialized)

  useEffect(() => {
    if (!isSupabaseConfigured || !isInitialized) return

    // ── 1. Supabase Realtime subscription ──────────────────────────────────
    const channel = supabase
      .channel('activities-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => { void refreshActivities() }
      )
      .subscribe()

    // ── 2. Foreground refetch (covers iOS bfcache restore) ──────────────────
    function refetchIfVisible() {
      if (document.visibilityState === 'visible') void refreshActivities()
    }
    document.addEventListener('visibilitychange', refetchIfVisible)
    window.addEventListener('focus', refetchIfVisible)
    window.addEventListener('pageshow', refetchIfVisible)

    // ── 3. Visible-interval poll (iOS safety net) ───────────────────────────
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refreshActivities()
    }, POLL_INTERVAL_MS)

    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', refetchIfVisible)
      window.removeEventListener('focus', refetchIfVisible)
      window.removeEventListener('pageshow', refetchIfVisible)
      clearInterval(interval)
    }
  }, [isInitialized, refreshActivities])

  return null
}
