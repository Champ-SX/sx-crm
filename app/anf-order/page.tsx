'use client'

import { useMemo, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { VAT_RATE, type AnfOrder, type AnfOrderStatus, type AnfRemindOption } from '@/types'
import { Plus, Trash2, Bell, Package, ChevronDown, Check } from 'lucide-react'

const STATUS: { key: AnfOrderStatus; label: string; dot: string }[] = [
  { key: 'to_order', label: 'To order', dot: 'bg-[#FF5B3F]' },
  { key: 'ordered',  label: 'Ordered',  dot: 'bg-[#D7FE3A] ring-1 ring-black/15' },
  { key: 'received', label: 'Received', dot: 'bg-[#3f9d5b]' },
]
const statusMeta = (k: AnfOrderStatus) => STATUS.find((s) => s.key === k) ?? STATUS[0]

// Preset branches; the picker also absorbs any branch already used, and you can
// add a new one inline. Each branch gets a stable colour.
const SEED_BRANCHES = ['BACC', 'BTT', 'TRUE ALPHA', 'Cloud 11']
const BRANCH_COLORS: Record<string, string> = {
  'BACC': '#3F6EA5', 'BTT': '#2E8A9A', 'TRUE ALPHA': '#5A7D3F', 'Cloud 11': '#C9772E',
}
const BRANCH_PALETTE = ['#3F6EA5', '#2E8A9A', '#5A7D3F', '#C9772E', '#7A5AA5', '#B8543F', '#9A6B2E', '#3F9D5B']
function branchColor(name?: string | null): string {
  if (!name) return '#9a968d'
  if (BRANCH_COLORS[name]) return BRANCH_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return BRANCH_PALETTE[h % BRANCH_PALETTE.length]
}

const REMIND: { key: AnfRemindOption; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: '1d', label: '1 day' },
  { key: '1w', label: '1 week' },
  { key: '1m', label: '1 month' },
  { key: 'custom', label: 'Custom date' },
]

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`
const lineTotal = (o: Pick<AnfOrder, 'quantity' | 'unit_price' | 'with_vat'>) =>
  o.quantity * o.unit_price * (o.with_vat ? 1 + VAT_RATE : 1)
const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return iso }
}
function computeRemindAt(neededBy: string | null, option: AnfRemindOption, customDate: string): string | null {
  if (option === 'none') return null
  if (option === 'custom') return customDate ? new Date(customDate).toISOString() : null
  if (!neededBy) return null
  const d = new Date(neededBy + 'T09:00:00')
  if (option === '1d') d.setDate(d.getDate() - 1)
  if (option === '1w') d.setDate(d.getDate() - 7)
  if (option === '1m') d.setMonth(d.getMonth() - 1)
  return d.toISOString()
}

export default function AnfOrderPage() {
  const isHydrated = useHydrated()
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const [statusFilter, setStatusFilter] = useState<AnfOrderStatus | 'all'>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [editing, setEditing] = useState<AnfOrder | null>(null)
  const [creating, setCreating] = useState(false)

  const orders = useMemo(
    () => anfOrders.filter((o) => !activeBoardId || o.board_id === activeBoardId || !o.board_id),
    [anfOrders, activeBoardId],
  )
  const branches = useMemo(
    () => [...new Set(orders.map((o) => o.branch).filter(Boolean))] as string[],
    [orders],
  )
  const filtered = orders.filter(
    (o) => (statusFilter === 'all' || o.status === statusFilter) && (branchFilter === 'all' || o.branch === branchFilter),
  )
  const groups = useMemo(() => {
    const m = new Map<string, AnfOrder[]>()
    for (const o of filtered) {
      const b = o.branch || 'No branch'
      if (!m.has(b)) m.set(b, [])
      m.get(b)!.push(o)
    }
    return [...m.entries()]
  }, [filtered])

  const openCount = orders.filter((o) => o.status !== 'received').length
  const toOrderValue = orders.filter((o) => o.status === 'to_order').reduce((s, o) => s + lineTotal(o), 0)

  if (!isHydrated) return null

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex items-center gap-3">
        <MobileMenuButton />
        <span className="w-3.5 h-3.5 rounded-[5px] shrink-0" style={{ backgroundColor: '#7A5AA5' }} />
        <div>
          <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">ANF Order</h1>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">{openCount} open · {baht(toOrderValue)} to order</p>
        </div>
        <Button size="sm" className="ml-auto h-9 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" /> New order
        </Button>
      </div>

      {/* Filters */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2 border-b border-border/60">
        <FilterChip label="All" on={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
        {STATUS.map((s) => (
          <FilterChip key={s.key} label={s.label} dot={s.dot} on={statusFilter === s.key} onClick={() => setStatusFilter(s.key)} />
        ))}
        {branches.length > 0 && <span className="w-px h-5 bg-border mx-1" />}
        <FilterChip label="All branches" on={branchFilter === 'all'} onClick={() => setBranchFilter('all')} />
        {branches.map((b) => (
          <FilterChip key={b} label={b} color={branchColor(b)} on={branchFilter === b} onClick={() => setBranchFilter(b)} />
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No orders yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">Add stock or consumables that need ordering.</p>
            <Button size="sm" className="mt-4 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> New order
            </Button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block border border-border rounded-xl overflow-hidden bg-card">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: '150px' }} /><col style={{ width: '40%' }} /><col style={{ width: '64px' }} />
                  <col /><col /><col /><col />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    {['Status', 'Item', 'Qty', 'Unit price', 'Total', 'Needed by', 'Assignee'].map((h, i) => (
                      <th key={h} className={`font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-4 py-3 whitespace-nowrap ${i >= 2 && i <= 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map(([branch, rows]) => (
                    <DesktopBranch key={branch} branch={branch} rows={rows} onOpen={setEditing} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list — Status · Item · Qty */}
            <div className="md:hidden space-y-4">
              {groups.map(([branch, rows]) => (
                <div key={branch} className="border border-border rounded-xl overflow-hidden bg-card">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                    <span className="font-mono text-[11px] uppercase tracking-wider font-bold" style={{ color: branchColor(branch) }}>{branch}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">— {rows.length}</span>
                  </div>
                  {rows.map((o) => (
                    <button key={o.order_id} onClick={() => setEditing(o)} className="w-full grid grid-cols-[auto_1fr_auto] gap-3 items-center px-3 py-3 border-b border-border/50 last:border-0 text-left active:bg-muted/40">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusMeta(o.status).dot}`} />
                      <span className="min-w-0">
                        <span className="block font-medium text-[13.5px] leading-tight truncate">{o.item}</span>
                        <span className="font-mono text-[10.5px] mt-0.5 block">
                          <span className="font-semibold" style={{ color: branchColor(o.branch) }}>{o.branch || '—'}</span><span className="text-muted-foreground"> · {baht(lineTotal(o))}</span>
                        </span>
                      </span>
                      <span className="font-mono text-[13px] font-bold tabular-nums text-right">{o.quantity}<span className="block font-normal text-[9px] tracking-widest text-muted-foreground">QTY</span></span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {(creating || editing) && (
        <OrderDialog order={editing} onClose={() => { setCreating(false); setEditing(null) }} />
      )}
    </div>
  )
}

function FilterChip({ label, on, onClick, dot, color }: { label: string; on: boolean; onClick: () => void; dot?: string; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={color && !on ? { color } : undefined}
      className={`inline-flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1 border transition-colors ${on ? 'bg-foreground text-background border-transparent font-medium' : color ? 'border-border bg-card font-semibold hover:bg-muted' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
    >
      {dot && <span className={`w-2 h-2 rounded-full ${dot}`} />}
      {label}
    </button>
  )
}

// Inline status dropdown — change status from the board without opening the editor.
function StatusInline({ order }: { order: AnfOrder }) {
  const updateAnfOrder = useCRMStore((s) => s.updateAnfOrder)
  const st = statusMeta(order.status)
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Change status"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 pl-2 pr-2 py-1 hover:bg-muted transition-colors"
        >
          <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wide whitespace-nowrap">
            <span className={`w-2 h-2 rounded-full ${st.dot}`} />{st.label}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          {STATUS.map((s) => (
            <DropdownMenuItem key={s.key} onClick={() => { if (s.key !== order.status) void updateAnfOrder(order.order_id, { status: s.key }) }} className="text-xs gap-2 cursor-pointer font-mono uppercase tracking-wide">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
              {s.key === order.status && <Check className="w-3.5 h-3.5 ml-auto text-muted-foreground" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  )
}

function DesktopBranch({ branch, rows, onOpen }: { branch: string; rows: AnfOrder[]; onOpen: (o: AnfOrder) => void }) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const nameFor = (id: string | null) => teamMembers.find((m) => m.id === id)?.name ?? null
  const today = new Date()
  const color = branchColor(branch)
  return (
    <>
      <tr>
        <td colSpan={7} className="bg-muted/50 px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold" style={{ color }}>{branch}</span>
          <span className="font-mono text-[10px] text-muted-foreground ml-2">— {rows.length} item{rows.length > 1 ? 's' : ''}</span>
        </td>
      </tr>
      {rows.map((o) => {
        const assignee = nameFor(o.assignee_id)
        const dueSoon = o.needed_by && o.status !== 'received' && new Date(o.needed_by + 'T00:00:00').getTime() - today.getTime() < 3 * 864e5
        return (
          <tr key={o.order_id} className="border-b border-border/50 last:border-0 hover:bg-muted/40 cursor-pointer" onClick={() => onOpen(o)}>
            <td className="px-4 py-3"><StatusInline order={o} /></td>
            <td className="px-4 py-3 font-medium truncate">{o.item}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums">{o.quantity}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">{baht(o.unit_price)}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">{baht(lineTotal(o))}{o.with_vat && <span className="ml-1.5 font-mono text-[9px] tracking-wide bg-[#7A5AA5]/15 text-[#7A5AA5] px-1.5 py-0.5 rounded">+VAT</span>}</td>
            <td className={`px-4 py-3 font-mono text-[12px] whitespace-nowrap ${dueSoon ? 'text-[#FF5B3F] font-bold' : 'text-muted-foreground'}`}>{fmtDate(o.needed_by)}{o.remind_at && <Bell className="inline w-3 h-3 ml-1.5 text-[#7A5AA5]" />}</td>
            <td className="px-4 py-3">{assignee ? <span className="inline-flex items-center gap-2 whitespace-nowrap"><UserAvatar name={assignee} size={22} /><span className="text-[12px]">{assignee}</span></span> : <span className="text-muted-foreground/60 text-[12px]">—</span>}</td>
          </tr>
        )
      })}
    </>
  )
}

function OrderDialog({ order, onClose }: { order: AnfOrder | null; onClose: () => void }) {
  const { anfOrders, teamMembers, activeBoardId, addAnfOrder, updateAnfOrder, deleteAnfOrder } = useCRMStore()
  const isEdit = !!order

  const [item, setItem] = useState(order?.item ?? '')
  const [showSug, setShowSug] = useState(false)
  const [quantity, setQuantity] = useState(String(order?.quantity ?? 1))
  const [unitPrice, setUnitPrice] = useState(String(order?.unit_price ?? ''))
  const [withVat, setWithVat] = useState(order?.with_vat ?? false)
  const [branch, setBranch] = useState(order?.branch ?? '')
  const [addingBranch, setAddingBranch] = useState(false)
  const [orderedAt, setOrderedAt] = useState(order?.ordered_at ?? new Date().toISOString().slice(0, 10))
  const [neededBy, setNeededBy] = useState(order?.needed_by ?? '')
  const [remindOption, setRemindOption] = useState<AnfRemindOption>(order?.remind_option ?? 'none')
  const [customDate, setCustomDate] = useState(order?.remind_option === 'custom' ? (order?.remind_at ?? '').slice(0, 10) : '')
  const [requestedBy, setRequestedBy] = useState(order?.requested_by ?? '')
  const [assigneeId, setAssigneeId] = useState(order?.assignee_id ?? '')
  const [status, setStatus] = useState<AnfOrderStatus>(order?.status ?? 'to_order')
  const [notes, setNotes] = useState(order?.notes ?? '')

  const qtyN = parseInt(quantity, 10) || 0
  const priceN = parseFloat(unitPrice) || 0
  const total = qtyN * priceN * (withVat ? 1 + VAT_RATE : 1)

  const branchOptions = useMemo(
    () => [...new Set([...SEED_BRANCHES, ...anfOrders.map((o) => o.branch).filter(Boolean) as string[], ...(order?.branch ? [order.branch] : [])])],
    [anfOrders, order],
  )

  const suggestions = useMemo(() => {
    const q = item.trim().toLowerCase()
    const seen = new Map<string, number>()
    for (const o of anfOrders) {
      if (!o.item || seen.has(o.item)) continue
      seen.set(o.item, o.unit_price)
    }
    return [...seen.entries()].filter(([name]) => q && name.toLowerCase().includes(q) && name.toLowerCase() !== q).slice(0, 5)
  }, [anfOrders, item])

  function save() {
    if (!item.trim()) return
    const remind_at = computeRemindAt(neededBy || null, remindOption, customDate)
    const base = {
      item: item.trim(), quantity: qtyN, unit_price: priceN, with_vat: withVat,
      branch: branch.trim() || null, ordered_at: orderedAt || null, needed_by: neededBy || null,
      remind_option: remindOption, remind_at, requested_by: requestedBy.trim() || null,
      assignee_id: assigneeId || null, status, notes: notes.trim() || null,
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
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: '#7A5AA5' }} />
          <DialogTitle className="text-[15px] font-bold">{isEdit ? 'Edit order' : 'New order'}</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto grid grid-cols-2 gap-3.5">
          {/* Item + autocomplete */}
          <div className="col-span-2 relative">
            <label className="field-label">Item</label>
            <Input value={item} onChange={(e) => { setItem(e.target.value); setShowSug(true) }} onFocus={() => setShowSug(true)} onBlur={() => setTimeout(() => setShowSug(false), 150)} placeholder="e.g. กระดาษปริ้นท์ RX1 4×6" className="h-9" />
            {showSug && suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-md overflow-hidden">
                {suggestions.map(([name, price]) => (
                  <button key={name} type="button" onMouseDown={(e) => { e.preventDefault(); setItem(name); if (!unitPrice) setUnitPrice(String(price)); setShowSug(false) }} className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                    <span className="font-medium truncate">{name}</span>
                    <span className="font-mono text-[11px] text-muted-foreground shrink-0">last {baht(price)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div><label className="field-label">Qty</label><Input type="number" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9" /></div>
          <div><label className="field-label">Unit price (฿)</label><Input type="number" min={0} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" className="h-9" /></div>

          <button type="button" onClick={() => setWithVat((v) => !v)} className="col-span-2 flex items-center gap-2.5 px-3 h-10 rounded-md border border-border bg-muted/40 text-left">
            <span className={`w-[18px] h-[18px] rounded-[5px] flex items-center justify-center text-[11px] ${withVat ? 'bg-[#7A5AA5] text-white' : 'border border-border'}`}>{withVat ? '✓' : ''}</span>
            <span className="text-[13px] font-medium">Include VAT (7%)</span>
            {withVat && <span className="ml-auto font-mono text-[12px] text-muted-foreground">+ {baht(qtyN * priceN * VAT_RATE)}</span>}
          </button>

          {/* Branch dropdown (coloured) */}
          <div>
            <label className="field-label">Branch</label>
            {addingBranch ? (
              <div className="flex items-center gap-1.5">
                <Input autoFocus value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="New branch name" className="h-9" />
                <button type="button" onClick={() => setAddingBranch(false)} className="text-[11px] text-muted-foreground hover:text-foreground shrink-0 px-1">list</button>
              </div>
            ) : (
              <Select value={branch || 'none'} onValueChange={(v) => { if (v === '__add__') { setBranch(''); setAddingBranch(true) } else setBranch(v === 'none' ? '' : (v ?? '')) }}>
                <SelectTrigger className="h-9"><span className="truncate font-semibold" style={branch ? { color: branchColor(branch) } : undefined}>{branch || <span className="font-normal text-muted-foreground">Select branch</span>}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No branch</SelectItem>
                  {branchOptions.map((b) => <SelectItem key={b} value={b}><span className="font-semibold" style={{ color: branchColor(b) }}>{b}</span></SelectItem>)}
                  <SelectItem value="__add__"><span className="inline-flex items-center gap-2 text-[#7A5AA5]"><Plus className="w-3.5 h-3.5" />Add branch…</span></SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          {/* Status (with colour dot) */}
          <div>
            <label className="field-label">Status</label>
            <Select value={status} onValueChange={(v) => v && setStatus(v as AnfOrderStatus)}>
              <SelectTrigger className="h-9"><span className="inline-flex items-center gap-2 truncate"><span className={`w-2 h-2 rounded-full ${statusMeta(status).dot}`} />{statusMeta(status).label}</span></SelectTrigger>
              <SelectContent>{STATUS.map((s) => <SelectItem key={s.key} value={s.key}><span className="inline-flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><label className="field-label">Ordered</label><Input type="date" value={orderedAt} onChange={(e) => setOrderedAt(e.target.value)} className="h-9" /></div>
          <div><label className="field-label">Needed by</label><Input type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className="h-9" /></div>

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
          <div>
            <label className="field-label">Requested by</label>
            <Select value={requestedBy || 'none'} onValueChange={(v) => setRequestedBy(v === 'none' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-9"><span className="inline-flex items-center gap-2 truncate">{requestedBy ? <><UserAvatar name={requestedBy} size={18} />{requestedBy}</> : 'Select user'}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {teamMembers.map((m) => <SelectItem key={m.id} value={m.name || m.email}><span className="inline-flex items-center gap-2"><UserAvatar name={m.name || m.email} size={18} />{m.name || m.email}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Assignee */}
          <div>
            <label className="field-label">Assignee</label>
            <Select value={assigneeId || 'none'} onValueChange={(v) => setAssigneeId(v === 'none' ? '' : (v ?? ''))}>
              <SelectTrigger className="h-9"><span className="inline-flex items-center gap-2 truncate">{teamMembers.find((m) => m.id === assigneeId)?.name ?? 'Unassigned'}</span></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {teamMembers.map((m) => <SelectItem key={m.id} value={m.id}><span className="inline-flex items-center gap-2"><UserAvatar name={m.name || m.email} size={18} />{m.name || m.email}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2"><label className="field-label">Notes</label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm resize-none" /></div>

          <div className="col-span-2 flex items-baseline justify-between pt-3 border-t border-border/60">
            <span className="field-label mb-0">Total{withVat ? ' (incl. VAT)' : ''}</span>
            <span className="font-mono text-lg font-bold tabular-nums">{baht(total)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          {isEdit && <button onClick={remove} className="text-destructive hover:opacity-80 text-sm inline-flex items-center gap-1.5 mr-auto"><Trash2 className="w-4 h-4" /> Delete</button>}
          <Button variant="ghost" size="sm" className={isEdit ? '' : 'ml-auto'} onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={save} disabled={!item.trim()}>{isEdit ? 'Save' : 'Add order'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
