import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createUserClient } from '@/lib/supabase/server'

// Cosmo (Bestclus) → cosmo_installs. Fired every 30 min by Supabase pg_cron
// (x-cron-secret) and by "Sync now" from a signed-in user. Read-only on Cosmo;
// never touches won_jobs — the UI compares and lets people copy values by hand.
// HOLD bookings and rows without a job number are skipped.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COSMO_URL = 'https://cosmo.bestclus.com/api/public/installs'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRON_SECRET = process.env.CRON_SECRET
const COSMO_KEY = process.env.COSMO_API_KEY

interface CosmoItem {
  type?: string; typeLabel?: string; datetime?: string; bookingId?: string; runningNumber?: number | null
  status?: string; title?: string; eventName?: string; customerName?: string; product?: string
  skus?: unknown[]; quantity?: number; venueName?: string; venueAddress?: string; mapUrl?: string
  eventStart?: string; eventEnd?: string; siteContact?: { name?: string; phone?: string } | null
  installTeams?: unknown[]; jobUrl?: string
}

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
// Only keep links that point at Cosmo itself.
const cosmoLink = (v: unknown) => { const s = str(v); return s && s.startsWith('https://cosmo.bestclus.com/') ? s : null }
const ts = (v: unknown) => { const s = str(v); return s && !Number.isNaN(Date.parse(s)) ? new Date(s).toISOString() : null }
const names = (v: unknown[] | undefined) =>
  (v ?? []).map((x) => (typeof x === 'string' ? x : str((x as { name?: unknown })?.name) ?? str((x as { label?: unknown })?.label))).filter((x): x is string => !!x)

async function authorized(req: NextRequest) {
  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) return true
  const sb = await createUserClient()
  const { data: { user } } = await sb.auth.getUser()
  return !!user
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
  if (!(await authorized(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sb = createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const log = (ok: boolean, rows: number | null, message: string | null) =>
    sb.from('cosmo_sync_log').insert({ ok, rows, message })

  if (!COSMO_KEY) {
    await log(false, null, 'COSMO_API_KEY not set')
    return NextResponse.json({ error: 'COSMO_API_KEY not set' }, { status: 503 })
  }

  let items: CosmoItem[]
  try {
    const res = await fetch(COSMO_URL, { headers: { Authorization: `Bearer ${COSMO_KEY}` }, cache: 'no-store', signal: AbortSignal.timeout(20_000) })
    if (!res.ok) throw new Error(`Cosmo HTTP ${res.status}`)
    const body = await res.json()
    items = Array.isArray(body?.items) ? body.items : []
  } catch (e) {
    const msg = (e as Error).message
    await log(false, null, msg)
    return NextResponse.json({ error: 'Cosmo unavailable', detail: msg }, { status: 502 })
  }

  const now = new Date().toISOString()
  const rows = items
    .filter((i) => i.bookingId && i.type && Number.isFinite(Number(i.runningNumber)) && Number(i.runningNumber) > 0 && (i.status ?? '').toUpperCase() !== 'HOLD')
    .map((i) => ({
      booking_id: String(i.bookingId), type: String(i.type), running_number: Number(i.runningNumber),
      type_label: str(i.typeLabel), at: ts(i.datetime), status: str(i.status), title: str(i.title),
      event_name: str(i.eventName), customer_name: str(i.customerName), product: str(i.product),
      skus: (i.skus ?? []).map(String), quantity: typeof i.quantity === 'number' ? i.quantity : null,
      venue_name: str(i.venueName), venue_address: str(i.venueAddress), map_url: str(i.mapUrl),
      event_start: ts(i.eventStart), event_end: ts(i.eventEnd),
      site_contact_name: str(i.siteContact?.name), site_contact_phone: str(i.siteContact?.phone),
      install_teams: names(i.installTeams), job_url: cosmoLink(i.jobUrl), synced_at: now,
    }))

  if (rows.length) {
    let { error } = await sb.from('cosmo_installs').upsert(rows, { onConflict: 'booking_id,type' })
    // job_url column not added yet (migration 20261026 pending) → save without it.
    if (error && /job_url/.test(error.message)) {
      ({ error } = await sb.from('cosmo_installs').upsert(rows.map(({ job_url: _j, ...r }) => r), { onConflict: 'booking_id,type' }))
    }
    if (error) { await log(false, null, error.message); return NextResponse.json({ error: 'Save failed' }, { status: 500 }) }
  }
  // Rows inside Cosmo's window (today →) that disappeared or went back to HOLD → remove.
  // Past rows are kept so older jobs still show their last synced data.
  const keep = new Set(rows.map((r) => `${r.booking_id}|${r.type}`))
  const { data: current } = await sb.from('cosmo_installs').select('booking_id, type, at').gte('at', new Date(Date.now() - 86_400_000).toISOString())
  const stale = (current ?? []).filter((r) => !keep.has(`${r.booking_id}|${r.type}`))
  for (const r of stale) await sb.from('cosmo_installs').delete().eq('booking_id', r.booking_id).eq('type', r.type)

  await log(true, rows.length, stale.length ? `removed ${stale.length}` : null)
  return NextResponse.json({ ok: true, rows: rows.length, removed: stale.length })
}
