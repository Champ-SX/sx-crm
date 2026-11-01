'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Package, Plus, Trash2 } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { cn } from '@/lib/utils'
import { ANF_ACCENT, ASSET_CATEGORIES, kindOf } from '@/lib/anf'
import {
  useBom, linesOf, saveProduct, deleteProduct, saveLine, deleteLine, newBomId, KIND_META,
  type BomKind, type BomLine, type RentalProduct,
} from '@/lib/supabase/bom'

const input = 'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-foreground/40 disabled:opacity-60'

/** Stock & Assets → Products: what we rent out and what goes in each box (BOM). */
export default function ProductsPage() {
  const isHydrated = useHydrated()
  const { products, kits } = useBom()
  const [selId, setSelId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!isHydrated) return null
  const sel = products.find((p) => p.product_id === selId) ?? products[0] ?? null

  async function addProduct() {
    const name = window.prompt('Product name (e.g. LCA iPad)')?.trim()
    if (!name) return
    if (products.some((p) => p.name.toLowerCase() === name.toLowerCase())) { setError(`“${name}” already exists.`); return }
    const p: RentalProduct = { product_id: newBomId(), name, position: products.length }
    try { await saveProduct(p); setSelId(p.product_id) } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex flex-wrap items-center gap-3">
        <MobileMenuButton />
        <span className="w-3.5 h-3.5 rounded-[5px] shrink-0 flex items-center justify-center" style={{ backgroundColor: ANF_ACCENT }}><Package className="w-2.5 h-2.5 text-white" /></span>
        <div>
          <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">Products</h1>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">what we rent out · what goes in each box</p>
        </div>
        <Link href="/purchasing/stock" className="ml-2 text-[13px] underline underline-offset-4 text-[#7A5AA5] hover:opacity-80">Stock &amp; Assets ↗</Link>
        <button type="button" onClick={() => void addProduct()} className="ml-auto h-9 rounded-md bg-[#7A5AA5] px-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-white hover:opacity-90"><Plus className="w-4 h-4" />Add product</button>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {error && <p className="mb-3 text-[12px] text-destructive">{error}</p>}
        {products.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No products yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">Add what you rent out (LCA iPad, Tally…), then list what goes in its box.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
            <div className="rounded-xl border border-border bg-card p-1 h-max">
              {products.map((p) => {
                const n = linesOf(p.product_id).length
                return (
                  <button key={p.product_id} type="button" onClick={() => setSelId(p.product_id)}
                    className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-[13px]', sel?.product_id === p.product_id ? 'bg-muted font-semibold' : 'hover:bg-muted/60')}>
                    <span className="truncate">{p.name}</span>
                    <span className={cn('shrink-0 font-mono text-[11px]', n ? 'text-muted-foreground' : 'text-amber-700 dark:text-amber-400')}>{n ? `${n} lines` : 'no BOM'}</span>
                  </button>
                )
              })}
            </div>
            {sel && <BomEditor key={sel.product_id} product={sel} usedOn={kits.filter((k) => k.product_id === sel.product_id).length} onError={setError}
              onDeleted={() => setSelId(null)} />}
          </div>
        )}
      </div>
    </div>
  )
}

