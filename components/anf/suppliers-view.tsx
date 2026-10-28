'use client'

import { useMemo, useState } from 'react'
import { Truck, Plus, Phone, MessageCircle, ExternalLink, Search } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { useHydrated } from '@/hooks/use-hydrated'
import { RequestDialog, type RequestPrefill } from '@/components/anf/purchasing-ui'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ANF_ACCENT, categoryMeta, baht, kindOf } from '@/lib/anf'
import { useSuppliers, saveSupplier, deleteSupplier, newSupplierId, telHref, lineHref } from '@/lib/supabase/suppliers'
import type { AnfSupplier } from '@/types'

/** Catalog → Suppliers: who we buy from, what they sell, and one click to request their low items. Admin edits, everyone views. */
export function SuppliersView() {
  const isHydrated = useHydrated()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const { suppliers, links, loaded } = useSuppliers()
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<AnfSupplier | null>(null)

  const rows = useMemo(() => {
    const boardOk = (s: AnfSupplier) => !activeBoardId || !s.board_id || s.board_id === activeBoardId
    const needle = q.trim().toLowerCase()
    return suppliers.filter(boardOk).map((s) => {
      const ls = links.filter((l) => l.supplier_id === s.supplier_id)
      const prods = ls.map((l) => anfProducts.find((p) => p.product_id === l.product_id)).filter(Boolean)
      const cats = [...new Set(prods.map((p) => p!.category || 'other'))]
      return { s, count: ls.length, preferred: ls.filter((l) => l.preferred).length, cats, items: prods.map((p) => p!.name) }
    }).filter(({ s, items }) => !needle || [s.name, s.contact_person, s.phone, s.line_id, s.email, ...items].some((v) => (v ?? '').toLowerCase().includes(needle)))
  }, [suppliers, links, anfProducts, activeBoardId, q])

  if (!isHydrated) return null

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3 border-b border-border/60">
        <span className="font-mono text-[12px] text-muted-foreground">{rows.length} supplier{rows.length === 1 ? '' : 's'}</span>
        <div className="relative ml-auto w-full sm:w-72 order-last sm:order-none">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supplier or item…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-[13px] outline-none focus:border-foreground/40" />
        </div>
        {isAdmin && (
          <Button size="sm" className="h-9 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => setEditing({ supplier_id: newSupplierId(), board_id: activeBoardId || 'anf-order', name: '' })}>
            <Plus className="w-4 h-4" /> Add supplier
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {loaded && rows.length === 0 ? (
          <div className="text-center py-20">
            <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">{q ? 'No match' : 'No suppliers yet'}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{isAdmin ? 'Add a supplier, then link it to items in Stock → product.' : 'An admin can add suppliers.'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.4fr_1.2fr_1fr_70px] gap-3 px-4 py-2 border-b border-border font-mono text-[11px] tracking-wide text-muted-foreground">
              <span>SUPPLIER</span><span>CONTACT</span><span>SUPPLIES</span><span className="text-right">ITEMS</span>
            </div>
            {rows.map(({ s, count, preferred, cats, items }) => {
              const tel = telHref(s.phone), line = lineHref(s.line_id)
              return (
                <button key={s.supplier_id} type="button" onClick={() => setEditing(s)}
                  className="w-full text-left grid grid-cols-1 sm:grid-cols-[1.4fr_1.2fr_1fr_70px] gap-1 sm:gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/40">
                  <span className="min-w-0">
                    <b className="text-[14px]">{s.name}</b>
                    {s.payment_terms && <span className="ml-2 text-[11px] text-muted-foreground">{s.payment_terms}</span>}
                    {items.length > 0 && <span className="block text-[12px] text-muted-foreground truncate">{items.slice(0, 3).join(', ')}{items.length > 3 ? ` +${items.length - 3}` : ''}</span>}
                  </span>
                  <span className="min-w-0 text-[13px]">
                    {s.contact_person || '—'}
                    <span className="mt-0.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {tel && <a href={tel} className="inline-flex items-center gap-1 rounded border border-border px-1.5 text-[11px] hover:bg-muted"><Phone className="w-3 h-3" />{s.phone}</a>}
                      {line && <a href={line} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-border px-1.5 text-[11px] hover:bg-muted"><MessageCircle className="w-3 h-3" />LINE</a>}
                      {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded border border-border px-1.5 text-[11px] hover:bg-muted"><ExternalLink className="w-3 h-3" />Shop</a>}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1 items-start">
                    {cats.map((c) => { const m = categoryMeta(c); return <span key={c} className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 text-[11px]"><span className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: m.color }} />{m.en || m.th}</span> })}
                  </span>
                  <span className="sm:text-right font-mono text-[13px]">{count}{preferred > 0 && <span className="block text-[10px] text-muted-foreground">{preferred} preferred</span>}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {editing && <SupplierDialog supplier={editing} canEdit={isAdmin} linked={links.filter((l) => l.supplier_id === editing.supplier_id).length} onClose={() => setEditing(null)} />}
    </div>
  )
}

const FIELDS: { k: keyof AnfSupplier; label: string; ph?: string; wide?: boolean; area?: boolean }[] = [
  { k: 'name', label: 'Supplier name', ph: 'e.g. DNP Thailand', wide: true },
  { k: 'contact_person', label: 'Contact person', ph: 'คุณ…' },
  { k: 'phone', label: 'Phone', ph: '08x-xxx-xxxx' },
  { k: 'line_id', label: 'LINE', ph: '@shop or LINE ID' },
  { k: 'email', label: 'Email', ph: 'sales@…' },
  { k: 'website', label: 'Website / shop link', ph: 'https://…', wide: true },
  { k: 'address', label: 'Address', wide: true, area: true },
  { k: 'tax_id', label: 'Tax ID', ph: 'for invoices' },
  { k: 'payment_terms', label: 'Payment terms', ph: 'cash / credit 30' },
  { k: 'notes', label: 'Notes', ph: 'Order cut-off, delivery days…', wide: true, area: true },
]

function SupplierDialog({ supplier, canEdit, linked, onClose }: { supplier: AnfSupplier; canEdit: boolean; linked: number; onClose: () => void }) {
  const isNewSupplier = !supplier.name
  const [tab, setTab] = useState<'items' | 'details'>(isNewSupplier ? 'details' : 'items')
  const [d, setD] = useState<AnfSupplier>(supplier)
  const [error, setError] = useState<string | null>(null)
  const isNew = !supplier.name
  const set = (k: keyof AnfSupplier, v: string) => setD((x) => ({ ...x, [k]: v === '' ? null : v }))
  const valid = !!d.name?.trim() && (!d.website || /^https?:\/\//i.test(d.website))

  function save() {
    if (!valid) { setError(!d.name?.trim() ? 'Enter a supplier name.' : 'Website must start with https://'); return }
    saveSupplier({ ...d, name: d.name.trim() }).then(onClose).catch((e: Error) => setError(e.message))
  }
  function remove() {
    if (!window.confirm(linked ? `Delete “${supplier.name}”? It is linked to ${linked} item(s); those links will be removed.` : `Delete “${supplier.name}”?`)) return
    deleteSupplier(supplier.supplier_id).then(onClose).catch((e: Error) => setError(e.message))
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="text-[15px] font-bold">{isNew ? 'New supplier' : canEdit ? 'Edit supplier' : supplier.name}</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        {!isNew && (
          <div className="flex gap-0 border-b border-border text-[13px] px-3">
            {(['items', 'details'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={cn('px-3 py-2', tab === t ? 'font-semibold shadow-[inset_0_-2px_0_currentColor]' : 'text-muted-foreground')}>{t === 'items' ? `Items ${linked}` : 'Details'}</button>
            ))}
          </div>
        )}
        {tab === 'items' && !isNew ? <SupplierItems supplier={supplier} onDone={onClose} /> : (
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto">
          {FIELDS.map((f) => (
            <div key={f.k} className={f.wide ? 'sm:col-span-2' : ''}>
              <label className="field-label">{f.label}</label>
              {!canEdit ? (
                <p className="text-[13px] min-h-5 whitespace-pre-wrap">{(d[f.k] as string) || <span className="text-muted-foreground">—</span>}</p>
              ) : f.area ? (
                <Textarea value={(d[f.k] as string) ?? ''} placeholder={f.ph} rows={2} onChange={(e) => set(f.k, e.target.value)} className="text-[13px]" />
              ) : (
                <Input value={(d[f.k] as string) ?? ''} placeholder={f.ph} onChange={(e) => set(f.k, e.target.value)} className="h-9" />
              )}
            </div>
          ))}
          <p className="sm:col-span-2 text-[11.5px] text-muted-foreground">Linked to <b className="text-foreground">{linked}</b> item(s). Link items from Catalog → open an item. No passwords or bank logins here.</p>
        </div>
        )}
        {error && <p className="px-5 pb-2 text-[12px] text-destructive">{error}</p>}
        {canEdit && tab === 'details' && (
          <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
            {!isNew && <button onClick={remove} className="text-destructive hover:opacity-80 text-sm mr-auto">Delete</button>}
            <span className={isNew ? 'mr-auto' : ''} />
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={save} disabled={!d.name?.trim()}>Save</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** What this supplier sells, with stock — tick the low ones and request them in one go. */
function SupplierItems({ supplier, onDone }: { supplier: AnfSupplier; onDone: () => void }) {
  const { links } = useSuppliers()
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const anfStock = useCRMStore((s) => s.anfStock)
  const rows = links.filter((l) => l.supplier_id === supplier.supplier_id).map((l) => {
    const p = anfProducts.find((x) => x.product_id === l.product_id)
    const stock = anfStock.filter((r) => r.product_id === l.product_id)
    const qty = stock.reduce((t, r) => t + (r.qty || 0), 0)
    const low = stock.some((r) => r.qty <= 0 || (r.alert_qty != null && r.qty <= r.alert_qty))
    return { l, p, qty, low, asset: kindOf(p) === 'asset' }
  }).filter((x) => x.p).sort((a, b) => Number(b.low) - Number(a.low) || a.p!.name.localeCompare(b.p!.name))
  const [picked, setPicked] = useState<string[]>(() => rows.filter((x) => x.low && !x.asset).map((x) => x.l.product_id))
  const [prefill, setPrefill] = useState<RequestPrefill[] | null>(null)

  return (
    <>
      <div className="overflow-y-auto">
        {rows.length === 0 ? <p className="px-5 py-6 text-[13px] text-muted-foreground">No items linked yet. Open an item in Catalog → Suppliers & price → Link supplier.</p> : (
          <table className="w-full text-[13px]">
            <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border"><th className="w-8" /><th className="px-2 py-2">ITEM</th><th className="px-2 py-2 text-right">PRICE</th><th className="px-2 py-2 text-right">STOCK</th></tr></thead>
            <tbody>
              {rows.map(({ l, p, qty, low, asset }) => {
                const on = picked.includes(l.product_id)
                return (
                  <tr key={l.id} className="border-b border-border">
                    <td className="pl-4"><input type="checkbox" checked={on} onChange={() => setPicked((x) => (on ? x.filter((id) => id !== l.product_id) : [...x, l.product_id]))} className="w-4 h-4 accent-foreground" aria-label={`Request ${p!.name}`} /></td>
                    <td className="px-2 py-2">{l.preferred && <span className="text-amber-500">★ </span>}{p!.name}{p!.code && <span className="block text-[11px] text-muted-foreground">{p!.code}</span>}</td>
                    <td className="px-2 py-2 text-right font-mono">{l.price != null ? baht(l.price) : '—'}</td>
                    <td className={cn('px-2 py-2 text-right font-mono', low && 'text-[#e5401b] font-semibold')}>{asset ? 'asset' : `${qty}${low ? ' · LOW' : ''}`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
        <span className="mr-auto text-[12px] text-muted-foreground">{picked.length ? `${picked.length} selected` : 'Low items are pre-selected'}</span>
        <Button size="sm" disabled={!picked.length} onClick={() => setPrefill(rows.filter((x) => picked.includes(x.l.product_id)).map((x) => ({
          item: x.p!.name, product_id: x.p!.product_id, description: x.p!.code, unit_price: x.l.price ?? undefined, supplier_id: supplier.supplier_id,
        })))}>Request {picked.length || ''} item{picked.length === 1 ? '' : 's'} →</Button>
      </div>
      {prefill && <RequestDialog request={null} prefill={prefill} onClose={() => { setPrefill(null); onDone() }} onCreatePO={() => { setPrefill(null); onDone() }} />}
    </>
  )
}
