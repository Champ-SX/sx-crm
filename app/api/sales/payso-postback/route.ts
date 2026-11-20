import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Payso postback receiver (https://api-docs.payso.co/docs/api/webhook-postback).
// Default mode: POST form (refno, merchantid, customeremail, productdetail, total, cardtype).
// Dynamic mode: GET with a query string. Payso sends no signature, so we only store the refno;
// the Mac script verifies every ref with the Payso Inquiry API before it becomes a sale.
// Optional: PAYSO_POSTBACK_KEY → the URL must carry ?k=<key>.
// Optional: PAYSO_POSTBACK_FORWARD → the same postback is passed on (e.g. to the booth server
// that used this Control Panel URL before), so switching the URL breaks nothing.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PB_KEY = process.env.PAYSO_POSTBACK_KEY, FORWARD = process.env.PAYSO_POSTBACK_FORWARD
const REF = /^\d{6,20}$/

async function handle(req: NextRequest, fields: URLSearchParams, via: 'post' | 'get', raw: string) {
  if (PB_KEY && req.nextUrl.searchParams.get('k') !== PB_KEY) return new NextResponse('forbidden', { status: 403 })
  const refno = (fields.get('refno') ?? fields.get('ReferenceNo') ?? '').trim()
  if (FORWARD) {   // best effort, never blocks Payso
    const f = new URL(FORWARD)
    if (via === 'get') fields.forEach((v, k) => { if (k !== 'k') f.searchParams.set(k, v) })
    await fetch(f, via === 'post' ? { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: raw, signal: AbortSignal.timeout(8000) } : { signal: AbortSignal.timeout(8000) }).catch(() => {})
  }
  if (!REF.test(refno)) return new NextResponse('OK', { status: 200 })   // ignore junk, but don't make Payso retry
  if (!URL_ || !KEY) return new NextResponse('not configured', { status: 503 })
  const sb = createClient(URL_, KEY, { auth: { persistSession: false } })
  const { error } = await sb.from('payso_refs').upsert(
    { refno, total: fields.get('total')?.slice(0, 20) ?? null, productdetail: fields.get('productdetail')?.slice(0, 80) ?? null, via },
    { onConflict: 'refno', ignoreDuplicates: true })
  if (error) return new NextResponse('error', { status: 500 })           // Payso may retry
  return new NextResponse('OK', { status: 200 })
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const ct = req.headers.get('content-type') ?? ''
  let fields = new URLSearchParams(raw)
  if (ct.includes('application/json')) { try { fields = new URLSearchParams(Object.entries(JSON.parse(raw)).map(([k, v]) => [k, String(v)])) } catch {} }
  return handle(req, fields, 'post', raw)
}
export async function GET(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams, 'get', '')
}
