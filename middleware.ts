import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const pathname = requestUrl.pathname

  // Allow login pages and auth callback without auth
  if (pathname === '/login' || pathname === '/login-test' || pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  // Check if user has session
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    // Redirect to login if no session
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      // Redirect non-admin users away from admin routes
      return NextResponse.redirect(new URL('/won-ready-op', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
