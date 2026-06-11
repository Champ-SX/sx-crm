import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Browser client from @supabase/ssr stores the session and the PKCE code
// verifier in COOKIES (not localStorage). This is required so that:
//   1. OAuth uses the Authorization Code (PKCE) flow → callback gets ?code=
//   2. The server-side route.ts can read the verifier to exchangeCodeForSession()
//   3. Middleware can read the resulting session cookies
// Single instance - reuse everywhere to prevent multiple GoTrueClient instances.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
