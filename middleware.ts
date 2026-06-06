import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Middleware disabled for Phase 2.0 (UI-only deployments)
  // Using client-side auth via AuthProvider instead
  // TODO: Re-enable with proper SSR-compatible auth in Phase 2.1
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
