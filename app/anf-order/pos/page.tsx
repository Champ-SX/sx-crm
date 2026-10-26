'use client'

import { useState } from 'react'
import { FileText, Check } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { OrderDialog } from '@/components/anf/order-dialog'
import { ProjectChip, useMe } from '@/components/anf/purchasing-ui'
import { cn } from '@/lib/utils'
import { ANF_ACCENT, baht, fmtDate } from '@/lib/anf'
import { usePurchasing, savePO, requestStatus, REQ_STATUS, itemTotal } from '@/lib/supabase/purchasing'
import { useSuppliers, telHref, lineHref } from '@/lib/supabase/suppliers'
import type { AnfOrder, AnfPO } from '@/types'

const PO_STATUS = { draft: { label: 'Draft', cls: 'bg-muted text-muted-foreground' }, cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground line-through' } }

export default function POsPage() {
  const isHydrated = useHydrated()
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const { pos } = usePurchasing()
  const { suppliers } = useSuppliers()
  const [open, setOpen] = useState<AnfPO | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)
  if (!isHydrated) return null

  const list = pos.filter((p) => (!activeBoardId || !p.board_id || p.board_id === activeBoardId) && (showCancelled || p.status !== 'cancelled'))
  const itemsOf = (id: string) => anfOrders.filter((o) => o.po_id === id)

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex flex-wrap items-center gap-3">
        <MobileMenuButton />
        <span className="w-3.5 h-3.5 rounded-[5px] shrink-0 flex items-center justify-center" style={{ backgroundColor: ANF_ACCENT }}><FileText className="w-2.5 h-2.5 text-white" /></span>
        <div>
          <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">POs</h1>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">grouped by supplier · made from requests</p>
        </div>
        <label className="ml-auto flex items-center gap-1.5 text-[12px] text-muted-foreground"><input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-foreground" />Show cancelled</label>
      </div>
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {list.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No POs yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">In Requests, tick requests (or open one) → Create PO.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden md:grid grid-cols-[130px_1.3fr_1.4fr_110px_120px_130px] gap-3 px-4 py-2 border-b border-border font-mono text-[10px] tracking-wide text-muted-foreground">
              <span>PO</span><span>SUPPLIER</span><span>FROM REQUESTS</span><span className="text-right">TOTAL</span><span>FLOWACCOUNT</span><span>STATUS</span>
            </div>
            {list.map((p) => {
              const items = itemsOf(p.po_id)
              const st = requestStatus(items)
              const total = items.reduce((t, o) => t + itemTotal(o), 0)
              const sup = suppliers.find((s) => s.supplier_id === p.supplier_id)
              return (
                <button key={p.po_id} type="button" onClick={() => setOpen(p)}
                  className="w-full text-left grid grid-cols-1 md:grid-cols-[130px_1.3fr_1.4fr_110px_120px_130px] gap-x-3 gap-y-1 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/40">
                  <span className="font-mono text-[13px] font-semibold">{p.number}</span>
                  <span className="text-[13px]">{sup?.name ?? '—'}<span className="block text-[11px] text-muted-foreground">{items.length} item{items.length === 1 ? '' : 's'} · {fmtDate((p.created_at ?? '').slice(0, 10))}</span></span>
                  <ReqChips items={items} />
                  <span className="md:text-right font-mono text-[13px]">{total ? baht(total) : '—'}</span>
                  <span><span className="rounded px-1.5 py-0.5 text-[11px] font-semibold bg-muted text-muted-foreground">{p.fa_doc_no ? `✓ ${p.fa_doc_no}` : 'Not sent'}</span></span>
                  <span>{p.status === 'ordered'
                    ? <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', REQ_STATUS[st.status === 'to_order' ? 'ordered' : st.status].cls)}>{st.status === 'partial' ? `${st.received}/${st.total} received` : st.status === 'received' ? 'Received' : 'Ordered'}</span>
                    : <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', PO_STATUS[p.status].cls)}>{PO_STATUS[p.status].label}</span>}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      {open && <PODialog po={pos.find((x) => x.po_id === open.po_id) ?? open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function ReqChips({ items }: { items: AnfOrder[] }) {
  const { requests } = usePurchasing()
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const ids = [...new Set(items.map((o) => o.request_id ?? `single:${o.order_id}`))]
  return (
    <span className="flex flex-wrap gap-1 items-start">
      {ids.slice(0, 4).map((id) => {
        const r = requests.find((x) => x.request_id === id) ?? null
        const job = r?.job_id ? wonJobs.find((j) => j.job_id === r.job_id) : null
        return <span key={id} className="inline-flex items-center gap-1"><ProjectChip r={r} job={job} />{r?.project_kind === 'free' && <span className="text-[11px] text-muted-foreground">{r.project_name}</span>}</span>
      })}
      {ids.length > 4 && <span className="text-[11px] text-muted-foreground">+{ids.length - 4}</span>}
    </span>
  )
}

function PODialog({ po, onClose }: { po: AnfPO; onClose: () => void }) {
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const updateAnfOrder = useCRMStore((s) => s.updateAnfOrder)
  const { suppliers } = useSuppliers()
  const me = useMe()
  const [receiving, setReceiving] = useState<AnfOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const items = anfOrders.filter((o) => o.po_id === po.po_id)
  const sup = suppliers.find((s) => s.supplier_id === po.supplier_id)
  const total = items.reduce((t, o) => t + itemTotal(o), 0)
  const today = new Date().toISOString().slice(0, 10)

  async function markOrdered() {
    try {
      await savePO({ ...po, status: 'ordered', ordered_at: new Date().toISOString() })
      for (const o of items) if (o.status === 'to_order') await updateAnfOrder(o.order_id, { status: 'ordered', ordered_at: o.ordered_at ?? today, ordered_by: o.ordered_by ?? me, supplier_id: po.supplier_id ?? o.supplier_id })
    } catch (e) { setError((e as Error).message) }
  }
  async function cancel() {
    if (!window.confirm(`Cancel ${po.number}? Its items go back to their requests as “To order”.`)) return
    try {
      await savePO({ ...po, status: 'cancelled' })
      for (const o of items) if (o.status !== 'received') await updateAnfOrder(o.order_id, { po_id: null, status: 'to_order' })
      onClose()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-[720px] max-w-[96vw] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-start gap-3 px-5 py-3 border-b border-border">
          <div>
            <DialogTitle className="font-mono text-[18px] font-bold" style={{ color: ANF_ACCENT }}>{po.number}</DialogTitle>
            <p className="text-[13px] mt-0.5">{sup?.name ?? 'No supplier'}{sup?.contact_person && <span className="text-muted-foreground"> · {sup.contact_person}</span>}</p>
            <p className="text-[12px] text-muted-foreground flex gap-3">
              {telHref(sup?.phone) && <a href={telHref(sup?.phone)!} className="underline">Call</a>}
              {lineHref(sup?.line_id) && <a href={lineHref(sup?.line_id)!} target="_blank" rel="noreferrer" className="underline">LINE</a>}
              {sup?.tax_id ? <span>Tax ID ✓</span> : <span className="text-orange-700 dark:text-orange-400">no tax ID</span>}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border bg-muted/40">
              <th className="px-4 py-2">ITEM</th><th className="px-2 py-2 text-right">QTY</th><th className="px-2 py-2 text-right">UNIT ฿</th><th className="px-2 py-2 text-right">TOTAL</th><th className="px-2 py-2">RECEIVED</th>
            </tr></thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.order_id} className="border-b border-border">
                  <td className="px-4 py-2"><div className="font-medium">{o.item}</div><div className="text-[11px] text-muted-foreground">{o.description || (o.product_id ? '' : 'manual item')}</div></td>
                  <td className="px-2 py-2 text-right font-mono">{o.quantity}{o.unit ? ` ${o.unit}` : ''}</td>
                  <td className="px-2 py-2 text-right font-mono">{o.unit_price ? o.unit_price.toLocaleString() : '—'}</td>
                  <td className="px-2 py-2 text-right font-mono">{itemTotal(o) ? baht(itemTotal(o)) : '—'}</td>
                  <td className="px-2 py-2">{o.status === 'received'
                    ? <span className="inline-flex items-center gap-1 text-[12px] text-emerald-700 dark:text-emerald-400"><Check className="w-3.5 h-3.5" />{o.received_qty ?? o.quantity}</span>
                    : <button type="button" disabled={po.status !== 'ordered'} onClick={() => setReceiving(o)} className="h-7 rounded-md border border-border px-2 text-[12px] hover:bg-muted disabled:opacity-40" title={po.status !== 'ordered' ? 'Mark the PO ordered first' : ''}>Receive…</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end items-baseline gap-4 px-5 py-3"><span className="text-[13px] text-muted-foreground">Total</span><b className="font-mono text-[18px]">{baht(total)}</b></div>
          <div className="mx-5 mb-4 rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
            <b className="text-foreground">FlowAccount</b> — “Create PO in FlowAccount” comes in phase 2. For now, create the PO in FlowAccount by hand using the lines above, then mark it ordered here.
          </div>
          {error && <p className="px-5 pb-2 text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-border">
          {po.status !== 'cancelled' && items.every((o) => o.status !== 'received') && <button type="button" onClick={cancel} className="text-destructive text-sm mr-auto">Cancel PO</button>}
          <span className="ml-auto" />
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          {po.status === 'draft' && <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={markOrdered} disabled={items.length === 0}>Mark ordered</Button>}
        </div>
        {receiving && <OrderDialog order={receiving} onClose={() => setReceiving(null)} />}
      </DialogContent>
    </Dialog>
  )
}
