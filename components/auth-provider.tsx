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
