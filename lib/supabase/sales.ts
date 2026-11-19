import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import type { SaleRow } from '@/lib/sales/parse'
import { useAuth } from '@/components/auth-provider'
import { useMyIds } from '@/components/shared/assignee-picker'

// ── Stored row = parsed row + bookkeeping ─────────────────────────────────────
export interface SaleConflict { amount_satang: number; biz_date: string; machine: number | null; file: string; at: string }
export interface StoredSale extends SaleRow { source_file: string | null; import_id: string | null; conflict: SaleConflict | null; voided?: boolean }
export interface ImportFileSummary { name: string; format: string; rows: number; new: number; dup: number; conflict: number; review: number; excluded: number; from: string | null; to: string | null; gross_satang: number; sha256?: string }
export interface SalesImport { import_id: string; files: ImportFileSummary[]; new_rows: number; dup_rows: number; review_rows: number; created_by: string | null; created_at: string; voided_at?: string | null; voided_by?: string | null; void_reason?: string | null }

let mockTxns: StoredSale[] = []
const mockImports: SalesImport[] = []
let mockAccess: string[] = []
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `imp-${Date.now()}`)
const toStored = (r: Record<string, unknown>): StoredSale => ({ ...(r as unknown as StoredSale), biz_date: String(r.biz_date ?? ''), amount_satang: Number(r.amount_satang), fee_satang: r.fee_satang == null ? null : Number(r.fee_satang), net_satang: r.net_satang == null ? null : Number(r.net_satang) })

// ── Access: admins + users ticked in Admin › Users ───────────────────────────
export const SALES_PAGE = 'sales'
const accessCache = new Map<string, string[]>()
export async function fetchPageAccess(page: string): Promise<string[]> {
  const r = await fetchPageAccessRaw(page); accessCache.set(page, r); return r
}
async function fetchPageAccessRaw(page: string): Promise<string[]> {
  if (!isSupabaseConfigured) return mockAccess
  const { data, error } = await supabase.from('page_access').select('user_id').eq('page', page)
  if (error) return []
  return (data ?? []).map((r) => String(r.user_id))
}
export async function setPageAccess(page: string, userId: string, on: boolean): Promise<void> {
  accessCache.delete(page)
  if (!isSupabaseConfigured) { mockAccess = on ? [...mockAccess, userId] : mockAccess.filter((x) => x !== userId); return }
  const q = on ? supabase.from('page_access').upsert({ page, user_id: userId }) : supabase.from('page_access').delete().eq('page', page).eq('user_id', userId)
  const { error } = await q
  if (error) throw error
}
/** null while loading. */
export function useSalesAccess(): boolean | null {
  const { role, loading } = useAuth()
  const ids = useMyIds()
  const [members, setMembers] = useState<string[] | null>(() => accessCache.get(SALES_PAGE) ?? null)   // sidebar + page share one check
  useEffect(() => { let on = true; void fetchPageAccess(SALES_PAGE).then((m) => on && setMembers(m)); return () => { on = false } }, [])
  if (loading) return null
  if (role === 'admin' || !isSupabaseConfigured) return true
  if (members == null) return null
  return ids.some((i) => members.includes(i))
}

// ── Reads ─────────────────────────────────────────────────────────────────────
/** Last result per period this session — reopening shows it at once, then refreshes. Cleared on any write. */
export const salesCache = new Map<string, StoredSale[]>()
const clearSalesCache = () => salesCache.clear()

