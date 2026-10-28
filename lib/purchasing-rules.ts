import type { AnfOrder, AnfRequest } from '@/types'

// Order board purchasing rules — pure functions (no DB / store), unit-tested in purchasing-rules.test.ts.

/** Requests at or above this total (incl. VAT) wait for the approver. */
export const APPROVAL_LIMIT_THB = 10_000

export const lineTotalVat = (o: Pick<AnfOrder, 'quantity' | 'unit_price' | 'with_vat'>) => itemTotal(o) * (o.with_vat ? 1.07 : 1)
export const requestTotal = (items: AnfOrder[]) => Math.round(items.reduce((t, o) => t + lineTotalVat(o), 0))
/** Rows from before approval existed (no status) and quick 1-item orders count as approved. */
export const approvalOf = (r: AnfRequest | null) => (r ? r.status ?? 'approved' : 'approved')

/** What can be changed on a request line in each state (the approved amount is what gets ordered). */
export function lineRules(r: AnfRequest | null, o: Pick<AnfOrder, 'status' | 'po_id'>) {
  const appr = approvalOf(r)
  const open = (appr === 'draft' || appr === 'rejected') && o.status === 'to_order' && !o.po_id
  return { editQtyPrice: open, editSupplier: open || (appr === 'approved' && o.status === 'to_order' && !o.po_id), remove: open, canAdd: appr === 'draft' || appr === 'rejected' }
}

/**
 * Receiving a line: `arrived` may be less than ordered.
 * keepRest → this line closes at `arrived` and a new line for the rest stays on the same PO (still ordered).
 * otherwise → closed short: the line closes with received_qty = arrived.
 */
export function receivePlan(o: AnfOrder, arrived: number, keepRest: boolean, newId: () => string = () => crypto.randomUUID()): { patch: Partial<AnfOrder>; rest: AnfOrder | null } {
  const got = Math.max(0, Math.min(arrived, o.quantity))
  const missing = o.quantity - got
  if (keepRest && missing > 0 && got > 0) {
    return {
      patch: { status: 'received', quantity: got, received_qty: got },
      rest: { ...o, order_id: newId(), quantity: missing, status: 'ordered', received_qty: null, received_at: null, received_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    }
  }
  return { patch: { status: 'received', received_qty: got, ...(missing > 0 ? { notes: [o.notes, `Closed short: ${got}/${o.quantity} received`].filter(Boolean).join(' · ') } : {}) }, rest: null }
}

// ── Derived status ───────────────────────────────────────────────────────────
export type ReqStatus = 'draft' | 'pending' | 'rejected' | 'to_order' | 'ordered' | 'partial' | 'received' | 'empty'
export function requestStatus(items: AnfOrder[], req: AnfRequest | null = null): { status: ReqStatus; received: number; total: number } {
  const live = items.filter((o) => !o.archived_at || o.status === 'received')
  const total = live.length
  const received = live.filter((o) => o.status === 'received').length
  const appr = approvalOf(req)
  if (appr !== 'approved') return { status: appr, received, total }
  if (total === 0) return { status: 'empty', received, total }
  if (received === total) return { status: 'received', received, total }
  if (received > 0) return { status: 'partial', received, total }
  // On a draft PO is still "to order" — only a PO marked ordered makes it ordered.
  if (live.some((o) => o.status === 'ordered')) return { status: 'ordered', received, total }
  return { status: 'to_order', received, total }
}
export const REQ_STATUS: Record<ReqStatus, { label: string; cls: string }> = {
  draft:    { label: 'Draft', cls: 'bg-muted text-muted-foreground' },
  pending:  { label: 'Wait for approval', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
  rejected: { label: 'Rejected', cls: 'bg-red-500/12 text-red-700 dark:text-red-400' },
  to_order: { label: 'Approved · to order', cls: 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400' },
  ordered:  { label: 'Ordered',  cls: 'bg-blue-500/12 text-blue-700 dark:text-blue-300' },
  partial:  { label: 'Partly received', cls: 'bg-violet-500/14 text-violet-700 dark:text-violet-300' },
  received: { label: 'Received', cls: 'bg-muted text-foreground' },
  empty:    { label: 'No items', cls: 'bg-muted text-muted-foreground' },
}
export const itemTotal = (o: Pick<AnfOrder, 'quantity' | 'unit_price'>) => (o.quantity || 0) * (o.unit_price || 0)

/** ฿10,000 or more (incl. VAT) needs the approver; anything under is approved on submit. */
export const needsApproval = (totalThb: number) => totalThb >= APPROVAL_LIMIT_THB

/** Days before "Needed by" when an unordered request starts to warn. */
export const NEEDED_SOON_DAYS = 3
/** Today's date in Thai time (YYYY-MM-DD) — dates are compared as calendar days. */
export const thaiToday = (nowMs = Date.now()) => new Date(nowMs + 7 * 3600_000).toISOString().slice(0, 10)
const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000)

/**
 * Needed-by state of a submitted request:
 * 'late' = past Needed by and something not received; 'soon' = within NEEDED_SOON_DAYS and something not ordered yet.
 * Drafts / rejected requests and requests without a date never alert.
 */
export function neededByAlert(r: Pick<AnfRequest, 'needed_by' | 'status'> | null, items: Pick<AnfOrder, 'status' | 'archived_at'>[], today: string): 'soon' | 'late' | null {
  if (!r?.needed_by) return null
  const appr = approvalOf(r as AnfRequest)
  if (appr !== 'pending' && appr !== 'approved') return null
  const live = items.filter((o) => !o.archived_at || o.status === 'received')
  if (!live.length) return null
  const left = dayDiff(r.needed_by, today)
  if (left < 0 && live.some((o) => o.status !== 'received')) return 'late'
  if (left >= 0 && left <= NEEDED_SOON_DAYS && live.some((o) => o.status === 'to_order')) return 'soon'
  return null
}
