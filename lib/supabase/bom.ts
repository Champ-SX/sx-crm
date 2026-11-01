import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import { MOCK_RENTAL_PRODUCTS, MOCK_BOM_LINES } from './bom-mock'

// Equipment by product (BOM). Replaces equipment sets (SET1/SET2/…).
//   rental_products   what we rent out: LCA iPad, Tally, Box Shot…
//   rental_bom_lines  what goes in its box (equipment / accessory / consumable)
//   job_kits          a product added to a Won job ("LCA iPad #1")
//   job_kit_lines     that kit's lines, copied from the BOM when added, with the
//                     picked unit (equipment) or packed tick / qty (others).
// Copying the lines means editing a BOM never changes jobs already packed.

export type BomKind = 'equipment' | 'accessory' | 'consumable'

export interface RentalProduct {
  product_id: string
  name: string
  notes?: string | null
  position: number
  created_at?: string
}

export interface BomLine {
  id: string
  product_id: string
  kind: BomKind
  label: string
  category?: string | null        // equipment: asset category that fills it (camera, printer…)
  anf_product_id?: string | null  // equipment: preferred model · consumable: catalog item
  qty: number
  unit?: string | null
  optional?: boolean
  position: number
}

export interface JobKit {
  id: string
  job_id: string
  product_id: string | null
  name: string                    // product name at the time it was added
  kit_no: number                  // 1, 2… when the same product is on a job twice
  position: number
  created_at?: string
}

export interface JobKitLine {
  id: string
  kit_id: string
  job_id: string
  kind: BomKind
  label: string
  category?: string | null
  anf_product_id?: string | null
  slot: number                    // equipment: 1..qty, one row per unit (Light 1 of 2)
  of_qty: number
  qty: number                     // accessory / consumable amount
  unit?: string | null
  optional?: boolean
  asset_id?: string | null        // equipment: the picked unit
  packed: boolean                 // accessory / consumable: ticked as packed
  position: number
}

export const KIND_META: Record<BomKind, { label: string; cls: string }> = {
  equipment:  { label: 'Equipment',  cls: 'bg-blue-500/12 text-blue-700 dark:text-blue-300' },
  accessory:  { label: 'Accessory',  cls: 'bg-muted text-muted-foreground' },
  consumable: { label: 'Consumable', cls: 'bg-amber-500/14 text-amber-700 dark:text-amber-400' },
}

export const kitLabel = (k: Pick<JobKit, 'name' | 'kit_no'>) => `${k.name} #${k.kit_no}`

