'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Plus, Search } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ProductDialog } from '@/components/anf/product-dialog'
import { ProductSuppliers } from '@/components/anf/product-suppliers'
import { RequestDialog, CreatePODialog, type RequestPrefill } from '@/components/anf/purchasing-ui'
import { SuppliersView } from '@/components/anf/suppliers-view'
import { cn } from '@/lib/utils'
import { ANF_ACCENT, baht, categoryMeta, fmtDate, kindOf, branchColor } from '@/lib/anf'
import { useSuppliers } from '@/lib/supabase/suppliers'
import { useAssets } from '@/lib/supabase/assets'
import { usePurchasing } from '@/lib/supabase/purchasing'
import type { AnfOrder, AnfProduct, AnfStock } from '@/types'

type Filter = 'all' | 'low' | 'nosup' | 'asset' | `cat:${string}`

const isLow = (r: AnfStock) => r.qty <= 0 || (r.alert_qty != null && r.qty <= r.alert_qty)

/** Order board → Catalog: every item (with who sells it, price and stock) and every supplier, search first. */
export default function CatalogPage() {
  const isHydrated = useHydrated()
  const [tab, setTab] = useState<'items' | 'suppliers'>(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'suppliers' ? 'suppliers' : 'items'))
  if (!isHydrated) return null
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex flex-wrap items-center gap-3">
        <MobileMenuButton />
        <span className="w-3.5 h-3.5 rounded-[5px] shrink-0 flex items-center justify-center" style={{ backgroundColor: ANF_ACCENT }}><BookOpen className="w-2.5 h-2.5 text-white" /></span>
        <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">Catalog</h1>
        <div className="flex rounded-lg border border-border p-0.5 ml-2">
          {(['items', 'suppliers'] as const).map((t) => (
            <button key={t} type="button" onClick={() => { setTab(t); window.history.replaceState(null, '', t === 'suppliers' ? '?tab=suppliers' : window.location.pathname) }}
              className={cn('h-7 px-3 rounded-md text-[13px] capitalize', tab === t ? 'bg-foreground text-background font-semibold' : 'text-muted-foreground hover:text-foreground')}>{t}</button>
          ))}
        </div>
      </div>
      {tab === 'items' ? <ItemsView /> : <SuppliersView />}
    </div>
  )
}

