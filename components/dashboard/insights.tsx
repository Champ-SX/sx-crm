'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ClipboardCheck, Hourglass, MessageCircleWarning, Target, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionHeader, fmtBaht } from './shared'
import { useBom, kitLinesOf, kitsOf, packProgress } from '@/lib/supabase/bom'
import { useAssets } from '@/lib/supabase/assets'
import { OP_STAGE_LABELS, type Activity, type LeadOpportunity, type OPStage, type WonJob } from '@/types'
import {
  upcomingJobs, readinessOf, closingJobs, staleLeads, winRates, lostReasons, bkkToday,
  URGENT_DAYS, CLOSING_GRACE_DAYS, STALE_DAYS, MIN_CLOSED, type WinGroup,
} from '@/lib/insights'

// Dashboard cards: ops readiness / closing, sales follow-ups and win-loss.

const pill = 'inline-flex items-center rounded-full px-2 py-0.5 text-[11.5px] font-semibold whitespace-nowrap'
const OK = 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-400'
const WARN = 'bg-amber-500/14 text-amber-700 dark:text-amber-400'
const BAD = 'bg-red-500/12 text-red-700 dark:text-red-400'
const NT = 'bg-muted text-muted-foreground'
const jobHref = (id: string) => `/won-ready-op?open=${encodeURIComponent(id)}`
const leadHref = (id: string) => `/leads-opportunities?open=${encodeURIComponent(id)}`
const stageLabel = (s: string) => OP_STAGE_LABELS[s as OPStage] ?? s
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const jobName = (j: WonJob) => j.event_display_name || j.product_name || j.job_number || 'Job'

/** Packing progress for a job from its event products (null = none added). */
function usePacking() {
  useBom()
  return (jobId: string) => {
    const kits = kitsOf(jobId)
    if (kits.length === 0) return null
    return packProgress(kits.flatMap((k) => kitLinesOf(k.id)))
  }
}

/** Three counts for the top of the Operation dashboard. */
export function OpsAlerts({ jobs }: { jobs: WonJob[] }) {
  const packing = usePacking()
  const { assets } = useAssets()
  const today = bkkToday()
  const notReady = upcomingJobs(jobs, today).filter((j) => j.daysLeft <= URGENT_DAYS && !readinessOf(j, packing(j.job_id)).ready).length
  const overdue = closingJobs(jobs, today).filter((j) => j.overdue).length
  const done = new Set(jobs.filter((j) => j.op_stage === 'OP_EVENT_DONE' || j.op_stage === 'OP_WAIT_STAFF_PAYMENT_DOC_TERR' || j.op_stage === 'OP_DONE_PAYMENT' || ((j.event_end_date || j.event_date || '9') < today)).map((j) => j.job_id))
  const notBack = assets.filter((a) => a.location_kind === 'event' && a.job_id && done.has(a.job_id)).length
  const card = (label: string, n: number, sub: string, cls: string) => (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <p className="font-mono text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className={cn('font-mono text-[24px] font-bold leading-tight', n > 0 ? cls : 'text-foreground')}>{n}</p>
      <p className="text-[12px] text-muted-foreground">{sub}</p>
    </div>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {card(`Not ready ≤ ${URGENT_DAYS} days`, notReady, 'needs action today', 'text-red-600 dark:text-red-400')}
      {card('Closing overdue', overdue, `event done ${CLOSING_GRACE_DAYS}+ days, not closed`, 'text-amber-600 dark:text-amber-400')}
      {card('Equipment not back', notBack, 'units still “On event”', 'text-amber-600 dark:text-amber-400')}
    </div>
  )
}

