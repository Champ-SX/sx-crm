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
    // MOCK MODE (local dev, no Supabase env vars): bypass auth entirely with a
    // fake admin dev user so the app is usable without a login wall. This branch
    // never runs in production, where the env vars are always present.
    if (!isSupabaseConfigured) {
      // Sign in locally AS the admin team member, so owner/mentions/notifications
      // all reference a real identity in the mock team (id matches teamMembers).
      const admin = mockTeamMembers.find((m) => m.role === 'admin') ?? mockTeamMembers[0]
      const devUser = {
        id: admin?.id ?? 'dev-user',
        email: admin?.email ?? 'dev@localhost',
        user_metadata: { full_name: admin?.name ?? 'Dev User' },
      }
      setUser(devUser)
      setRole(admin?.role ?? 'admin')
      // Minimal truthy session so AuthGuard/DataInitializer treat us as signed in.
      setSession({ user: devUser, access_token: 'mock', token_type: 'bearer' } as unknown as Session)
      setLoading(false)
      return
    }

    // Single initialization: restore session from cookies (set by exchangeCodeForSession)
    // and fetch user role from database. No onAuthStateChange listener needed.
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          setSession(session)
          setUser(session.user)

          // Fetch user role from database
          try {
            const { data, error } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single()

            if (error) {
              console.error('[AuthProvider] Error fetching user role:', error)
              throw error
            }

            console.log('[AuthProvider] User role fetched:', data?.role)
            setRole(data?.role || 'operation')
          } catch (error) {
            console.error('[AuthProvider] Error in role fetch, creating user:', error)
            // User record doesn't exist yet, create it
            const { error: insertError } = await supabase.from('users').insert({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name,
              role: 'operation',
            })

            if (insertError && !insertError.message.includes('duplicate')) {
              console.error('[AuthProvider] Error creating user:', insertError)
            }
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
    // Mock mode has no real session to clear and /login can't sign back in,
    // so signing out is a no-op locally.
    if (!isSupabaseConfigured) return

    try {
      // Sign out from Supabase (clears cookies and localStorage)
      await supabase.auth.signOut()

      // Clear app state
      setSession(null)
      setUser(null)
      setRole(null)

      // Redirect to login
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
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
