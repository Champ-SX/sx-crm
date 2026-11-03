import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import type { AnfSupplier, AnfProductSupplier } from '@/types'

// Order board suppliers — shared contact list + item ↔ supplier links.
// A tiny module store so the Suppliers page, product dialog and order dialog stay in sync.

const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sup-${Date.now()}-${Math.round(Math.random() * 1e6)}`)
export const newSupplierId = mkId

let suppliers: AnfSupplier[] = []
let links: AnfProductSupplier[] = []
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

// Local dev (mock mode) — made-up sample data.
const MOCK_SUPPLIERS: AnfSupplier[] = [
  { supplier_id: 'sup-mock-1', name: 'Sample Photo Paper Co.', contact_person: 'คุณเอ', phone: '080-000-0001', line_id: '@samplepaper', payment_terms: 'credit 30', notes: 'Order before 14:00 for next-day dispatch' },
  { supplier_id: 'sup-mock-2', name: 'Sample Camera Shop', contact_person: 'B2B desk', phone: '02-000-0000', website: 'https://example.com/shop', payment_terms: 'cash' },
]

async function load() {
  if (!isSupabaseConfigured) {
    if (!loaded) { suppliers = [...MOCK_SUPPLIERS]; links = [] }
    loaded = true; emit(); return
  }
  const [s, l] = await Promise.all([
    supabase.from('anf_suppliers').select('*').order('name'),
    supabase.from('anf_product_suppliers').select('*'),
  ])
  if (s.error) console.warn('[suppliers] load failed', s.error.message)
  if (l.error) console.warn('[suppliers] links load failed', l.error.message)
  suppliers = (s.data ?? []) as AnfSupplier[]
  links = (l.data ?? []) as AnfProductSupplier[]
  loaded = true; emit()
}
export function reloadSuppliers() { loading = load(); return loading }

/** Suppliers + links, loaded once and shared. */
export function useSuppliers() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    listeners.add(f)
    if (!loaded && !loading) loading = load()
    return () => { listeners.delete(f) }
  }, [])
  return { suppliers, links, loaded }
}

export const SUPPLIER_CHANNELS = ['Shopee', 'Lazada', 'LINE', 'Email', 'Facebook', 'Alibaba', 'Walk-in', 'Other'] as const
export const CHANNEL_CLS: Record<string, string> = {
  Shopee: 'bg-orange-500/14 text-orange-700 dark:text-orange-400', Lazada: 'bg-blue-500/14 text-blue-700 dark:text-blue-400',
  LINE: 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400', Email: 'bg-slate-500/14 text-slate-700 dark:text-slate-300',
  Facebook: 'bg-indigo-500/14 text-indigo-700 dark:text-indigo-400', Alibaba: 'bg-amber-500/14 text-amber-800 dark:text-amber-400',
}
/** Next free SUP-### code. */
export const nextSupplierCode = () => {
  const n = Math.max(0, ...suppliers.map((s) => Number(/^SUP-(\d+)$/.exec(s.code ?? '')?.[1] ?? 0)))
  return `SUP-${String(n + 1).padStart(3, '0')}`
}

export const supplierById = (id: string | null | undefined) => suppliers.find((s) => s.supplier_id === id) ?? null
export const linksFor = (productId: string | null | undefined) => links.filter((l) => l.product_id === productId)
export const preferredFor = (productId: string | null | undefined) => {
  const ls = linksFor(productId)
  return ls.find((l) => l.preferred) ?? (ls.length === 1 ? ls[0] : null)
}

// ── Writes (optimistic) ─────────────────────────────────────────────────────
export async function saveSupplier(s: AnfSupplier) {
  const row = { ...s, code: s.code || nextSupplierCode(), updated_at: new Date().toISOString() }
  suppliers = [...suppliers.filter((x) => x.supplier_id !== s.supplier_id), row].sort((a, b) => a.name.localeCompare(b.name))
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_suppliers').upsert(row)
  if (error) throw new Error(error.message)
}

export async function deleteSupplier(id: string) {
  suppliers = suppliers.filter((x) => x.supplier_id !== id)
  links = links.filter((l) => l.supplier_id !== id)
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_suppliers').delete().eq('supplier_id', id)
  if (error) throw new Error(error.message)
}

export async function saveLink(l: AnfProductSupplier) {
  // Only one preferred supplier per item.
  const others = l.preferred ? links.filter((x) => x.product_id === l.product_id && x.id !== l.id && x.preferred) : []
  links = [...links.filter((x) => x.id !== l.id).map((x) => (others.some((o) => o.id === x.id) ? { ...x, preferred: false } : x)), l]
  emit()
  if (!isSupabaseConfigured) return
  if (others.length) {
    const { error } = await supabase.from('anf_product_suppliers').update({ preferred: false }).in('id', others.map((o) => o.id))
    if (error) throw new Error(error.message)
  }
  const { error } = await supabase.from('anf_product_suppliers').upsert(l)
  if (error) throw new Error(error.message)
}

export async function deleteLink(id: string) {
  links = links.filter((x) => x.id !== id)
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_product_suppliers').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export function newLink(productId: string, supplierId: string, preferred: boolean): AnfProductSupplier {
  return { id: mkId(), product_id: productId, supplier_id: supplierId, preferred, price: null, unit: null, lead_time: null, min_order: null, order_via: null, note: null }
}

/** tel: / LINE helpers */
export const telHref = (p?: string | null) => (p ? `tel:${p.replace(/[^\d+]/g, '')}` : null)
export const lineHref = (id?: string | null) => {
  if (!id) return null
  const v = id.trim()
  return v.startsWith('@') ? `https://line.me/R/ti/p/${encodeURIComponent(v)}` : `https://line.me/ti/p/~${encodeURIComponent(v)}`
}
