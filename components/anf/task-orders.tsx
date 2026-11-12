'use client'

import { useRouter } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { useState } from 'react'
import { usePurchasing, saveRequest, logEvent } from '@/lib/supabase/purchasing'
import { ordersForTask, stageOf, STAGES, type TaskOrder } from '@/lib/task-orders'
import type { AnfRequest } from '@/types'
import type { AnfTask } from '@/lib/supabase/anf-tasks'
import { fmtDate } from '@/lib/anf'
import { cn } from '@/lib/utils'

const todayIso = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)   // Thai date

/** Purchases linked to this task (live: requests + PO lines). */
export function useTaskOrders(task: AnfTask | null | undefined): TaskOrder[] {
  const { requests, pos } = usePurchasing()
  const orders = useCRMStore((s) => s.anfOrders)
  if (!task) return []
  return ordersForTask(task, requests, orders, pos, todayIso())
}

/** All tasks at once (board cards, Timeline). */
export function useAllTaskOrders(tasks: AnfTask[]): Map<string, TaskOrder[]> {
  const { requests, pos } = usePurchasing()
  const orders = useCRMStore((s) => s.anfOrders)
  const m = new Map<string, TaskOrder[]>()
  const today = todayIso()
  for (const t of tasks) if (requests.some((r) => r.anf_task_id === t.task_id)) m.set(t.task_id, ordersForTask(t, requests, orders, pos, today))
  return m
}

export function useOpenRequest() {
  const router = useRouter()
  const requestOpenEntity = useCRMStore((s) => s.requestOpenEntity)
  return (id: string) => { requestOpenEntity('anf_request', id); router.push('/inventory') }
}

/** Small chip on a sub-task row. */
export function OrderChip({ o, onOpen }: { o: TaskOrder; onOpen: () => void }) {
  const done = o.stage === 4
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onOpen() }} title={`${o.r.number} · ${STAGES[o.stage]}${o.eta ? ` · ETA ${o.eta}` : ''}`}
      className={cn('ml-1.5 inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-px align-middle text-[11px] font-semibold',
        o.late ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
          : done ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300')}>
      📦 {o.r.number.replace(/^REQ-\d{4}-\d{2}-/, 'REQ-')} · {STAGES[o.stage]}{!done && o.eta ? ` · ${o.etaGuess ? '~' : 'ETA '}${fmtDate(o.eta)}` : ''}{o.late ? ' · late' : ''}
    </button>
  )
}

