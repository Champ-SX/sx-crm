'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'

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
    // Wait for auth to load
    if (loading) return

    // If on a protected route and no session, redirect to login
    if (!isPublicRoute && !session) {
      router.push('/login')
    }
  }, [session, loading, pathname, isPublicRoute, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <div className="w-8 h-8 rounded-lg border-2 border-muted-foreground/20 border-t-blue-500 animate-spin" />
          </div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
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
