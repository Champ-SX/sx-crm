import { createClient } from '@supabase/supabase-js'
import { getMockSession, mockSignOut } from './mock-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Client-side auth instance - lazy init to allow builds without env vars
export const createAuthClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured - using mock auth only')
    return null as any
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export const authClient = createAuthClient()

// Test mode detection
const isTestMode = typeof window !== 'undefined' && getMockSession() !== null

// Auth types
export interface User {
  id: string
  email: string
  name?: string
  role: 'admin' | 'operation' | 'sales'
  is_active: boolean
  created_at: string
  updated_at: string
}

// Get current user from auth session
export async function getCurrentUser() {
  // Check if in test mode first
  const mockSession = getMockSession()
  if (mockSession) {
    return mockSession as User
  }

  const {
    data: { session },
  } = await authClient.auth.getSession()

  if (!session?.user) {
    return null
  }

  // Fetch user profile with role
  const { data: userProfile, error } = await authClient
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return userProfile as User
}

// Sign in with Google
export async function signInWithGoogle() {
  const { data, error } = await authClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  })

  return { data, error }
}

// Sign out
export async function signOut() {
  // Check if in test mode
  const mockSession = getMockSession()
  if (mockSession) {
    return await mockSignOut()
  }

  const { error } = await authClient.auth.signOut()
  return { error }
}

// Get auth session
export async function getSession() {
  const {
    data: { session },
  } = await authClient.auth.getSession()
  return session
}

// Watch auth changes
export function onAuthStateChange(callback: (user: User | null) => void) {
  // Check if in test mode
  const mockSession = getMockSession()
  if (mockSession) {
    // For test mode, just return the mock session
    callback(mockSession as User)

    // Watch for storage changes (for other tabs)
    const handleStorageChange = () => {
      const newMockSession = getMockSession()
      callback(newMockSession as User | null)
    }

    window.addEventListener('storage', handleStorageChange)
    return {
      data: {
        subscription: {
          unsubscribe: () => window.removeEventListener('storage', handleStorageChange),
        },
      },
    }
  }

  if (!authClient) {
    return { data: { subscription: { unsubscribe: () => {} } } }
  }

  return authClient.auth.onAuthStateChange(async (event: any, session: any) => {
    if (session?.user) {
      const user = await getCurrentUser()
      callback(user)
    } else {
      callback(null)
    }
  })
}
