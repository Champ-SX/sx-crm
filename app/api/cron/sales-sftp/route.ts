import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import SftpClient from 'ssh2-sftp-client'
import { createClient as createUserClient } from '@/lib/supabase/server'
import { importFilesServer, type ServerFile } from '@/lib/sales/server-import'

// KBank daily report (SFTP) → Sales. Fired daily 05:00 Thai by Supabase pg_cron
// (x-cron-secret), or by "Run now" from a signed-in admin / Sales user.
// Collects YYYYMMDD_PTR…_Report.csv for the last `days` days (default 3, rolling)
// or an explicit from/to, and imports with the normal duplicate rules.
// Credentials live only in Vercel env (KBANK_SFTP_*); never logged or returned.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRON_SECRET = process.env.CRON_SECRET
const S = {
  host: process.env.KBANK_SFTP_HOST, port: Number(process.env.KBANK_SFTP_PORT || 22),
  username: process.env.KBANK_SFTP_USER, password: process.env.KBANK_SFTP_PASSWORD, dir: process.env.KBANK_SFTP_DIR || '.',
}
const FILE_RE = /^(\d{8})_PTR\d+_Report\.csv$/i

const thaiToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const isoOk = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

async function who(req: NextRequest, sb: SupabaseClient): Promise<string | null> {
  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) return 'Auto-import (KBank SFTP, scheduled)'
  const uc = await createUserClient()
  const { data: { user } } = await uc.auth.getUser()
  if (!user?.email) return null
  const { data: u } = await sb.from('users').select('id, role').ilike('email', user.email).maybeSingle<{ id: string; role: string }>()
  const ids = [user.id, u?.id].filter(Boolean).map(String)
  const { data: acc } = await sb.from('page_access').select('user_id').eq('page', 'sales').in('user_id', ids)
  return u?.role === 'admin' || (acc ?? []).length > 0 ? `Auto-import (KBank SFTP, run by ${user.email})` : null
}

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
  const sb: SupabaseClient = createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const by = await who(req, sb)
  if (!by) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!S.host || !S.username || !S.password) return NextResponse.json({ error: 'KBank SFTP settings missing in Vercel (KBANK_SFTP_HOST / USER / PASSWORD)' }, { status: 503 })

  const q = req.nextUrl.searchParams
  const days = Math.min(31, Math.max(1, Number(q.get('days') || 3)))
  const to = isoOk(q.get('to')) ? q.get('to')! : thaiToday()
  const from = isoOk(q.get('from')) ? q.get('from')! : addDays(to, -(days - 1))
  if (from > to) return NextResponse.json({ error: 'from is after to' }, { status: 400 })
  const want = (d8: string) => { const iso = `${d8.slice(0, 4)}-${d8.slice(4, 6)}-${d8.slice(6, 8)}`; return iso >= from && iso <= to }

  const sftp = new SftpClient()
  const files: ServerFile[] = []
  let listed = 0
  try {
    await sftp.connect({ host: S.host, port: S.port, username: S.username, password: S.password, readyTimeout: 15_000 })
    const list = await sftp.list(S.dir)
    const pick = list.filter((f) => f.type === '-' && FILE_RE.test(f.name) && want(FILE_RE.exec(f.name)![1])).sort((a, b) => a.name.localeCompare(b.name))
    listed = list.length
    for (const f of pick) {
      const buf = await sftp.get(`${S.dir.replace(/\/$/, '')}/${f.name}`)
      files.push({ name: f.name, data: Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf)) })
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Never echo credentials; connection errors are safe to show (host refused, auth failed, timeout…)
    return NextResponse.json({ ok: false, stage: 'sftp', error: msg.replace(S.password ?? '\u0000', '***'), from, to }, { status: 502 })
  } finally {
    try { await sftp.end() } catch { /* ignore */ }
  }

  if (!files.length) return NextResponse.json({ ok: true, from, to, listed, files: [], message: `No KBank report files for ${from} – ${to} yet.` })
  try {
    const r = await importFilesServer(sb, files, by)
    return NextResponse.json({ ok: true, from, to, listed, ...r })
  } catch (e) {
    return NextResponse.json({ ok: false, stage: 'import', error: e instanceof Error ? e.message : String(e), from, to, files: files.map((f) => f.name) }, { status: 500 })
  }
}
