'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, onAuthStateChange, getCurrentUser } from '@/lib/supabase/auth'
import { getMockSession } from '@/lib/supabase/mock-auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  // First, set up client-side detection
  useEffect(() => {
    setIsMounted(true)

    // Check for mock session first (client-side only)
    const mockSession = getMockSession()
    if (mockSession) {
      setUser(mockSession as User)
      setLoading(false)
      return
    }

    // Then check for real Supabase session
    const checkUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (err) {
        console.error('Error checking user:', err)
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  // Listen for auth changes
  useEffect(() => {
    if (!isMounted) return

    const unsubscribe = onAuthStateChange((user) => {
      setUser(user)
    })

    return () => {
      unsubscribe?.data?.subscription?.unsubscribe()
    }
  }, [isMounted])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
