import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client-side auth instance
export const createAuthClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
}

export const authClient = createAuthClient()

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
  return authClient.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const user = await getCurrentUser()
      callback(user)
    } else {
      callback(null)
    }
  })
}