/** "Parts & orders" block in the task drawer. */
export function TaskOrdersSection({ orders, subName, onOpen, action, onUnlink }: {
  orders: TaskOrder[]; subName: (id: string | null | undefined) => string | null; onOpen: (id: string) => void; action: React.ReactNode; onUnlink: (o: TaskOrder) => void
}) {
  const lbl = 'font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={lbl}>PARTS &amp; ORDERS {orders.length > 0 && `· ${orders.length}`}</span>
        {action}
      </div>
      {orders.length === 0 && <p className="text-[12.5px] text-muted-foreground">Nothing ordered for this task. Need parts? Link an existing PR / PO, or request new ones — the order&apos;s progress and ETA show up on this task.</p>}
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.r.request_id} role="button" tabIndex={0} onClick={() => onOpen(o.r.request_id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(o.r.request_id)} className="block w-full cursor-pointer rounded-lg border border-border bg-background p-2.5 text-left hover:border-foreground/25">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px]">
              <span className="font-mono text-[11.5px] font-semibold">{o.r.number}</span>
              {subName(o.r.anf_subtask_id) && <span className="text-muted-foreground">↳ {subName(o.r.anf_subtask_id)}</span>}
              <span className="ml-auto">
                {o.stage === 4 ? <span className="font-semibold text-emerald-700 dark:text-emerald-400">Received ✓</span>
                  : o.eta ? <>{o.etaGuess ? 'If ordered today ~' : 'ETA '}<b>{fmtDate(o.eta)}</b>{o.due && <> · {o.late ? <span className="font-bold text-red-600">after due {fmtDate(o.due)}</span> : <span className="text-emerald-700 dark:text-emerald-400">before due {fmtDate(o.due)}</span>}</>}</>
                  : <span className="text-muted-foreground">ETA not set</span>}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12px] text-muted-foreground">{o.items.map((i) => `${i.quantity}× ${i.item}`).join(' · ') || 'No items yet'}</div>
            <div className="mt-2 grid grid-cols-5 gap-0.5">
              {STAGES.map((s, i) => <span key={s} className={cn('h-1.5 rounded-full', i <= o.stage ? (o.late && i === o.stage ? 'bg-red-500' : 'bg-teal-600') : 'bg-muted')} />)}
            </div>
            <div className="mt-1 grid grid-cols-5 text-[10px] text-muted-foreground">{STAGES.map((s, i) => <span key={s} className={cn(i === o.stage && 'font-semibold text-foreground')}>{s}</span>)}</div>
            {o.late && <div className="mt-2 rounded-md bg-red-50 px-2 py-1 text-[12px] text-red-800 dark:bg-red-500/10 dark:text-red-300">⚠ {o.stage < 3 ? 'Not ordered yet — at the usual lead time it' : 'It'} arrives after {o.due ? fmtDate(o.due) : 'the due date'}. Ping the buyer or move the due date.</div>}
            <div className="mt-1 text-right"><button type="button" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Unlink ${o.r.number} from this task? The request itself stays.`)) onUnlink(o) }} className="text-[11px] text-muted-foreground hover:text-destructive">✕ Unlink</button></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** "🔗 Link PR / PO" — attach existing open requests (or every request on a PO) to this task or a sub-task. */
export function LinkOrderPicker({ task, subs, onNew, onLinked }: {
  task: AnfTask; subs: { id: string; text: string }[]; onNew: () => void; onLinked: (msg: string) => void
}) {
  const { requests, pos } = usePurchasing()
  const orders = useCRMStore((s) => s.anfOrders)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [target, setTarget] = useState<string>('')   // '' = whole task, else sub-task id
  const itemsOf = (rid: string) => orders.filter((o) => o.request_id === rid)
  const openReqs = requests.filter((r) => (r.board_id ?? '').startsWith('anf') && r.status !== 'rejected' && r.anf_task_id !== task.task_id && stageOf(r, itemsOf(r.request_id), pos) < 4)
  const openPOs = pos.filter((p) => p.status !== 'cancelled' && orders.some((o) => o.po_id === p.po_id && o.request_id && o.status !== 'received'))
  const hit = (s: string) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase())
  const reqText = (r: AnfRequest) => [r.number, r.project_name, ...itemsOf(r.request_id).map((i) => i.item)].filter(Boolean).join(' · ')
  const where = target ? `↳ ${subs.find((s) => s.id === target)?.text}` : 'this task'
  async function link(rs: AnfRequest[]) {
    const moving = rs.filter((r) => r.anf_task_id && r.anf_task_id !== task.task_id)
    if (moving.length && !window.confirm(`${moving.map((r) => r.number).join(', ')} ${moving.length > 1 ? 'are' : 'is'} linked to another task. Move to ${where}?`)) return
    for (const r of rs) {
      await saveRequest({ ...r, anf_task_id: task.task_id, anf_subtask_id: target || null })
      void logEvent(r.request_id, 'item_changed', `Linked to ${task.name}${target ? ` › ${subs.find((s) => s.id === target)?.text}` : ''}`)
    }
    onLinked(`🔗 Linked ${rs.map((r) => r.number).join(', ')}`); setOpen(false); setQ('')
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)} className="text-[12px] font-medium text-[#7A5AA5]">🔗 Link PR / PO ▾</button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 w-[340px] max-w-[85vw] rounded-xl border border-border bg-popover p-1.5 shadow-lg">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search REQ / PO number, item…" className="mb-1 h-8 w-full rounded-md border border-border bg-background px-2 text-[12.5px] outline-none" />
          <label className="flex items-center gap-2 px-2 py-1 text-[12px] text-muted-foreground">Link to
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="h-7 flex-1 rounded border border-border bg-background px-1 text-[12px] text-foreground">
              <option value="">Whole task</option>{subs.map((s) => <option key={s.id} value={s.id}>↳ {s.text}</option>)}
            </select>
          </label>
          <div className="max-h-64 overflow-y-auto">
            <div className="px-2 pt-1.5 font-mono text-[10.5px] text-muted-foreground">OPEN REQUESTS</div>
            {openReqs.filter((r) => hit(reqText(r))).slice(0, 12).map((r) => (
              <button key={r.request_id} type="button" onClick={() => link([r])} className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] hover:bg-muted">
                <span className="truncate">{reqText(r)}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{r.anf_task_id ? 'linked elsewhere' : STAGES[stageOf(r, itemsOf(r.request_id), pos)]}</span>
              </button>
            ))}
            {openReqs.length === 0 && <div className="px-2 py-1 text-[12px] text-muted-foreground">No open requests.</div>}
            <div className="px-2 pt-2 font-mono text-[10.5px] text-muted-foreground">OPEN POs · links their requests</div>
            {openPOs.filter((p) => hit(p.number)).slice(0, 8).map((p) => {
              const rs = requests.filter((r) => orders.some((o) => o.po_id === p.po_id && o.request_id === r.request_id) && r.anf_task_id !== task.task_id)
              return (
                <button key={p.po_id} type="button" disabled={!rs.length} onClick={() => window.confirm(`Link ${rs.map((r) => r.number).join(', ')} from ${p.number} to ${where}?`) && link(rs)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] hover:bg-muted disabled:opacity-50">
                  <span className="truncate font-mono">{p.number}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{p.status === 'ordered' ? `Ordered${p.eta ? ` · ETA ${fmtDate(p.eta)}` : ''}` : 'Draft'} · {rs.length ? `${rs.length} request${rs.length > 1 ? 's' : ''}` : 'already linked'}</span>
                </button>
              )
            })}
          </div>
          <button type="button" onClick={() => { setOpen(false); onNew() }} className="mt-1 w-full rounded-md border-t border-border px-2 py-2 text-left text-[12.5px] font-medium text-[#7A5AA5] hover:bg-muted">＋ New request…</button>
        </div>
      )}
    </div>
  )
}

export async function unlinkOrder(r: AnfRequest) {
  await saveRequest({ ...r, anf_task_id: null, anf_subtask_id: null })
}
