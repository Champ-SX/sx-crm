import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Daily Payso order list for the Mac script (payso_inquiry.mjs → PAYSO_ORDERS_URL).
// GET ?date=YYYYMMDD, header Authorization: Bearer <SALES_IMPORT_SECRET> (or x-import-secret).
// Returns refnos received that Bangkok day plus the first 2 h after midnight (late postbacks;
// the CRM skips anything already saved). [] when there were none.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY, SECRET = process.env.SALES_IMPORT_SECRET

export async function GET(req: NextRequest) {
  if (!URL_ || !KEY || !SECRET) return NextResponse.json({ error: 'not configured' }, { status: 503 })
  const auth = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? req.headers.get('x-import-secret')
  if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const d = req.nextUrl.searchParams.get('date') ?? ''
  if (!/^\d{8}$/.test(d)) return NextResponse.json({ error: 'date=YYYYMMDD' }, { status: 400 })
  const from = new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T00:00:00+07:00`)
  const to = new Date(from.getTime() + 26 * 3600e3)
  const sb = createClient(URL_, KEY, { auth: { persistSession: false } })
  const { data, error } = await sb.from('payso_refs').select('refno').gte('received_at', from.toISOString()).lt('received_at', to.toISOString()).order('received_at').limit(5000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json((data ?? []).map((r) => r.refno))
}
