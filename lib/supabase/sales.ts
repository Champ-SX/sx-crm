import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import type { SaleRow } from '@/lib/sales/parse'
import { useAuth } from '@/components/auth-provider'
import { useMyIds } from '@/components/shared/assignee-picker'

// ── Stored row = parsed row + bookkeeping ─────────────────────────────────────
export interface SaleConflict { amount_satang: number; biz_date: string; machine: number | null; file: string; at: string }
export interface StoredSale extends SaleRow { source_file: string | null; import_id: string | null; conflict: SaleConflict | null }
export interface ImportFileSummary { name: string; format: string; rows: number; new: number; dup: number; conflict: number; review: number; excluded: number; from: string | null; to: string | null; gross_satang: number }
export interface SalesImport { import_id: string; files: ImportFileSummary[]; new_rows: number; dup_rows: number; review_rows: number; created_by: string | null; created_at: string }

let mockTxns: StoredSale[] = []
const mockImports: SalesImport[] = []
let mockAccess: string[] = []
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `imp-${Date.now()}`)
const toStored = (r: Record<string, unknown>): StoredSale => ({ ...(r as unknown as StoredSale), biz_date: String(r.biz_date ?? ''), amount_satang: Number(r.amount_satang), fee_satang: r.fee_satang == null ? null : Number(r.fee_satang), net_satang: r.net_satang == null ? null : Number(r.net_satang) })

// ── Access: admins + users ticked in Admin › Users ───────────────────────────
export const SALES_PAGE = 'sales'
export async function fetchPageAccess(page: string): Promise<string[]> {
  if (!isSupabaseConfigured) return mockAccess
  const { data, error } = await supabase.from('page_access').select('user_id').eq('page', page)
  if (error) return []
  return (data ?? []).map((r) => String(r.user_id))
}
export async function setPageAccess(page: string, userId: string, on: boolean): Promise<void> {
  if (!isSupabaseConfigured) { mockAccess = on ? [...mockAccess, userId] : mockAccess.filter((x) => x !== userId); return }
  const q = on ? supabase.from('page_access').upsert({ page, user_id: userId }) : supabase.from('page_access').delete().eq('page', page).eq('user_id', userId)
  const { error } = await q
  if (error) throw error
}
/** null while loading. */
export function useSalesAccess(): boolean | null {
  const { role, loading } = useAuth()
  const ids = useMyIds()
  const [members, setMembers] = useState<string[] | null>(null)
  useEffect(() => { let on = true; void fetchPageAccess(SALES_PAGE).then((m) => on && setMembers(m)); return () => { on = false } }, [])
  if (loading) return null
  if (role === 'admin' || !isSupabaseConfigured) return true
  if (members == null) return null
  return ids.some((i) => members.includes(i))
}

// ── Reads ─────────────────────────────────────────────────────────────────────
/** Every row with a business date in [from, to] (inclusive), plus undated review rows. */
export async function fetchSales(from: string, to: string): Promise<StoredSale[]> {
  if (!isSupabaseConfigured) return mockTxns.filter((r) => !r.biz_date || (r.biz_date >= from && r.biz_date <= to))
  const out: StoredSale[] = []
  for (let page = 0; ; page++) {
    const { data, error } = await supabase.from('sales_txns').select('*').gte('biz_date', from).lte('biz_date', to)
      .order('key').range(page * 1000, page * 1000 + 999)
    if (error) throw error
    out.push(...(data ?? []).map(toStored))
    if (!data || data.length < 1000) break
  }
  return out
}
export async function fetchReviewQueue(): Promise<StoredSale[]> {
  if (!isSupabaseConfigured) return mockTxns.filter((r) => r.review || r.conflict)
  const { data, error } = await supabase.from('sales_txns').select('*').or('review.not.is.null,conflict.not.is.null').order('biz_date').limit(1000)
  if (error) throw error
  return (data ?? []).map(toStored)
}
export async function fetchImports(): Promise<SalesImport[]> {
  if (!isSupabaseConfigured) return [...mockImports].reverse()
  const { data, error } = await supabase.from('sales_imports').select('*').order('created_at', { ascending: false }).limit(50)
  if (error) throw error
  return (data ?? []) as SalesImport[]
}
/** Months that have data (for the month picker). */
export async function fetchDateRange(): Promise<{ min: string | null; max: string | null }> {
  if (!isSupabaseConfigured) { const d = mockTxns.map((r) => r.biz_date).filter(Boolean).sort(); return { min: d[0] ?? null, max: d[d.length - 1] ?? null } }
  const a = await supabase.from('sales_txns').select('biz_date').not('biz_date', 'is', null).order('biz_date', { ascending: true }).limit(1)
  const b = await supabase.from('sales_txns').select('biz_date').not('biz_date', 'is', null).order('biz_date', { ascending: false }).limit(1)
  return { min: (a.data?.[0]?.biz_date as string) ?? null, max: (b.data?.[0]?.biz_date as string) ?? null }
}

