'use client'

import { useRouter } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { usePurchasing } from '@/lib/supabase/purchasing'
import { ordersForTask, STAGES, type TaskOrder } from '@/lib/task-orders'
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
export function TaskOrdersSection({ orders, subName, onOpen, onRequest }: {
  orders: TaskOrder[]; subName: (id: string | null | undefined) => string | null; onOpen: (id: string) => void; onRequest: () => void
}) {
  const lbl = 'font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className={lbl}>PARTS &amp; ORDERS {orders.length > 0 && `· ${orders.length}`}</span>
        <button type="button" onClick={onRequest} className="text-[12px] font-medium text-[#7A5AA5]">＋ Request items</button>
      </div>
      {orders.length === 0 && <p className="text-[12.5px] text-muted-foreground">Nothing ordered for this task. Need parts? Request them here or from a sub-task — the order&apos;s progress and ETA show up on this task.</p>}
      <div className="space-y-2">
        {orders.map((o) => (
          <button key={o.r.request_id} type="button" onClick={() => onOpen(o.r.request_id)} className="block w-full rounded-lg border border-border bg-background p-2.5 text-left hover:border-foreground/25">
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
          </button>
        ))}
      </div>
    </div>
  )
}