function ItemsView() {
  const { role } = useAuth()
  const isAdmin = role === 'admin'
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const anfStock = useCRMStore((s) => s.anfStock)
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const addAnfProduct = useCRMStore((s) => s.addAnfProduct)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const { suppliers, links } = useSuppliers()
  const { assets } = useAssets()
  usePurchasing()   // seeds / loads purchase history used for "last paid"
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<AnfProduct | null>(null)
  const [editing, setEditing] = useState<AnfProduct | null>(null)
  const [prefill, setPrefill] = useState<RequestPrefill | null>(null)
  const [poItems, setPoItems] = useState<AnfOrder[] | null>(null)

  const rows = useMemo(() => anfProducts.filter((p) => !activeBoardId || !p.board_id || p.board_id === activeBoardId).map((p) => {
    const ls = links.filter((l) => l.product_id === p.product_id)
    const pref = ls.find((l) => l.preferred) ?? ls[0] ?? null
    const stock = anfStock.filter((r) => r.product_id === p.product_id)
    const asset = kindOf(p) === 'asset'
    const last = anfOrders.filter((o) => o.product_id === p.product_id && o.status === 'received' && o.unit_price > 0)
      .sort((a, b) => (b.received_at ?? '').localeCompare(a.received_at ?? ''))[0] ?? null
    return {
      p, ls, pref, asset, last,
      supplier: pref ? suppliers.find((s) => s.supplier_id === pref.supplier_id) ?? null : null,
      qty: asset ? assets.filter((a) => a.product_id === p.product_id && a.location_kind !== 'retired').length : stock.reduce((t, r) => t + (r.qty || 0), 0),
      low: !asset && stock.some(isLow),
    }
  }).sort((a, b) => a.p.name.localeCompare(b.p.name)), [anfProducts, activeBoardId, links, anfStock, anfOrders, suppliers, assets])

  const needle = q.trim().toLowerCase()
  const shown = rows.filter((r) => {
    if (filter === 'low' && !r.low) return false
    if (filter === 'nosup' && r.ls.length) return false
    if (filter === 'asset' && !r.asset) return false
    if (filter.startsWith('cat:') && (r.asset || (r.p.category || 'other') !== filter.slice(4))) return false
    if (!needle) return true
    const sups = r.ls.map((l) => suppliers.find((s) => s.supplier_id === l.supplier_id)?.name)
    return [r.p.name, r.p.code, ...(r.p.aliases ?? []), ...sups].some((v) => (v ?? '').toLowerCase().includes(needle))
  })
  const cats = [...new Set(rows.filter((r) => !r.asset).map((r) => r.p.category || 'other'))]
  const count = (f: Filter) => rows.filter((r) => (f === 'low' ? r.low : f === 'nosup' ? !r.ls.length : f === 'asset' ? r.asset : f.startsWith('cat:') ? !r.asset && (r.p.category || 'other') === f.slice(4) : true)).length

  function reorder(r: typeof rows[number]) {
    setPrefill({ item: r.p.name, product_id: r.p.product_id, description: r.p.code, unit_price: r.pref?.price ?? r.last?.unit_price ?? undefined, supplier_id: r.pref?.supplier_id ?? null })
  }
  async function createFromSearch() {
    const name = q.trim()
    if (!name) return
    const p: AnfProduct = { product_id: crypto.randomUUID(), board_id: activeBoardId || 'anf-order', name, code: null, category: 'other', unit: null, kind: 'supply' }
    await addAnfProduct(p)
    setEditing(p)
  }
  const chip = (f: Filter, label: string) => {
    const n = count(f)
    if (f !== 'all' && !n) return null
    return (
      <button key={f} type="button" onClick={() => setFilter(f)}
        className={cn('h-7 rounded-full border px-2.5 text-[12px]', filter === f ? 'border-foreground bg-foreground text-background font-semibold' : 'border-border text-muted-foreground hover:text-foreground', f === 'low' && filter !== f && 'text-[#e5401b]')}>
        {label}<span className="ml-1 opacity-70">{n}</span>
      </button>
    )
  }

  return (
    <>
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-2 border-b border-border/60">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, code, other name or supplier…"
              className="h-10 w-full rounded-lg border-2 border-border bg-background pl-9 pr-3 text-[14px] outline-none focus:border-foreground/60" />
          </div>
          {isAdmin && <Button size="sm" className="h-10 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => void (q.trim() ? createFromSearch() : setEditing({ product_id: crypto.randomUUID(), board_id: activeBoardId || 'anf-order', name: '', code: null, category: 'other', unit: null, kind: 'supply' }))}><Plus className="w-4 h-4" />New item</Button>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chip('all', 'All')}
          {cats.map((c) => chip(`cat:${c}`, categoryMeta(c).en || categoryMeta(c).th))}
          {chip('asset', 'Assets')}{chip('low', 'Low stock')}{chip('nosup', 'No supplier')}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {shown.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">{needle ? `Nothing matches “${q.trim()}”` : 'No items here'}</p>
            {needle && isAdmin && <Button size="sm" variant="outline" className="mt-3" onClick={() => void createFromSearch()}>＋ Create “{q.trim()}” as a new item</Button>}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
              <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border">
                <th className="px-4 py-2">ITEM</th><th className="px-2 py-2">★ SUPPLIER</th><th className="px-2 py-2 text-right">PRICE</th><th className="px-2 py-2 text-right">LAST PAID</th><th className="px-2 py-2 text-right">STOCK</th><th className="w-24" />
              </tr></thead>
              <tbody>
                {shown.map((r) => {
                  const cm = categoryMeta(r.p.category || 'other')
                  return (
                    <tr key={r.p.product_id} onClick={() => setOpen(r.p)} className="border-b border-border last:border-b-0 hover:bg-muted/40 cursor-pointer">
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2.5 h-8 rounded-[3px] shrink-0" style={{ backgroundColor: cm.color }} />
                          <span className="min-w-0">
                            <b className="block truncate">{r.p.name}</b>
                            <span className="block font-mono text-[11px] text-muted-foreground truncate">{[r.p.code, r.p.unit, r.asset ? 'ASSET' : null].filter(Boolean).join(' · ') || '—'}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-2 py-2.5">{r.supplier ? <>{r.pref?.preferred && <span className="text-amber-500">★ </span>}{r.supplier.name}{r.ls.length > 1 && <span className="block text-[11px] text-muted-foreground">+{r.ls.length - 1} more</span>}</> : <span className="text-amber-700 dark:text-amber-400">— no supplier</span>}</td>
                      <td className="px-2 py-2.5 text-right font-mono">{r.pref?.price != null ? baht(r.pref.price) : '—'}</td>
                      <td className="px-2 py-2.5 text-right font-mono">{r.last ? <>{baht(r.last.unit_price)}<span className="block text-[11px] text-muted-foreground">{r.last.received_at ? fmtDate(r.last.received_at) : ''}</span></> : '—'}</td>
                      <td className={cn('px-2 py-2.5 text-right font-mono', r.low && 'text-[#e5401b] font-semibold')}>{r.asset ? `${r.qty} unit${r.qty === 1 ? '' : 's'}` : `${r.qty}${r.low ? ' · LOW' : ''}`}</td>
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => reorder(r)} className="h-7 rounded-md border border-[#7A5AA5] text-[#7A5AA5] px-2.5 text-[12px] font-medium hover:bg-[#7A5AA5]/10">{r.asset ? 'Request' : 'Reorder'}</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && <ItemDrawer product={anfProducts.find((p) => p.product_id === open.product_id) ?? open} canEdit={isAdmin}
        onEdit={(p) => { setOpen(null); setEditing(p) }} onReorder={() => { const r = rows.find((x) => x.p.product_id === open.product_id); setOpen(null); if (r) reorder(r) }} onClose={() => setOpen(null)} />}
      {editing && <ProductDialog product={anfProducts.find((p) => p.product_id === editing.product_id) ?? editing} onClose={() => setEditing(null)} />}
      {prefill && <RequestDialog request={null} prefill={prefill} onClose={() => setPrefill(null)} onCreatePO={(items) => { setPrefill(null); setPoItems(items) }} />}
      {poItems && <CreatePODialog items={poItems} onClose={() => setPoItems(null)} />}
    </>
  )
}

/** Everything about one item: who sells it at what price, where the stock is, what we paid before. */
function ItemDrawer({ product, canEdit, onEdit, onReorder, onClose }: { product: AnfProduct; canEdit: boolean; onEdit: (p: AnfProduct) => void; onReorder: () => void; onClose: () => void }) {
  const anfStock = useCRMStore((s) => s.anfStock)
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const { suppliers } = useSuppliers()
  const { pos } = usePurchasing()
  const [tab, setTab] = useState<'suppliers' | 'stock' | 'history'>('suppliers')
  const asset = kindOf(product) === 'asset'
  const stock = anfStock.filter((r) => r.product_id === product.product_id).sort((a, b) => (a.branch ?? '').localeCompare(b.branch ?? ''))
  const history = anfOrders.filter((o) => o.product_id === product.product_id && o.status !== 'to_order')
    .sort((a, b) => (b.received_at ?? b.ordered_at ?? '').localeCompare(a.received_at ?? a.ordered_at ?? ''))
  const cm = categoryMeta(product.category || 'other')

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-[640px] max-w-[96vw] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-start gap-3 px-5 py-3 border-b border-border">
          <span className="w-3 h-10 rounded-[4px] shrink-0" style={{ backgroundColor: cm.color }} />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-[16px] font-bold">{product.name}</DialogTitle>
            <p className="font-mono text-[11px] text-muted-foreground">{[product.code, cm.en || cm.th, product.unit, asset ? 'ASSET' : 'SUPPLY'].filter(Boolean).join(' · ')}</p>
            {!!product.aliases?.length && <p className="text-[12px] text-muted-foreground">Also known as: {product.aliases.join(', ')}</p>}
          </div>
          {canEdit && <Button size="sm" variant="outline" className="h-8" onClick={() => onEdit(product)}>Edit</Button>}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none px-1" aria-label="Close">✕</button>
        </div>
        <div className="flex border-b border-border text-[13px] px-3">
          {([['suppliers', 'Suppliers & price'], ['stock', asset ? 'Units' : 'Stock'], ['history', `History ${history.length}`]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={cn('px-3 py-2', tab === k ? 'font-semibold shadow-[inset_0_-2px_0_currentColor]' : 'text-muted-foreground')}>{l}</button>
          ))}
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {tab === 'suppliers' && <ProductSuppliers productId={product.product_id} unit={product.unit} canEdit={canEdit} />}
          {tab === 'stock' && (asset ? (
            <p className="text-[13px] text-muted-foreground">Each unit has its own ID and location. See <a href="/anf-order/stock" className="underline">Stock → Assets</a>.</p>
          ) : stock.length === 0 ? <p className="text-[13px] text-muted-foreground">Not stocked at any branch yet.</p> : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border"><th className="py-2">BRANCH</th><th className="py-2 text-right">QTY</th><th className="py-2 text-right">ALERT AT</th><th className="py-2 pl-3">STATE</th></tr></thead>
              <tbody>{stock.map((r) => (
                <tr key={r.stock_id} className="border-b border-border last:border-b-0">
                  <td className="py-2 font-semibold" style={{ color: branchColor(r.branch ?? '') }}>{r.branch ?? '—'}</td>
                  <td className="py-2 text-right font-mono">{r.qty}</td>
                  <td className="py-2 text-right font-mono text-muted-foreground">{r.alert_qty ?? '—'}</td>
                  <td className={cn('py-2 pl-3', isLow(r) ? 'text-[#e5401b] font-semibold' : 'text-muted-foreground')}>{r.qty <= 0 ? 'OUT' : isLow(r) ? 'LOW' : 'OK'}</td>
                </tr>
              ))}</tbody>
            </table>
          ))}
          {tab === 'history' && (history.length === 0 ? <p className="text-[13px] text-muted-foreground">Never ordered through the Order board yet.</p> : (
            <table className="w-full text-[13px]">
              <tbody>{history.map((o) => (
                <tr key={o.order_id} className="border-b border-border last:border-b-0">
                  <td className="py-2 font-mono text-[12px] text-muted-foreground whitespace-nowrap">{fmtDate((o.received_at ?? o.ordered_at ?? o.created_at).slice(0, 10))}</td>
                  <td className="py-2 px-2">{pos.find((p) => p.po_id === o.po_id)?.number ?? 'order'} · {suppliers.find((s) => s.supplier_id === o.supplier_id)?.name ?? '—'}<span className="block text-[11px] text-muted-foreground">{o.status === 'received' ? `received ${o.received_qty ?? o.quantity}` : 'ordered'}</span></td>
                  <td className="py-2 text-right font-mono whitespace-nowrap">{o.quantity} × {baht(o.unit_price)}</td>
                </tr>
              ))}</tbody>
            </table>
          ))}
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <span className="mr-auto text-[12px] text-muted-foreground">★ preferred fills in on every request</span>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={onReorder}>{asset ? 'Request' : 'Reorder'} →</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
