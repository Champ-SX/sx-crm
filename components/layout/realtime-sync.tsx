'use client'

import { useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

// How often to poll for new activity while the app is visible. This is only the
// iOS safety net (iOS suspends a backgrounded PWA's JS, killing the Realtime
// WebSocket); Realtime is the primary live-update path on every other platform.
// Kept long to minimise egress — the refresh fetches metadata only (no
// attachment blobs), but there's no need to hammer it every few seconds.
const POLL_INTERVAL_MS = 60_000

/**
 * Mounts once in the root layout. Keeps the activity feed up-to-date across
 * users and devices via three layered mechanisms (most → least instant):
 *
 * 1. Supabase Realtime — instant push when another user logs a note. Works on
 *    desktop and active mobile, but the socket dies when an iOS PWA backgrounds.
 * 2. Foreground refetch — pageshow / focus / visibilitychange all trigger a
 *    refetch. iOS often restores a PWA from bfcache WITHOUT firing
 *    visibilitychange, so we listen to pageshow + focus as well.
 * 3. Visible-interval poll — every 60s while the tab is visible (metadata only).
 *    The reliable floor for iOS where the WebSocket is suspended.
 */
export function RealtimeSync() {
  const refreshActivities = useCRMStore((s) => s.refreshActivities)
  const refreshNotifications = useCRMStore((s) => s.refreshNotifications)
  const isInitialized = useCRMStore((s) => s.isInitialized)
  const { user } = useAuth()
  const userId = user?.id

  useEffect(() => {
    if (!isSupabaseConfigured || !isInitialized) return

    const refreshAll = () => {
      void refreshActivities()
      void refreshNotifications()
    }

    // ── 1. Supabase Realtime subscriptions ──────────────────────────────────
    const activityChannel = supabase
      .channel('activities-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activities' },
        () => { void refreshActivities() }
      )
      .subscribe()

    // Only this user's notifications (matched server-side by recipient_id).
    const notifChannel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          ...(userId ? { filter: `recipient_id=eq.${userId}` } : {}),
        },
        () => { void refreshNotifications() }
      )
      .subscribe()

    // ── 2. Foreground refetch (covers iOS bfcache restore) ──────────────────
    function refetchIfVisible() {
      if (document.visibilityState === 'visible') refreshAll()
    }
    document.addEventListener('visibilitychange', refetchIfVisible)
    window.addEventListener('focus', refetchIfVisible)
    window.addEventListener('pageshow', refetchIfVisible)

    // ── 3. Visible-interval poll (iOS safety net) ───────────────────────────
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshAll()
    }, POLL_INTERVAL_MS)

    return () => {
      void supabase.removeChannel(activityChannel)
      void supabase.removeChannel(notifChannel)
      document.removeEventListener('visibilitychange', refetchIfVisible)
      window.removeEventListener('focus', refetchIfVisible)
      window.removeEventListener('pageshow', refetchIfVisible)
      clearInterval(interval)
    }
  }, [isInitialized, userId, refreshActivities, refreshNotifications])

  return null
}