// ── Import: classify against what's stored, then commit ──────────────────────
export type Classified = { row: SaleRow & { source_file: string }; kind: 'new' | 'dup' | 'conflict' | 'review'; existing?: StoredSale }

async function existingByKey(keys: string[]): Promise<Map<string, StoredSale>> {
  const m = new Map<string, StoredSale>()
  if (!isSupabaseConfigured) { for (const r of mockTxns) if (keys.includes(r.key)) m.set(r.key, r); return m }
  for (let i = 0; i < keys.length; i += 200) {
    const { data, error } = await supabase.from('sales_txns').select('*').in('key', keys.slice(i, i + 200))
    if (error) throw error
    for (const r of data ?? []) m.set(String(r.key), toStored(r))
  }
  return m
}
const same = (a: SaleRow, b: SaleRow) => a.amount_satang === b.amount_satang && a.biz_date === b.biz_date && a.machine === b.machine

export async function classify(rows: (SaleRow & { source_file: string })[]): Promise<Classified[]> {
  const ex = await existingByKey([...new Set(rows.map((r) => r.key))])
  const seen = new Map<string, SaleRow>()
  return rows.map((row) => {
    const prev = ex.get(row.key) ?? seen.get(row.key)
    if (prev) return { row, kind: same(prev, row) ? 'dup' : 'conflict', existing: ex.get(row.key) }
    seen.set(row.key, row)
    return { row, kind: row.review ? 'review' : 'new' }
  })
}

/** Saves new + review rows and flags conflicts. Rolls back this import's rows if any batch fails. */
export async function commitImport(items: Classified[], files: ImportFileSummary[], by: string | null): Promise<SalesImport> {
  const imp: SalesImport = {
    import_id: uid(), files, created_by: by, created_at: new Date().toISOString(),
    new_rows: items.filter((i) => i.kind === 'new').length, dup_rows: items.filter((i) => i.kind === 'dup').length,
    review_rows: items.filter((i) => i.kind === 'review' || i.kind === 'conflict').length,
  }
  const now = new Date().toISOString()
  const insert = items.filter((i) => i.kind === 'new' || i.kind === 'review').map((i) => ({ ...i.row, biz_date: i.row.biz_date || null, import_id: imp.import_id, conflict: null }))
  // DB conflicts and same-upload conflicts (the first copy is inserted above, then flagged)
  const conflicts = items.filter((i) => i.kind === 'conflict')
  if (!isSupabaseConfigured) {
    mockImports.push(imp)
    mockTxns.push(...insert.map((r) => ({ ...r, biz_date: r.biz_date ?? '' }) as StoredSale))
    for (const c of conflicts) mockTxns = mockTxns.map((r) => (r.key === c.row.key ? { ...r, conflict: { amount_satang: c.row.amount_satang, biz_date: c.row.biz_date, machine: c.row.machine, file: c.row.source_file, at: now } } : r))
    return imp
  }
  const { error: e1 } = await supabase.from('sales_imports').insert(imp)
  if (e1) throw e1
  try {
    for (let i = 0; i < insert.length; i += 500) {
      const { error } = await supabase.from('sales_txns').upsert(insert.slice(i, i + 500), { onConflict: 'key', ignoreDuplicates: true })
      if (error) throw error
    }
    for (const c of conflicts) {
      const { error } = await supabase.from('sales_txns').update({ conflict: { amount_satang: c.row.amount_satang, biz_date: c.row.biz_date, machine: c.row.machine, file: c.row.source_file, at: now }, updated_at: now }).eq('key', c.row.key)
      if (error) throw error
    }
  } catch (err) {
    await supabase.from('sales_txns').delete().eq('import_id', imp.import_id)
    await supabase.from('sales_imports').delete().eq('import_id', imp.import_id)
    throw err
  }
  return imp
}

// ── Review decisions ──────────────────────────────────────────────────────────
export async function patchSale(key: string, patch: Partial<StoredSale>): Promise<void> {
  if (!isSupabaseConfigured) { mockTxns = mockTxns.map((r) => (r.key === key ? { ...r, ...patch } : r)); return }
  const { error } = await supabase.from('sales_txns').update({ ...patch, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) throw error
}