/** Every row with a business date in [from, to] (inclusive), plus undated review rows. */
export async function fetchSales(from: string, to: string): Promise<StoredSale[]> {
  if (!isSupabaseConfigured) return mockTxns.filter((r) => !r.voided).filter((r) => !r.biz_date || (r.biz_date >= from && r.biz_date <= to))
  const out: StoredSale[] = []
  for (let page = 0; ; page++) {
    const { data, error } = await supabase.from('sales_txns').select('*').eq('voided', false).gte('biz_date', from).lte('biz_date', to)
      .order('key').range(page * 1000, page * 1000 + 999)
    if (error) throw error
    out.push(...(data ?? []).map(toStored))
    if (!data || data.length < 1000) break
  }
  return out
}
export async function fetchReviewQueue(): Promise<StoredSale[]> {
  if (!isSupabaseConfigured) return mockTxns.filter((r) => !r.voided && (r.review || r.conflict))
  const { data, error } = await supabase.from('sales_txns').select('*').eq('voided', false).or('review.not.is.null,conflict.not.is.null').order('biz_date').limit(1000)
  if (error) throw error
  return (data ?? []).map(toStored)
}
export async function fetchImports(): Promise<SalesImport[]> {
  if (!isSupabaseConfigured) return [...mockImports].reverse()
  const { data, error } = await supabase.from('sales_imports').select('*').order('created_at', { ascending: false }).limit(1000)
  if (error) throw error
  return (data ?? []) as SalesImport[]
}
/** Months that have data (for the month picker). */
export async function fetchDateRange(): Promise<{ min: string | null; max: string | null }> {
  if (!isSupabaseConfigured) { const d = mockTxns.map((r) => r.biz_date).filter(Boolean).sort(); return { min: d[0] ?? null, max: d[d.length - 1] ?? null } }
  const a = await supabase.from('sales_txns').select('biz_date').eq('voided', false).not('biz_date', 'is', null).order('biz_date', { ascending: true }).limit(1)
  const b = await supabase.from('sales_txns').select('biz_date').eq('voided', false).not('biz_date', 'is', null).order('biz_date', { ascending: false }).limit(1)
  return { min: (a.data?.[0]?.biz_date as string) ?? null, max: (b.data?.[0]?.biz_date as string) ?? null }
}

// ── Import: classify against what's stored, then commit ──────────────────────
export type Classified = { row: SaleRow & { source_file: string }; kind: 'new' | 'dup' | 'conflict' | 'review'; existing?: StoredSale; revive?: boolean }

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
    const old = ex.get(row.key)
    const revive = !!old?.voided && !seen.has(row.key)   // only a voided upload had it: this file brings it back
    const prev = revive ? seen.get(row.key) : old ?? seen.get(row.key)
    if (prev) return { row, kind: same(prev, row) ? 'dup' : 'conflict', existing: old }
    seen.set(row.key, row)
    return { row, kind: row.review ? 'review' : 'new', revive }
  })
}

/** Saves new + review rows and flags conflicts. Rolls back this import's rows if any batch fails. */
export async function commitImport(items: Classified[], files: ImportFileSummary[], by: string | null, onProgress?: (done: number, total: number) => void): Promise<SalesImport> {
  clearSalesCache()
  const imp: SalesImport = {
    import_id: uid(), files, created_by: by, created_at: new Date().toISOString(),
    new_rows: items.filter((i) => i.kind === 'new').length, dup_rows: items.filter((i) => i.kind === 'dup').length,
    review_rows: items.filter((i) => i.kind === 'review' || i.kind === 'conflict').length,
  }
  const now = new Date().toISOString()
  const toRow = (i: Classified) => ({ ...i.row, biz_date: i.row.biz_date || null, import_id: imp.import_id, conflict: null, voided: false })
  const fresh = items.filter((i) => (i.kind === 'new' || i.kind === 'review') && !i.revive)
  const revived = items.filter((i) => (i.kind === 'new' || i.kind === 'review') && i.revive)
  const insert = [...fresh, ...revived].map(toRow)
  // DB conflicts and same-upload conflicts (the first copy is inserted above, then flagged)
  const conflicts = items.filter((i) => i.kind === 'conflict')
  if (!isSupabaseConfigured) {
    mockImports.push(imp)
    mockAudit.unshift({ id: mockAudit.length + 1, at: imp.created_at, actor: by, action: 'imported', import_id: imp.import_id, txn_key: null, summary: `Imported ${files.map((f) => f.name).join(', ')} · ${imp.new_rows} new · ${imp.dup_rows} dup`, reason: null, detail: null })
    const keys = new Set(revived.map((i) => i.row.key)); mockTxns = mockTxns.filter((r) => !keys.has(r.key))
    mockTxns.push(...insert.map((r) => ({ ...r, biz_date: r.biz_date ?? '' }) as StoredSale))
    for (const c of conflicts) mockTxns = mockTxns.map((r) => (r.key === c.row.key ? { ...r, conflict: { amount_satang: c.row.amount_satang, biz_date: c.row.biz_date, machine: c.row.machine, file: c.row.source_file, at: now } } : r))
    return imp
  }
  const { error: e1 } = await supabase.from('sales_imports').insert(imp)
  if (e1) throw e1
  try {
    for (let i = 0; i < insert.length; i += 500) {
      onProgress?.(i, insert.length)
      const batch = insert.slice(i, i + 500)
      const nNew = Math.max(0, Math.min(batch.length, fresh.length - i))   // fresh rows come first
      if (nNew) { const { error } = await supabase.from('sales_txns').upsert(batch.slice(0, nNew), { onConflict: 'key', ignoreDuplicates: true }); if (error) throw error }
      if (nNew < batch.length) { const { error } = await supabase.from('sales_txns').upsert(batch.slice(nNew), { onConflict: 'key' }); if (error) throw error }
    }
    onProgress?.(insert.length, insert.length)
    for (const c of conflicts) {
      const { error } = await supabase.from('sales_txns').update({ conflict: { amount_satang: c.row.amount_satang, biz_date: c.row.biz_date, machine: c.row.machine, file: c.row.source_file, at: now }, edit_reason: null, updated_at: now }).eq('key', c.row.key)
      if (error) throw error
    }
  } catch (err) {
    await supabase.from('sales_txns').delete().eq('import_id', imp.import_id)
    await supabase.from('sales_imports').delete().eq('import_id', imp.import_id)
    throw err
  }
  return imp
}