// ── Store ────────────────────────────────────────────────────────────────────
const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bom-${Date.now()}-${Math.round(Math.random() * 1e6)}`)
export const newBomId = mkId

let products: RentalProduct[] = []
let lines: BomLine[] = []
let kits: JobKit[] = []
let kitLines: JobKitLine[] = []
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

async function load() {
  if (!isSupabaseConfigured) {
    products = MOCK_RENTAL_PRODUCTS
    lines = MOCK_BOM_LINES
    loaded = true; emit(); return
  }
  const [p, l, k, kl] = await Promise.all([
    supabase.from('rental_products').select('*').order('position'),
    supabase.from('rental_bom_lines').select('*').order('position'),
    supabase.from('job_kits').select('*').order('position'),
    supabase.from('job_kit_lines').select('*').order('position'),
  ])
  for (const r of [p, l, k, kl]) if (r.error) console.warn('[bom] load failed', r.error.message)
  products = (p.data ?? []) as RentalProduct[]
  lines = (l.data ?? []) as BomLine[]
  kits = (k.data ?? []) as JobKit[]
  kitLines = (kl.data ?? []) as JobKitLine[]
  loaded = true; emit()
}

export function useBom() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    listeners.add(f)
    if (!loaded && !loading) loading = load()
    return () => { listeners.delete(f) }
  }, [])
  return { products, lines, kits, kitLines, loaded }
}

export const linesOf = (productId: string) => lines.filter((l) => l.product_id === productId).sort((a, b) => a.position - b.position)
export const kitsOf = (jobId: string) => kits.filter((k) => k.job_id === jobId).sort((a, b) => a.position - b.position)
export const kitLinesOf = (kitId: string) => kitLines.filter((l) => l.kit_id === kitId).sort((a, b) => a.position - b.position)
/** The kit line an asset is picked on (for "#131 · LCA iPad #1 · Camera"). */
export const kitLineForAsset = (assetId: string) => {
  const l = kitLines.find((x) => x.asset_id === assetId)
  return l ? { line: l, kit: kits.find((k) => k.id === l.kit_id) } : null
}

async function upsert<T extends object>(table: string, row: T) {
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from(table).upsert(row)
  if (error) throw new Error(error.message)
}
async function remove(table: string, col: string, ids: string[]) {
  if (!isSupabaseConfigured || ids.length === 0) return
  const { error } = await supabase.from(table).delete().in(col, ids)
  if (error) throw new Error(error.message)
}

// ── Products + BOM lines ─────────────────────────────────────────────────────
export async function saveProduct(p: RentalProduct) {
  products = [...products.filter((x) => x.product_id !== p.product_id), p].sort((a, b) => a.position - b.position)
  emit(); await upsert('rental_products', p)
}
export async function deleteProduct(productId: string) {
  const ids = lines.filter((l) => l.product_id === productId).map((l) => l.id)
  products = products.filter((p) => p.product_id !== productId)
  lines = lines.filter((l) => l.product_id !== productId)
  emit()
  await remove('rental_bom_lines', 'id', ids)
  await remove('rental_products', 'product_id', [productId])
}
export async function saveLine(l: BomLine) {
  lines = [...lines.filter((x) => x.id !== l.id), l]
  emit(); await upsert('rental_bom_lines', l)
}
export async function deleteLine(id: string) {
  lines = lines.filter((l) => l.id !== id)
  emit(); await remove('rental_bom_lines', 'id', [id])
}

// ── Kits on a job ────────────────────────────────────────────────────────────
/** Add a product to a job: copies its BOM. Equipment lines become one row per unit. */
export async function addKit(jobId: string, p: RentalProduct): Promise<JobKit> {
  const onJob = kitsOf(jobId)
  const kit: JobKit = {
    id: mkId(), job_id: jobId, product_id: p.product_id, name: p.name,
    kit_no: Math.max(0, ...onJob.filter((k) => k.product_id === p.product_id).map((k) => k.kit_no)) + 1,
    position: onJob.length, created_at: new Date().toISOString(),
  }
  const rows: JobKitLine[] = []
  for (const l of linesOf(p.product_id)) {
    const base = { kit_id: kit.id, job_id: jobId, kind: l.kind, label: l.label, category: l.category ?? null, anf_product_id: l.anf_product_id ?? null, unit: l.unit ?? null, optional: !!l.optional, asset_id: null, packed: false }
    if (l.kind === 'equipment') {
      const n = Math.max(1, Math.round(l.qty))
      for (let i = 1; i <= n; i++) rows.push({ ...base, id: mkId(), slot: i, of_qty: n, qty: 1, position: rows.length })
    } else rows.push({ ...base, id: mkId(), slot: 1, of_qty: 1, qty: l.qty, position: rows.length })
  }
  kits = [...kits, kit]; kitLines = [...kitLines, ...rows]
  emit()
  await upsert('job_kits', kit)
  if (isSupabaseConfigured && rows.length) {
    const { error } = await supabase.from('job_kit_lines').insert(rows)
    if (error) throw new Error(error.message)
  }
  return kit
}
export async function removeKit(kitId: string) {
  kits = kits.filter((k) => k.id !== kitId)
  kitLines = kitLines.filter((l) => l.kit_id !== kitId)
  emit()
  await remove('job_kit_lines', 'kit_id', [kitId])
  await remove('job_kits', 'id', [kitId])
}
export async function saveKitLine(l: JobKitLine) {
  kitLines = kitLines.map((x) => (x.id === l.id ? l : x))
  emit(); await upsert('job_kit_lines', l)
}

/** A line counts as packed when its unit is picked (equipment) or it's ticked. Optional lines don't count. */
export const isPacked = (l: JobKitLine) => (l.kind === 'equipment' ? !!l.asset_id : l.packed)
export function packProgress(list: JobKitLine[]) {
  const req = list.filter((l) => !l.optional)
  return { done: req.filter(isPacked).length, total: req.length }
}
