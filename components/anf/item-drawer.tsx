'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { ProductSuppliers } from '@/components/anf/product-suppliers'
import { cn } from '@/lib/utils'
import { baht, categoryMeta, fmtDate, kindOf, branchColor } from '@/lib/anf'
import { useSuppliers } from '@/lib/supabase/suppliers'
import { usePurchasing } from '@/lib/supabase/purchasing'
import type { AnfProduct, AnfStock } from '@/types'

const isLow = (r: AnfStock) => r.qty <= 0 || (r.alert_qty != null && r.qty <= r.alert_qty)

/** Everything about one item: who sells it at what price, where the stock is, what we paid before. */
export function ItemDrawer({ product, canEdit, onEdit, onReorder, onClose }: { product: AnfProduct; canEdit: boolean; onEdit: (p: AnfProduct) => void; onReorder: () => void; onClose: () => void }) {
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
          {tab === 'suppliers' && <ProductSuppliers productId={product.product_id} unit={product.unit} canEdit />}
          {tab === 'stock' && (asset ? (
            <p className="text-[13px] text-muted-foreground">Each unit has its own ID and location. See <a href="/inventory/equipment" className="underline">Equipment</a>.</p>
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
          {tab === 'history' && (history.length === 0 ? <p className="text-[13px] text-muted-foreground">Never bought through Purchasing yet.</p> : (
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
