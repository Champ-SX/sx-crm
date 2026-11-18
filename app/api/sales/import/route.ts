import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { importFilesServer, type ServerImportResult } from '@/lib/sales/server-import'

// Gateway report files pushed by the daily download agent (KBank / ChillPay / Pay Solution).
// POST multipart/form-data, one or more `file` fields, header x-import-secret = SALES_IMPORT_SECRET.
// Each file becomes its own Upload-history entry (deletable on its own); payments
// already saved are skipped, so re-sending a rolling window is safe.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SECRET = process.env.SALES_IMPORT_SECRET
const OK_EXT = /\.(csv|xlsx|xls)$/i
const MAX_BYTES = 15 * 1024 * 1024

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY || !SECRET) return NextResponse.json({ error: 'Import not configured' }, { status: 503 })
  if (req.headers.get('x-import-secret') !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Send multipart/form-data with file fields' }, { status: 400 }) }
  const blobs = form.getAll('file').filter((f): f is File => typeof f !== 'string')
  if (!blobs.length) return NextResponse.json({ error: 'No files (use field name "file")' }, { status: 400 })

  const sb: SupabaseClient = createServiceClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const src = String(form.get('source') || 'Drive')
  const results: ({ name: string } & (Partial<ServerImportResult> & { status: string; error?: string }))[] = []
  for (const b of blobs) {
    if (!OK_EXT.test(b.name) || b.size > MAX_BYTES) { results.push({ name: b.name, status: 'skipped', error: 'not a .csv/.xlsx/.xls under 15 MB' }); continue }
    try {
      const r = await importFilesServer(sb, [{ name: b.name, data: Buffer.from(await b.arrayBuffer()) }], `Auto-import (${src.slice(0, 40)})`)
      const unknown = !r.files.length
      results.push({ name: b.name, status: unknown ? 'unrecognised' : r.import_id ? 'imported' : 'already saved', ...r })
    } catch (e) {
      results.push({ name: b.name, status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  }
  const failed = results.some((r) => r.status === 'error')
  return NextResponse.json({ ok: !failed, results: results.map(({ name, status, error, new_rows, dup_rows, review_rows }) => ({ name, status, error, new_rows, dup_rows, review_rows })) }, { status: failed ? 207 : 200 })
}