// ── File fingerprints ─────────────────────────────────────────────────────────
export async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
/** Earlier uploads that contained exactly this file (same bytes). */
export async function importsWithFile(sha: string): Promise<SalesImport[]> {
  if (!isSupabaseConfigured) return mockImports.filter((m) => m.files.some((f) => f.sha256 === sha))
  const { data, error } = await supabase.from('sales_imports').select('*').contains('files', [{ sha256: sha }]).order('created_at', { ascending: false }).limit(5)
  if (error) return []
  return (data ?? []) as SalesImport[]
}

// ── Void / restore (kept, with who / when / why) ──────────────────────────────
export async function voidImport(imp: SalesImport, by: string, reason: string): Promise<{ rows: number; satang: number }> {
  clearSalesCache()
  const now = new Date().toISOString()
  const names = imp.files.map((f) => f.name)
  if (!isSupabaseConfigured) {
    const gone = mockTxns.filter((r) => r.import_id === imp.import_id && !r.voided)
    mockTxns = mockTxns.map((r) => (r.import_id === imp.import_id ? { ...r, voided: true } : r.conflict && names.includes(r.conflict.file) ? { ...r, conflict: null } : r))
    Object.assign(imp, { voided_at: now, voided_by: by, void_reason: reason })
    mockAudit.unshift({ id: mockAudit.length + 1, at: now, actor: by, action: 'voided', import_id: imp.import_id, txn_key: null, summary: `Voided upload ${names.join(', ')} · ${imp.new_rows} payments`, reason, detail: null })
    return { rows: gone.length, satang: gone.reduce((s, r) => s + r.amount_satang, 0) }
  }
  const { data: gone, error: e0 } = await supabase.from('sales_txns').update({ voided: true, updated_at: now }).eq('import_id', imp.import_id).eq('voided', false).select('amount_satang')
  if (e0) throw e0
  for (const n of names) {
    const { error } = await supabase.from('sales_txns').update({ conflict: null, updated_at: now }).eq('conflict->>file', n)
    if (error) throw error
  }
  const { error: e2 } = await supabase.from('sales_imports').update({ voided_at: now, voided_by: by, void_reason: reason }).eq('import_id', imp.import_id)
  if (e2) throw e2
  return { rows: gone?.length ?? 0, satang: (gone ?? []).reduce((s, r) => s + Number(r.amount_satang), 0) }
}
export async function restoreImport(imp: SalesImport): Promise<number> {
  clearSalesCache()
  if (!isSupabaseConfigured) {
    let n = 0; mockTxns = mockTxns.map((r) => (r.import_id === imp.import_id && r.voided ? (n++, { ...r, voided: false }) : r))
    Object.assign(imp, { voided_at: null, voided_by: null, void_reason: null }); return n
  }
  const { data, error } = await supabase.from('sales_txns').update({ voided: false, updated_at: new Date().toISOString() }).eq('import_id', imp.import_id).eq('voided', true).select('key')
  if (error) throw error
  const { error: e2 } = await supabase.from('sales_imports').update({ voided_at: null, voided_by: null, void_reason: null }).eq('import_id', imp.import_id)
  if (e2) throw e2
  return data?.length ?? 0
}

