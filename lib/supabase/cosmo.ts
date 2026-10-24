import { supabase, isSupabaseConfigured } from './client'
import type { WonJob } from '@/types'

// Cosmo (Bestclus) setup / teardown rows, synced server-side by /api/cron/cosmo-sync.
// The browser only reads our own copy — the Cosmo key never leaves the server.
export interface CosmoInstall {
  booking_id: string
  type: string                 // 'setup' | 'teardown' (Cosmo's value)
  running_number: number       // = won_jobs.job_number
  type_label: string | null
  at: string | null            // phase arrival time (ISO)
  status: string | null
  title: string | null
  event_name: string | null
  customer_name: string | null
  product: string | null
  skus: string[] | null
  quantity: number | null
  venue_name: string | null
  venue_address: string | null
  map_url: string | null
  event_start: string | null
  event_end: string | null
  site_contact_name: string | null
  site_contact_phone: string | null
  install_teams: string[] | null
  synced_at: string
}

export interface CosmoSyncLog { ran_at: string; ok: boolean; rows: number | null; message: string | null }

export const isTeardown = (r: Pick<CosmoInstall, 'type' | 'type_label'>) =>
  /tear|รื้อ/i.test(`${r.type} ${r.type_label ?? ''}`)

// ── Mock data (local dev only, made-up) ─────────────────────────────────────
function mockRows(): CosmoInstall[] {
  const d = (days: number, h: number) => { const t = new Date(); t.setHours(h, 0, 0, 0); t.setDate(t.getDate() + days); return t.toISOString() }
  const base = { booking_id: 'BK-MOCK-1', running_number: 38, status: 'CONFIRMED', title: 'Mock booking', event_name: 'Mock event', customer_name: 'Mock', product: 'Photobooth', skus: ['K035', 'K041'], quantity: 2, venue_name: 'Impact Hall 5', venue_address: 'Muang Thong Thani', map_url: 'https://maps.google.com/?q=Impact+Hall+5', event_start: d(2, 10), event_end: d(2, 18), site_contact_name: 'คุณเอ', site_contact_phone: '080-000-0000', synced_at: new Date().toISOString() }
  return [
    { ...base, type: 'setup', type_label: 'ติดตั้ง', at: d(1, 20), install_teams: ['พี่หนุ่ย'] },
    { ...base, type: 'teardown', type_label: 'รื้อถอน', at: d(2, 19), install_teams: [] },
  ]
}

export async function getCosmoInstalls(): Promise<CosmoInstall[]> {
  if (!isSupabaseConfigured) return mockRows()
  const { data, error } = await supabase.from('cosmo_installs').select('*').order('at')
  if (error) { console.warn('[cosmo] read failed', error.message); return [] }
  return (data ?? []) as CosmoInstall[]
}

export async function getLastCosmoSync(): Promise<CosmoSyncLog | null> {
  if (!isSupabaseConfigured) return { ran_at: new Date(Date.now() - 12 * 60_000).toISOString(), ok: true, rows: 2, message: 'mock' }
  const { data } = await supabase.from('cosmo_sync_log').select('ran_at, ok, rows, message').order('ran_at', { ascending: false }).limit(1)
  return (data?.[0] as CosmoSyncLog) ?? null
}

/** Ask the server to sync now (signed-in user). Returns the server's summary. */
export async function syncCosmoNow(): Promise<{ ok: boolean; rows?: number; error?: string }> {
  if (!isSupabaseConfigured) return { ok: true, rows: 2 }
  try {
    const res = await fetch('/api/cron/cosmo-sync', { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    return res.ok ? { ok: true, rows: body.rows } : { ok: false, error: body.error ?? `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ── Comparison helpers ──────────────────────────────────────────────────────
const bkkDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10)
const norm = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9ก-๙]/g, '')

export interface CosmoDiff { field: 'date' | 'venue'; ours: string; cosmo: string }

/** Differences between our card and Cosmo's booking (event date + venue). */
export function cosmoDiffs(job: Pick<WonJob, 'event_date' | 'venue'>, rows: CosmoInstall[]): CosmoDiff[] {
  const r = rows.find((x) => x.event_start) ?? rows[0]
  if (!r) return []
  const out: CosmoDiff[] = []
  if (r.event_start && job.event_date && bkkDate(r.event_start) !== job.event_date)
    out.push({ field: 'date', ours: job.event_date, cosmo: bkkDate(r.event_start) })
  if (r.venue_name && job.venue && !norm(job.venue).includes(norm(r.venue_name)) && !norm(r.venue_name).includes(norm(job.venue)))
    out.push({ field: 'venue', ours: job.venue, cosmo: r.venue_name })
  return out
}

export const cosmoEventDate = (rows: CosmoInstall[]) => {
  const r = rows.find((x) => x.event_start)
  return r?.event_start ? bkkDate(r.event_start) : null
}
export { bkkDate }
