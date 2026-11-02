'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Lock, UserRound } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { useHydrated } from '@/hooks/use-hydrated'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { StaffMember, WonJob } from '@/types'

/**
 * Staff · ทีมงาน — the freelance staff registry. Operation and Admin add, edit
 * and delete; Sales views name / phone / skills only (no bank details).
 * Anyone who has worked a job is marked Inactive instead of deleted.
 */

const SKILLS = ['LCA', 'Popup', 'Photo Moov', 'AI Booth', 'Driver', 'Lead', 'Setup']
const thb = (n: number) => `฿${n.toLocaleString()}`

interface JobRow { job: WonJob; fee: number; paid: boolean }
function jobsOf(staffId: string, jobs: WonJob[]): JobRow[] {
  return jobs
    .flatMap((job) => (job.staff_list ?? []).filter((s) => s.staff_id === staffId).map((s) => ({ job, fee: s.fee_thb || 0, paid: !!s.paid })))
    .sort((a, b) => (b.job.event_date ?? '').localeCompare(a.job.event_date ?? ''))
}

type Filter = 'active' | 'inactive' | 'unpaid'

export default function StaffPage() {
  const hydrated = useHydrated()
  const { role } = useAuth()
  const canEdit = role === 'admin' || role === 'operation'
  const staff = useCRMStore((s) => s.staff)
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('active')
  const [skill, setSkill] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('open')))
  const [creating, setCreating] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return staff.map((m) => {
      const jobs = jobsOf(m.staff_id, wonJobs)
      return { m, jobs, unpaid: jobs.filter((j) => !j.paid && !j.job.is_ops).reduce((n, j) => n + j.fee, 0) }
    })
      .filter(({ m, unpaid }) => filter === 'inactive' ? m.is_active === false : m.is_active !== false && (filter !== 'unpaid' || unpaid > 0))
      .filter(({ m }) => !skill || (m.skills ?? []).includes(skill))
      .filter(({ m }) => !needle || [m.name, m.nickname, m.phone, m.line_id].some((v) => (v ?? '').toLowerCase().includes(needle)))
      .sort((a, b) => (a.m.nickname || a.m.name).localeCompare(b.m.nickname || b.m.name))
  }, [staff, wonJobs, q, filter, skill])

  if (!hydrated) return null
  const counts = { active: staff.filter((m) => m.is_active !== false).length, inactive: staff.filter((m) => m.is_active === false).length }
  const open = staff.find((m) => m.staff_id === openId)
  const chip = (on: boolean) => cn('h-7 rounded-full border px-3 text-[12px]', on ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted')

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <PageHeader title="Staff · ทีมงาน" description={canEdit ? 'Freelance staff for events' : 'View only'}>
        {canEdit && <Button size="sm" className="h-9 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => setCreating(true)}><Plus className="w-4 h-4" />Add staff</Button>}
      </PageHeader>

      <div className="px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-2 border-b border-border/60">
        <button className={chip(filter === 'active')} onClick={() => setFilter('active')}>Active {counts.active}</button>
        <button className={chip(filter === 'inactive')} onClick={() => setFilter('inactive')}>Inactive {counts.inactive}</button>
        {canEdit && <button className={chip(filter === 'unpaid')} onClick={() => setFilter('unpaid')}>Unpaid ฿</button>}
        <span className="mx-1 h-4 w-px bg-border" />
        {SKILLS.map((s) => <button key={s} className={chip(skill === s)} onClick={() => setSkill(skill === s ? null : s)}>{s}</button>)}
        <div className="relative ml-auto w-full sm:w-64 order-first sm:order-none">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, nickname, phone…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-[13px] outline-none focus:border-foreground/40" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 py-4">
        {rows.length === 0 ? (
          <div className="text-center py-20">
            <UserRound className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">{q || skill ? 'No match' : 'No staff here'}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="hidden sm:grid grid-cols-[1.6fr_1fr_1.4fr_60px_1.1fr_90px] gap-3 px-4 py-2 border-b border-border font-mono text-[11px] tracking-wide text-muted-foreground">
              <span>STAFF</span><span>PHONE</span><span>SKILLS</span><span className="text-right">JOBS</span><span>LAST JOB</span><span className="text-right">{canEdit ? 'UNPAID' : ''}</span>
            </div>
            {rows.map(({ m, jobs, unpaid }) => (
              <button key={m.staff_id} type="button" onClick={() => setOpenId(m.staff_id)}
                className={cn('w-full text-left grid grid-cols-[1fr_auto] sm:grid-cols-[1.6fr_1fr_1.4fr_60px_1.1fr_90px] gap-x-3 gap-y-0.5 px-4 py-2.5 border-b border-border/60 last:border-0 hover:bg-muted/40 text-[13px] items-center', m.is_active === false && 'opacity-55')}>
                <span className="min-w-0 truncate"><b>{m.nickname || m.name}</b> <span className="text-muted-foreground">{m.nickname ? m.name : ''}</span></span>
                <span className="font-mono text-[12px] text-muted-foreground whitespace-nowrap">{m.phone || '—'}</span>
                <span className="hidden sm:flex flex-wrap gap-1">{(m.skills ?? []).map((s) => <span key={s} className="rounded border border-border px-1.5 text-[11px]">{s}</span>)}</span>
                <span className="hidden sm:block text-right">{jobs.length}</span>
                <span className="hidden sm:block truncate text-muted-foreground">{jobs[0] ? `#${jobs[0].job.job_number ?? '—'} · ${jobs[0].job.event_date ?? ''}` : '—'}</span>
                <span className={cn('hidden sm:block text-right', unpaid ? 'font-semibold text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>{canEdit ? (unpaid ? thb(unpaid) : '—') : ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {(open || creating) && (
        <StaffDialog key={open?.staff_id ?? 'new'} member={open ?? null} canEdit={canEdit} jobs={open ? jobsOf(open.staff_id, wonJobs) : []}
          onClose={() => { setOpenId(null); setCreating(false) }} />
      )}
    </div>
  )
}

const EMPTY: StaffMember = { staff_id: '', name: '', nickname: '', phone: '', bank_name: '', bank_account_number: '', bank_account_name: '', bank_branch: '', line_id: '', skills: [], default_fee_thb: null, note: '', is_active: true }

function StaffDialog({ member, canEdit, jobs, onClose }: { member: StaffMember | null; canEdit: boolean; jobs: JobRow[]; onClose: () => void }) {
  const { addStaff, updateStaff, deleteStaff } = useCRMStore()
  const isNew = !member
  const [f, setF] = useState<StaffMember>(() => ({ ...EMPTY, ...member }))
  const [tab, setTab] = useState<'details' | 'jobs' | 'payments'>('details')
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof StaffMember>(k: K, v: StaffMember[K]) => setF((p) => ({ ...p, [k]: v }))
  const year = String(new Date().getFullYear())
  const paidYear = jobs.filter((j) => j.paid && (j.job.event_date ?? '').startsWith(year)).reduce((n, j) => n + j.fee, 0)
  const unpaid = jobs.filter((j) => !j.paid && !j.job.is_ops).reduce((n, j) => n + j.fee, 0)

  async function save() {
    if (!f.name.trim()) { setError('Name is required'); return }
    const clean = { ...f, name: f.name.trim(), nickname: f.nickname.trim() }
    if (isNew) await addStaff({ ...clean, staff_id: `staff-${Date.now()}` })
    else { const { staff_id: _id, ...rest } = clean; await updateStaff(f.staff_id, rest) }
    onClose()
  }
  async function remove() {
    if (jobs.length) { setError(`${f.nickname || f.name} has worked ${jobs.length} job(s). Mark inactive instead so payment history stays.`); return }
    if (window.confirm(`Delete ${f.name}?`)) { await deleteStaff(f.staff_id); onClose() }
  }
  async function toggleActive() {
    await updateStaff(f.staff_id, { is_active: f.is_active === false })
    onClose()
  }

  const field = (label: string, k: 'name' | 'nickname' | 'phone' | 'line_id' | 'bank_name' | 'bank_account_number' | 'bank_account_name' | 'bank_branch') => (
    <label className="block">
      <span className="field-label">{label}</span>
      {canEdit ? <Input value={(f[k] as string) ?? ''} onChange={(e) => set(k, e.target.value)} className="h-9 mt-1" />
        : <p className="mt-1 text-[13px]">{(f[k] as string) || '—'}</p>}
    </label>
  )
  const tabCls = (on: boolean) => cn('px-3 py-1.5 text-[13px] border-b-2 -mb-px', on ? 'border-foreground font-semibold' : 'border-transparent text-muted-foreground')

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[520px] max-w-[94vw] sm:max-w-[520px] top-[5vh] translate-y-0 p-0 gap-0 max-h-[90vh] flex flex-col">
        <div className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-[16px] font-bold">{isNew ? 'New staff' : f.nickname || f.name}</DialogTitle>
          {!isNew && <p className="text-[12px] text-muted-foreground">{f.name}{f.is_active === false ? ' · Inactive' : ''}</p>}
          {!isNew && canEdit && (
            <div className="grid grid-cols-3 gap-2 mt-3 text-[12px]">
              <div className="rounded-lg border border-border p-2"><span className="text-muted-foreground">Jobs</span><b className="block text-[15px]">{jobs.length}</b></div>
              <div className="rounded-lg border border-border p-2"><span className="text-muted-foreground">Paid {year}</span><b className="block text-[15px]">{thb(paidYear)}</b></div>
              <div className="rounded-lg border border-border p-2"><span className="text-muted-foreground">Unpaid</span><b className={cn('block text-[15px]', unpaid && 'text-amber-700 dark:text-amber-400')}>{thb(unpaid)}</b></div>
            </div>
          )}
          {!isNew && (
            <div className="flex gap-1 mt-3 -mb-3 border-b border-transparent">
              <button className={tabCls(tab === 'details')} onClick={() => setTab('details')}>Details</button>
              <button className={tabCls(tab === 'jobs')} onClick={() => setTab('jobs')}>Jobs ({jobs.length})</button>
              {canEdit && <button className={tabCls(tab === 'payments')} onClick={() => setTab('payments')}>Payments</button>}
            </div>
          )}
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
          {tab === 'details' && <>
            <div className="grid grid-cols-2 gap-3">{field('Name · ชื่อ-นามสกุล', 'name')}{field('Nickname · ชื่อเล่น', 'nickname')}</div>
            <div className="grid grid-cols-2 gap-3">{field('Phone · เบอร์โทร', 'phone')}{field('LINE ID', 'line_id')}</div>
            <div>
              <span className="field-label">Skills · ทักษะ</span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(canEdit ? SKILLS : f.skills ?? []).map((s) => {
                  const on = (f.skills ?? []).includes(s)
                  return <button key={s} type="button" disabled={!canEdit} onClick={() => set('skills', on ? (f.skills ?? []).filter((x) => x !== s) : [...(f.skills ?? []), s])}
                    className={cn('h-7 rounded-full border px-3 text-[12px]', on ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground')}>{s}</button>
                })}
                {!canEdit && !(f.skills ?? []).length && <span className="text-[13px]">—</span>}
              </div>
            </div>
            {canEdit && <>
              <label className="block">
                <span className="field-label">Default fee · ค่าจ้างปกติ (฿ / job)</span>
                <Input type="number" inputMode="numeric" value={f.default_fee_thb ?? ''} onChange={(e) => set('default_fee_thb', e.target.value === '' ? null : Number(e.target.value))} className="h-9 mt-1 w-40" />
                <span className="block mt-1 text-[11px] text-muted-foreground">Filled in automatically when added to a job.</span>
              </label>
              <div className="rounded-lg border border-border p-3 space-y-3">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Lock className="w-3 h-3" />Bank details · only Operation and Admin see these</p>
                <div className="grid grid-cols-2 gap-3">{field('Bank · ธนาคาร', 'bank_name')}{field('Account no. · เลขบัญชี', 'bank_account_number')}</div>
                <div className="grid grid-cols-2 gap-3">{field('Account name · ชื่อบัญชี', 'bank_account_name')}{field('Branch · สาขา', 'bank_branch')}</div>
              </div>
            </>}
            <label className="block">
              <span className="field-label">Note · หมายเหตุ</span>
              {canEdit ? <Textarea value={f.note ?? ''} onChange={(e) => set('note', e.target.value)} rows={2} className="mt-1" />
                : <p className="mt-1 text-[13px] whitespace-pre-wrap">{f.note || '—'}</p>}
            </label>
          </>}

          {tab === 'jobs' && (jobs.length === 0 ? <p className="text-[13px] text-muted-foreground">No jobs yet.</p> : (
            <ul className="divide-y divide-border">
              {jobs.map(({ job }) => (
                <li key={job.job_id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                  <Link href={`/won-ready-op?open=${encodeURIComponent(job.job_id)}`} className="min-w-0 truncate hover:underline"><span className="font-mono">#{job.job_number ?? '—'}</span> {job.event_display_name || job.product_name || ''}</Link>
                  <span className="shrink-0 text-muted-foreground">{job.event_date ?? ''}</span>
                </li>
              ))}
            </ul>
          ))}

          {tab === 'payments' && (jobs.filter((j) => !j.job.is_ops).length === 0 ? <p className="text-[13px] text-muted-foreground">No payments yet.</p> : (
            <ul className="divide-y divide-border">
              {jobs.filter((j) => !j.job.is_ops).map(({ job, fee, paid }) => (
                <li key={job.job_id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
                  <span className="min-w-0 truncate"><span className="font-mono">#{job.job_number ?? '—'}</span> <span className="text-muted-foreground">{job.event_date ?? ''}</span></span>
                  <span className="shrink-0">{fee ? thb(fee) : '—'} <span className={cn('ml-2 rounded px-1.5 py-px text-[11px] font-semibold', paid ? 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/14 text-amber-700 dark:text-amber-400')}>{paid ? 'Paid' : 'Unpaid'}</span></span>
                </li>
              ))}
            </ul>
          ))}
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </div>

        {canEdit && tab === 'details' && (
          <div className="px-6 py-3 border-t flex items-center gap-2 shrink-0">
            {!isNew && <button type="button" onClick={() => void remove()} className="text-destructive text-sm mr-auto hover:opacity-80">Delete</button>}
            {!isNew && <Button variant="outline" size="sm" className={isNew ? 'ml-auto' : ''} onClick={() => void toggleActive()}>{f.is_active === false ? 'Mark active' : 'Mark inactive'}</Button>}
            <Button size="sm" className={cn('bg-[#7A5AA5] text-white hover:opacity-90', isNew && 'ml-auto')} onClick={() => void save()}>Save</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