// ── Audit log (written by database triggers; read-only) ───────────────────────
export interface AuditEntry { id: number; at: string; actor: string | null; action: string; import_id: string | null; txn_key: string | null; summary: string | null; reason: string | null; detail: Record<string, unknown> | null }
const mockAudit: AuditEntry[] = []
export async function fetchAudit(from: string, to: string): Promise<AuditEntry[]> {
  if (!isSupabaseConfigured) return mockAudit.filter((a) => a.at.slice(0, 10) >= from && a.at.slice(0, 10) <= to)
  const out: AuditEntry[] = []
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase.from('sales_audit').select('*').gte('at', `${from}T00:00:00+07:00`).lte('at', `${to}T23:59:59.999+07:00`)
      .order('at', { ascending: false }).range(page * 1000, page * 1000 + 999)
    if (error) throw error
    out.push(...((data ?? []) as AuditEntry[]))
    if (!data || data.length < 1000) break
  }
  return out
}

// ── Review decisions ──────────────────────────────────────────────────────────
/** reason is written to the audit log with the change (the database logs every edit). */
export async function patchSale(key: string, patch: Partial<StoredSale>, reason: string | null = null): Promise<void> {
  clearSalesCache()
  if (!isSupabaseConfigured) {
    const old = mockTxns.find((r) => r.key === key)
    if (old) mockAudit.unshift({ id: mockAudit.length + 1, at: new Date().toISOString(), actor: 'you (mock)', action: patch.status === 'excluded' ? 'excluded_payment' : 'edited_payment', import_id: old.import_id, txn_key: key, summary: `${old.txn_id} · ${Object.keys(patch).join(', ')}`, reason, detail: patch as Record<string, unknown> })
    mockTxns = mockTxns.map((r) => (r.key === key ? { ...r, ...patch } : r)); return
  }
  const { error } = await supabase.from('sales_txns').update({ ...patch, edit_reason: reason, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) throw error
}

/** Remove an upload: every payment it added, the conflicts it raised, and its history entry.
 *  Payments that were duplicates in that upload belong to an earlier upload and stay. */
export async function deleteImport(imp: SalesImport): Promise<{ rows: number; satang: number }> {
  clearSalesCache()
  const names = imp.files.map((f) => f.name)
  if (!isSupabaseConfigured) {
    const gone = mockTxns.filter((r) => r.import_id === imp.import_id)
    mockTxns = mockTxns.filter((r) => r.import_id !== imp.import_id).map((r) => (r.conflict && names.includes(r.conflict.file) ? { ...r, conflict: null } : r))
    const i = mockImports.findIndex((x) => x.import_id === imp.import_id); if (i >= 0) mockImports.splice(i, 1)
    return { rows: gone.length, satang: gone.reduce((s, r) => s + r.amount_satang, 0) }
  }
  const { data: gone, error: e0 } = await supabase.from('sales_txns').delete().eq('import_id', imp.import_id).select('amount_satang')
  if (e0) throw e0
  for (const n of names) {
    const { error } = await supabase.from('sales_txns').update({ conflict: null, updated_at: new Date().toISOString() }).eq('conflict->>file', n)
    if (error) throw error
  }
  const { error: e2 } = await supabase.from('sales_imports').delete().eq('import_id', imp.import_id)
  if (e2) throw e2
  return { rows: gone?.length ?? 0, satang: (gone ?? []).reduce((s, r) => s + Number(r.amount_satang), 0) }
}
