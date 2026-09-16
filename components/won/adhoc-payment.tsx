'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Pin, X, Plus, Trash2, Check, Clock, Archive, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useCRMStore } from '@/store/crm-store'
import type { StaffMember } from '@/types'
import {
  type AdhocPayment, type AdhocJob, currentMonth, fetchAdhoc, createAdhocMonth, updateAdhoc, adhocSummary,
} from '@/lib/supabase/adhoc'

const monthLabel = (m: string) => { try { return format(parseISO(`${m}-01T00:00:00`), 'MMM yyyy') } catch { return m } }
const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`

// ── Pinned board card (unmovable, green edge) ─────────────────────────────────
export function AdhocCard({ summary, onOpen }: { summary: { paid: number; total: number; fee: number }; onOpen: () => void }) {
  const allPaid = summary.total > 0 && summary.paid === summary.total
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onOpen() }}
      className="bg-card rounded-xl border border-emerald-500 border-l-[4px] overflow-hidden cursor-pointer hover:shadow-md transition-all select-none shadow-[0_2px_10px_-4px_rgba(16,160,101,0.4)]"
    >
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Pin className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
          <span className="text-[14px] font-bold text-foreground">Adhoc Payment</span>
          <span className="ml-auto text-[10px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-300 px-2 py-0.5 rounded-full">PINNED</span>
        </div>
        <p className="text-[12px] text-muted-foreground">Temporary staff payments · not tied to a job</p>
      </div>
      {summary.total > 0 && (
        <div className={`px-3 py-1.5 border-t flex items-center gap-2 ${allPaid ? 'border-emerald-200 dark:border-emerald-500/30' : 'border-red-200 dark:border-red-500/30'}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${allPaid ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className={`font-mono text-[12px] font-medium ${allPaid ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
            จ่ายแล้ว {summary.paid}/{summary.total} · ฿{summary.fee.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}

// ── The modal sheet ───────────────────────────────────────────────────────────
export function AdhocSheet({ list, onClose, onChanged }: {
  list: AdhocPayment[]; onClose: () => void; onChanged: () => void
}) {
  const allStaff = useCRMStore((s) => s.staff)
  const addStaff = useCRMStore((s) => s.addStaff)

  const cur = currentMonth()
  const active = list.find((a) => a.month === cur && !a.archived)
  const [selectedId, setSelectedId] = useState<string | null>(active?.id ?? list[0]?.id ?? null)
  const viewing = list.find((a) => a.id === selectedId) ?? active ?? list[0]
  const editable = !!viewing && !viewing.archived && viewing.month === cur

  // Persist a change to the viewing card's jobs (creates the current month lazily).
  async function saveJobs(jobs: AdhocJob[], id = viewing?.id) {
    if (!id) return
    await updateAdhoc(id, { jobs })
    onChanged()
  }
  async function ensureActive(): Promise<AdhocPayment> {
    if (active) return active
    const created = await createAdhocMonth(cur)
    setSelectedId(created.id)
    onChanged()
    return created
  }

  async function addJob() {
    const target = await ensureActive()
    const jobs = [...target.jobs, { id: mkId(), title: 'New task', staff_list: [] }]
    await saveJobs(jobs, target.id)
  }
  async function patchJob(jobId: string, patch: Partial<AdhocJob>) {
    if (!viewing) return
    await saveJobs(viewing.jobs.map((j) => j.id === jobId ? { ...j, ...patch } : j))
  }
  async function removeJob(jobId: string) {
    if (!viewing) return
    if (!window.confirm('Remove this temp job and its staff?')) return
    await saveJobs(viewing.jobs.filter((j) => j.id !== jobId))
  }
  async function archive() {
    if (!viewing) return
    if (!window.confirm(`Archive ${monthLabel(viewing.month)}? It becomes read-only and a fresh card starts for this month.`)) return
    await updateAdhoc(viewing.id, { archived: true })
    onChanged()
  }

  const summary = adhocSummary(viewing)

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="w-[520px] max-w-[92vw] sm:max-w-[520px] top-[6vh] translate-y-0 p-0 gap-0 max-h-[86vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b bg-emerald-50/70 dark:bg-emerald-500/10 flex items-center gap-2.5 shrink-0">
          <Pin className="w-4 h-4 text-emerald-600 fill-emerald-600" />
          <DialogTitle className="text-[15px] font-bold">Adhoc Payment</DialogTitle>
          {/* Month switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-800 dark:text-emerald-200 bg-white/70 dark:bg-white/5 border border-emerald-200 dark:border-emerald-500/30 rounded-md px-2 py-1 hover:bg-white">
              {viewing ? monthLabel(viewing.month) : monthLabel(cur)}{viewing?.archived ? ' · archived' : ''}<ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              {list.length === 0 && <DropdownMenuItem disabled>{monthLabel(cur)} (empty)</DropdownMenuItem>}
              {list.map((a) => (
                <DropdownMenuItem key={a.id} onClick={() => setSelectedId(a.id)} className="gap-2">
                  {monthLabel(a.month)}{a.archived ? <span className="text-muted-foreground">· archived</span> : <span className="text-emerald-600">· current</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="ml-auto font-mono text-[12.5px] font-semibold text-emerald-700 dark:text-emerald-300">จ่ายแล้ว {summary.paid}/{summary.total} · ฿{summary.fee.toLocaleString()}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {!viewing || viewing.jobs.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-8">No temp jobs yet.{editable && ' Add one below.'}</p>
          ) : (
            viewing.jobs.map((job) => (
              <AdhocJobBlock key={job.id} job={job} editable={editable} allStaff={allStaff} addStaff={addStaff}
                onPatch={(p) => patchJob(job.id, p)} onRemove={() => removeJob(job.id)} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center gap-2 shrink-0">
          {editable
            ? <button onClick={archive} className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><Archive className="w-4 h-4" /> Archive month</button>
            : <span className="text-[12px] text-muted-foreground italic">Archived — read-only</span>}
          {editable && <Button size="sm" className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={addJob}><Plus className="w-4 h-4" /> เพิ่มงานชั่วคราว · Add temp job</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── One temp job: title + staff payment rows ──────────────────────────────────
function AdhocJobBlock({ job, editable, allStaff, addStaff, onPatch, onRemove }: {
  job: AdhocJob; editable: boolean; allStaff: StaffMember[]; addStaff: (s: StaffMember) => void
  onPatch: (p: Partial<AdhocJob>) => void; onRemove: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const inJob = new Set(job.staff_list.map((s) => s.staff_id))
  const matches = allStaff.filter((s) => !inJob.has(s.staff_id) && (`${s.name} ${s.nickname}`.toLowerCase().includes(search.toLowerCase())))

  function setStaff(list: StaffMember[]) { onPatch({ staff_list: list }) }
  function addFromRegistry(m: StaffMember) { setStaff([...job.staff_list, { ...m, fee_thb: m.fee_thb ?? 0, paid: false }]); setAdding(false); setSearch('') }
  function createNew() {
    const name = search.trim(); if (!name) return
    const m: StaffMember = { staff_id: `staff-${Date.now()}`, name, nickname: name, phone: '', bank_name: '', bank_account_number: '', bank_account_name: '', bank_branch: '' }
    addStaff(m); addFromRegistry(m)
  }
  const setRow = (sid: string, patch: Partial<StaffMember>) => setStaff(job.staff_list.map((s) => s.staff_id === sid ? { ...s, ...patch } : s))
  const removeRow = (sid: string) => setStaff(job.staff_list.filter((s) => s.staff_id !== sid))

  const jobFee = job.staff_list.reduce((n, s) => n + (s.fee_thb || 0), 0)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
        {editable
          ? <input value={job.title} onChange={(e) => onPatch({ title: e.target.value })} className="flex-1 bg-transparent text-[13.5px] font-bold outline-none" />
          : <span className="flex-1 text-[13.5px] font-bold">{job.title}</span>}
        <span className="font-mono text-[11px] text-muted-foreground">฿{jobFee.toLocaleString()}</span>
        {editable && <button onClick={onRemove} className="text-muted-foreground hover:text-destructive" title="Remove job"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>

      <div className="divide-y divide-border/60">
        {job.staff_list.map((s) => (
          <div key={s.staff_id} className="flex items-center gap-2.5 px-3 py-2">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">{(s.nickname || s.name || '?').slice(0, 1)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate">{s.nickname || s.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{s.bank_name} {s.bank_account_number}</p>
            </div>
            {editable
              ? <div className="flex items-center gap-0.5"><span className="text-[11px] text-muted-foreground">฿</span><input type="number" value={s.fee_thb ?? 0} onChange={(e) => setRow(s.staff_id, { fee_thb: parseInt(e.target.value, 10) || 0 })} className="w-16 h-7 text-[12px] font-mono text-right bg-transparent border border-border rounded px-1 outline-none" /></div>
              : <span className="font-mono text-[12px] font-semibold">฿{(s.fee_thb || 0).toLocaleString()}</span>}
            <button
              disabled={!editable}
              onClick={() => editable && setRow(s.staff_id, { paid: !s.paid })}
              className={`inline-flex items-center gap-1 text-[10.5px] font-semibold rounded-md px-2 py-1.5 ${s.paid ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'} ${editable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              {s.paid ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}{s.paid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}
            </button>
            {editable && <button onClick={() => removeRow(s.staff_id)} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>}
          </div>
        ))}
      </div>

      {editable && (
        <div className="px-3 py-2 border-t border-border/60">
          {!adding
            ? <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-400"><Plus className="w-3.5 h-3.5" /> เพิ่มน้อง · add staff</button>
            : (
              <div>
                <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search or type a new name…" className="h-8 text-sm" />
                {matches.length > 0 && (
                  <ul className="mt-1.5 max-h-40 overflow-y-auto space-y-1">
                    {matches.slice(0, 8).map((m) => (
                      <li key={m.staff_id}><button onClick={() => addFromRegistry(m)} className="w-full text-left text-[12.5px] px-2 py-1.5 rounded-md border border-border/60 hover:bg-muted/40">{m.name} <span className="text-muted-foreground">({m.nickname})</span> {m.bank_name && <span className="text-muted-foreground">· {m.bank_name}</span>}</button></li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {search.trim() && <button onClick={createNew} className="text-[12px] font-medium text-emerald-700 dark:text-emerald-400">＋ New “{search.trim()}”</button>}
                  <button onClick={() => { setAdding(false); setSearch('') }} className="ml-auto text-[12px] text-muted-foreground">Cancel</button>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
