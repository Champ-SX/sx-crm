'use client'

import { useMemo } from 'react'
import { addDays, format, isToday, isWeekend, parseISO, differenceInCalendarDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Users, Palette, Package, Check } from 'lucide-react'
import type { WonJob, InventoryStatus, TeamMember } from '@/types'
import { parseJobDates, jobCardName } from '@/lib/jobs'
import { cn, parseDbDate } from '@/lib/utils'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { UserAvatar } from '@/components/shared/user-avatar'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

export const CAL_DAYS = 9

const toISO = (d: Date) => format(d, 'yyyy-MM-dd')
const fromISO = (s: string) => parseISO(s + 'T00:00:00')

// Stage colour = the column's dot colour on the Board (bg-<name>-<shade>).
const TW_HEX: Record<string, string> = {
  slate: '#94a3b8', gray: '#9ca3af', zinc: '#a1a1aa', red: '#ef4444', rose: '#f43f5e', pink: '#ec4899',
  orange: '#f97316', amber: '#f59e0b', yellow: '#eab308', lime: '#84cc16', green: '#22c55e', emerald: '#10b981',
  teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9', blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7',
}
export function stageHex(dotClass: string | undefined): string {
  if (dotClass?.startsWith('#')) return dotClass
  const name = /bg-([a-z]+)-/.exec(dotClass ?? '')?.[1] ?? ''
  return TW_HEX[name] ?? TW_HEX.slate
}

/** The days a job occupies: a start–end range, or a comma list of dates from the title. */
export function jobDays(job: WonJob): string[] {
  const parsed = parseJobDates(job.event_display_name || job.product_name)
  const start = job.event_date || parsed.start
  if (!start) return []
  const end = job.event_end_date || parsed.end
  if (end && end > start) {
    const n = Math.min(differenceInCalendarDays(fromISO(end), fromISO(start)), 60)
    return Array.from({ length: n + 1 }, (_, i) => toISO(addDays(fromISO(start), i)))
  }
  if (parsed.dates.length > 1 && parsed.dates[0] === start) return parsed.dates
  return [start]
}

interface Staffing { assigned: number; needed: number | null; tone: 'ok' | 'short' | 'none' | 'unset' }
function staffing(job: WonJob): Staffing {
  const assigned = (job.staff_list ?? []).length
  const needed = job.staff_needed ?? null
  if (needed == null) return { assigned, needed, tone: assigned > 0 ? 'ok' : 'none' }
  if (needed === 0 || assigned >= needed) return { assigned, needed, tone: 'ok' }
  return { assigned, needed, tone: assigned === 0 ? 'none' : 'short' }
}

const toneCls: Record<Staffing['tone'], string> = {
  ok: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  short: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  none: 'bg-red-500/12 text-red-700 dark:text-red-300',
  unset: 'bg-muted text-muted-foreground',
}

function StaffChip({ job, long }: { job: WonJob; long?: boolean }) {
  const s = staffing(job)
  const label = s.needed == null ? `${s.assigned} staff` : `${long ? 'Staff ' : ''}${s.assigned}/${s.needed}`
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium tabular-nums', toneCls[s.tone])}
      title={s.needed == null ? 'Staff needed not set' : `${s.assigned} assigned of ${s.needed} needed`}>
      <Users className="w-3 h-3" />{label}
    </span>
  )
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export const INVENTORY: Record<InventoryStatus, { label: string; th: string; cls: string }> = {
  none:    { label: 'None',    th: 'ยังไม่เตรียม',   cls: toneCls.none },
  partial: { label: 'Partial', th: 'เตรียมบางส่วน', cls: toneCls.short },
  ready:   { label: 'Ready',   th: 'พร้อมแล้ว',      cls: toneCls.ok },
}