/** Every job with an event in the next 14 days and what it's still missing. */
export function ReadinessCard({ jobs }: { jobs: WonJob[] }) {
  const packing = usePacking()
  const list = upcomingJobs(jobs, bkkToday())
  return (
    <div>
      <SectionHeader icon={ClipboardCheck} title="Readiness · next 14 days" sub="soonest first" href="/won-ready-op" linkLabel="Won board" />
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        {list.length === 0 ? <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">No events in the next 14 days.</p> : (
          <table className="w-full min-w-[640px] text-[13px]">
            <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border">
              <th className="px-4 py-2">IN</th><th className="px-2 py-2">JOB</th><th className="px-2 py-2">EQUIPMENT</th><th className="px-2 py-2">STAFF</th><th className="px-2 py-2">STAGE</th><th className="px-2 py-2">READY?</th>
            </tr></thead>
            <tbody>
              {list.map((j) => {
                const r = readinessOf(j, packing(j.job_id))
                const urgent = j.daysLeft <= URGENT_DAYS && !r.ready
                return (
                  <tr key={j.job_id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                    <td className={cn('px-4 py-2 font-mono font-bold', urgent ? 'text-red-600 dark:text-red-400' : j.daysLeft <= 7 ? 'text-amber-600 dark:text-amber-400' : '')}>{j.daysLeft === 0 ? 'today' : `${j.daysLeft}d`}</td>
                    <td className="px-2 py-2"><Link href={jobHref(j.job_id)} className="font-semibold hover:underline">{jobName(j)}</Link>
                      <span className="block font-mono text-[11px] text-muted-foreground">{j.job_number ? `#${j.job_number} · ` : ''}{fmtDay(j.event_date as string)}{j.product_type ? ` · ${j.product_type}` : ''}</span></td>
                    <td className="px-2 py-2">{j.is_ops ? <span className={cn(pill, NT)}>—</span> : !r.packed ? <span className={cn(pill, urgent ? BAD : WARN)}>no product</span>
                      : <span className={cn(pill, r.packed.done >= r.packed.total ? OK : urgent ? BAD : WARN)}>{r.packed.done}/{r.packed.total} packed</span>}</td>
                    <td className="px-2 py-2">{r.staff.need == null ? <span className={cn(pill, NT)}>{r.staff.have || '—'}</span>
                      : <span className={cn(pill, r.staff.have >= r.staff.need ? OK : urgent ? BAD : WARN)}>{r.staff.have}/{r.staff.need}</span>}</td>
                    <td className="px-2 py-2 text-[12px] text-muted-foreground">{stageLabel(j.op_stage)}</td>
                    <td className="px-2 py-2">{r.ready ? <span className={cn(pill, OK)}>✓ ready</span> : <span className={cn(pill, urgent ? BAD : WARN)}>{urgent ? '✕ ' : ''}{r.missing.join(' · ')}</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/** Finished events still open: staff unpaid, equipment out, stage not done. */
export function ClosingCard({ jobs }: { jobs: WonJob[] }) {
  const { assets } = useAssets()
  const list = closingJobs(jobs, bkkToday())
  return (
    <div>
      <SectionHeader icon={Hourglass} title="Events done, not closed yet" sub={`overdue after ${CLOSING_GRACE_DAYS} days`} />
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        {list.length === 0 ? <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Every finished event is closed. 🎉</p> : (
          <table className="w-full min-w-[620px] text-[13px]">
            <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border">
              <th className="px-4 py-2">JOB</th><th className="px-2 py-2">STAFF PAID</th><th className="px-2 py-2">EQUIPMENT</th><th className="px-2 py-2">STAGE</th><th className="px-4 py-2 text-right">SINCE EVENT</th>
            </tr></thead>
            <tbody>
              {list.slice(0, 12).map((j) => {
                const staff = j.staff_list ?? []
                const out = assets.filter((a) => a.location_kind === 'event' && a.job_id === j.job_id).length
                return (
                  <tr key={j.job_id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                    <td className="px-4 py-2"><Link href={jobHref(j.job_id)} className="font-semibold hover:underline">{jobName(j)}</Link>
                      <span className="block font-mono text-[11px] text-muted-foreground">{j.job_number ? `#${j.job_number} · ` : ''}{fmtDay((j.event_end_date || j.event_date) as string)}</span></td>
                    <td className="px-2 py-2">{j.is_ops || staff.length === 0 ? <span className={cn(pill, NT)}>—</span>
                      : <span className={cn(pill, j.unpaid ? WARN : OK)}>จ่ายแล้ว {staff.length - j.unpaid}/{staff.length}{j.unpaidThb ? ` · ${fmtBaht(j.unpaidThb)} left` : ''}</span>}</td>
                    <td className="px-2 py-2"><span className={cn(pill, out ? BAD : OK)}>{out ? `${out} out` : '✓ back'}</span></td>
                    <td className="px-2 py-2 text-[12px] text-muted-foreground">{stageLabel(j.op_stage)}</td>
                    <td className={cn('px-4 py-2 text-right font-mono font-bold', j.overdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>{j.daysSince}d</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/** Open / negotiating leads with no activity for 7+ days. */
export function StaleLeadsCard({ leads, activities, showOwner }: { leads: LeadOpportunity[]; activities: Activity[]; showOwner?: boolean }) {
  const [now] = useState(() => new Date())
  const list = useMemo(() => staleLeads(leads, activities, now), [leads, activities, now])
  return (
    <div>
      <SectionHeader icon={MessageCircleWarning} title="Needs a follow-up" sub={`no activity for ${STALE_DAYS}+ days`} href="/leads-opportunities" linkLabel="All leads" />
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        {list.length === 0 ? <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Every open lead has been touched this week. 👍</p> : (
          <table className="w-full min-w-[560px] text-[13px]">
            <thead><tr className="text-left font-mono text-[10px] tracking-wide text-muted-foreground border-b border-border">
              <th className="px-4 py-2">LEAD</th>{showOwner && <th className="px-2 py-2">OWNER</th>}<th className="px-2 py-2">STATUS</th><th className="px-2 py-2 text-right">VALUE</th><th className="px-2 py-2">QUIET FOR</th><th className="px-4 py-2" />
            </tr></thead>
            <tbody>
              {list.slice(0, 10).map((l) => (
                <tr key={l.lead_op_id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-2"><b>{l.name}</b><span className="block text-[11.5px] text-muted-foreground">{[l.customer_name, l.service_type].filter(Boolean).join(' · ')}</span></td>
                  {showOwner && <td className="px-2 py-2 text-[12.5px]">{l.owner || '—'}</td>}
                  <td className="px-2 py-2"><span className={cn(pill, l.status === 'negotiating' ? WARN : NT)}>{l.status === 'negotiating' ? 'Negotiating' : 'Open'}</span></td>
                  <td className="px-2 py-2 text-right font-mono">{l.estimated_value ? fmtBaht(l.estimated_value) : '—'}</td>
                  <td className={cn('px-2 py-2 font-mono font-bold', l.idleDays >= 14 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>{l.idleDays} days</td>
                  <td className="px-4 py-2 text-right"><Link href={leadHref(l.lead_op_id)} className="text-[12px] font-semibold text-[#7A5AA5] hover:underline">Follow up →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {list.length > 10 && <p className="px-4 py-2 text-[12px] text-muted-foreground border-t border-border">+{list.length - 10} more</p>}
      </div>
    </div>
  )
}

const GROUPS: { key: WinGroup; label: string }[] = [
  { key: 'service', label: 'Service' }, { key: 'owner', label: 'Owner' }, { key: 'size', label: 'Deal size' }, { key: 'source', label: 'Source' },
]

/** Win rate per group, last 6 months. Admin also gets "Owner". */
export function WinRateCard({ leads, withOwner }: { leads: LeadOpportunity[]; withOwner?: boolean }) {
  const [by, setBy] = useState<WinGroup>('service')
  const [since] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d.toISOString() })
  const rows = winRates(leads, by, since)
  const groups = GROUPS.filter((g) => withOwner || g.key !== 'owner')
  return (
    <div>
      <SectionHeader icon={Target} title="Win rate" sub="last 6 months · won ÷ (won + lost)" />
      <div className="bg-card border border-border rounded-xl">
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {groups.map((g) => (
            <button key={g.key} type="button" onClick={() => setBy(g.key)}
              className={cn('h-7 rounded-full px-3 text-[12px] font-medium', by === g.key ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>{g.label}</button>
          ))}
        </div>
        <div className="px-4 py-3 space-y-2">
          {rows.length === 0 && <p className="py-3 text-center text-[13px] text-muted-foreground">No won or lost deals in the last 6 months.</p>}
          {rows.map((r) => (
            <div key={r.key} className="grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-[13px]">
              <span className="truncate">{r.key}</span>
              <span className="h-2 rounded-full bg-muted overflow-hidden">
                {r.rate != null && <span className={cn('block h-full rounded-full', r.rate >= 0.5 ? 'bg-emerald-600' : r.rate >= 0.3 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.round(r.rate * 100)}%` }} />}
              </span>
              <span className="w-24 text-right font-mono text-[12px]"><b>{r.rate != null ? `${Math.round(r.rate * 100)}%` : '—'}</b> <span className="text-muted-foreground">{r.won}/{r.won + r.lost}</span></span>
            </div>
          ))}
        </div>
        <p className="px-4 pb-3 text-[11.5px] text-muted-foreground">“—” until a group has {MIN_CLOSED} closed deals.{by === 'source' && ' Source starts counting from new leads.'}</p>
      </div>
    </div>
  )
}

/** Count of lost leads per lost reason. */
export function LostReasonsCard({ leads }: { leads: LeadOpportunity[] }) {
  const rows = lostReasons(leads)
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <div>
      <SectionHeader icon={TrendingDown} title="Why we lose" sub="since lost reasons started" />
      <div className="bg-card border border-border rounded-xl px-4 py-3 space-y-2">
        {rows.length === 0 && <p className="py-3 text-center text-[13px] text-muted-foreground">No lost reasons yet. They&apos;re asked each time a lead is marked Lost.</p>}
        {rows.map((r) => (
          <div key={r.reason} className="grid grid-cols-[minmax(110px,150px)_1fr_28px] items-center gap-3 text-[13px]">
            <span className="truncate">{r.reason}</span>
            <span className="h-2 rounded-full bg-muted overflow-hidden"><span className="block h-full rounded-full bg-red-500/80" style={{ width: `${(r.n / max) * 100}%` }} /></span>
            <b className="text-right font-mono">{r.n}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
