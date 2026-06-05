/**
 * Mock Auth for Local Testing
 * Use this to test the auth flow without Supabase Google OAuth
 *
 * This simulates:
 * - User sign-in
 * - Session creation
 * - User data storage
 * - Sign out
 */

export interface MockUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'operation' | 'sales'
  is_active: boolean
  created_at: string
}

const MOCK_USERS = {
  admin: {
    id: 'mock-admin-id',
    email: 'champ@sixsheet.me',
    name: 'Admin User',
    role: 'admin' as const,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  operation: {
    id: 'mock-op-id',
    email: 'operation@sixsheet.me',
    name: 'Operations User',
    role: 'operation' as const,
    is_active: true,
    created_at: new Date().toISOString(),
  },
  sales: {
    id: 'mock-sales-id',
    email: 'sales@sixsheet.me',
    name: 'Sales User',
    role: 'sales' as const,
    is_active: true,
    created_at: new Date().toISOString(),
  },
}

const SESSION_KEY = 'mock_auth_session'

/**
 * Sign in with mock user (for local testing)
 */
export async function mockSignIn(role: 'admin' | 'operation' | 'sales' = 'admin') {
  const user = MOCK_USERS[role]

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500))

  // Store session
  if (typeof window !== 'undefined') {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }

  return { user, error: null }
}

/**
 * Get current mock session
 */
export function getMockSession() {
  if (typeof window === 'undefined') return null

  const session = localStorage.getItem(SESSION_KEY)
  return session ? JSON.parse(session) : null
}

/**
 * Sign out of mock session
 */
export async function mockSignOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SESSION_KEY)
  }

  await new Promise(resolve => setTimeout(resolve, 300))
  return { error: null }
}

/**
 * Get all mock users (for admin panel testing)
 */
export function getMockUsers(): MockUser[] {
  return Object.values(MOCK_USERS)
}

/**
 * Update mock user role (for admin panel testing)
 */
export function updateMockUserRole(email: string, newRole: 'admin' | 'operation' | 'sales') {
  const user = Object.values(MOCK_USERS).find(u => u.email === email)
  if (user) {
    user.role = newRole

    // Update session if this is the current user
    const currentSession = getMockSession()
    if (currentSession?.email === email) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    }
  }
}

/**
 * Toggle mock user active status
 */
export function toggleMockUserActive(email: string) {
  const user = Object.values(MOCK_USERS).find(u => u.email === email)
  if (user) {
    user.is_active = !user.is_active
  }
}
