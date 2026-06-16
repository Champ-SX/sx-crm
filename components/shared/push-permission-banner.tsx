'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import {
  isPushSupported,
  currentPushPermission,
  requestPushPermission,
} from '@/components/auth-provider'
import { isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Shown in the sidebar after login when push permission hasn't been granted yet.
 * Uses a button tap to trigger Notification.requestPermission() — required by iOS.
 */
export function PushPermissionBanner() {
  const [status, setStatus] = useState<'idle' | 'asking' | 'granted' | 'denied' | 'hidden'>('idle')

  useEffect(() => {
    // Only show in prod (Supabase configured) where push actually works
    if (!isSupabaseConfigured) { setStatus('hidden'); return }
    if (!isPushSupported()) { setStatus('hidden'); return }
    const perm = currentPushPermission()
    if (perm === 'granted') { setStatus('granted'); return }
    if (perm === 'denied')  { setStatus('hidden'); return }
    setStatus('idle')
  }, [])

  async function handleEnable() {
    setStatus('asking')
    const granted = await requestPushPermission()
    setStatus(granted ? 'granted' : 'denied')
  }

  if (status === 'hidden' || status === 'denied') return null

  if (status === 'granted') {
    return (
      <div className="mx-3 mb-2 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-2 text-xs text-green-700 dark:text-green-400">
        <Bell className="w-3.5 h-3.5 shrink-0" />
        <span>Notifications on</span>
      </div>
    )
  }

  return (
    <div className="mx-3 mb-2 rounded-lg border border-border bg-muted/60 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground leading-snug">
            Get notified when mentioned
          </p>
        </div>
        <button
          type="button"
          onClick={() => setStatus('hidden')}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={status === 'asking'}
        className="mt-2 w-full rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
      >
        {status === 'asking' ? 'Requesting…' : 'Enable Notifications'}
      </button>
    </div>
  )
}
