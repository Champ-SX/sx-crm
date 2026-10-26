'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { addDays, endOfMonth, format, parseISO, startOfMonth, startOfWeek, endOfWeek } from 'date-fns'
import { Printer, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useCRMStore } from '@/store/crm-store'
import { jobCardName } from '@/lib/jobs'
import { cn } from '@/lib/utils'
import { OP_STAGES, type WonJob } from '@/types'
import { jobDays, stageHex, CAL_DAYS, INVENTORY } from '@/components/won/op-calendar'
import { cosmoFor, phasesOn, type CosmoState } from '@/components/won/cosmo'
import { isTeardown, type CosmoInstall } from '@/lib/supabase/cosmo'

// Print layout for the Won calendar — month grid or the 9-day window, A4 portrait/landscape.
// Rendered into a body-level portal that only shows in @media print (see globals.css).

type Range = 'days' | 'month'
type Orient = 'portrait' | 'landscape'
interface Show { venue: boolean; status: boolean; cosmo: boolean; ops: boolean }
interface Config { range: Range; month: string; orient: Orient; show: Show }

// Kept here (not globals.css) so the print rules ship with the component.
const PRINT_CSS = `@media screen { .print-only { display: none !important; } }
@media print {
  body > *:not(.print-only) { display: none !important; }
  html, body { background: #fff !important; }
  .print-only { display: block !important; font: 9px/1.25 system-ui, "Noto Sans Thai", sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .print-only i { font-style: normal; color: #555; }
  .pr-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.5px solid #111; padding-bottom: 4px; margin-bottom: 6px; }
  .pr-head b { font-size: 14px; } .pr-head span { color: #666; font-size: 9px; }
  .pr-month { display: grid; grid-template-columns: repeat(7, 1fr); border-left: 1px solid #bbb; border-top: 1px solid #bbb; }
  .pr-dh { font-weight: 700; font-size: 8px; color: #444; padding: 2px 3px; background: #f1f1f1; border-right: 1px solid #bbb; border-bottom: 1px solid #bbb; }
  .pr-cell { min-height: 22mm; padding: 2px 3px; border-right: 1px solid #bbb; border-bottom: 1px solid #bbb; break-inside: avoid; overflow: hidden; }
  .pr-out { background: #f7f7f7; color: #bbb; }
  .pr-dn { font-weight: 700; font-size: 9px; margin-bottom: 1px; }
  .pr-line { font-size: 7px; line-height: 1.2; border-left: 2.5px solid #111; padding-left: 2px; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .print-landscape .pr-line { font-size: 7.5px; }
  .pr-mark { font-size: 7px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pr-su { color: #15803d; } .pr-td { color: #c2410c; }
  .pr-rows .pr-row { display: grid; grid-template-columns: 16mm 1fr; border-top: 1px solid #ccc; padding: 3px 0; break-inside: avoid; }
  .pr-rl b { display: block; font-size: 10px; } .pr-rl span { color: #666; }
  .pr-empty { color: #aaa; }
  .pr-card { border: 1px solid #ccc; border-left: 3px solid #111; border-radius: 2px; padding: 2px 5px; margin-bottom: 3px; break-inside: avoid; }
  .pr-card b { font-size: 9.5px; } .pr-sub { color: #555; }
  .pr-compact b { font-size: 8px; } .pr-compact { font-size: 7.5px; padding: 2px 3px; }
  .pr-chips { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 1px; }
  .pr-chips span { border: 1px solid #bbb; border-radius: 6px; padding: 0 4px; font-size: 7.5px; }
  .pr-cols { display: grid; grid-template-columns: repeat(9, 1fr); gap: 3px; }
  .pr-col { min-width: 0; }
  .pr-ch { border-bottom: 1px solid #111; margin-bottom: 3px; } .pr-ch span { color: #666; margin-right: 3px; } .pr-ch b { font-size: 11px; }
  .pr-foot { margin-top: 6px; border-top: 1px solid #ddd; padding-top: 3px; font-size: 8px; color: #333; }
  .pr-legend { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px; color: #555; }
  .pr-legend i { display: inline-block; width: 7px; height: 7px; border-radius: 2px; margin-right: 3px; vertical-align: -1px; }
}`

const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
const fromISO = (s: string) => parseISO(s + 'T00:00:00')
const hhmm = (iso: string | null) => (iso ? format(new Date(iso), 'HH:mm') : '')

