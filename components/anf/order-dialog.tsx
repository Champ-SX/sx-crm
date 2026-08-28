'use client'

import { useMemo, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { UserAvatar } from '@/components/shared/user-avatar'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { ProductPicker } from '@/components/anf/product-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { VAT_RATE, type AnfOrder, type AnfOrderStatus, type AnfRemindOption } from '@/types'
import { Plus, Trash2, Archive } from 'lucide-react'
import {
  ANF_ACCENT, STATUS, statusMeta, SEED_BRANCHES, branchColor, REMIND, baht, computeRemindAt,
} from '@/lib/anf'

// Prefill when raising an order from a low stock row (the Stock⇄Order loop).
export interface OrderPrefill {
  item?: string
  branch?: string | null
  stock_id?: string | null
  unit_price?: number
  description?: string | null
  product_id?: string | null
}

export function OrderDialog({ order, prefill, onClose }: { order: AnfOrder | null; prefill?: OrderPrefill; onClose: () => void }) {
  const { anfOrders, anfStock, teamMembers, activeBoardId, addAnfOrder, updateAnfOrder, deleteAnfOrder } = useCRMStore()
  const { user } = useAuth()
  const isEdit = !!order

  // Default "Requested by" to the logged-in user (name matched to the roster;
  // falls back to their profile name / email). New orders only — editable.
  const me = teamMembers.find((m) => m.id === user?.id || (!!user?.email && m.email === user.email))
  const myName = me ? (me.name || me.email) : (user?.user_metadata?.full_name || user?.email || '')

  const [productId, setProductId] = useState<string | null>(order?.product_id ?? prefill?.product_id ?? null)
  const [item, setItem] = useState(order?.item ?? prefill?.item ?? '')
  const [description, setDescription] = useState(order?.description ?? prefill?.description ?? '')
  const [quantity, setQuantity] = useState(String(order?.quantity ?? 1))
  const [unitPrice, setUnitPrice] = useState(String(order?.unit_price ?? prefill?.unit_price ?? ''))
  const [withVat, setWithVat] = useState(order?.with_vat ?? false)
  const [branch, setBranch] = useState(order?.branch ?? prefill?.branch ?? '')
  const [addingBranch, setAddingBranch] = useState(false)
  const [orderedAt, setOrderedAt] = useState(order?.ordered_at ?? new Date().toISOString().slice(0, 10))
  const [neededBy, setNeededBy] = useState(order?.needed_by ?? '')
  const [remindOption, setRemindOption] = useState<AnfRemindOption>(order?.remind_option ?? 'none')
  const [customDate, setCustomDate] = useState(order?.remind_option === 'custom' ? (order?.remind_at ?? '').slice(0, 10) : '')
  const [requestedBy, setRequestedBy] = useState(order ? (order.requested_by ?? '') : myName)
  const [assigneeIds, setAssigneeIds] = useState<string[]>(order?.assignee_ids ?? (order?.assignee_id ? [order.assignee_id] : []))
  const [status, setStatus] = useState<AnfOrderStatus>(order?.status ?? 'to_order')
  const [receivedAt, setReceivedAt] = useState(order?.received_at ?? new Date().toISOString().slice(0, 10))
  const [receivedQty, setReceivedQty] = useState(String(order?.received_qty ?? order?.quantity ?? 1))
  const [receivedBy, setReceivedBy] = useState(order?.received_by ?? '')
  const [notes, setNotes] = useState(order?.notes ?? '')

  const qtyN = parseInt(quantity, 10) || 0
  const priceN = parseFloat(unitPrice) || 0
  const total = qtyN * priceN * (withVat ? 1 + VAT_RATE : 1)
  const stockId = order?.stock_id ?? prefill?.stock_id ?? null

  const branchOptions = useMemo(
    () => [...new Set([...SEED_BRANCHES, ...anfOrders.map((o) => o.branch).filter(Boolean) as string[], ...(branch ? [branch] : [])])],
    [anfOrders, branch],
  )

  // Last unit price seen for a product name — prefill on pick.
  function lastPriceFor(name: string): number {
    const o = anfOrders.find((o) => o.item === name && o.unit_price)
    return o?.unit_price ?? 0
  }

  function save() {
    if (!item.trim()) return
    const remind_at = computeRemindAt(neededBy || null, remindOption, customDate)
    const base = {
      product_id: productId, item: item.trim(), description: description.trim() || null, quantity: qtyN, unit_price: priceN, with_vat: withVat,
      branch: branch.trim() || null, ordered_at: orderedAt || null, needed_by: neededBy || null,
      remind_option: remindOption, remind_at, requested_by: requestedBy.trim() || null,
      assignee_ids: assigneeIds, assignee_id: assigneeIds[0] ?? null, status,
      received_at: status === 'received' ? (receivedAt || null) : (order?.received_at ?? null),
      received_qty: status === 'received' ? (parseInt(receivedQty, 10) || qtyN) : (order?.received_qty ?? null),
      received_by: status === 'received' ? (receivedBy.trim() || null) : (order?.received_by ?? null),
      stock_id: stockId,
      notes: notes.trim() || null,
    }
    if (isEdit && order) {
      void updateAnfOrder(order.order_id, { ...base, remind_notified_at: null })
    } else {
      const now = new Date().toISOString()
      void addAnfOrder({
        order_id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `anf-${Date.now()}`,
        board_id: activeBoardId ?? 'anf-order', ...base, remind_notified_at: null, created_at: now, updated_at: now,
      })
    }
    onClose()
  }
  function remove() {
    if (order && window.confirm(`Delete order “${order.item}”?`)) { void deleteAnfOrder(order.order_id); onClose() }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="text-[15px] font-bold">{isEdit ? 'Edit order' : 'New order'}</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto grid grid-cols-2 gap-3.5">
          {/* Product — pick from the catalog (shares the SKU with stock) */}
          <div className="col-span-2 min-w-0">
            <label className="field-label">Product</label>
            <ProductPicker value={productId} boardId={activeBoardId} onSelect={(p) => { setProductId(p.product_id); setItem(p.name); setDescription(p.code ?? ''); const last = lastPriceFor(p.name); if (!unitPrice && last) setUnitPrice(String(last)) }} />
            {productId && description && <div className="mt-1.5 text-[12px] text-muted-foreground truncate">{description}</div>}
          </div>

          <div><label className="field-label">Qty</label><Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" /></div>
          <div><label className="field-label">Unit price (฿)</label><Input type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" className="h-9" /></div>

          <button type="button" onClick={() => setWithVat((v) => !v)} className="col-span-2 flex items-center gap-2.5 px-3 h-10 rounded-md border border-border bg-muted/40 text-left">
            <span className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[11px] ${withVat ? 'bg-[#7A5AA5] text-white' : 'border border-border'}`}>{withVat ? '✓' : ''}</span>
            <span className="text-[13px] font-medium">Include VAT (7%)</span>
            {withVat && <span className="ml-auto font-mono text-[12px] text-muted-foreground">+ {baht(qtyN * priceN * VAT_RATE)}</span>}
          </button>

          {/* Branch dropdown (coloured) */}
          <div className="min-w-0">
            <label className="field-label">Branch</label>
            {addingBranch ? (
              <div className="flex items-center gap-1.5">
                <Input autoFocus value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="New branch name" className="h-9" />
                <button type="button" onClick={() => setAddingBranch(false)} className="text-[11px] text-muted-foreground hover:text-foreground shrink-0 px-1">list</button>
              </div>
            ) : (
              <Select value={branch || 'none'} onValueChange={(v) => { if (v === '__add__') { setBranch(''); setAddingBranch(true) } else setBranch(v === 'none' ? '' : (v ?? '')) }}>
                <SelectTrigger className="h-9 w-full"><span className="flex-1 min-w-0 truncate text-left font-semibold" style={branch ? { color: branchColor(branch) } : undefined}>{branch || <span className="font-normal text-muted-foreground">Select branch</span>}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No branch</SelectItem>
                  {branchOptions.map((b) => <SelectItem key={b} value={b}><span className="font-semibold" style={{ color: branchColor(b) }}>{b}</span></SelectItem>)}
                  <SelectItem value="__add__"><span className="inline-flex items-center gap-2 text-[#7A5AA5]"><Plus className="w-3.5 h-3.5" />Add branch…</span></SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Status (with colour dot) */}
          <div className="min-w-0">
            <label className="field-label">Status</label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as AnfOrderStatus)}>
              <SelectTrigger className="h-9 w-full"><span className="flex-1 min-w-0 flex items-center gap-2"><span className={`w-2 h-2 rounded-full shrink-0 ${statusMeta(status).dot}`} /><span className="truncate">{statusMeta(status).label}</span></span></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s.key} value={s.key}><span className="inline-flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><label className="field-label">Ordered</label><Input type="date" value={orderedAt} onChange={(e) => setOrderedAt(e.target.value)} className="h-9" /></div>
          <div><label className="field-label">Needed by</label><Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="h-9" /></div>

          {/* Received — appears once status is Received; tops up the linked stock */}
          {status === 'received' && (
            <div className="col-span-2 grid grid-cols-2 gap-3.5 rounded-lg border border-[#3f9d5b]/40 bg-[#3f9d5b]/[0.06] p-3">
              <div className="col-span-2 field-label mb-0 text-[#3f9d5b]">Received {stockId ? '— tops up linked stock' : ''}</div>
              <div><label className="field-label">Received date</label><Input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className="h-9" /></div>
              <div><label className="field-label">Qty delivered</label><Input type="number" min={0} value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} className="h-9" /></div>
              <div className="col-span-2"><label className="field-label">Received by — who took delivery</label><Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="name" className="h-9" /></div>
            </div>
          )}

          <div className="col-span-2">
            <label className="field-label">Remind — before needed by (notifies assignee + requester)</label>
            <div className="flex flex-wrap gap-1.5">
              {REMIND.map((r) => (
                <button key={r.key} type="button" onClick={() => setRemindOption(r.key)} className={`text-[12px] rounded-lg px-2.5 py-1.5 border transition-colors ${remindOption === r.key ? 'bg-[#7A5AA5] text-white border-transparent font-medium' : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}`}>{r.label}</button>
              ))}
            </div>
            {remindOption === 'custom' && <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="h-9 mt-2" />}
          </div>

          {/* Requested by — real user */}
          <div className="min-w-0">
            <label className="field-label">Requested by</label>
            <Select value={requestedBy || 'none'} onValueChange={(v) => setRequestedBy(v === 'none' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-9 w-full"><span className="flex-1 min-w-0 flex items-center gap-2">{requestedBy ? <><UserAvatar name={requestedBy} size={18} /><span className="truncate">{requestedBy}</span></> : <span className="text-muted-foreground">Select user</span>}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {teamMembers.map((m) => <SelectItem key={m.id} value={m.name || m.email}><span className="inline-flex items-center gap-2"><UserAvatar name={m.name || m.email} size={18} />{m.name || m.email}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Assignees — multi-select; all get notified */}
          <div className="min-w-0">
            <label className="field-label">Assignees</label>
            <div className="min-h-9 flex items-center"><AssigneePicker value={assigneeIds} onChange={setAssigneeIds} size={22} /></div>
          </div>

          <div className="col-span-2"><label className="field-label">Notes</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm resize-none" /></div>

          <div className="col-span-2 flex items-baseline justify-between pt-3 border-t border-border/60">
            <span className="field-label mb-0">Total{withVat ? ' (incl. VAT)' : ''}</span>
            <span className="font-mono text-lg font-bold tabular-nums">{baht(total)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          {isEdit && <button onClick={remove} className="text-destructive hover:opacity-80 text-sm inline-flex items-center gap-1.5 mr-auto"><Trash2 className="w-4 h-4" /> Delete</button>}
          {isEdit && order && (order.archived_at
            ? <button onClick={() => { void updateAnfOrder(order.order_id, { archived_at: null }); onClose() }} className="text-[#7A5AA5] hover:opacity-80 text-sm inline-flex items-center gap-1.5"><Archive className="w-4 h-4" /> Restore</button>
            : <button onClick={() => { void updateAnfOrder(order.order_id, { archived_at: new Date().toISOString() }); onClose() }} className="text-muted-foreground hover:text-foreground text-sm inline-flex items-center gap-1.5"><Archive className="w-4 h-4" /> Archive</button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={save} disabled={!item.trim()}>{isEdit ? 'Save' : 'Add order'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
