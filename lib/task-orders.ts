import type { AnfOrder, AnfPO, AnfRequest } from '@/types'

// Purchases linked to Andy & Fine. tasks — pure rules (tested).

/** "3–5 days" → 5 · "2 weeks" → 14 · "30-45 วัน" → 45 · nothing → null. */
export function leadDays(text: string | null | undefined): number | null {
  if (!text) return null
  const nums = (text.match(/\d+/g) ?? []).map(Number)
  if (!nums.length) return null
  const n = Math.max(...nums)
  return /week|wk|สัปดาห์|อาทิตย์/i.test(text) ? n * 7 : /month|เดือน/i.test(text) ? n * 30 : n
}

export const addDaysIso = (iso: string, days: number) => {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** ETA for a PO ordered on `orderedIso`: the slowest line's lead time. Null when no lead time is known. */
export function etaFor(orderedIso: string, leadTimes: (string | null | undefined)[]): string | null {
  const days = leadTimes.map(leadDays).filter((x): x is number => x !== null)
  return days.length ? addDaysIso(orderedIso, Math.max(...days)) : null
}

export const STAGES = ['Requested', 'Approved', 'On PO', 'Ordered', 'Received'] as const

/** 0 Requested · 1 Approved · 2 On PO · 3 Ordered · 4 Received. */
export function stageOf(r: AnfRequest, items: AnfOrder[], pos: AnfPO[]): number {
  if (items.length && items.every((o) => o.status === 'received')) return 4
  const approved = (r.status ?? 'draft') === 'approved'
  if (!approved) return 0
  if (items.some((o) => o.status === 'ordered' || o.status === 'received' || pos.find((p) => p.po_id === o.po_id)?.status === 'ordered')) return 3
  if (items.some((o) => o.po_id)) return 2
  return 1
}

const DEFAULT_LEAD = 7
export interface TaskOrder {
  r: AnfRequest; items: AnfOrder[]; stage: number
  orderedAt: string | null        // yyyy-mm-dd
  eta: string | null              // PO ETA, or (not ordered yet) today + usual lead time
  etaGuess: boolean               // true when eta is a guess (not ordered yet)
  due: string | null              // sub-task due, else task due
  late: boolean
}

/** Everything bought for one task, with ETA and a late flag against the (sub-)task due date. */
export function ordersForTask(
  task: { task_id: string; due_date: string | null; checklists: { items: { id: string; due?: string | null }[] }[] },
  requests: AnfRequest[], orders: AnfOrder[], pos: AnfPO[], today: string,
): TaskOrder[] {
  return requests.filter((r) => r.anf_task_id === task.task_id).map((r) => {
    const items = orders.filter((o) => o.request_id === r.request_id)
    const stage = stageOf(r, items, pos)
    const myPos = pos.filter((p) => items.some((o) => o.po_id === p.po_id) && p.status !== 'cancelled')
    const orderedAt = myPos.map((p) => p.ordered_at?.slice(0, 10)).filter((x): x is string => !!x).sort()[0] ?? null
    const poEta = myPos.map((p) => p.eta).filter((x): x is string => !!x).sort().pop() ?? null
    const etaGuess = stage < 3
    const eta = stage === 4 ? null : poEta ?? (etaGuess ? addDaysIso(today, DEFAULT_LEAD) : null)
    const sub = r.anf_subtask_id ? task.checklists.flatMap((c) => c.items).find((i) => i.id === r.anf_subtask_id) : null
    const due = sub?.due ?? task.due_date ?? null
    const late = stage < 4 && !!due && !!eta && eta > due
    return { r, items, stage, orderedAt, eta, etaGuess, due, late }
  })
}
