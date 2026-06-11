import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * True when both Supabase env vars are present.
 * - Production (Vercel) always has them → real Supabase + real auth.
 * - Local dev with the vars commented out → MOCK MODE: no DB, no login wall.
 * This is the single switch the whole app keys off of.
 */
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

/**
 * Mock-mode stub: a chainable, awaitable no-op that mimics the slice of the
 * Supabase client surface the app touches, so nothing crashes when running on
 * mock data locally. Never used in production (env vars are always present there).
 */
function createStubClient(): SupabaseClient {
  const makeChain = () => {
    const chain: any = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      upsert: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      // Make the chain awaitable: `await supabase.from(x).select('*')`
      then: (resolve: (v: { data: never[]; error: null }) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    }
    return chain
  }

  const stub: any = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: async () => ({
        data: { provider: 'google', url: null },
        error: { message: 'Mock mode: authentication is disabled locally.' },
      }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ data: { session: null, user: null }, error: null }),
    },
    from: () => makeChain(),
  }

  return stub as SupabaseClient
}

// Single instance - reuse everywhere to prevent multiple GoTrueClient instances.
// createBrowserClient (@supabase/ssr) stores session + PKCE verifier in COOKIES,
// which the server callback/middleware can read. See [[auth_oauth_pkce]].
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl!, supabaseAnonKey!)
  : createStubClient()
