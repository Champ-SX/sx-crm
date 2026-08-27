'use client'

import { useMemo, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { type AnfOrder, type AnfOrderStatus } from '@/types'
import { Plus, Bell, Package, ChevronDown, Check } from 'lucide-react'
import { OrderDialog } from '@/components/anf/order-dialog'
import { AssigneeFilter, matchesAssigneeFilter, ASSIGNEE_FILTER_ALL } from '@/components/shared/assignee-picker'
import { STATUS, statusMeta, branchColor, baht, lineTotal, fmtDate } from '@/lib/anf'

const assigneesOf = (o: AnfOrder): string[] => o.assignee_ids ?? (o.assignee_id ? [o.assignee_id] : [])

export default function AnfOrderPage() {
  const isHydrated = useHydrated()
  const { user } = useAuth()
  const meId = user?.id ?? null
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const updateAnfOrder = useCRMStore((s) => s.updateAnfOrder)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const [statusFilter, setStatusFilter] = useState<AnfOrderStatus | 'all'>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ASSIGNEE_FILTER_ALL)
  const [showArchived, setShowArchived] = useState(false)
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
  const archivedCount = orders.filter((o) => o.archived_at).length
  const clearableCount = orders.filter((o) => o.status === 'received' && !o.archived_at).length
  function clearReceived() {
    const targets = orders.filter((o) => o.status === 'received' && !o.archived_at)
    if (targets.length === 0) return
    if (!window.confirm(`Archive ${targets.length} received order${targets.length > 1 ? 's' : ''}? They stay in item history and can be restored from “Show archived”.`)) return
    const now = new Date().toISOString()
    targets.forEach((o) => void updateAnfOrder(o.order_id, { archived_at: now }))
  }

  const filtered = orders.filter(
    (o) => (statusFilter === 'all' || o.status === statusFilter) &&
      (branchFilter === 'all' || o.branch === branchFilter) &&
      matchesAssigneeFilter(assigneesOf(o), assigneeFilter, meId) &&
      (showArchived || !o.archived_at),
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
        <span className="ml-auto flex items-center gap-2">
          {clearableCount > 0 && (
            <button type="button" onClick={clearReceived} className="inline-flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1 border border-border bg-card text-muted-foreground hover:bg-muted transition-colors">
              🗂 Clear received ({clearableCount})
            </button>
          )}
          {archivedCount > 0 && (
            <button type="button" onClick={() => setShowArchived((v) => !v)} className={`inline-flex items-center gap-1.5 text-[12px] rounded-full px-3 py-1 border transition-colors ${showArchived ? 'bg-foreground text-background border-transparent font-medium' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}>
              {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
            </button>
          )}
          <AssigneeFilter value={assigneeFilter} onChange={setAssigneeFilter} meId={meId} />
        </span>
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
                  <col style={{ width: '150px' }} /><col style={{ width: '36%' }} /><col style={{ width: '56px' }} />
                  <col /><col /><col /><col /><col />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    {[['Status', 'สถานะ'], ['Item', 'รายการ'], ['Qty', 'จำนวน'], ['Unit price', 'ราคา/หน่วย'], ['Total', 'ยอดรวม'], ['Needed by', 'ต้องใช้ภายใน'], ['Received', 'รับแล้ว'], ['Assignee', 'ผู้รับผิดชอบ']].map(([en, th], i) => (
                      <th key={en} className={`px-4 py-3 whitespace-nowrap align-top ${i >= 2 && i <= 4 ? 'text-right' : 'text-left'}`}>
                        <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{en}</span>
                        <span className="block text-[10.5px] text-muted-foreground/75 font-normal mt-0.5">{th}</span>
                      </th>
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
                    <button key={o.order_id} onClick={() => setEditing(o)} className={`w-full grid grid-cols-[auto_1fr_auto] gap-3 items-center px-3 py-3 border-b border-border/50 last:border-0 text-left active:bg-muted/40 ${o.archived_at ? 'opacity-55' : ''}`}>
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusMeta(o.status).dot}`} />
                      <span className="min-w-0">
                        <span className="block font-semibold text-[13.5px] leading-tight truncate">{o.item}</span>
                        {o.description && <span className="block text-[11.5px] text-muted-foreground truncate mt-0.5">{o.description}</span>}
                        <span className="font-mono text-[10.5px] mt-0.5 block">
                          <span className="font-semibold" style={{ color: branchColor(o.branch) }}>{o.branch || '—'}</span><span className="text-muted-foreground"> · {baht(lineTotal(o))}</span>
                          {o.status === 'received' && <span className="text-[#3f9d5b]"> · ✓ recv {fmtDate(o.received_at)}</span>}
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
  const today = new Date()
  const color = branchColor(branch)
  return (
    <>
      <tr>
        <td colSpan={8} className="bg-muted/50 px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-wider font-bold" style={{ color }}>{branch}</span>
          <span className="font-mono text-[10px] text-muted-foreground ml-2">— {rows.length} item{rows.length > 1 ? 's' : ''}</span>
        </td>
      </tr>
      {rows.map((o) => {
        const assignees = teamMembers.filter((m) => assigneesOf(o).includes(m.id))
        const dueSoon = o.needed_by && o.status !== 'received' && new Date(o.needed_by + 'T00:00:00').getTime() - today.getTime() < 3 * 864e5
        return (
          <tr key={o.order_id} className={`border-b border-border/50 last:border-0 hover:bg-muted/40 cursor-pointer ${o.archived_at ? 'opacity-55' : ''}`} onClick={() => onOpen(o)}>
            <td className="px-4 py-3"><StatusInline order={o} /></td>
            <td className="px-4 py-3 min-w-0"><div className="font-semibold truncate">{o.item}</div>{o.description && <div className="text-[12.5px] text-muted-foreground truncate mt-0.5">{o.description}</div>}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums">{o.quantity}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">{baht(o.unit_price)}</td>
            <td className="px-4 py-3 text-right font-mono tabular-nums whitespace-nowrap">{baht(lineTotal(o))}{o.with_vat && <span className="ml-1.5 font-mono text-[9px] tracking-wide bg-[#7A5AA5]/15 text-[#7A5AA5] px-1.5 py-0.5 rounded">+VAT</span>}</td>
            <td className={`px-4 py-3 font-mono text-[12px] whitespace-nowrap ${dueSoon ? 'text-[#FF5B3F] font-bold' : 'text-muted-foreground'}`}>{fmtDate(o.needed_by)}{o.remind_at && <Bell className="inline w-3 h-3 ml-1.5 text-[#7A5AA5]" />}</td>
            <td className="px-4 py-3 font-mono text-[11.5px] whitespace-nowrap">{o.status === 'received' ? <span><span className="block text-[#3f9d5b]">✓ {fmtDate(o.received_at)}</span>{o.received_qty != null && <span className="block text-muted-foreground">{o.received_qty} in</span>}{o.received_by && <span className="block text-[10px] text-muted-foreground">by {o.received_by}</span>}</span> : o.status === 'ordered' ? <span className="text-muted-foreground/70">awaiting</span> : <span className="text-muted-foreground/40">—</span>}</td>
            <td className="px-4 py-3">{assignees.length > 0 ? (assignees.length === 1 ? <span className="inline-flex items-center gap-2 whitespace-nowrap"><UserAvatar name={assignees[0].name || assignees[0].email} size={22} /><span className="text-[12px]">{assignees[0].name || assignees[0].email}</span></span> : <span className="inline-flex -space-x-1.5" title={assignees.map((m) => m.name || m.email).join(', ')}>{assignees.slice(0, 4).map((m) => <span key={m.id} className="ring-2 ring-card rounded-full"><UserAvatar name={m.name || m.email} size={22} /></span>)}{assignees.length > 4 && <span className="w-[22px] h-[22px] rounded-full bg-muted ring-2 ring-card text-[9px] font-mono flex items-center justify-center text-muted-foreground">+{assignees.length - 4}</span>}</span>) : <span className="text-muted-foreground/60 text-[12px]">—</span>}</td>
          </tr>
        )
      })}
    </>
  )
}
