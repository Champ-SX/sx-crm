'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardList, Plus, Upload, Search } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { Button } from '@/components/ui/button'
import { OrderDialog } from '@/components/anf/order-dialog'
import { RequestDialog, CreatePODialog, ImportDialog, ProjectChip, projectTitle } from '@/components/anf/purchasing-ui'
import { cn } from '@/lib/utils'
import { ANF_ACCENT, baht, fmtDate } from '@/lib/anf'
import { usePurchasing, requestStatus, REQ_STATUS, requestTotal, approvalOf, isApprover, type ReqStatus } from '@/lib/supabase/purchasing'
import { useAuth } from '@/components/auth-provider'
import { useOpenDeepLink } from '@/hooks/use-open-deep-link'
import { useSuppliers } from '@/lib/supabase/suppliers'
import type { AnfOrder, AnfRequest } from '@/types'

/** A row = a real request, or a quick 1-item order (no request) shown as a "Stock refill" request. */
interface ReqRow { key: string; req: AnfRequest | null; items: AnfOrder[]; created: string }

export default function RequestsPage() {
  const isHydrated = useHydrated()
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const { requests, pos, loaded } = usePurchasing()
  const { user, role } = useAuth()
  const approver = isApprover(user?.email, role)
  useSuppliers()
  const [pick, setFilter] = useState<'open' | ReqStatus | 'all' | null>(null)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [openReq, setOpenReq] = useState<AnfRequest | 'new' | null>(null)
  const [openItem, setOpenItem] = useState<AnfOrder | null>(null)
  const [poItems, setPoItems] = useState<AnfOrder[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [quick, setQuick] = useState(false)

  const onBoard = (b?: string | null) => !activeBoardId || !b || b === activeBoardId
  const rows: ReqRow[] = useMemo(() => {
    const orders = anfOrders.filter((o) => onBoard(o.board_id))
    const byReq = new Map<string, AnfOrder[]>()
    for (const o of orders) if (o.request_id) byReq.set(o.request_id, [...(byReq.get(o.request_id) ?? []), o])
    const real = requests.filter((r) => onBoard(r.board_id)).map((r) => ({ key: r.request_id, req: r, items: byReq.get(r.request_id) ?? [], created: r.created_at ?? '' }))
    const singles = orders.filter((o) => !o.request_id || !requests.some((r) => r.request_id === o.request_id))
      .map((o) => ({ key: o.order_id, req: null, items: [o], created: o.created_at }))
    return [...real, ...singles].sort((a, b) => b.created.localeCompare(a.created))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anfOrders, requests, activeBoardId])

  const jobOf = (r: AnfRequest | null) => (r?.job_id ? wonJobs.find((j) => j.job_id === r.job_id) ?? null : null)
  const poNum = (id: string) => pos.find((p) => p.po_id === id)?.number
  const counts: Record<string, number> = {}
  for (const r of rows) { const s = requestStatus(r.items, r.req).status; counts[s] = (counts[s] ?? 0) + 1 }
  // Approver lands on what's waiting for them; everyone else on open requests.
  const filter = pick ?? (approver && counts.pending ? 'pending' : 'open')
  const needle = q.trim().toLowerCase()
  const shown = rows.filter((r) => {
    const s = requestStatus(r.items, r.req).status
    if (filter === 'open' ? s === 'received' || (r.items.every((o) => o.archived_at) && r.items.length > 0) : filter !== 'all' && s !== filter) return false
    if (!needle) return true
    const job = jobOf(r.req)
    return [r.req?.number, r.req?.project_name, job?.job_number, projectTitle(r.req, job), ...r.items.map((o) => o.item)].some((v) => (v ?? '').toLowerCase().includes(needle))
  })
  const selItems = rows.filter((r) => selected.includes(r.key) && approvalOf(r.req) === 'approved').flatMap((r) => r.items).filter((o) => o.status !== 'received' && !o.po_id)
  const { suppliers } = useSuppliers()
  const bySup = new Map<string, number>()
  for (const o of selItems) bySup.set(o.supplier_id ?? '', (bySup.get(o.supplier_id ?? '') ?? 0) + 1)

  useOpenDeepLink(loaded, 'anf_request', (id) => requests.some((r) => r.request_id === id),
    (id) => setOpenReq(requests.find((r) => r.request_id === id) ?? null))

  if (!isHydrated) return null
  const chip = (k: typeof filter, label: string, n?: number) => (
    <button key={k} type="button" onClick={() => setFilter(k)}
      className={cn('h-7 rounded-full border px-2.5 text-[12px]', filter === k ? 'border-foreground bg-foreground text-background font-semibold' : 'border-border text-muted-foreground hover:text-foreground')}>
      {label}{n ? <span className="ml-1 opacity-70">{n}</span> : null}
    </button>
  )

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex flex-wrap items-center gap-3">
        <MobileMenuButton />
        <span className="w-3.5 h-3.5 rounded-[5px] shrink-0 flex items-center justify-center" style={{ backgroundColor: ANF_ACCENT }}><ClipboardList className="w-2.5 h-2.5 text-white" /></span>
        <div>
          <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">Requests</h1>
          <p className="font-mono text-[12px] text-muted-foreground mt-1">{counts.pending ? <span className="text-amber-700 dark:text-amber-400">{counts.pending} wait for approval · </span> : null}{(counts.to_order ?? 0)} to order · {(counts.ordered ?? 0) + (counts.partial ?? 0)} ordered</p>
        </div>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setImporting(true)}><Upload className="w-4 h-4" />Import</Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setQuick(true)}>Quick order</Button>
          <Button size="sm" className="h-9 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => setOpenReq('new')}><Plus className="w-4 h-4" />New request</Button>
        </span>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2 border-b border-border/60">
        {chip('open', 'Open')}{chip('pending', 'Wait for approval', counts.pending)}{chip('to_order', 'To order', counts.to_order)}{chip('ordered', 'Ordered', counts.ordered)}{chip('partial', 'Partly received', counts.partial)}{chip('received', 'Received', counts.received)}{chip('rejected', 'Rejected', counts.rejected)}{counts.draft ? chip('draft', 'Draft', counts.draft) : null}{chip('all', 'All')}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search item, project, REQ…" className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-[13px] outline-none focus:border-foreground/40" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4 pb-24">
        {shown.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No requests here</p>
            <p className="text-[12px] text-muted-foreground mt-1">＋Order a LOW/OUT item from Stock, start a New request, or Import a list.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden md:grid grid-cols-[28px_2.2fr_80px_100px_80px_120px_120px] gap-3 px-4 py-2 border-b border-border font-mono text-[10px] tracking-wide text-muted-foreground">
              <span /><span>REQUEST</span><span>ITEMS</span><span className="text-right">TOTAL inc VAT</span><span>NEEDED</span><span>PO</span><span>STATUS</span>
            </div>
            {shown.map((r) => {
              const st = requestStatus(r.items, r.req)
              const job = jobOf(r.req)
              const total = requestTotal(r.items)
              const manual = r.items.filter((o) => !o.product_id).length
              const poIds = [...new Set(r.items.map((o) => o.po_id).filter(Boolean))] as string[]
              const canSelect = approvalOf(r.req) === 'approved' && r.items.some((o) => o.status !== 'received' && !o.po_id)
              const on = selected.includes(r.key)
              const single = r.req ? null : r.items[0]
              return (
                <div key={r.key} className={cn('grid grid-cols-[28px_1fr] md:grid-cols-[28px_2.2fr_80px_100px_80px_120px_120px] gap-x-3 gap-y-1 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/40', on && 'bg-[#7A5AA5]/7')}>
                  <span className="pt-0.5">
                    {canSelect && <input type="checkbox" checked={on} onChange={() => setSelected((s) => (on ? s.filter((x) => x !== r.key) : [...s, r.key]))} className="w-4 h-4 accent-foreground" aria-label="Select for PO" />}
                  </span>
                  <button type="button" onClick={() => (r.req ? setOpenReq(r.req) : setOpenItem(single))} className="text-left min-w-0">
                    <span className="flex items-center gap-2 min-w-0">
                      <ProjectChip r={r.req} job={job} fallback={single?.branch ? `Refill · ${single.branch}` : undefined} />
                      <b className="text-[14px] truncate">{projectTitle(r.req, job, single ?? undefined)}</b>
                    </span>
                    <span className="block font-mono text-[11px] text-muted-foreground truncate">{r.req ? `${r.req.number}${r.req.created_by ? ` · ${r.req.created_by}` : ''}` : `Quick order${single?.requested_by ? ` · ${single.requested_by}` : ''}`}</span>
                  </button>
                  <span className="col-start-2 md:col-start-auto text-[13px] text-muted-foreground md:text-foreground">{r.items.length}{manual ? <span className="text-muted-foreground text-[11px]"> · {manual} manual</span> : null}</span>
                  <span className="col-start-2 md:col-start-auto md:text-right font-mono text-[13px]">{total ? baht(total) : '—'}</span>
                  <span className="hidden md:block text-[12px] text-muted-foreground">{r.req?.needed_by ? fmtDate(r.req.needed_by) : single?.needed_by ? fmtDate(single.needed_by) : '—'}</span>
                  <span className={cn('col-start-2 md:col-start-auto font-mono text-[12px] text-muted-foreground truncate', !poIds.length && 'hidden md:block')}>{poIds.length ? poIds.map((id) => <Link key={id} href="/anf-order/pos" className="underline mr-1">{poNum(id) ?? 'PO'}</Link>) : '—'}</span>
                  <span className="col-start-2 md:col-start-auto"><span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', REQ_STATUS[st.status].cls)}>{st.status === 'partial' ? `${st.received}/${st.total} received` : REQ_STATUS[st.status].label}</span></span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selItems.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[min(720px,calc(100vw-2rem))] flex flex-wrap items-center gap-3 rounded-xl bg-foreground text-background px-4 py-3 shadow-xl">
          <b className="text-[13px]">{selected.length} selected · {selItems.length} item{selItems.length > 1 ? 's' : ''}</b>
          <span className="text-[12px] opacity-75 truncate">→ {[...bySup.entries()].map(([sid, n]) => `${suppliers.find((s) => s.supplier_id === sid)?.name ?? 'no supplier'} (${n})`).join(' · ')}</span>
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => setSelected([])} className="h-8 rounded-md border border-background/30 px-3 text-[12px]">Clear</button>
            <button type="button" onClick={() => setPoItems(selItems)} className="h-8 rounded-md bg-background text-foreground px-3 text-[12px] font-bold">Create PO →</button>
          </span>
        </div>
      )}

      {openReq && <RequestDialog request={openReq === 'new' ? null : openReq} onClose={() => setOpenReq(null)} onCreatePO={(items) => setPoItems(items)} />}
      {openItem && <OrderDialog order={openItem} onClose={() => setOpenItem(null)} />}
      {quick && <OrderDialog order={null} onClose={() => setQuick(false)} />}
      {poItems && <CreatePODialog items={poItems} onClose={() => setPoItems(null)} onDone={() => setSelected([])} />}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
    </div>
  )
}
