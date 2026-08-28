'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { mockTeamMembers } from '@/lib/mock-data'
import type { Session } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  user: any | null
  role: string | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // MOCK MODE: bypass auth with a fake admin user. Never runs in production.
    if (!isSupabaseConfigured) {
      const admin = mockTeamMembers.find((m) => m.role === 'admin') ?? mockTeamMembers[0]
      const devUser = {
        id: admin?.id ?? 'dev-user',
        email: admin?.email ?? 'dev@localhost',
        user_metadata: { full_name: admin?.name ?? 'Dev User' },
      }
      setUser(devUser)
      setRole(admin?.role ?? 'admin')
      setSession({ user: devUser, access_token: 'mock', token_type: 'bearer' } as unknown as Session)
      setLoading(false)
      return
    }

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          setSession(session)
          setUser(session.user)
          // Tell the store who's signed in (actor / skip-self for notifications).
          try {
            const { useCRMStore } = await import('@/store/crm-store')
            useCRMStore.getState().setCurrentUser(
              session.user.id,
              session.user.user_metadata?.full_name || session.user.email || null,
            )
          } catch { /* ignore */ }

          // Register SW only — permission prompt needs a user gesture (button tap).
          // See PushPermissionBanner in sidebar for the explicit opt-in step.
          void registerServiceWorker()

          // Google profile picture (kept fresh on each login)
          const avatarUrl = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null

          // Sync the users row by EMAIL (not id) so a teammate who was
          // pre-provisioned by an admin (before ever logging in) links to their
          // existing row instead of creating a duplicate. Keeps that row's id so
          // any prior references stay valid.
          try {
            const fullName = session.user.user_metadata?.full_name
            const { data: existing } = await supabase
              .from('users')
              .select('id, role, name')
              .eq('email', session.user.email)
              .maybeSingle()

            if (existing) {
              setRole(existing.role || 'operation')
              // Refresh the avatar only; keep the stored name so a user's own
              // edit (Settings → Your profile) isn't clobbered on each login.
              // Backfill the name only if it's still empty.
              const patch: { avatar_url: string | null; name?: string } = { avatar_url: avatarUrl }
              if (!existing.name && fullName) patch.name = fullName
              void supabase.from('users')
                .update(patch)
                .eq('email', session.user.email)
            } else {
              const { error: insertError } = await supabase.from('users').insert({
                id: session.user.id,
                email: session.user.email,
                name: fullName,
                avatar_url: avatarUrl,
                role: 'operation',
              })
              if (insertError && !insertError.message.includes('duplicate')) {
                console.error('[AuthProvider] Error creating user:', insertError)
              }
              setRole('operation')
            }
          } catch (err) {
            console.error('[AuthProvider] user sync failed:', err)
            setRole('operation')
          }
        }
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const signOut = async () => {
    if (!isSupabaseConfigured) return
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setRole(null)
      window.location.href = '/login'
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

// ── Web Push helpers (module-level, not inside component) ─────────────────────

// Step 1: Register SW only — safe to call automatically on login, no permission prompt.
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    return reg
  } catch (err) {
    console.warn('[push] SW registration failed:', err)
    return null
  }
}

// Step 2: Request permission + subscribe — MUST be called from a user gesture (button tap).
// iOS blocks Notification.requestPermission() if called automatically on page load.
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const subscription = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
    })

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    })
    return true
  } catch (err) {
    console.warn('[push] subscribe failed:', err)
    return false
  }
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
}

export function currentPushPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)))
}
