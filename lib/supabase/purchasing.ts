import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import type { AnfOrder, AnfPO, AnfRequest } from '@/types'

// Order board purchasing — Requests (by project) → POs (by supplier).
// Items live in anf_orders (request_id / po_id). Shared module store like suppliers/assets.

const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pr-${Date.now()}-${Math.round(Math.random() * 1e6)}`)
export const newPurchasingId = mkId

let requests: AnfRequest[] = []
let pos: AnfPO[] = []
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

async function load() {
  if (!isSupabaseConfigured) { loaded = true; emit(); return }
  const [r, p] = await Promise.all([
    supabase.from('anf_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('anf_pos').select('*').order('created_at', { ascending: false }),
  ])
  if (r.error) console.warn('[purchasing] requests load failed', r.error.message)
  if (p.error) console.warn('[purchasing] POs load failed', p.error.message)
  requests = (r.data ?? []) as AnfRequest[]
  pos = (p.data ?? []) as AnfPO[]
  loaded = true; emit()
}

export function usePurchasing() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    listeners.add(f)
    if (!loaded && !loading) loading = load()
    return () => { listeners.delete(f) }
  }, [])
  return { requests, pos, loaded }
}

export async function saveRequest(r: AnfRequest) {
  const row = { ...r, updated_at: new Date().toISOString() }
  requests = [row, ...requests.filter((x) => x.request_id !== r.request_id)]
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_requests').upsert(row)
  if (error) throw new Error(error.message)
}
export async function deleteRequest(id: string) {
  requests = requests.filter((x) => x.request_id !== id)
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_requests').delete().eq('request_id', id)
  if (error) throw new Error(error.message)
}
export async function savePO(p: AnfPO) {
  const row = { ...p, updated_at: new Date().toISOString() }
  pos = [row, ...pos.filter((x) => x.po_id !== p.po_id)]
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_pos').upsert(row)
  if (error) throw new Error(error.message)
}

// ── Numbers ──────────────────────────────────────────────────────────────────
const ym = (d = new Date()) => {
  const t = new Date(d.getTime() + 7 * 3600_000)   // Thai time
  return { y: t.getUTCFullYear(), m: String(t.getUTCMonth() + 1).padStart(2, '0') }
}
/** REQ-2026-10-014 — running number per month. */
export function nextRequestNumber(existing: string[]): string {
  const { y, m } = ym(); const pre = `REQ-${y}-${m}-`
  const max = existing.filter((n) => n.startsWith(pre)).reduce((a, n) => Math.max(a, parseInt(n.slice(pre.length), 10) || 0), 0)
  return `${pre}${String(max + 1).padStart(3, '0')}`
}
/** PO2026100002 — FlowAccount style, running number per month. */
export function nextPONumber(existing: string[]): string {
  const { y, m } = ym(); const pre = `PO${y}${m}`
  const max = existing.filter((n) => n.startsWith(pre)).reduce((a, n) => Math.max(a, parseInt(n.slice(pre.length), 10) || 0), 0)
  return `${pre}${String(max + 1).padStart(4, '0')}`
}

// ── Derived status ───────────────────────────────────────────────────────────
export type ReqStatus = 'to_order' | 'ordered' | 'partial' | 'received' | 'empty'
export function requestStatus(items: AnfOrder[]): { status: ReqStatus; received: number; total: number } {
  const live = items.filter((o) => !o.archived_at || o.status === 'received')
  const total = live.length
  const received = live.filter((o) => o.status === 'received').length
  if (total === 0) return { status: 'empty', received, total }
  if (received === total) return { status: 'received', received, total }
  if (received > 0) return { status: 'partial', received, total }
  if (live.some((o) => o.status === 'ordered' || o.po_id)) return { status: 'ordered', received, total }
  return { status: 'to_order', received, total }
}
export const REQ_STATUS: Record<ReqStatus, { label: string; cls: string }> = {
  to_order: { label: 'To order', cls: 'bg-muted text-muted-foreground' },
  ordered:  { label: 'Ordered',  cls: 'bg-blue-500/12 text-blue-700 dark:text-blue-300' },
  partial:  { label: 'Partly received', cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-400' },
  received: { label: 'Received', cls: 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400' },
  empty:    { label: 'No items', cls: 'bg-muted text-muted-foreground' },
}
export const itemTotal = (o: Pick<AnfOrder, 'quantity' | 'unit_price'>) => (o.quantity || 0) * (o.unit_price || 0)
