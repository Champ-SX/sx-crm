'use client'

import { useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Mounts once in the root layout. Keeps the activity feed up-to-date via two mechanisms:
 *
 * 1. Supabase Realtime — instant update when another user logs a note (app is active).
 * 2. visibilitychange — refetch when the PWA is brought to the foreground after being
 *    backgrounded (e.g., user taps a push notification and switches back to the app).
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
        () => {
          void refreshActivities()
        }
      )
      .subscribe()

    // ── 2. visibilitychange — refetch when PWA comes to foreground ──────────
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refreshActivities()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      void supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isInitialized, refreshActivities])

  return null
}
