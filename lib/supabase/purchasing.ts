import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import type { AnfOrder, AnfPO, AnfRequest, Notification } from '@/types'
import { notificationQueries } from './db'
import { useCRMStore } from '@/store/crm-store'
import { MOCK_REQUESTS, MOCK_POS, MOCK_PURCHASE_ITEMS } from './purchasing-mock'

// Order board purchasing — Requests (by project) → POs (by supplier).
// Items live in anf_orders (request_id / po_id). Shared module store like suppliers/assets.

const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pr-${Date.now()}-${Math.round(Math.random() * 1e6)}`)
export const newPurchasingId = mkId

let requests: AnfRequest[] = []
let pos: AnfPO[] = []
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

async function load() {
  if (!isSupabaseConfigured) {
    // Local dev (mock mode) — sample requests / POs / items to click through.
    if (!loaded) {
      requests = [...MOCK_REQUESTS]; pos = [...MOCK_POS]
      if (useCRMStore.getState().anfOrders.length === 0) useCRMStore.setState({ anfOrders: [...MOCK_PURCHASE_ITEMS] })
    }
    loaded = true; emit(); return
  }
  const [r, p] = await Promise.all([
    supabase.from('anf_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('anf_pos').select('*').order('created_at', { ascending: false }),
  ])
  if (r.error) console.warn('[purchasing] requests load failed', r.error.message)
  if (p.error) console.warn('[purchasing] POs load failed', p.error.message)
  requests = (r.data ?? []) as AnfRequest[]
  pos = (p.data ?? []) as AnfPO[]
  loaded = true; emit()
}

export function usePurchasing() {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    listeners.add(f)
    if (!loaded && !loading) loading = load()
    return () => { listeners.delete(f) }
  }, [])
  return { requests, pos, loaded }
}

export async function saveRequest(r: AnfRequest) {
  const row = { ...r, updated_at: new Date().toISOString() }
  requests = [row, ...requests.filter((x) => x.request_id !== r.request_id)]
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_requests').upsert(row)
  if (error) throw new Error(error.message)
}
export async function deleteRequest(id: string) {
  requests = requests.filter((x) => x.request_id !== id)
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_requests').delete().eq('request_id', id)
  if (error) throw new Error(error.message)
}
export async function savePO(p: AnfPO) {
  const row = { ...p, updated_at: new Date().toISOString() }
  pos = [row, ...pos.filter((x) => x.po_id !== p.po_id)]
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_pos').upsert(row)
  if (error) throw new Error(error.message)
}

// ── Numbers ──────────────────────────────────────────────────────────────────
const ym = (d = new Date()) => {
  const t = new Date(d.getTime() + 7 * 3600_000)   // Thai time
  return { y: t.getUTCFullYear(), m: String(t.getUTCMonth() + 1).padStart(2, '0') }
}
/** REQ-2026-10-014 — running number per month. */
export function nextRequestNumber(existing: string[]): string {
  const { y, m } = ym(); const pre = `REQ-${y}-${m}-`
  const max = existing.filter((n) => n.startsWith(pre)).reduce((a, n) => Math.max(a, parseInt(n.slice(pre.length), 10) || 0), 0)
  return `${pre}${String(max + 1).padStart(3, '0')}`
}
/** PO2026100002 — FlowAccount style, running number per month. */
export function nextPONumber(existing: string[]): string {
  const { y, m } = ym(); const pre = `PO${y}${m}`
  const max = existing.filter((n) => n.startsWith(pre)).reduce((a, n) => Math.max(a, parseInt(n.slice(pre.length), 10) || 0), 0)
  return `${pre}${String(max + 1).padStart(4, '0')}`
}

// ── Approval ─────────────────────────────────────────────────────────────────
/** Requests at or above this total (incl. VAT) wait for the approver. */
export const APPROVAL_LIMIT_THB = 10_000
export const APPROVER_EMAIL = 'champ@sixsheet.me'

/** Mock mode has no Champ — the mock admin stands in so the flow can be clicked through. */
export function isApprover(email?: string | null, role?: string | null): boolean {
  if (!email) return false
  if (email.toLowerCase() === APPROVER_EMAIL) return true
  return !isSupabaseConfigured && role === 'admin'
}
const withVat = (o: Pick<AnfOrder, 'quantity' | 'unit_price' | 'with_vat'>) => itemTotal(o) * (o.with_vat ? 1.07 : 1)
export const requestTotal = (items: AnfOrder[]) => Math.round(items.reduce((t, o) => t + withVat(o), 0))
/** Rows from before approval existed (no status) and quick 1-item orders count as approved. */
export const approvalOf = (r: AnfRequest | null) => (r ? r.status ?? 'approved' : 'approved')

function notifyApprover(r: AnfRequest, total: number) {
  const st = useCRMStore.getState()
  const m = st.teamMembers.find((x) => x.email?.toLowerCase() === APPROVER_EMAIL)
    ?? (!isSupabaseConfigured ? st.teamMembers.find((x) => x.role === 'admin') : undefined)
  if (!m) return
  notify({ recipient_id: m.id, recipient_name: m.name || m.email, actor: r.created_by || st.currentUserName || 'Someone',
    entity_type: 'anf_request', entity_id: r.request_id, entity_name: `${r.number} · ${r.project_name || 'request'}`,
    message: `asks for approval · ฿${total.toLocaleString('en-US')}`, read: false, board_id: 'anf-order' })
}
function notifyRequester(r: AnfRequest, message: string) {
  const st = useCRMStore.getState()
  const m = st.teamMembers.find((x) => x.name === r.created_by || x.email === r.created_by)
  if (!m || m.id === st.currentUserId) return
  notify({ recipient_id: m.id, recipient_name: m.name || m.email, actor: st.currentUserName || 'Champ',
    entity_type: 'anf_request', entity_id: r.request_id, entity_name: r.number, message, read: false, board_id: 'anf-order' })
}
function notify(n: Omit<Notification, 'id' | 'created_at'>) {
  const full: Notification = { ...n, id: `notif-${Date.now()}-${n.recipient_id}`, created_at: new Date().toISOString() }
  useCRMStore.setState((s) => ({ notifications: [full, ...s.notifications] }))
  if (!isSupabaseConfigured) return
  void notificationQueries.insert(n).catch((e: Error) => console.warn('[purchasing] notify failed', e.message))
  void fetch('/api/push/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipientId: n.recipient_id, title: n.entity_name, body: `${n.actor} ${n.message}`, url: '/anf-order' }),
  }).catch(() => {})
}

/** Submit: under the limit → approved straight away; otherwise wait for the approver. */
export async function submitRequest(r: AnfRequest, items: AnfOrder[]): Promise<AnfRequest> {
  const total = requestTotal(items)
  const now = new Date().toISOString()
  const auto = total < APPROVAL_LIMIT_THB
  const next: AnfRequest = { ...r, total_thb: total, submitted_at: now, rejected_reason: null,
    ...(auto ? { status: 'approved', approved_by: 'auto', approved_at: now } : { status: 'pending', approved_by: null, approved_at: null }) }
  await saveRequest(next)
  if (!auto) notifyApprover(next, total)
  return next
}
export async function approveRequest(r: AnfRequest, items: AnfOrder[], by: string): Promise<AnfRequest> {
  const next: AnfRequest = { ...r, status: 'approved', total_thb: requestTotal(items), approved_by: by, approved_at: new Date().toISOString(), rejected_reason: null }
  await saveRequest(next)
  notifyRequester(next, 'approved your request')
  return next
}
export async function rejectRequest(r: AnfRequest, reason: string): Promise<AnfRequest> {
  const next: AnfRequest = { ...r, status: 'rejected', rejected_reason: reason, approved_by: null, approved_at: null }
  await saveRequest(next)
  notifyRequester(next, `rejected your request: ${reason}`)
  return next
}
/** After an item edit on an approved request: over the limit and above the approved amount → back to pending. */
export async function recheckApproval(r: AnfRequest, items: AnfOrder[]): Promise<AnfRequest | null> {
  if (approvalOf(r) !== 'approved') return null
  const total = requestTotal(items)
  if (total < APPROVAL_LIMIT_THB || total <= (r.total_thb ?? 0)) return null
  const next: AnfRequest = { ...r, status: 'pending', total_thb: total, submitted_at: new Date().toISOString(), approved_by: null, approved_at: null }
  await saveRequest(next)
  notifyApprover(next, total)
  return next
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
  if (live.some((o) => o.status === 'ordered' || o.po_id)) return { status: 'ordered', received, total }
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