export function CalendarPrint({ jobs, stages, start, cosmo, boardName }: {
  jobs: WonJob[]
  stages: { id: string; dot: string; label?: string }[]
  start: string
  cosmo?: CosmoState
  boardName?: string
}) {
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<Range>('days')
  const [month, setMonth] = useState(() => start.slice(0, 7))
  const [orient, setOrient] = useState<Orient>('portrait')
  const [show, setShow] = useState<Show>({ venue: true, status: true, cosmo: true, ops: false })
  const [printing, setPrinting] = useState<Config | null>(null)
  const [job, setJob] = useState(0)   // bumps once per Print click

  // Print only after the popover has fully closed and the sheet has painted —
  // window.print() blocks the page, so firing mid-animation froze the popover
  // half-faded on screen. The sheet stays mounted a little after `afterprint`
  // because Safari / mobile can fire it before the page is captured.
  useEffect(() => {
    if (!job) return
    let raf = 0, clear = 0
    const done = () => { clear = window.setTimeout(() => setPrinting(null), 1500) }
    const go = window.setTimeout(() => {
      raf = requestAnimationFrame(() => requestAnimationFrame(() => {
        window.addEventListener('afterprint', done, { once: true })
        window.print()
      }))
    }, 250)
    return () => { window.clearTimeout(go); window.clearTimeout(clear); cancelAnimationFrame(raf); window.removeEventListener('afterprint', done) }
  }, [job])

  const stepMonth = (n: number) => {
    const d = fromISO(month + '-01')
    setMonth(format(new Date(d.getFullYear(), d.getMonth() + n, 1), 'yyyy-MM'))
  }

  const seg = (on: boolean) => cn('flex-1 h-7 rounded-md text-[12px] font-medium', on ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')
  const check = (k: keyof Show, label: string) => (
    <label className="flex items-center gap-2 text-[12px]">
      <input type="checkbox" checked={show[k]} onChange={(e) => setShow((s) => ({ ...s, [k]: e.target.checked }))} className="w-3.5 h-3.5 accent-foreground" />{label}
    </label>
  )

  return (
    <>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setMonth(start.slice(0, 7)) }}>
        <PopoverTrigger className="h-8 px-2.5 rounded-lg border border-border bg-card inline-flex items-center gap-1.5 text-[12px] font-medium hover:bg-muted" title="Print calendar">
          <Printer className="w-3.5 h-3.5" /><span className="hidden sm:inline">Print</span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[290px] p-3.5 gap-0">
          <div className="field-label mb-1">Range</div>
          <div className="flex rounded-lg border border-border p-0.5">
            <button type="button" onClick={() => setRange('days')} className={seg(range === 'days')}>9 days (this view)</button>
            <button type="button" onClick={() => setRange('month')} className={seg(range === 'month')}>Month</button>
          </div>
          {range === 'month' && (
            // Stepper, not a native <select>: picking from a native list counts as an
            // outside click in some browsers and closed the popover.
            <div className="mt-2 flex items-center gap-1">
              <button type="button" onClick={() => stepMonth(-1)} aria-label="Previous month" className="h-8 w-8 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
              <span className="flex-1 text-center text-[13px] font-semibold">{format(fromISO(month + '-01'), 'MMMM yyyy')}</span>
              <button type="button" onClick={() => stepMonth(1)} aria-label="Next month" className="h-8 w-8 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
          <div className="field-label mt-3 mb-1">Orientation · A4</div>
          <div className="flex gap-2">
            {(['portrait', 'landscape'] as const).map((o) => (
              <button key={o} type="button" onClick={() => setOrient(o)}
                className={cn('flex-1 rounded-lg border p-2 text-[12px] flex flex-col items-center gap-1', orient === o ? 'border-foreground ring-1 ring-foreground font-semibold' : 'border-border text-muted-foreground')}>
                <span className={cn('border-[1.5px] border-current rounded-[2px]', o === 'portrait' ? 'w-3.5 h-5' : 'w-5 h-3.5')} />{o === 'portrait' ? 'Portrait' : 'Landscape'}
              </button>
            ))}
          </div>
          <div className="field-label mt-3 mb-1">Show on cards</div>
          <div className="flex flex-col gap-1.5">
            {check('venue', 'Venue + time')}
            {check('status', 'Staff · AW · Inventory')}
            {check('cosmo', 'Cosmo setup / teardown (SU/TD)')}
            {check('ops', 'Assigned OP names')}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">Uses the board&apos;s current filters and search.</p>
          <button type="button" onClick={() => { setPrinting({ range, month, orient, show }); setOpen(false); setJob((n) => n + 1) }}
            className="mt-3 h-8 w-full rounded-md bg-foreground text-background text-[12px] font-semibold inline-flex items-center justify-center gap-1.5">
            <Printer className="w-3.5 h-3.5" />Print / Save PDF
          </button>
        </PopoverContent>
      </Popover>
      {printing && typeof document !== 'undefined' && createPortal(
        <PrintSheet cfg={printing} jobs={jobs} stages={stages} start={start} cosmo={cosmo} boardName={boardName} />,
        document.body,
      )}
    </>
  )
}

// ── The printed page ──────────────────────────────────────────────────────────
function PrintSheet({ cfg, jobs, stages, start, cosmo, boardName }: {
  cfg: Config; jobs: WonJob[]; stages: { id: string; dot: string; label?: string }[]; start: string; cosmo?: CosmoState; boardName?: string
}) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const [printedAt] = useState(() => new Date())
  const stageInfo = useMemo(() => new Map(stages.map((s, i) => [s.id, { ...s, i }])), [stages])
  const awIndex = stageInfo.get('OP_PREPARING_AW_DONE')?.i ?? (OP_STAGES as string[]).indexOf('OP_PREPARING_AW_DONE')
  const edge = (j: WonJob) => stageHex(stageInfo.get(j.op_stage)?.dot)
  const awDone = (j: WonJob) => (stageInfo.get(j.op_stage)?.i ?? -1) >= awIndex
  const opNames = (j: WonJob) => (j.assignee_ids ?? []).map((id) => teamMembers.find((m) => m.id === id)).filter((m) => m && m.role === 'operation').map((m) => m!.name.split(' ')[0])

  // Days covered
  const days = useMemo(() => {
    if (cfg.range === 'days') return Array.from({ length: CAL_DAYS }, (_, i) => toISO(addDays(fromISO(start), i)))
    const m0 = fromISO(cfg.month + '-01')
    const a = startOfWeek(startOfMonth(m0), { weekStartsOn: 1 }), b = endOfWeek(endOfMonth(m0), { weekStartsOn: 1 })
    const out: string[] = []
    for (let d = a; d <= b; d = addDays(d, 1)) out.push(toISO(d))
    return out
  }, [cfg.range, cfg.month, start])
  const first = days[0], last = days[days.length - 1]
  const inMonth = (d: string) => cfg.range === 'days' || d.startsWith(cfg.month)

  const placed = useMemo(() => jobs
    .map((job) => ({ job, all: jobDays(job) }))
    .filter((p) => p.all.some((d) => d >= first && d <= last))
    .sort((a, b) => a.all[0].localeCompare(b.all[0]) || (a.job.event_time ?? '').localeCompare(b.job.event_time ?? '')),
  [jobs, first, last])

  // 9-day view: jobs spanning the whole window go to one footer line.
  const spansAll = (p: { all: string[] }) => cfg.range === 'days' && p.all[0] <= first && p.all[p.all.length - 1] >= last
  const ongoing = placed.filter(spansAll)
  const onDay = (d: string) => placed.filter((p) => !spansAll(p) && p.all.includes(d))
  const markers = (d: string) => (cfg.show.cosmo ? jobs.flatMap((job) => phasesOn(cosmoFor(cosmo, job), d).map((r) => ({ job, r }))) : [])

  const title = cfg.range === 'month'
    ? format(fromISO(cfg.month + '-01'), 'MMMM yyyy')
    : `${format(fromISO(first), 'd MMM')} – ${format(fromISO(last), 'd MMM yyyy')}`
  const legend = stages.filter((s) => placed.some((p) => p.job.op_stage === s.id))

  return (
    <div className={cn('print-only text-black bg-white', `print-${cfg.orient}`)}>
      <style>{`@page { size: A4 ${cfg.orient}; margin: 8mm; }\n${PRINT_CSS}`}</style>
      <div className="pr-head">
        <b>Won &amp; Ready · {title}</b>
        <span>{boardName ? `${boardName} · ` : ''}printed {format(printedAt, 'd MMM yyyy HH:mm')} · {placed.length} job{placed.length === 1 ? '' : 's'}</span>
      </div>

      {cfg.range === 'month' ? (
        <div className="pr-month">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="pr-dh">{d}</div>)}
          {days.map((d) => (
            <div key={d} className={cn('pr-cell', !inMonth(d) && 'pr-out')}>
              <div className="pr-dn">{format(fromISO(d), 'd')}</div>
              {inMonth(d) && onDay(d).map(({ job, all }) => {
                const firstDay = all[0] === d || d === days.find((x) => all.includes(x))
                const span = all.length > 1 ? `${format(fromISO(all[0]), 'd')}–${format(fromISO(all[all.length - 1]), 'd MMM')}` : ''
                return (
                  <div key={job.job_id} className="pr-line" style={{ borderLeftColor: edge(job) }}>
                    <b>#{job.job_number ?? '—'}</b>{firstDay ? <> {jobCardName(job)}{span && <i> · {span}</i>}{cfg.show.venue && job.event_time && <i> · {job.event_time}</i>}</> : <i> cont.</i>}
                  </div>
                )
              })}
              {inMonth(d) && markers(d).map(({ job, r }) => <Marker key={`${job.job_id}${r.type}`} r={r} />)}
            </div>
          ))}
        </div>
      ) : cfg.orient === 'portrait' ? (
        <div className="pr-rows">
          {days.map((d) => {
            const items = onDay(d), mk = markers(d)
            return (
              <div key={d} className="pr-row">
                <div className="pr-rl"><b>{format(fromISO(d), 'EEE d')}</b><span>{format(fromISO(d), 'MMM')}</span></div>
                <div>
                  {items.length === 0 && mk.length === 0 && <span className="pr-empty">—</span>}
                  {items.map(({ job, all }) => <Card key={job.job_id} job={job} all={all} day={d} edge={edge(job)} show={cfg.show} aw={awDone(job)} ops={opNames(job)} />)}
                  {mk.map(({ job, r }) => <Marker key={`${job.job_id}${r.type}`} r={r} name={jobCardName(job)} />)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="pr-cols">
          {days.map((d) => (
            <div key={d} className="pr-col">
              <div className="pr-ch"><span>{format(fromISO(d), 'EEE')}</span><b>{format(fromISO(d), 'd')}</b></div>
              {onDay(d).map(({ job, all }) => <Card key={job.job_id} job={job} all={all} day={d} edge={edge(job)} show={cfg.show} aw={awDone(job)} ops={opNames(job)} compact />)}
              {markers(d).map(({ job, r }) => <Marker key={`${job.job_id}${r.type}`} r={r} />)}
            </div>
          ))}
        </div>
      )}

      <div className="pr-foot">
        {ongoing.length > 0 && <div><b>Ongoing all 9 days:</b> {ongoing.map(({ job, all }) => `#${job.job_number ?? '—'} ${jobCardName(job)} (until ${format(fromISO(all[all.length - 1]), 'd MMM')})`).join(' · ')}</div>}
        <div className="pr-legend">
          {legend.map((s) => <span key={s.id}><i style={{ background: stageHex(s.dot) }} />{s.label ?? s.id}</span>)}
          {cfg.show.cosmo && <><span>▲ Setup</span><span>▼ Teardown</span></>}
        </div>
      </div>
    </div>
  )
}

function Card({ job, all, day, edge, show, aw, ops, compact }: {
  job: WonJob; all: string[]; day: string; edge: string; show: Show; aw: boolean; ops: string[]; compact?: boolean
}) {
  const assigned = (job.staff_list ?? []).length, need = job.staff_needed
  const staff = need === 0 ? 'No staff' : need != null ? `Staff ${assigned}/${need}` : assigned ? `Staff ${assigned}` : 'Staff —'
  const k = all.indexOf(day)
  return (
    <div className={cn('pr-card', compact && 'pr-compact')} style={{ borderLeftColor: edge }}>
      <b>#{job.job_number ?? '—'} {jobCardName(job)}</b>
      {all.length > 1 && <span className="pr-sub"> · day {k + 1}/{all.length}</span>}
      {show.venue && (job.venue || job.event_time) && <div className="pr-sub">{[job.venue, job.event_time].filter(Boolean).join(' · ')}</div>}
      {show.status && <div className="pr-chips"><span>{staff}</span><span>AW {aw ? '✓' : '—'}</span><span>{INVENTORY[job.inventory_status ?? 'none'].label}</span></div>}
      {show.ops && ops.length > 0 && <div className="pr-sub">OP: {ops.join(', ')}</div>}
    </div>
  )
}

function Marker({ r, name }: { r: CosmoInstall; name?: string }) {
  const down = isTeardown(r)
  const team = (r.install_teams ?? []).join(', ')
  return (
    <div className={cn('pr-mark', down ? 'pr-td' : 'pr-su')}>
      {down ? '▼ TD' : '▲ SU'} #{r.running_number} {hhmm(r.at)}{name && <i> · {name}</i>}{team && <i> · {team}</i>}
    </div>
  )
}