/** Pill that opens a 3-step picker. Used on the calendar and in the job drawer. */
export function InventoryPill({ job, size = 'sm' }: { job: WonJob; size?: 'sm' | 'md' }) {
  const updateWonJob = useCRMStore((s) => s.updateWonJob)
  const { user } = useAuth()
  const cur: InventoryStatus = job.inventory_status ?? 'none'
  const set = (v: InventoryStatus) => {
    if (v === cur) return
    void updateWonJob(job.job_id, {
      inventory_status: v,
      inventory_updated_by: user?.user_metadata?.full_name ?? user?.email ?? null,
      inventory_updated_at: new Date().toISOString(),
    })
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger onClick={(e) => e.stopPropagation()}
        className={cn('inline-flex items-center gap-1 rounded font-medium hover:ring-1 hover:ring-foreground/20', size === 'md' ? 'px-2 py-1 text-[12px]' : 'px-1.5 py-px text-[11px]', INVENTORY[cur].cls)}
        title="Inventory — click to change">
        <Package className="w-3 h-3" />{size === 'md' ? `${INVENTORY[cur].label} · ${INVENTORY[cur].th}` : INVENTORY[cur].label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]" onClick={(e) => e.stopPropagation()}>
        {(Object.keys(INVENTORY) as InventoryStatus[]).map((k) => (
          <DropdownMenuItem key={k} onClick={() => set(k)} className="gap-2">
            <span className={cn('rounded px-1.5 py-px text-[11px] font-medium', INVENTORY[k].cls)}>{INVENTORY[k].label}</span>
            <span className="text-[13px]">{INVENTORY[k].th}</span>
            {k === cur && <Check className="w-3.5 h-3.5 ml-auto" />}
          </DropdownMenuItem>
        ))}
        {job.inventory_updated_at && (
          <div className="border-t border-border mt-1 px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">
            {job.inventory_updated_by ? `${job.inventory_updated_by} · ` : ''}{format(parseDbDate(job.inventory_updated_at), 'd MMM HH:mm')}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AwPill({ done }: { done: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium', done ? toneCls.ok : 'bg-muted text-muted-foreground')}
      title={done ? 'Artwork done' : 'Artwork not done yet'}>
      <Palette className="w-3 h-3" />AW
    </span>
  )
}

/** Operation-role assignees only — max 3 avatars, then +N. */
function OpsAvatars({ job, ops }: { job: WonJob; ops: TeamMember[] }) {
  const people = ops.filter((m) => (job.assignee_ids ?? []).includes(m.id))
  if (people.length === 0) {
    return <span className="inline-flex w-5 h-5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground text-[11px] items-center justify-center" title="No Operation assignee">+</span>
  }
  return (
    <span className="inline-flex items-center" title={people.map((p) => p.name || p.email).join(', ')}>
      {people.slice(0, 3).map((p, i) => (
        <span key={p.id} className={cn('rounded-full ring-2 ring-card', i > 0 && '-ml-1.5')}><UserAvatar name={p.name || p.email} size={20} /></span>
      ))}
      {people.length > 3 && <span className="-ml-1.5 w-5 h-5 rounded-full ring-2 ring-card bg-muted text-[10px] font-medium inline-flex items-center justify-center">+{people.length - 3}</span>}
    </span>
  )
}

function Pills({ job, awDone, long }: { job: WonJob; awDone: boolean; long?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <StaffChip job={job} long={long} /><AwPill done={awDone} /><InventoryPill job={job} />
    </span>
  )
}

function JobNo({ job }: { job: WonJob }) {
  return job.job_number ? <span className="font-mono text-muted-foreground mr-1">#{job.job_number}</span> : null
}

interface OpCalendarProps {
  jobs: WonJob[]
  stages: { id: string; dot: string }[]   // board columns in order, with their dot colour
  start: string                       // ISO first day of the window
  onStart: (iso: string) => void
  onOpen: (jobId: string) => void
}

export function OpCalendar({ jobs, stages, start, onStart, onOpen }: OpCalendarProps) {
  const days = useMemo(() => Array.from({ length: CAL_DAYS }, (_, i) => toISO(addDays(fromISO(start), i))), [start])
  const first = days[0], last = days[CAL_DAYS - 1]

  // Stage colour + "AW done" (= at or past the AW-done column in board order).
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const ops = useMemo(() => teamMembers.filter((m) => m.role === 'operation'), [teamMembers])
  const stageOf = useMemo(() => new Map(stages.map((st, i) => [st.id, { ...st, index: i }])), [stages])
  const awIndex = stageOf.get('OP_PREPARING_AW_DONE')?.index ?? Infinity
  const edge = (job: WonJob) => stageHex(stageOf.get(job.op_stage)?.dot)
  const awDone = (job: WonJob) => (stageOf.get(job.op_stage)?.index ?? -1) >= awIndex
  const open = (id: string) => onOpen(id)
  const cardProps = (id: string) => ({
    role: 'button' as const, tabIndex: 0, onClick: () => open(id),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(id) } },
  })

  // Every job that touches the window, with its days clipped to it.
  const placed = useMemo(() => jobs
    .map((job) => {
      const all = jobDays(job)
      const inWin = all.filter((d) => d >= first && d <= last)
      return { job, all, inWin }
    })
    .filter((p) => p.inWin.length > 0)
    .sort((a, b) => a.inWin[0].localeCompare(b.inWin[0]) || (a.job.event_time ?? '').localeCompare(b.job.event_time ?? '')),
  [jobs, first, last])

  // Contiguous multi-day ranges render as spanning bars; the rest sit in their day column.
  const isRange = (p: typeof placed[number]) => p.all.length > 1 && differenceInCalendarDays(fromISO(p.all[p.all.length - 1]), fromISO(p.all[0])) === p.all.length - 1
  const bars = placed.filter(isRange)
  const singles = placed.filter((p) => !isRange(p))

  const totals = placed.reduce((t, p) => {
    const s = staffing(p.job)
    t.events++
    if (s.needed != null) { t.needed += s.needed; t.open += Math.max(0, s.needed - s.assigned) }
    return t
  }, { events: 0, needed: 0, open: 0 })

  const shift = (n: number) => onStart(toISO(addDays(fromISO(start), n)))
  const rangeLabel = `${format(fromISO(first), 'd MMM')} – ${format(fromISO(last), 'd MMM yyyy')}`

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background">
      {/* Window controls + what Operation needs to act on */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-CAL_DAYS)} aria-label="Previous 9 days" className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => onStart(toISO(new Date()))} className="h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-medium hover:bg-muted">Today</button>
          <button type="button" onClick={() => shift(CAL_DAYS)} aria-label="Next 9 days" className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <span className="text-[14px] font-semibold text-foreground">{rangeLabel}</span>
        <span className="ml-auto text-[12px] text-muted-foreground">
          {totals.events} event{totals.events === 1 ? '' : 's'}
          {totals.needed > 0 && <> · {totals.needed} staff needed</>}
          {totals.open > 0 && <> · <span className="text-amber-600 dark:text-amber-400 font-medium">{totals.open} open slot{totals.open === 1 ? '' : 's'}</span></>}
        </span>
      </div>

      {/* Desktop: 9 columns */}
      <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pb-6">
        <div className="grid grid-cols-9 gap-1.5 sticky top-0 z-10 bg-background pb-1.5 border-b border-border">
          {days.map((d) => {
            const dt = fromISO(d)
            return (
              <div key={d} className={cn('px-2 pt-1 pb-1 rounded-md', isWeekend(dt) && 'bg-muted/60')}>
                <div className="text-[11px] text-muted-foreground">{format(dt, 'EEE')}</div>
                <div className={cn('text-[17px] font-semibold leading-tight', isToday(dt) ? 'text-primary' : 'text-foreground')}>
                  {format(dt, 'd')}{(d === first || dt.getDate() === 1) && <span className="text-[11px] font-normal text-muted-foreground ml-1">{format(dt, 'MMM')}</span>}
                </div>
              </div>
            )
          })}
        </div>

        {bars.length > 0 && (
          <div className="grid grid-cols-9 gap-1.5 pt-1.5 [grid-auto-flow:row_dense]">
            {bars.map(({ job, all, inWin }) => {
              const col = days.indexOf(inWin[0]) + 1
              const contL = all[0] < first, contR = all[all.length - 1] > last
              return (
                <div key={job.job_id} {...cardProps(job.job_id)}
                  style={{ gridColumn: `${col} / span ${inWin.length}`, borderLeftColor: edge(job) }}
                  className={cn('text-left rounded-md border border-border border-l-4 cursor-pointer bg-card px-2 py-1.5 hover:border-foreground/30 transition-colors min-w-0', contL && 'rounded-l-none', contR && 'rounded-r-none')}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-semibold truncate"><JobNo job={job} />{jobCardName(job)}</span>
                    <Pills job={job} awDone={awDone(job)} long /><OpsAvatars job={job} ops={ops} />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {contL && '← '}{format(fromISO(all[0]), 'd MMM')} – {format(fromISO(all[all.length - 1]), 'd MMM')}{contR && ' →'}
                    {job.venue && <> · {job.venue}</>}{job.event_time && <> · {job.event_time}</>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-9 gap-1.5 pt-1.5 flex-1">
          {days.map((d) => {
            const items = singles.filter((p) => p.inWin.includes(d))
            return (
              <div key={d} className={cn('flex flex-col gap-1.5 rounded-md min-h-[200px] p-0.5', isWeekend(fromISO(d)) && 'bg-muted/40')}>
                {items.map(({ job }) => (
                  <div key={job.job_id} {...cardProps(job.job_id)}
                    style={{ borderLeftColor: edge(job) }}
                    className="text-left rounded-md border border-border border-l-4 cursor-pointer bg-card p-1.5 hover:border-foreground/30 transition-colors min-w-0">
                    <div className="text-[12px] font-semibold leading-snug line-clamp-3 [overflow-wrap:anywhere]"><JobNo job={job} />{jobCardName(job)}</div>
                    {job.venue && <div className="text-[11px] text-muted-foreground truncate">{job.venue}</div>}
                    {job.event_time && <div className="text-[11px] text-muted-foreground truncate">{job.event_time}</div>}
                    <div className="mt-1"><Pills job={job} awDone={awDone(job)} /></div>
                    <div className="mt-1"><OpsAvatars job={job} ops={ops} /></div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile: the same 9 days as an agenda */}
      <div className="sm:hidden flex-1 min-h-0 overflow-y-auto px-4 pb-6">
        {days.map((d) => {
          const dt = fromISO(d)
          const items = placed.filter((p) => p.inWin.includes(d))
          return (
            <div key={d} className={cn('grid grid-cols-[44px_1fr] gap-2 py-2.5 border-t border-border', isWeekend(dt) && 'bg-muted/30 -mx-4 px-4')}>
              <div className="text-center">
                <div className="text-[11px] text-muted-foreground">{format(dt, 'EEE')}</div>
                <div className={cn('text-[18px] font-semibold leading-tight', isToday(dt) ? 'text-primary' : 'text-foreground')}>{format(dt, 'd')}</div>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                {items.length === 0 && <span className="text-[12px] text-muted-foreground pt-2">—</span>}
                {items.map(({ job, all }) => {
                  const k = all.indexOf(d)
                  return (
                    <div key={job.job_id} {...cardProps(job.job_id)}
                      style={{ borderLeftColor: edge(job) }}
                      className="text-left rounded-md border border-border border-l-4 cursor-pointer bg-card px-2.5 py-2 min-w-0">
                      <div className="text-[13px] font-semibold truncate"><JobNo job={job} />{jobCardName(job)}{all.length > 1 && <span className="font-normal text-muted-foreground"> · day {k + 1}/{all.length}</span>}</div>
                      <div className="text-[12px] text-muted-foreground truncate">{[job.venue, job.event_time].filter(Boolean).join(' · ')}</div>
                      <div className="mt-1 flex items-center justify-between gap-2"><Pills job={job} awDone={awDone(job)} long /><OpsAvatars job={job} ops={ops} /></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
