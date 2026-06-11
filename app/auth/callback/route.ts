import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth errors from Google
  if (error) {
    const errorDescription = searchParams.get('error_description')
    console.error('[AuthCallback] OAuth error:', { error, errorDescription })
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  // Authorization Code Flow: Google returns short-lived code
  if (!code) {
    console.error('[AuthCallback] No authorization code received')
    return NextResponse.redirect(
      new URL('/login?error=No authorization code received', request.url)
    )
  }

  try {
    // Create SSR Supabase client
    // This client has cookie handlers attached
    const supabase = await createClient()

    // Exchange authorization code for session
    // The SSR client automatically sets HTTP-only cookies when this succeeds
    console.log('[AuthCallback] Exchanging code for session...')
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[AuthCallback] Code exchange failed:', exchangeError)
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(exchangeError.message)}`, request.url)
      )
    }

    // Session is now in HTTP-only cookies (set by SSR client)
    // Middleware will be able to verify this on next request
    console.log('[AuthCallback] Session established, redirecting to dashboard')

    // Redirect to dashboard where middleware can verify the session
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (err) {
    console.error('[AuthCallback] Unexpected error:', err)
    return NextResponse.redirect(
      new URL('/login?error=Authentication failed', request.url)
    )
  }
}
