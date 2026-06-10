'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
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
    // Check current session and sync to cookies
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        setSession(session)
        setUser(session.user)

        // Sync session to cookies for middleware
        // This ensures server-side middleware can see the session
        document.cookie = `sb-session=${JSON.stringify(session)}; path=/`

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
          await supabase.from('users').insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name,
            role: 'operation',
          })
          setRole('operation')
        }
      }

      setLoading(false)
    }

    checkSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setSession(session)
        setUser(session.user)

        // Fetch role when session changes
        try {
          const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single()

          if (error) throw error
          setRole(data?.role || 'operation')
        } catch (error) {
          console.error('[AuthProvider] Error fetching role in onAuthStateChange:', error)
          // User record doesn't exist, create it
          await supabase.from('users').insert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name,
            role: 'operation',
          })
          setRole('operation')
        }
      } else {
        setSession(null)
        setUser(null)
        setRole(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut()

      // Clear localStorage
      localStorage.clear()

      // Clear custom cookie
      document.cookie = 'sb-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;'

      // Clear state
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
