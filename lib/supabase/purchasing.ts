import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import type { AnfOrder, AnfPO, AnfRequest, AnfRequestEvent, Notification } from '@/types'
import { notificationQueries } from './db'
import { useCRMStore } from '@/store/crm-store'
import { MOCK_REQUESTS, MOCK_POS, MOCK_PURCHASE_ITEMS, MOCK_ASSET_PRODUCT, MOCK_EVENTS } from './purchasing-mock'
import { needsApproval, requestTotal, approvalOf } from '@/lib/purchasing-rules'
export * from '@/lib/purchasing-rules'

// Order board purchasing — Requests (by project) → POs (by supplier).
// Items live in anf_orders (request_id / po_id). Shared module store like suppliers/assets.

const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pr-${Date.now()}-${Math.round(Math.random() * 1e6)}`)
export const newPurchasingId = mkId

let requests: AnfRequest[] = []
let pos: AnfPO[] = []
let events: AnfRequestEvent[] = []
let loaded = false
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((f) => f())

async function load() {
  if (!isSupabaseConfigured) {
    // Local dev (mock mode) — sample requests / POs / items to click through.
    if (!loaded) {
      requests = [...MOCK_REQUESTS]; pos = [...MOCK_POS]; events = [...MOCK_EVENTS]
      if (useCRMStore.getState().anfOrders.length === 0) useCRMStore.setState({ anfOrders: [...MOCK_PURCHASE_ITEMS] })
      const st = useCRMStore.getState()
      if (!st.anfProducts.some((p) => p.product_id === MOCK_ASSET_PRODUCT.product_id)) useCRMStore.setState({ anfProducts: [...st.anfProducts, MOCK_ASSET_PRODUCT] })
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
  // History is optional until its migration has run.
  const e = await supabase.from('anf_request_events').select('*').order('at', { ascending: true })
  if (e.error) console.warn('[purchasing] history load failed', e.error.message)
  events = (e.data ?? []) as AnfRequestEvent[]
  loaded = true; emit()
}

/** enabled=false subscribes without loading (e.g. the sidebar on other boards). */
export function usePurchasing(enabled = true) {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    listeners.add(f)
    if (enabled && !loaded && !loading) loading = load()
    return () => { listeners.delete(f) }
  }, [enabled])
  return { requests, pos, events, loaded }
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

// ── History ──────────────────────────────────────────────────────────────────
/** The signed-in person, for "who did it" (name for display, id because names change). */
export function actor(): { name: string; id: string | null } {
  const st = useCRMStore.getState()
  return { name: st.currentUserName || 'Someone', id: st.currentUserId }
}
export const eventsFor = (requestId: string) => events.filter((e) => e.request_id === requestId)
export async function logEvent(requestId: string | null | undefined, action: AnfRequestEvent['action'], detail?: string | null) {
  if (!requestId) return
  const who = actor()
  const e: AnfRequestEvent = { id: mkId(), request_id: requestId, action, detail: detail ?? null, actor: who.name, actor_id: who.id, at: new Date().toISOString() }
  events = [...events, e]
  emit()
  if (!isSupabaseConfigured) return
  const { error } = await supabase.from('anf_request_events').insert(e)
  if (error) console.warn('[purchasing] history write failed', error.message)
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
export const APPROVER_EMAIL = 'champ@sixsheet.me'
/** The one person who normally makes POs; anyone else can only in an emergency (with a reason). */
export const BUYER_EMAIL = 'admin@sixsheet.me'

/** Mock mode has no Champ — the mock admin stands in so the flow can be clicked through. */
export function isApprover(email?: string | null, role?: string | null): boolean {
  if (!email) return false
  if (email.toLowerCase() === APPROVER_EMAIL) return true
  return !isSupabaseConfigured && role === 'admin'
}

/** Mock mode has no admin@ — the mock admin stands in so the buyer flow can be clicked through. */
export function isBuyer(email?: string | null, role?: string | null): boolean {
  if (!email) return false
  if (email.toLowerCase() === BUYER_EMAIL) return true
  return !isSupabaseConfigured && role === 'admin'
}
const memberByEmail = (email: string) => {
  const st = useCRMStore.getState()
  return st.teamMembers.find((x) => x.email?.toLowerCase() === email) ?? (!isSupabaseConfigured ? st.teamMembers.find((x) => x.role === 'admin') : undefined)
}
/** Tell the buyer an approved request is ready to order. */
function notifyBuyer(r: AnfRequest, total: number, by: string) {
  const m = memberByEmail(BUYER_EMAIL)
  if (!m) return
  notify({ recipient_id: m.id, recipient_name: m.name || m.email, actor: by,
    entity_type: 'anf_request', entity_id: r.request_id, entity_name: `${r.number} · ${r.project_name || 'request'}`,
    message: `approved · ready to order · ฿${total.toLocaleString('en-US')}`, read: false, board_id: 'anf-order' })
}
/** Emergency PO: Champ and the buyer both hear about it. */
export function notifyEmergencyPO(po: AnfPO, total: number, requestId: string | null) {
  const seen = new Set<string>()
  for (const email of [APPROVER_EMAIL, BUYER_EMAIL]) {
    const m = memberByEmail(email)
    if (!m || seen.has(m.id)) continue
    seen.add(m.id)
    notify({ recipient_id: m.id, recipient_name: m.name || m.email, actor: po.emergency_by || 'Someone',
      entity_type: 'anf_request', entity_id: requestId ?? po.po_id, entity_name: `${po.number} · ฿${total.toLocaleString('en-US')}`,
      message: `made an emergency PO: “${po.emergency_reason ?? ''}”`, read: false, board_id: 'anf-order' })
  }
}

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
  const m = st.teamMembers.find((x) => (r.created_by_id && x.id === r.created_by_id) || x.name === r.created_by || x.email === r.created_by)
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
  const auto = !needsApproval(total)
  const who = actor()
  const next: AnfRequest = { ...r, total_thb: total, submitted_at: now, submitted_by: who.name, submitted_by_id: who.id, rejected_reason: null,
    ...(auto ? { status: 'approved', approved_by: 'auto', approved_by_id: null, approved_at: now } : { status: 'pending', approved_by: null, approved_by_id: null, approved_at: null }) }
  await saveRequest(next)
  void logEvent(r.request_id, 'submitted', `฿${total.toLocaleString('en-US')} · ${auto ? 'approved automatically (under ฿10,000)' : 'sent to Champ for approval'}`)
  if (!auto) notifyApprover(next, total)
  else notifyBuyer(next, total, 'Auto-approved')
  return next
}
export async function approveRequest(r: AnfRequest, items: AnfOrder[], by: string): Promise<AnfRequest> {
  const next: AnfRequest = { ...r, status: 'approved', total_thb: requestTotal(items), approved_by: by, approved_by_id: actor().id, approved_at: new Date().toISOString(), rejected_reason: null }
  await saveRequest(next)
  void logEvent(r.request_id, 'approved', `฿${(next.total_thb ?? 0).toLocaleString('en-US')}`)
  notifyRequester(next, 'approved your request')
  notifyBuyer(next, next.total_thb ?? 0, by)
  return next
}
export async function rejectRequest(r: AnfRequest, reason: string): Promise<AnfRequest> {
  const next: AnfRequest = { ...r, status: 'rejected', rejected_reason: reason, approved_by: null, approved_by_id: null, approved_at: null }
  await saveRequest(next)
  void logEvent(r.request_id, 'rejected', reason)
  notifyRequester(next, `rejected your request: ${reason}`)
  return next
}
/** Withdraw a waiting (or rejected) request back to draft so it can be edited. */
export async function withdrawRequest(r: AnfRequest): Promise<AnfRequest> {
  const next: AnfRequest = { ...r, status: 'draft', submitted_at: null, approved_by: null, approved_by_id: null, approved_at: null }
  await saveRequest(next)
  void logEvent(r.request_id, 'withdrawn', 'back to draft to edit')
  return next
}