function BomEditor({ product, usedOn, onError, onDeleted }: { product: RentalProduct; usedOn: number; onError: (m: string | null) => void; onDeleted: () => void }) {
  useBom()
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const [name, setName] = useState(product.name)
  const lines = linesOf(product.product_id)
  const models = (category?: string | null) => anfProducts.filter((p) => kindOf(p) === 'asset' && (!category || p.category === category))
  const supplies = anfProducts.filter((p) => kindOf(p) === 'supply')
  const put = (l: BomLine) => { onError(null); saveLine(l).catch((e: Error) => onError(e.message)) }
  const add = (kind: BomKind) => put({
    id: newBomId(), product_id: product.product_id, kind, position: (lines.at(-1)?.position ?? 0) + 1, qty: 1,
    label: kind === 'equipment' ? 'Camera' : kind === 'accessory' ? 'Cable bag' : 'DNP 4×6 paper',
    category: kind === 'equipment' ? 'camera' : null, unit: kind === 'consumable' ? 'box' : null,
  })

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== product.name && void saveProduct({ ...product, name: name.trim() }).catch((e: Error) => onError(e.message))}
          className="h-9 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-[17px] font-bold outline-none hover:border-border focus:border-foreground/40" aria-label="Product name" />
        <span className="text-[12px] text-muted-foreground">{usedOn ? `on ${usedOn} job${usedOn === 1 ? '' : 's'}` : 'not on any job'}</span>
        <button type="button" onClick={() => { if (window.confirm(`Delete ${product.name} and its BOM? Jobs that already have it keep their copy.`)) void deleteProduct(product.product_id).then(onDeleted).catch((e: Error) => onError(e.message)) }}
          className="h-8 w-8 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="Delete product"><Trash2 className="w-4 h-4" /></button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border bg-muted/40">
            <th className="px-3 py-2">LINE</th><th className="px-2 py-2 w-32">KIND</th><th className="px-2 py-2">FILLED BY</th><th className="px-2 py-2 w-20 text-right">QTY</th><th className="px-2 py-2 w-20">UNIT</th><th className="px-2 py-2 w-20 text-center">OPTIONAL</th><th className="w-8" />
          </tr></thead>
          <tbody>
            {lines.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-[12px] text-muted-foreground">No lines yet. Add what goes in the box below.</td></tr>}
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-border align-middle">
                <td className="px-3 py-1.5"><input defaultValue={l.label} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== l.label && put({ ...l, label: e.target.value.trim() })} className={input} aria-label="Line name" /></td>
                <td className="px-2 py-1.5">
                  <select value={l.kind} onChange={(e) => { const kind = e.target.value as BomKind; put({ ...l, kind, category: kind === 'equipment' ? l.category ?? 'camera' : null, anf_product_id: null }) }} className={input}>
                    {(Object.keys(KIND_META) as BomKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  {l.kind === 'equipment' ? (
                    <div className="flex gap-1.5">
                      <select value={l.category ?? ''} onChange={(e) => put({ ...l, category: e.target.value || null, anf_product_id: null })} className={input} aria-label="Type">
                        {ASSET_CATEGORIES.map((c) => <option key={c.key} value={c.key}>any {c.en}</option>)}
                      </select>
                      <select value={l.anf_product_id ?? ''} onChange={(e) => put({ ...l, anf_product_id: e.target.value || null })} className={input} aria-label="Preferred model">
                        <option value="">no preferred model</option>
                        {models(l.category).map((p) => <option key={p.product_id} value={p.product_id}>★ {p.name}</option>)}
                      </select>
                    </div>
                  ) : l.kind === 'consumable' ? (
                    <select value={l.anf_product_id ?? ''} onChange={(e) => put({ ...l, anf_product_id: e.target.value || null })} className={input} aria-label="Catalog item">
                      <option value="">— catalog item (optional) —</option>
                      {supplies.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                    </select>
                  ) : <span className="text-[12px] text-muted-foreground">ticked when packed</span>}
                </td>
                <td className="px-2 py-1.5"><input defaultValue={l.qty} inputMode="decimal" onBlur={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n) && n > 0 && n !== l.qty) put({ ...l, qty: n }) }} className={cn(input, 'text-right font-mono')} aria-label="Quantity" /></td>
                <td className="px-2 py-1.5"><input defaultValue={l.unit ?? ''} disabled={l.kind === 'equipment'} placeholder={l.kind === 'equipment' ? 'units' : ''} onBlur={(e) => (e.target.value || null) !== (l.unit ?? null) && put({ ...l, unit: e.target.value || null })} className={input} aria-label="Unit" /></td>
                <td className="px-2 py-1.5 text-center"><input type="checkbox" checked={!!l.optional} onChange={(e) => put({ ...l, optional: e.target.checked })} className="w-4 h-4 accent-foreground" aria-label="Optional" /></td>
                <td className="px-1 py-1.5"><button type="button" onClick={() => void deleteLine(l.id).catch((e: Error) => onError(e.message))} className="text-muted-foreground hover:text-destructive" aria-label="Remove line"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
        <span className="text-[12px] text-muted-foreground mr-1">Add line:</span>
        {(Object.keys(KIND_META) as BomKind[]).map((k) => (
          <button key={k} type="button" onClick={() => add(k)} className={cn('h-7 rounded-md px-2.5 text-[12px] font-semibold', KIND_META[k].cls)}>＋ {KIND_META[k].label}</button>
        ))}
        <span className="ml-auto text-[11.5px] text-muted-foreground">Changes apply to jobs that add this product from now on.</span>
      </div>
    </div>
  )
}
