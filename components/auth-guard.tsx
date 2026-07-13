'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import { LoadingAnimation } from '@/components/shared/loading-animation'

/**
 * AuthGuard Component
 *
 * Protects routes from unauthenticated access.
 * Redirects to /login if no session is found on protected routes.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { session, loading } = useAuth()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/auth']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  useEffect(() => {
    // Mock mode (local dev, no Supabase): no auth, never redirect.
    if (!isSupabaseConfigured) return
    // Wait for auth to load
    if (loading) return

    // If on a protected route and no session, redirect to login
    if (!isPublicRoute && !session) {
      router.push('/login')
    }
  }, [session, loading, pathname, isPublicRoute, router])

  // Mock mode: no auth wall — render everything (hooks above stay unconditional).
  if (!isSupabaseConfigured) return children

  // Show loading state while checking auth (but NOT for public routes)
  if (loading && !isPublicRoute) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <LoadingAnimation />
      </div>
    )
  }

  // If on protected route and no session, don't render anything (redirecting)
  if (!isPublicRoute && !session) {
    return null
  }

  // Otherwise render children
  return children
}
