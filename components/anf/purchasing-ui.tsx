'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { Trash2, Upload, Check } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ANF_ACCENT, SEED_BRANCHES, baht, kindOf } from '@/lib/anf'
import { jobCardName } from '@/lib/jobs'
import { useSuppliers, preferredFor, linksFor, saveLink, newLink } from '@/lib/supabase/suppliers'
import {
  usePurchasing, saveRequest, savePO, newPurchasingId, nextRequestNumber, nextPONumber, itemTotal,
  submitRequest, approveRequest, rejectRequest, withdrawRequest, deleteRequest, requestTotal, lineTotalVat, lineRules, receivePlan, approvalOf, isApprover, requestStatus, REQ_STATUS, APPROVAL_LIMIT_THB, type ReqStatus,
} from '@/lib/supabase/purchasing'
import type { AnfOrder, AnfRequest, AnfPO, AnfProduct, AnfAsset, WonJob } from '@/types'
import { useAssets, saveAsset, moveAsset, newAssetId, nextCode, prefixFor, RACKS, SHELVES } from '@/lib/supabase/assets'

export const inputCls = 'h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-foreground/40'

export function useMe() {
  const { user } = useAuth()
  return (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null
}

/** A blank purchasing item (an anf_orders row) — receiving / stock top-up works as before. */
export function newItem(p: Partial<AnfOrder> & { item: string }): AnfOrder {
  const now = new Date().toISOString()
  return {
    order_id: newPurchasingId(), board_id: 'anf-order', product_id: null, description: null,
    quantity: 1, unit_price: 0, with_vat: true, branch: null, ordered_at: null, needed_by: null,
    remind_option: 'none', remind_at: null, requested_by: null, ordered_by: null, assignee_ids: [],
    status: 'to_order', received_at: null, received_qty: null, received_by: null, stock_id: null,
    supplier_id: null, request_id: null, po_id: null, unit: null, notes: null, created_at: now, updated_at: now,
    ...p,
  }
}

// ── Project chip ─────────────────────────────────────────────────────────────
export function ProjectChip({ r, job, fallback }: { r?: AnfRequest | null; job?: WonJob | null; fallback?: string }) {
  if (!r || r.project_kind === 'refill') return <span className="rounded-full px-2 py-px text-[11px] font-semibold bg-[#FF5B3F]/12 text-[#FF5B3F]">{fallback ?? 'Stock refill'}</span>
  if (r.project_kind === 'job') return <span className="rounded-full px-2 py-px text-[11px] font-semibold bg-orange-500/12 text-orange-700 dark:text-orange-400">#{job?.job_number ?? '—'}</span>
  return <span className="rounded-full px-2 py-px text-[11px] font-semibold bg-muted text-foreground">Project</span>
}
export function projectTitle(r: AnfRequest | null | undefined, job: WonJob | null | undefined, item?: AnfOrder) {
  if (!r) return item ? `${item.item} ×${item.quantity}` : 'Stock refill'
  if (r.project_kind === 'job') return job ? jobCardName(job) : 'Won job'
  if (r.project_kind === 'refill') return r.project_name || 'Stock refill'
  return r.project_name || 'Untitled project'
}

// ── Request dialog (new / edit) ─────────────────────────────────────────────
const STEPS = ['Request', 'Approve', 'Order', 'Receive'] as const
/** Which step of Request → Approve → Order → Receive a request is on (0-based). */
function stepOf(s: ReqStatus): number {
  if (s === 'draft' || s === 'rejected' || s === 'empty') return 0
  if (s === 'pending') return 1
  if (s === 'to_order') return 2
  return 3
}
export function StepBar({ status }: { status: ReqStatus }) {
  const at = stepOf(status)
  const done = status === 'received'
  return (
    <div className="flex gap-1 px-5 py-2 border-b border-border text-[12px]">
      {STEPS.map((label, i) => (
        <span key={label} className={cn('flex-1 rounded-md py-1 text-center',
          i < at || done ? 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400' : i === at ? 'bg-foreground text-background font-semibold' : 'bg-muted text-muted-foreground')}>
          {i < at || done ? '✓ ' : `${i + 1} `}{label}
        </span>
      ))}
    </div>
  )
}

export interface RequestPrefill { item: string; product_id?: string | null; description?: string | null; branch?: string | null; unit_price?: number; quantity?: number; supplier_id?: string | null }

export function RequestDialog({ request, prefill, onClose, onCreatePO }: {
  request: AnfRequest | null      // null = new
  prefill?: RequestPrefill | RequestPrefill[]   // Stock / Catalog → Reorder: a refill request with these lines
  onClose: () => void
  onCreatePO: (items: AnfOrder[]) => void
}) {
  const { requests, pos, loaded } = usePurchasing()
  const { suppliers } = useSuppliers()
  const anfOrders = useCRMStore((s) => s.anfOrders)
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const addAnfOrder = useCRMStore((s) => s.addAnfOrder)
  const updateAnfOrder = useCRMStore((s) => s.updateAnfOrder)
  const deleteAnfOrder = useCRMStore((s) => s.deleteAnfOrder)
  const addAnfProduct = useCRMStore((s) => s.addAnfProduct)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const me = useMe()
  const { user, role } = useAuth()
  const approver = isApprover(user?.email, role)
  const lines = prefill ? (Array.isArray(prefill) ? prefill : [prefill]) : []
  const firstBranch = lines.find((l) => l.branch)?.branch ?? null
  const [r, setR] = useState<AnfRequest>(() => request ?? {
    request_id: newPurchasingId(), board_id: activeBoardId || 'anf-order', number: nextRequestNumber(requests.map((x) => x.number)),
    project_kind: lines.length ? 'refill' : 'free', job_id: null, project_name: firstBranch ? `Refill · ${firstBranch}` : '', needed_by: null,
    deliver_to: firstBranch || 'WAREHOUSE', created_by: me, status: 'draft',
  })
  const [rejecting, setRejecting] = useState<string | null>(null)   // reason being typed
  const [saved, setSaved] = useState(!!request)
  const [q, setQ] = useState('')
  const [receiving, setReceiving] = useState<AnfOrder | null>(null)
  const [error, setError] = useState<string | null>(null)
  const items = anfOrders.filter((o) => o.request_id === r.request_id).sort((a, b) => a.created_at.localeCompare(b.created_at))
  const [jobsFrom] = useState(() => new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10))
  const jobs = useMemo(() => wonJobs.filter((j) => !j.is_archived && ((j.event_end_date || j.event_date || '') >= jobsFrom || j.job_id === r.job_id))
    .sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? '')), [wonJobs, jobsFrom, r.job_id])
  const products = anfProducts.filter((p) => !activeBoardId || !p.board_id || p.board_id === activeBoardId)
  const matches = q.trim() ? products.filter((p) => [p.name, p.code, ...(p.aliases ?? [])].some((v) => (v ?? '').toLowerCase().includes(q.trim().toLowerCase()))).slice(0, 6) : []
  const anfStock = useCRMStore((s) => s.anfStock)
  const stockOf = (pid: string) => anfStock.filter((x) => x.product_id === pid).reduce((t, x) => t + (x.qty || 0), 0)
  const net = items.reduce((t, o) => t + itemTotal(o), 0)
  const grand = requestTotal(items)
  const appr = approvalOf(r)
  const st = requestStatus(items, r)
  const editable = appr === 'draft' || appr === 'rejected'
  const orderable = appr === 'approved' ? items.filter((o) => o.status === 'to_order' && !o.po_id) : []
  const poOf = (id?: string | null) => (id ? pos.find((p) => p.po_id === id) : undefined)

  // A new request takes its number when first saved, from the requests loaded by then
  // (numbering at open time could reuse a number if the list hadn't loaded yet).
  const numbered = (x: AnfRequest) => (saved ? x : { ...x, number: nextRequestNumber(requests.map((n) => n.number)) })

  // Stock → Reorder: create the draft with its one line as soon as the dialog opens (once).
  const seeded = useRef(false)
  useEffect(() => {
    if (!lines.length || request || seeded.current || !loaded) return
    seeded.current = true
    let live = true
    ;(async () => {
      const first = numbered(r)
      await saveRequest(first); if (live) setR(first)
      for (const l of lines) {
        const pref = l.product_id ? preferredFor(l.product_id) : null
        await addAnfOrder(newItem({
          item: l.item, product_id: l.product_id ?? null, description: l.description ?? null,
          quantity: l.quantity ?? 1, unit: pref?.unit ?? null, unit_price: l.unit_price ?? pref?.price ?? 0,
          supplier_id: l.supplier_id ?? pref?.supplier_id ?? null, request_id: r.request_id, board_id: r.board_id, branch: r.deliver_to ?? null, requested_by: me,
        }))
      }
      if (live) setSaved(true)
    })().catch((e: Error) => live && setError(e.message))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  async function act(fn: () => Promise<AnfRequest>) {
    try { setError(null); setR(await fn()) } catch (e) { setError((e as Error).message) }
  }
  /** Submit needs a project and a qty + price on every line (the price is what Champ approves). */
  function submitProblem(): string | null {
    if (items.length === 0) return 'Add at least one item.'
    if (r.project_kind === 'job' && !r.job_id) return 'Pick the Won job.'
    const bad = items.find((o) => !(o.quantity > 0) || !(o.unit_price > 0))
    if (bad) return `Set the qty and price for “${bad.item}”.`
    return null
  }
  async function submit() {
    const why = submitProblem()
    if (why) { setError(why); return }
    await act(() => submitRequest(r, items))
  }
  async function deleteDraft() {
    if (!window.confirm(`Delete ${r.number} and its ${items.length} item(s)?`)) return
    try { for (const o of items) await deleteAnfOrder(o.order_id); await deleteRequest(r.request_id); onClose() } catch (e) { setError((e as Error).message) }
  }

  async function ensureSaved(next = r) {
    if (next.project_kind === 'job' && !next.job_id) throw new Error('Pick the Won job.')
    if (saved) return
    const first = numbered(next)
    await saveRequest(first); setR(first); setSaved(true)
  }
  const patch = (p: Partial<AnfRequest>) => { const next = { ...r, ...p }; setR(next); if (saved) saveRequest(next).catch((e: Error) => setError(e.message)) }

  async function addItem(p: AnfProduct | null) {
    const text = p ? p.name : q.trim()
    if (!text) return
    try {
      setError(null)
      await ensureSaved()
      const pref = p ? preferredFor(p.product_id) : null
      await addAnfOrder(newItem({
        item: text, product_id: p?.product_id ?? null, description: p?.code ?? null, unit: pref?.unit ?? p?.unit ?? null,
        unit_price: pref?.price ?? 0, supplier_id: pref?.supplier_id ?? null, request_id: r.request_id,
        board_id: r.board_id, branch: r.deliver_to ?? null, needed_by: r.needed_by ?? null, requested_by: me,
      }))
      setQ('')
    } catch (e) { setError((e as Error).message) }
  }
  const upd = (o: AnfOrder, p: Partial<AnfOrder>) => void updateAnfOrder(o.order_id, p)
  /** A typed-in line becomes a catalog item (with its supplier + price), so it can be found and reordered next time. */
  async function saveToCatalog(o: AnfOrder) {
    try {
      const existing = products.find((p) => p.name.trim().toLowerCase() === o.item.trim().toLowerCase())
      const p: AnfProduct = existing ?? { product_id: newPurchasingId(), board_id: r.board_id || 'anf-order', name: o.item.trim(), code: o.description ?? null, category: 'other', unit: o.unit ?? null, kind: 'supply' }
      if (!existing) await addAnfProduct(p)
      if (o.supplier_id && !linksFor(p.product_id).some((l) => l.supplier_id === o.supplier_id)) {
        await saveLink({ ...newLink(p.product_id, o.supplier_id, linksFor(p.product_id).length === 0), price: o.unit_price || null, unit: o.unit ?? null })
      }
      await updateAnfOrder(o.order_id, { product_id: p.product_id })
    } catch (e) { setError((e as Error).message) }
  }
  const num = (v: string) => { const n = parseFloat(v.replace(/,/g, '')); return Number.isFinite(n) ? n : 0 }
  const limit = baht(APPROVAL_LIMIT_THB)
  const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

  // One main action per step, in the footer.
  let hint: React.ReactNode = null
  let main: React.ReactNode = null
  if (editable) {
    hint = appr === 'rejected'
      ? <span className="text-red-700 dark:text-red-400"><b>Rejected{r.rejected_reason ? `: “${r.rejected_reason}”` : ''}.</b> Edit it and send again.</span>
      : grand >= APPROVAL_LIMIT_THB ? <span className="text-amber-700 dark:text-amber-400">{limit} or more → Champ will approve it</span>
      : items.length ? `Under ${limit} → approved straight away` : 'Add items, then submit'
    main = <Button size="sm" className="h-9" disabled={items.length === 0} onClick={() => void submit()}>{grand >= APPROVAL_LIMIT_THB ? 'Send for approval →' : 'Submit →'}</Button>
  } else if (appr === 'pending') {
    hint = approver ? <span className="text-amber-700 dark:text-amber-400">Needs your approval</span> : <span className="text-amber-700 dark:text-amber-400">Waiting for Champ{r.submitted_at ? ` · sent ${when(r.submitted_at)}` : ''}</span>
    main = approver ? (rejecting === null ? (
      <span className="flex gap-2">
        <Button size="sm" variant="outline" className="h-9 text-destructive" onClick={() => setRejecting('')}>Reject…</Button>
        <Button size="sm" className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => void act(() => approveRequest(r, items, me || 'Champ'))}>Approve ✓</Button>
      </span>
    ) : (
      <span className="flex w-full sm:w-auto gap-2">
        <input autoFocus value={rejecting} onChange={(e) => setRejecting(e.target.value)} placeholder="Reason (required)" className={cn(inputCls, 'sm:w-64')}
          onKeyDown={(e) => { if (e.key === 'Enter' && rejecting.trim()) void act(() => rejectRequest(r, rejecting.trim())).then(() => setRejecting(null)) }} />
        <Button size="sm" variant="outline" className="h-9" onClick={() => setRejecting(null)}>Cancel</Button>
        <Button size="sm" className="h-9 bg-destructive text-white hover:opacity-90" disabled={!rejecting.trim()} onClick={() => void act(() => rejectRequest(r, rejecting.trim())).then(() => setRejecting(null))}>Reject</Button>
      </span>
    )) : <Button size="sm" variant="outline" className="h-9" onClick={() => void act(() => withdrawRequest(r))}>Withdraw to edit</Button>
  } else {
    hint = <span className="text-emerald-700 dark:text-emerald-400">{r.approved_by === 'auto' ? `Approved automatically (under ${limit})` : r.approved_by ? `Approved by ${r.approved_by}` : 'Approved'}{r.approved_at ? ` · ${when(r.approved_at)}` : ''}</span>
    if (orderable.length) main = <Button size="sm" className="h-9 bg-foreground text-background hover:opacity-90" onClick={() => onCreatePO(orderable)}>Create PO →</Button>
    else if (st.status === 'to_order' && items.some((o) => poOf(o.po_id)?.status === 'draft')) main = <Link href="/anf-order/pos" className="text-[13px] underline">Mark the PO ordered →</Link>
    else if (st.status === 'ordered' || st.status === 'partial') main = <Link href="/anf-order/pos" className="text-[13px] underline">Receive on the PO →</Link>
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-[920px] max-w-[96vw] p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="font-mono text-[16px] font-bold">{numbered(r).number}</DialogTitle>
          <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-semibold', REQ_STATUS[st.status].cls)}>{st.status === 'partial' ? `${st.received}/${st.total} received` : REQ_STATUS[st.status].label}</span>
          <span className="text-[12px] text-muted-foreground">{saved ? `by ${r.created_by ?? '—'}` : 'new request'}</span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1" aria-label="Close">✕</button>
        </div>
        <StepBar status={st.status} />

        <div className="overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 px-5 py-3 border-b border-border">
            <div className="sm:col-span-2">
              <label className="field-label">Project</label>
              <div className="flex gap-1.5">
                <select disabled={!editable} value={r.project_kind} onChange={(e) => patch({ project_kind: e.target.value as AnfRequest['project_kind'], job_id: null })} className={cn(inputCls, 'w-32 shrink-0')}>
                  <option value="job">Won job</option><option value="free">Project</option><option value="refill">Stock refill</option>
                </select>
                {r.project_kind === 'job' ? (
                  <select disabled={!editable} value={r.job_id ?? ''} onChange={(e) => patch({ job_id: e.target.value || null })} className={inputCls}>
                    <option value="">Pick a job…</option>
                    {jobs.map((j) => <option key={j.job_id} value={j.job_id}>#{j.job_number ?? '—'} · {j.event_date ?? ''} · {jobCardName(j)}</option>)}
                  </select>
                ) : (
                  <input disabled={!editable} value={r.project_name ?? ''} onChange={(e) => setR({ ...r, project_name: e.target.value })} onBlur={() => saved && saveRequest(r).catch((e: Error) => setError(e.message))}
                    placeholder={r.project_kind === 'refill' ? 'Stock refill' : 'e.g. Phuket branch refit'} className={inputCls} />
                )}
              </div>
            </div>
            <div><label className="field-label">Needed by</label><input type="date" value={r.needed_by ?? ''} onChange={(e) => patch({ needed_by: e.target.value || null })} className={inputCls} /></div>
            <div><label className="field-label">Deliver to</label>
              <select value={r.deliver_to ?? ''} onChange={(e) => patch({ deliver_to: e.target.value || null })} className={inputCls}>
                {SEED_BRANCHES.map((b) => <option key={b} value={b}>{b === 'WAREHOUSE' ? 'Warehouse' : b}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[780px]">
              <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border bg-muted/40">
                <th className="px-3 py-2 w-8">#</th><th className="px-2 py-2">ITEM</th><th className="px-2 py-2 w-20 text-right">QTY</th><th className="px-2 py-2 w-20">UNIT</th>
                <th className="px-2 py-2 w-24 text-right">UNIT ฿</th><th className="px-2 py-2 w-12 text-center">VAT</th><th className="px-2 py-2 w-40">SUPPLIER</th><th className="px-2 py-2 w-24 text-right">TOTAL</th><th className="px-2 py-2 w-28">WHERE</th><th className="w-8" />
              </tr></thead>
              <tbody>
                {items.map((o, i) => {
                  const rule = lineRules(r, o)
                  const linked = linksFor(o.product_id).map((l) => l.supplier_id)
                  const po = poOf(o.po_id)
                  return (
                    <tr key={o.order_id} className="border-b border-border align-top">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className={cn('px-2 py-2', !o.product_id && 'shadow-[inset_3px_0_0_#e8f25c]')}>
                        <div className="font-medium">{o.item}</div>
                        <div className="text-[11px] text-muted-foreground">{o.description || (o.product_id ? 'catalog' : 'manual item')}
                          {!o.product_id && <button type="button" onClick={() => void saveToCatalog(o)} className="ml-1.5 underline text-[#7A5AA5]">＋ Save to catalog</button>}</div>
                      </td>
                      <td className="px-2 py-1.5"><input disabled={!rule.editQtyPrice} defaultValue={o.quantity} onBlur={(e) => num(e.target.value) !== o.quantity && upd(o, { quantity: num(e.target.value) })} className={cn(inputCls, 'h-8 text-right font-mono')} /></td>
                      <td className="px-2 py-1.5"><input disabled={!rule.editQtyPrice} defaultValue={o.unit ?? ''} onBlur={(e) => (e.target.value || null) !== (o.unit ?? null) && upd(o, { unit: e.target.value || null })} className={cn(inputCls, 'h-8')} /></td>
                      <td className="px-2 py-1.5"><input disabled={!rule.editQtyPrice} defaultValue={o.unit_price || ''} placeholder="price" onBlur={(e) => num(e.target.value) !== o.unit_price && upd(o, { unit_price: num(e.target.value) })} className={cn(inputCls, 'h-8 text-right font-mono')} /></td>
                      <td className="px-2 py-2 text-center"><input type="checkbox" disabled={!rule.editQtyPrice} checked={o.with_vat} onChange={(e) => upd(o, { with_vat: e.target.checked })} className="w-4 h-4 accent-foreground" aria-label="Add 7% VAT" /></td>
                      <td className="px-2 py-1.5">
                        <select disabled={!rule.editSupplier} value={o.supplier_id ?? ''} onChange={(e) => upd(o, { supplier_id: e.target.value || null })} className={cn(inputCls, 'h-8')}>
                          <option value="">— pick —</option>
                          {[...suppliers].sort((a, b) => Number(linked.includes(b.supplier_id)) - Number(linked.includes(a.supplier_id))).map((s) => <option key={s.supplier_id} value={s.supplier_id}>{s.name}{linked.includes(s.supplier_id) ? ' ★' : ''}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-right font-mono">{lineTotalVat(o) ? baht(Math.round(lineTotalVat(o))) : '—'}</td>
                      <td className="px-2 py-1.5 text-[12px]">
                        {o.status === 'received'
                          ? <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Check className="w-3.5 h-3.5" />{o.received_qty ?? o.quantity}/{o.quantity}</span>
                          : po?.status === 'ordered'
                          ? <button type="button" onClick={() => setReceiving(o)} className="h-8 rounded-md border border-border px-2 hover:bg-muted">Receive…</button>
                          : po ? <span className="font-mono text-muted-foreground">{po.number} · draft</span>
                          : <span className="text-muted-foreground">{appr === 'approved' ? 'not on a PO yet' : '—'}</span>}
                      </td>
                      <td className="px-1 py-2">{rule.remove && <button type="button" onClick={() => { if (window.confirm(`Remove “${o.item}”?`)) void deleteAnfOrder(o.order_id) }} className="text-muted-foreground hover:text-destructive" aria-label="Remove"><Trash2 className="w-4 h-4" /></button>}</td>
                    </tr>
                  )
                })}
                {editable ? (
                  <tr>
                    <td />
                    <td colSpan={9} className="px-2 py-2 relative">
                      <input value={q} onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addItem(matches.length === 1 && matches[0].name.toLowerCase() === q.trim().toLowerCase() ? matches[0] : null) } }}
                        placeholder="＋ Add item — search the catalog, or type a name and press Enter for a manual item" className={cn(inputCls, 'border-dashed')} />
                      {matches.length > 0 && (
                        <div className="absolute z-10 left-2 right-2 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                          {matches.map((p) => (
                            <button key={p.product_id} type="button" onClick={() => void addItem(p)} className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-muted">
                              <span className="flex items-baseline gap-2">
                              <span className="min-w-0 truncate">{p.name}{p.code && <span className="text-muted-foreground"> · {p.code}</span>}</span>
                              <span className="ml-auto shrink-0 text-[12px] text-muted-foreground">stock {stockOf(p.product_id)}{preferredFor(p.product_id) && <> · ★ {preferredFor(p.product_id)?.price != null ? baht(preferredFor(p.product_id)!.price!) : 'supplier'}</>}</span>
                            </span>
                            </button>
                          ))}
                          <button type="button" onClick={() => void addItem(null)} className="w-full text-left px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted border-t border-border">＋ Add “{q.trim()}” as a manual item</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  <tr><td /><td colSpan={9} className="px-2 py-2 text-[12px] text-muted-foreground">{appr === 'pending' ? 'Locked while waiting for approval.' : 'Approved items are locked. Need more? Start a new request.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end items-baseline gap-3 px-5 py-3">
            <span className="text-[13px] text-muted-foreground">{baht(net)} + VAT</span>
            <b className="font-mono text-[18px]">{baht(grand)}</b>
          </div>
        </div>
        {error && <p className="px-5 py-2 text-[12px] text-destructive border-t border-border">{error}</p>}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-t border-border">
          {editable && saved && <button type="button" onClick={() => void deleteDraft()} className="text-[12px] text-muted-foreground hover:text-destructive">Delete</button>}
          <span className="mr-auto text-[13px] min-w-0">{hint}</span>
          {main}
        </div>
        {receiving && <ReceiveDialog order={receiving} onClose={() => setReceiving(null)} />}
      </DialogContent>
    </Dialog>
  )
}

// ── Receive ──────────────────────────────────────────────────────────────────
/** Count what arrived. Short delivery: keep the rest on order, or close the line short. */
export function ReceiveDialog({ order, onClose }: { order: AnfOrder; onClose: () => void }) {
  const updateAnfOrder = useCRMStore((s) => s.updateAnfOrder)
  const addAnfOrder = useCRMStore((s) => s.addAnfOrder)
  const me = useMe()
  const [arrived, setArrived] = useState(String(order.quantity))
  const [keepRest, setKeepRest] = useState(true)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [by, setBy] = useState(me ?? '')
  const [error, setError] = useState<string | null>(null)
  const n = parseInt(arrived, 10)
  const valid = Number.isFinite(n) && n > 0 && n <= order.quantity
  const missing = valid ? order.quantity - n : 0
  // Assets (camera, light…) become numbered units in Assets instead of stock.
  const product = useCRMStore((s) => s.anfProducts.find((p) => p.product_id === order.product_id))
  const isAsset = kindOf(product) === 'asset'
  const { assets } = useAssets()
  const [rack, setRack] = useState(RACKS[0])
  const [shelf, setShelf] = useState(SHELVES[0])
  const codes = useMemo(() => {
    if (!isAsset || !valid) return []
    const taken = assets.map((a) => a.code); const out: string[] = []
    for (let i = 0; i < n; i++) { const c = nextCode(prefixFor(product?.category), [...taken, ...out]); out.push(c) }
    return out
  }, [isAsset, valid, n, assets, product?.category])

  async function confirm() {
    if (!valid) { setError(`Enter 1 to ${order.quantity}.`); return }
    try {
      const plan = receivePlan(order, n, keepRest)
      await updateAnfOrder(order.order_id, { ...plan.patch, received_at: date, received_by: by.trim() || null })
      if (plan.rest) await addAnfOrder(plan.rest)
      // Price memory: the supplier's price for this item becomes what was just paid.
      if (order.product_id && order.supplier_id && order.unit_price > 0) {
        const link = linksFor(order.product_id).find((l) => l.supplier_id === order.supplier_id)
        if (!link) await saveLink({ ...newLink(order.product_id, order.supplier_id, linksFor(order.product_id).length === 0), price: order.unit_price, unit: order.unit ?? null })
        else if (link.price !== order.unit_price) await saveLink({ ...link, price: order.unit_price })
      }
      if (isAsset && product) {
        const slot = `${rack}-${shelf}`
        for (const code of codes) {
          const a: AnfAsset = { asset_id: newAssetId(), board_id: order.board_id || 'anf-order', code, product_id: product.product_id, location_kind: 'rack', location_slot: slot,
            job_id: null, purchase_date: date, value_thb: order.unit_price || null }
          await saveAsset(a)
          await moveAsset(a, { kind: 'rack', slot, job_id: null }, { from: '—', to: `New · ${rack} · ${shelf}` }, by.trim() || me, 'Received')
        }
      }
      onClose()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border"><DialogTitle className="text-[15px] font-semibold">Receive · {order.item}</DialogTitle></div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3 text-[13px]">
          <div><label className="field-label">Ordered</label><div className="h-9 flex items-center font-mono">{order.quantity}{order.unit ? ` ${order.unit}` : ''}</div></div>
          <div><label className="field-label">Arrived</label><input type="number" min={1} max={order.quantity} value={arrived} onChange={(e) => setArrived(e.target.value)} className={cn(inputCls, 'font-mono')} autoFocus /></div>
          <div><label className="field-label">Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
          <div><label className="field-label">Received by</label><input value={by} onChange={(e) => setBy(e.target.value)} className={inputCls} /></div>
          {missing > 0 && (
            <div className="col-span-2 flex flex-col gap-2">
              <span className="text-muted-foreground">{missing} still missing:</span>
              {[{ v: true, t: `Keep ${missing} on order`, d: 'The supplier will send the rest.' }, { v: false, t: 'Close short', d: `Not coming — this line closes at ${n}.` }].map((o) => (
                <label key={String(o.v)} className={cn('flex gap-2 rounded-lg border px-3 py-2 cursor-pointer', keepRest === o.v ? 'border-foreground' : 'border-border')}>
                  <input type="radio" checked={keepRest === o.v} onChange={() => setKeepRest(o.v)} className="mt-1 accent-foreground" />
                  <span><b>{o.t}</b><br /><span className="text-[12px] text-muted-foreground">{o.d}</span></span>
                </label>
              ))}
            </div>
          )}
          {isAsset && valid && (
            <div className="col-span-2 rounded-lg bg-muted px-3 py-2 flex flex-wrap items-center gap-2">
              <span className="w-full">Creates <b className="font-mono">{codes.join(', ')}</b> in Assets</span>
              <span className="text-muted-foreground">Put on</span>
              <select value={rack} onChange={(e) => setRack(e.target.value)} className={cn(inputCls, 'h-8 w-20')}>{RACKS.map((x) => <option key={x}>{x}</option>)}</select>
              <select value={shelf} onChange={(e) => setShelf(e.target.value)} className={cn(inputCls, 'h-8 w-24')}>{SHELVES.map((x) => <option key={x} value={x}>Shelf {x}</option>)}</select>
            </div>
          )}
          {error && <p className="col-span-2 text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <span className="mr-auto text-[12px] text-muted-foreground">{isAsset ? 'Assets get units, not stock' : 'Adds to Warehouse stock'}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!valid} onClick={() => void confirm()}>{isAsset && valid ? `Receive & create ${n} unit${n > 1 ? 's' : ''}` : `Receive ${valid ? n : ''}`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Create PO ────────────────────────────────────────────────────────────────
export function CreatePODialog({ items, onClose, onDone }: { items: AnfOrder[]; onClose: () => void; onDone?: (n: number) => void }) {
  const { pos } = usePurchasing()
  const { suppliers } = useSuppliers()
  const updateAnfOrder = useCRMStore((s) => s.updateAnfOrder)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const me = useMe()
  const [joinOpen, setJoinOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const eligible = items.filter((o) => o.status !== 'received' && !o.po_id)
  const groups = useMemo(() => {
    const m = new Map<string, AnfOrder[]>()
    for (const o of eligible) { const k = o.supplier_id ?? ''; m.set(k, [...(m.get(k) ?? []), o]) }
    return [...m.entries()].map(([sid, list]) => ({ sid, list, supplier: suppliers.find((s) => s.supplier_id === sid) ?? null, open: pos.find((p) => p.supplier_id === sid && p.status === 'draft') ?? null }))
      .sort((a, b) => Number(!a.sid) - Number(!b.sid))
  }, [eligible, suppliers, pos])
  const real = groups.filter((g) => g.sid)

  async function create() {
    setBusy(true); setError(null)
    try {
      const numbers = pos.map((p) => p.number)
      for (const g of real) {
        let po: AnfPO | null = joinOpen ? g.open : null
        if (!po) {
          po = { po_id: newPurchasingId(), board_id: activeBoardId || 'anf-order', number: nextPONumber(numbers), supplier_id: g.sid, status: 'draft', created_by: me }
          numbers.push(po.number)
          await savePO(po)
        }
        for (const o of g.list) await updateAnfOrder(o.order_id, { po_id: po.po_id })
      }
      onDone?.(real.length); onClose()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="text-[15px] font-bold">Create PO</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4 space-y-2 max-h-[60vh] overflow-y-auto">
          <p className="text-[12px] text-muted-foreground">Items are grouped by supplier — one PO each. Items without a supplier stay “To order”.</p>
          {groups.map((g) => (
            <div key={g.sid || 'none'} className={cn('rounded-lg border px-3 py-2', g.sid ? 'border-border' : 'border-dashed border-border')}>
              <div className="flex items-center justify-between gap-2">
                <b className="text-[13px]">{g.supplier?.name ?? (g.sid ? 'Unknown supplier' : 'No supplier')}</b>
                <span className="font-mono text-[13px]">{baht(requestTotal(g.list))} <span className="text-[11px] text-muted-foreground">incl. VAT</span></span>
              </div>
              <div className="text-[12px] text-muted-foreground">
                {g.list.length} item{g.list.length > 1 ? 's' : ''} · {g.list.map((o) => o.item).slice(0, 3).join(', ')}{g.list.length > 3 ? '…' : ''}
                {g.sid ? (g.open && joinOpen ? ` · add to ${g.open.number} (draft)` : ' · new PO') : ' · order later'}
              </div>
            </div>
          ))}
          {real.some((g) => g.open) && (
            <label className="flex items-center gap-2 text-[12px] pt-1"><input type="checkbox" checked={joinOpen} onChange={(e) => setJoinOpen(e.target.checked)} className="accent-foreground" />Add to the supplier&apos;s open draft PO when there is one</label>
          )}
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" disabled={busy || real.length === 0} onClick={create}>
            {real.length === 0 ? 'Pick suppliers first' : `Create ${real.length} PO${real.length > 1 ? 's' : ''}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Import Excel / CSV ──────────────────────────────────────────────────────
interface Row { project: string; item: string; qty: number; unit: string; price: number; supplier: string; product: AnfProduct | null; supplierId: string | null }

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const { requests } = usePurchasing()
  const { suppliers } = useSuppliers()
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const addAnfOrder = useCRMStore((s) => s.addAnfOrder)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const me = useMe()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const jobFor = (project: string): WonJob | null => {
    const n = /^#?\s*(\d{1,5})\b/.exec(project.trim())?.[1]
    return n ? wonJobs.find((j) => parseInt(j.job_number ?? '', 10) === parseInt(n, 10)) ?? null : null
  }

  async function onFile(f: File) {
    setError(null); setFileName(f.name)
    try {
      const buf = await f.arrayBuffer()
      const wb = f.name.toLowerCase().endsWith('.csv') ? XLSX.read(new TextDecoder('utf-8').decode(buf), { type: 'string' }) : XLSX.read(new Uint8Array(buf), { type: 'array' })
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' })
      const pick = (r: Record<string, unknown>, ...keys: string[]) => {
        const k = Object.keys(r).find((x) => keys.includes(norm(x)))
        return k ? String(r[k] ?? '').trim() : ''
      }
      const out: Row[] = raw.map((r) => {
        const item = pick(r, 'item', 'items', 'product', 'name', 'สินค้า', 'รายการ')
        const supplier = pick(r, 'supplier', 'vendor', 'ผู้ขาย')
        const product = anfProducts.find((p) => norm(p.name) === norm(item) || (!!p.code && norm(p.code) === norm(item))) ?? null
        return {
          project: pick(r, 'project', 'job', 'โปรเจค', 'โปรเจกต์') || 'Imported',
          item, qty: parseFloat(pick(r, 'qty', 'quantity', 'จำนวน').replace(/,/g, '')) || 1,
          unit: pick(r, 'unit', 'หน่วย'), price: parseFloat(pick(r, 'price', 'unit price', 'ราคา').replace(/,/g, '')) || 0,
          supplier, product,
          supplierId: suppliers.find((s) => supplier && norm(s.name) === norm(supplier))?.supplier_id ?? (product ? preferredFor(product.product_id)?.supplier_id ?? null : null),
        }
      }).filter((r) => r.item)
      if (out.length === 0) throw new Error('No rows found. Columns needed: project, item, qty, unit, price, supplier (optional).')
      setRows(out)
    } catch (e) { setError((e as Error).message) }
  }

  const projects = rows ? [...new Set(rows.map((r) => r.project))] : []
  async function run() {
    if (!rows) return
    setBusy(true); setError(null)
    try {
      const numbers = requests.map((r) => r.number)
      for (const p of projects) {
        const job = jobFor(p)
        const req: AnfRequest = {
          request_id: newPurchasingId(), board_id: activeBoardId || 'anf-order', number: nextRequestNumber(numbers),
          project_kind: job ? 'job' : 'free', job_id: job?.job_id ?? null, project_name: job ? null : p, deliver_to: 'WAREHOUSE', created_by: me,
          notes: `Imported from ${fileName}`, status: 'draft',
        }
        numbers.push(req.number)
        await saveRequest(req)
        const added: AnfOrder[] = []
        for (const r of rows.filter((x) => x.project === p)) {
          const it = newItem({
            item: r.product?.name ?? r.item, product_id: r.product?.product_id ?? null, description: r.product?.code ?? null,
            quantity: r.qty, unit: r.unit || r.product?.unit || null, unit_price: r.price, supplier_id: r.supplierId,
            request_id: req.request_id, board_id: req.board_id, branch: 'WAREHOUSE', requested_by: me,
          })
          await addAnfOrder(it); added.push(it)
        }
        // Imported lists are submitted straight away: auto-approved under the limit, else to Champ.
        await submitRequest(req, added)
      }
      onClose()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }

  function template() {
    const ws = XLSX.utils.aoa_to_sheet([['project', 'item', 'qty', 'unit', 'price', 'supplier'], ['#131', 'กระดาษปริ้นท์ RX1', 5, 'box', 2450, ''], ['Phuket branch refit', 'LED strip 5m', 6, 'pcs', 450, '']])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Request')
    XLSX.writeFile(wb, 'purchase-request-template.xlsx')
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="sm:max-w-[760px] max-w-[96vw] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="text-[15px] font-bold">Import requests · Excel / CSV</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4 overflow-y-auto space-y-3">
          <label className="block rounded-xl border-2 border-dashed border-border px-4 py-6 text-center cursor-pointer hover:bg-muted/30">
            <Upload className="w-5 h-5 mx-auto text-muted-foreground" />
            <span className="block text-[13px] font-medium mt-1">{fileName || 'Choose .xlsx or .csv'}</span>
            <span className="block text-[12px] text-muted-foreground">Columns: project · item · qty · unit · price · supplier (optional)</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
          </label>
          <p className="text-[12px] text-muted-foreground">Each <b>project</b> becomes one request. “#131” or “131” links to that Won job; anything else is a free-text project. <button type="button" onClick={template} className="underline">Download template</button></p>
          {rows && (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-3 py-2 text-[12px] bg-muted/40 border-b border-border">
                {rows.length} rows → {projects.length} request{projects.length > 1 ? 's' : ''} · {rows.filter((r) => r.product).length} matched · {rows.filter((r) => !r.product).length} manual
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-[12px]">
                  <tbody>
                    {rows.map((r, i) => {
                      const job = jobFor(r.project)
                      return (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-1.5">{job ? <span className="text-orange-700 dark:text-orange-400 font-semibold">#{job.job_number}</span> : r.project}</td>
                          <td className="px-2 py-1.5">{r.item}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{r.qty} {r.unit}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{r.price ? r.price.toLocaleString() : '—'}</td>
                          <td className="px-2 py-1.5">{suppliers.find((s) => s.supplier_id === r.supplierId)?.name ?? (r.supplier ? <span className="text-orange-700 dark:text-orange-400">{r.supplier} ?</span> : '—')}</td>
                          <td className="px-2 py-1.5">{r.product ? <span className="text-emerald-700 dark:text-emerald-400 font-semibold">✓ catalog</span> : <span className="text-orange-700 dark:text-orange-400 font-semibold">manual</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" disabled={!rows || busy} onClick={run}>{rows ? `Import ${projects.length} request${projects.length > 1 ? 's' : ''}` : 'Import'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
