import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')

  // Handle OAuth errors from Google
  if (error) {
    const errorDescription = searchParams.get('error_description')
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  // For implicit flow: Supabase returns token in hash fragment (#access_token=...)
  // The client-side Supabase SDK automatically:
  // 1. Parses the hash fragment
  // 2. Extracts the access token and session
  // 3. Stores in localStorage
  // 4. The @supabase/ssr package syncs to cookies on next request

  // Simply redirect to dashboard - client-side will handle session
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
