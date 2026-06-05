'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { mockSignIn, getMockSession, MockUser } from '@/lib/supabase/mock-auth'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Role = 'admin' | 'operation' | 'sales'

const ROLES = [
  {
    id: 'admin' as const,
    label: 'Admin User',
    description: 'Full access to all features',
    email: 'champ@sixsheet.me',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  {
    id: 'operation' as const,
    label: 'Operations User',
    description: 'Access to operational dashboards',
    email: 'operation@sixsheet.me',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  {
    id: 'sales' as const,
    label: 'Sales User',
    description: 'Access to sales features',
    email: 'sales@sixsheet.me',
    color: 'bg-green-100 text-green-700 border-green-300',
  },
]

export default function LoginTestPage() {
  const router = useRouter()
  const { loading } = useAuth()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role>('admin')
  const [currentSession, setCurrentSession] = useState<MockUser | null>(null)

  // Check for existing session
  useEffect(() => {
    const session = getMockSession()
    setCurrentSession(session)
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && currentSession) {
      router.push('/won-ready-op')
    }
  }, [currentSession, loading, router])

  const handleSignIn = async (role: Role) => {
    try {
      setIsSigningIn(true)
      const { user } = await mockSignIn(role)
      setCurrentSession(user)
      router.push('/won-ready-op')
    } catch (err) {
      console.error('Sign in error:', err)
    } finally {
      setIsSigningIn(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">SX CRM</h1>
          <p className="text-gray-600 mb-8">Local Testing - Choose a Role to Sign In</p>
          <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full border border-yellow-300">
            🧪 Testing Mode (Mock Auth)
          </div>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {ROLES.map(role => (
            <div
              key={role.id}
              className={cn(
                'p-6 rounded-lg border-2 transition-all',
                selectedRole === role.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className={cn('inline-block px-3 py-1 rounded text-sm font-semibold mb-3', role.color)}>
                {role.label}
              </div>
              <p className="text-gray-600 text-sm mb-4">{role.description}</p>
              <p className="text-xs text-gray-500 mb-4">Email: {role.email}</p>
              <Button
                onClick={() => handleSignIn(role.id)}
                disabled={isSigningIn}
                className="w-full"
              >
                {isSigningIn ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How This Works</h3>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>✓ Click any role above to sign in as that user</li>
            <li>✓ No Google OAuth needed - uses mock data</li>
            <li>✓ Session stored in browser localStorage</li>
            <li>✓ Admin users can access /admin/users panel</li>
            <li>✓ Sign out in sidebar to test logout flow</li>
            <li>✓ Refresh page - session persists</li>
          </ul>
        </div>

        {/* Troubleshooting */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">🔍 Testing Checklist</h3>
          <ul className="text-yellow-800 text-sm space-y-2">
            <li>□ Sign in as Admin → Check sidebar profile</li>
            <li>□ Admin: Click profile → See "Admin Panel" link</li>
            <li>□ Admin: Go to /admin/users → See user list</li>
            <li>□ Admin: Try changing user roles</li>
            <li>□ Admin: Try deleting a user</li>
            <li>□ Sign out → Redirected to /login</li>
            <li>□ Refresh page → Session restored</li>
            <li>□ Sign in as Sales → No admin features</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
