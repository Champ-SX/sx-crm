import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Lazy init - allow builds without Supabase credentials
let supabaseClient: any = null

if (supabaseUrl && supabaseAnonKey) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn('[Supabase Client] Credentials not configured - using mock data only')
}

export const supabase = supabaseClient
