'use client'

import { useEffect, useMemo, useState } from 'react'
import { addDays, format, isToday, isWeekend, parseISO, differenceInCalendarDays, startOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight, Users, Palette, Package, Check, CircleCheck, ArrowRight, Minus, Plus, UserPlus, UserX, TriangleAlert, ChevronDown } from 'lucide-react'
import { OP_STAGES, type WonJob, type InventoryStatus, type TeamMember } from '@/types'
import { parseJobDates, jobCardName } from '@/lib/jobs'
import { cn, parseDbDate } from '@/lib/utils'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

export const CAL_DAYS = 9

/** Monday of the week containing `d` — the calendar always starts on a Monday (Mon → next Tue). */
export function weekStart(d = new Date()): string {
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

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
  if (needed == null) return { assigned, needed, tone: assigned > 0 ? 'short' : 'none' }
  if (needed === 0 || assigned >= needed) return { assigned, needed, tone: 'ok' }
  return { assigned, needed, tone: assigned === 0 ? 'none' : 'short' }
}

const toneCls: Record<Staffing['tone'], string> = {
  ok: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  short: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  none: 'bg-red-500/12 text-red-700 dark:text-red-300',
  unset: 'bg-muted text-muted-foreground',
}

/** − N + headcount. Writes won_jobs.staff_needed. Shared by the calendar popover and the drawer. */
export function NeedStepper({ job }: { job: WonJob }) {
  const updateWonJob = useCRMStore((s) => s.updateWonJob)
  const need = job.staff_needed ?? 0
  const set = (n: number) => updateWonJob(job.job_id, { staff_needed: Math.max(1, Math.min(99, n)) })
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-card overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="Fewer staff needed" onClick={() => set(need - 1)} disabled={need <= 1}
        className="w-7 h-7 inline-flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40"><Minus className="w-3.5 h-3.5" /></button>
      <span className="min-w-7 text-center text-[13px] font-semibold tabular-nums">{job.staff_needed ?? '–'}</span>
      <button type="button" aria-label="More staff needed" onClick={() => set(need + 1)}
        className="w-7 h-7 inline-flex items-center justify-center text-muted-foreground hover:bg-muted"><Plus className="w-3.5 h-3.5" /></button>
    </span>
  )
}

/** "No staff needed" = staff_needed 0. Unticking clears it so the headcount is asked again. */
export function NoStaffToggle({ job }: { job: WonJob }) {
  const updateWonJob = useCRMStore((s) => s.updateWonJob)
  const on = job.staff_needed === 0
  return (
    <label className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer select-none" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={on} onChange={() => updateWonJob(job.job_id, { staff_needed: on ? null : 0 })}
        className="w-3.5 h-3.5 accent-foreground" />
      No staff needed
    </label>
  )
}

/** Staff pill → popover: set headcount, see who's on, fill open slots. */
function StaffPill({ job, long, onAddStaff }: { job: WonJob; long?: boolean; onAddStaff?: (jobId: string) => void }) {
  const updateWonJob = useCRMStore((st) => st.updateWonJob)
  const s = staffing(job)
  const list = job.staff_list ?? []
  const none = s.needed === 0
  const label = none ? 'No staff' : s.needed == null ? `${s.assigned}${s.assigned > 0 ? ' · set need' : ' staff'}` : `${long ? 'Staff ' : ''}${s.assigned}/${s.needed}`
  const open = s.needed == null ? 0 : Math.max(0, s.needed - s.assigned)
  return (
    <Popover>
      <PopoverTrigger onClick={(e) => e.stopPropagation()}
        className={cn('inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium tabular-nums hover:ring-1 hover:ring-foreground/20', toneCls[s.tone])}
        title="Staff — click to set headcount or add staff">
        {none ? <UserX className="w-3 h-3" /> : <Users className="w-3 h-3" />}{label}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-3" onClick={(e) => e.stopPropagation()}>
        {s.needed == null ? (
          <div>
            <p className="text-[13px] font-semibold">How many staff does this event need?</p>
            <div className="flex gap-1.5 mt-2.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => updateWonJob(job.job_id, { staff_needed: n })}
                  className="h-8 min-w-9 px-2 rounded-md border border-border text-[13px] font-medium hover:bg-foreground hover:text-background">{n === 0 ? 'None' : n === 5 ? '5+' : n}</button>
              ))}
            </div>
            <p className="text-[12px] text-muted-foreground mt-2">None = runs without staff (delivery, rental, self-run…) · {s.assigned} assigned</p>
          </div>
        ) : none ? (
          <div>
            <div className="flex items-center justify-between"><span className="text-[13px] font-semibold">Staff</span><NoStaffToggle job={job} /></div>
            <p className="text-[12px] text-emerald-700 dark:text-emerald-400 mt-2.5 flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5" />Counts as staffed for the ready check</p>
            {s.assigned > 0 && <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-1.5 flex items-center gap-1.5"><TriangleAlert className="w-3.5 h-3.5" />{s.assigned} staff still listed — remove them in the job if not needed</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12px] text-muted-foreground">Need <NeedStepper job={job} /></span>
              <NoStaffToggle job={job} />
            </div>
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden bg-muted my-2.5">
              {Array.from({ length: Math.max(s.needed, s.assigned, 1) }, (_, i) => (
                <span key={i} className={cn('flex-1', i < s.assigned ? 'bg-emerald-500' : 'bg-transparent')} />
              ))}
            </div>
            <p className={cn('text-[12px] mb-1', open > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400')}>
              {s.assigned} of {s.needed} assigned{open > 0 ? ` · ${open} open slot${open > 1 ? 's' : ''}` : ' · full'}
            </p>
          </>
        )}
        {list.length > 0 && (
          <ul className="mt-1.5">
            {list.map((m) => (
              <li key={m.staff_id} className="flex items-center gap-2 py-1.5 border-t border-border text-[13px]">
                <UserAvatar name={m.nickname || m.name} size={22} />
                <span className="truncate">{m.nickname || m.name}</span>
                <span className="ml-auto text-[12px] text-muted-foreground">{m.bank_name}</span>
              </li>
            ))}
          </ul>
        )}
        {onAddStaff && !none && (
          <button type="button" onClick={() => onAddStaff(job.job_id)}
            className="mt-2 w-full flex items-center gap-2 rounded-md border border-dashed border-muted-foreground/40 px-2.5 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:border-foreground/40">
            <UserPlus className="w-4 h-4" />{open > 0 ? `Add staff to open slot${open > 1 ? 's' : ''}` : 'Add staff'}
          </button>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">Fees and จ่ายแล้ว stay in the job drawer.</p>
      </PopoverContent>
    </Popover>
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

function AwPill({ done, onMark }: { done: boolean; onMark?: () => void }) {
  const cls = cn('inline-flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-medium', done ? toneCls.ok : 'bg-muted text-muted-foreground')
  if (!done && onMark) {
    return (
      <button type="button" className={cn(cls, 'hover:ring-1 hover:ring-foreground/20')} title="Artwork done? Click to move to AW DONE"
        onClick={(e) => { e.stopPropagation(); onMark() }}>
        <Palette className="w-3 h-3" />AW
      </button>
    )
  }
  return <span className={cls} title={done ? 'Artwork done' : 'Artwork not done yet'}><Palette className="w-3 h-3" />AW</span>
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

function Pills({ job, awDone, long, onMarkAw, onAddStaff }: { job: WonJob; awDone: boolean; long?: boolean; onMarkAw?: () => void; onAddStaff?: (jobId: string) => void }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <StaffPill job={job} long={long} onAddStaff={onAddStaff} /><AwPill done={awDone} onMark={onMarkAw} /><InventoryPill job={job} />
    </span>
  )
}

/** Staff fully assigned against a set headcount (unset needed never counts as ready). */
function staffComplete(job: WonJob): boolean {
  const s = staffing(job)
  return s.needed != null && s.assigned >= s.needed
}

const AW_STAGE = 'OP_PREPARING_AW_DONE'
const READY_STAGE = 'OP_READY_FOR_EVENT'

function JobNo({ job }: { job: WonJob }) {
  return job.job_number ? <span className="font-mono text-muted-foreground mr-1">#{job.job_number}</span> : null
}

interface OpCalendarProps {
  jobs: WonJob[]
  stages: { id: string; dot: string; label?: string }[]   // board columns in order, with dot colour + name
  start: string                       // ISO first day of the window
  onStart: (iso: string) => void
  onOpen: (jobId: string) => void
  onMove: (jobId: string, stage: string) => void
  paused?: boolean                    // a drawer is open — hold ready prompts until it closes
  onAddStaff?: (jobId: string) => void
}

export function OpCalendar({ jobs, stages, start, onStart, onOpen, onMove, paused, onAddStaff }: OpCalendarProps) {
  const days = useMemo(() => Array.from({ length: CAL_DAYS }, (_, i) => toISO(addDays(fromISO(start), i))), [start])
  const first = days[0], last = days[CAL_DAYS - 1]

  // Stage colour + "AW done" (= at or past the AW-done column in board order).
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const ops = useMemo(() => teamMembers.filter((m) => m.role === 'operation'), [teamMembers])
  // Rank: built-in stages by their fixed pipeline order (saved column order isn't
  // reliable for them); a custom column ranks just after the built-in before it.
  const stageOf = useMemo(() => {
    const builtIn = OP_STAGES as string[]
    const ranked: [string, typeof stages[number] & { index: number }][] = []
    for (const st of stages) {
      const b = builtIn.indexOf(st.id)
      const prev = ranked.length ? Math.floor(ranked[ranked.length - 1][1].index) : -1
      ranked.push([st.id, { ...st, index: b >= 0 ? b : prev + 0.5 }])
    }
    return new Map(ranked)
  }, [stages])
  const awIndex = stageOf.get(AW_STAGE)?.index ?? Infinity
  const edge = (job: WonJob) => stageHex(stageOf.get(job.op_stage)?.dot)
  const awDone = (job: WonJob) => (stageOf.get(job.op_stage)?.index ?? -1) >= awIndex
  const idx = (stage: string) => stageOf.get(stage)?.index ?? -1
  const readyIndex = stageOf.get(READY_STAGE)?.index
  const awStageLabel = stageOf.get(AW_STAGE)?.label ?? 'OP Preparing · AW DONE'
  const readyStageLabel = stageOf.get(READY_STAGE)?.label ?? 'OP พร้อมออกงาน'
  // Forward-only: AW move only from an earlier column; ready move only from before the ready column.
  const canMarkAw = (job: WonJob) => stageOf.has(AW_STAGE) && idx(job.op_stage) < awIndex
  const isReady = (job: WonJob) => readyIndex != null && idx(job.op_stage) < readyIndex
    && awDone(job) && staffComplete(job) && (job.inventory_status ?? 'none') === 'ready'

  // ── Stage prompts ──
  // A job that *becomes* ready (any cause — inventory pill, staff in the drawer…)
  // queues one prompt. "Not now" drops it; the card keeps a "Ready → move" chip.
  const readyIds = jobs.filter(isReady).map((j) => j.job_id).sort()
  const readyKey = readyIds.join(',')
  const [seenReady, setSeenReady] = useState<string | null>(null)
  const [queue, setQueue] = useState<string[]>([])
  const [quiet, setQuiet] = useState<string[]>([])   // answered or moved — chip only from now on
  if (seenReady !== readyKey) {
    const before = new Set(seenReady === null ? readyIds : seenReady.split(',').filter(Boolean))
    const fresh = readyIds.filter((id) => !before.has(id) && !quiet.includes(id))
    setSeenReady(readyKey)
    if (fresh.length) setQueue((q) => [...q, ...fresh.filter((id) => !q.includes(id))])
  }
  const [ask, setAsk] = useState<{ kind: 'aw' | 'ready'; id: string } | null>(null)
  const queued = queue.find((id) => readyIds.includes(id))
  const prompt = ask ?? (!paused && queued ? { kind: 'ready' as const, id: queued } : null)
  const promptJob = prompt ? jobs.find((j) => j.job_id === prompt.id) : undefined
  const closePrompt = () => {
    if (prompt) {
      const id = prompt.id
      setQueue((q) => q.filter((x) => x !== id))
      if (prompt.kind === 'ready') setQuiet((q) => (q.includes(id) ? q : [...q, id]))
    }
    setAsk(null)
  }

  const [undo, setUndo] = useState<{ id: string; from: string; text: string } | null>(null)
  useEffect(() => {
    if (!undo) return
    const t = window.setTimeout(() => setUndo(null), 5000)
    return () => window.clearTimeout(t)
  }, [undo])
  const move = (job: WonJob, stage: string, label: string) => {
    setUndo({ id: job.job_id, from: job.op_stage, text: `${job.job_number ? `#${job.job_number} ` : ''}moved to ${label}` })
    onMove(job.job_id, stage)
    closePrompt()
  }

  const ReadyChip = ({ job }: { job: WonJob }) => isReady(job) ? (
    <button type="button" onClick={(e) => { e.stopPropagation(); setAsk({ kind: 'ready', id: job.job_id }) }}
      className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-400/60 bg-emerald-500/12 px-2 py-px text-[11px] font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
      <CircleCheck className="w-3 h-3" />Ready<ArrowRight className="w-3 h-3" />move
    </button>
  ) : null
  const markAw = (job: WonJob) => canMarkAw(job) ? () => setAsk({ kind: 'aw', id: job.job_id }) : undefined

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
  // "Ongoing" = past staff payment (wait payment / done) but the event is still running.
  // These fold to slim bars (or hide) so the days with real prep work stay readable.
  const payIndex = stageOf.get('OP_WAIT_STAFF_PAYMENT_DOC_TERR')?.index ?? Infinity
  const isOngoing = (job: WonJob) => idx(job.op_stage) >= payIndex
  const [ongoingMode, setOngoingMode] = useState<'compact' | 'full' | 'hide'>(() => {
    if (typeof window === 'undefined') return 'compact'
    try { const v = localStorage.getItem('won-cal-ongoing'); return v === 'full' || v === 'hide' ? v : 'compact' } catch { return 'compact' }
  })
  const pickOngoing = (v: 'compact' | 'full' | 'hide') => { setOngoingMode(v); try { localStorage.setItem('won-cal-ongoing', v) } catch { /* private mode */ } }
  const [openDays, setOpenDays] = useState<string[]>([])   // mobile: days whose folded ongoing rows are expanded
  const staffPaid = (job: WonJob) => (job.staff_list ?? []).length > 0 && (job.staff_list ?? []).every((m) => m.paid)
  const slim = ongoingMode !== 'full' ? placed.filter((p) => isOngoing(p.job)) : []
  const live = ongoingMode !== 'full' ? placed.filter((p) => !isOngoing(p.job)) : placed
  const bars = live.filter(isRange)
  const singles = live.filter((p) => !isRange(p))

  const totals = placed.reduce((t, p) => {
    const s = staffing(p.job)
    t.events++
    if (s.needed != null) { t.needed += s.needed; t.open += Math.max(0, s.needed - s.assigned) }
    return t
  }, { events: 0, needed: 0, open: 0 })

  const shift = (n: number) => onStart(toISO(addDays(fromISO(start), n)))
  const rangeLabel = `${format(fromISO(first), 'EEE d MMM')} – ${format(fromISO(last), 'EEE d MMM yyyy')}`

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-background">
      {/* Window controls + what Operation needs to act on */}
      <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-7)} aria-label="Previous week" className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
          <button type="button" onClick={() => onStart(weekStart())} className="h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-medium hover:bg-muted">Today</button>
          <button type="button" onClick={() => shift(7)} aria-label="Next week" className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <span className="text-[14px] font-semibold text-foreground">{rangeLabel}</span>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          Ongoing
          <span className="relative">
            <select value={ongoingMode} onChange={(e) => pickOngoing(e.target.value as 'compact' | 'full' | 'hide')}
              className="h-7 appearance-none rounded-md border border-border bg-card pl-2 pr-6 text-[12px] text-foreground">
              <option value="compact">compact</option><option value="full">full</option><option value="hide">hide</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </span>
        </label>
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

        {ongoingMode === 'compact' && slim.length > 0 && (
          <div className="grid grid-cols-9 gap-1 pt-1.5 [grid-auto-flow:row_dense]">
            {slim.map(({ job, all, inWin }) => {
              const contL = all[0] < first, contR = all[all.length - 1] > last
              const span = Math.max(1, days.indexOf(inWin[inWin.length - 1]) - days.indexOf(inWin[0]) + 1)
              return (
                <div key={job.job_id} {...cardProps(job.job_id)}
                  title={`${job.job_number ? `#${job.job_number} ` : ''}${jobCardName(job)} · ${format(fromISO(all[0]), 'd MMM')} – ${format(fromISO(all[all.length - 1]), 'd MMM')}`}
                  style={{ gridColumn: `${days.indexOf(inWin[0]) + 1} / span ${span}`, borderLeftColor: edge(job) }}
                  className={cn('h-[22px] flex items-center gap-1.5 min-w-0 rounded-md border border-border border-l-4 bg-muted/50 px-2 text-[11px] text-muted-foreground cursor-pointer hover:bg-muted whitespace-nowrap overflow-hidden', contL && 'rounded-l-none', contR && 'rounded-r-none')}>
                  {job.job_number && <span className="font-mono">#{job.job_number}</span>}
                  <span className="font-semibold text-foreground truncate">{jobCardName(job)}</span>
                  <span className="shrink-0">· {all.length > 1 ? `until ${format(fromISO(all[all.length - 1]), 'd MMM')}` : 'ongoing'}{contR && ' →'}</span>
                  {staffPaid(job) && <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><CircleCheck className="w-3 h-3" />staff paid</span>}
                </div>
              )
            })}
          </div>
        )}

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
                    <Pills job={job} awDone={awDone(job)} long onMarkAw={markAw(job)} onAddStaff={onAddStaff} /><OpsAvatars job={job} ops={ops} /><ReadyChip job={job} />
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
                    <div className="mt-1"><Pills job={job} awDone={awDone(job)} onMarkAw={markAw(job)} onAddStaff={onAddStaff} /></div>
                    <ReadyChip job={job} />
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
          const items = live.filter((p) => p.inWin.includes(d))
          const ong = ongoingMode === 'compact' ? slim.filter((p) => p.inWin.includes(d)) : []
          // Each ongoing job shows on its first day in the window; later days fold into "N ongoing".
          const ongFirst = ong.filter((p) => p.inWin[0] === d)
          const ongRest = ong.filter((p) => p.inWin[0] !== d)
          const expanded = openDays.includes(d)
          const slimRow = ({ job, all }: typeof placed[number]) => (
            <div key={job.job_id} {...cardProps(job.job_id)} style={{ borderLeftColor: edge(job) }}
              className="h-[26px] flex items-center gap-1.5 rounded-md border border-border border-l-4 bg-card px-2 text-[12px] text-muted-foreground whitespace-nowrap overflow-hidden cursor-pointer">
              <span className="font-semibold text-foreground truncate"><JobNo job={job} />{jobCardName(job)}</span>
              {all.length > 1 && <span className="shrink-0">· day {all.indexOf(d) + 1}/{all.length}</span>}
              {staffPaid(job) && <CircleCheck className="w-3.5 h-3.5 ml-auto shrink-0 text-emerald-600" />}
            </div>
          )
          return (
            <div key={d} className={cn('grid grid-cols-[44px_1fr] gap-2 py-2.5 border-t border-border', isWeekend(dt) && 'bg-muted/30 -mx-4 px-4')}>
              <div className="text-center">
                <div className="text-[11px] text-muted-foreground">{format(dt, 'EEE')}</div>
                <div className={cn('text-[18px] font-semibold leading-tight', isToday(dt) ? 'text-primary' : 'text-foreground')}>{format(dt, 'd')}</div>
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                {ongFirst.map(slimRow)}
                {ongRest.length > 0 && (expanded ? ongRest.map(slimRow) : (
                  <button type="button" onClick={() => setOpenDays((o) => [...o, d])}
                    className="h-[26px] flex items-center rounded-md border border-dashed border-border px-2 text-[12px] text-muted-foreground">
                    {ongRest.length} ongoing<ChevronDown className="w-3.5 h-3.5 ml-auto" />
                  </button>
                ))}
                {items.length === 0 && ong.length === 0 && <span className="text-[12px] text-muted-foreground pt-2">—</span>}
                {items.map(({ job, all }) => {
                  const k = all.indexOf(d)
                  return (
                    <div key={job.job_id} {...cardProps(job.job_id)}
                      style={{ borderLeftColor: edge(job) }}
                      className="text-left rounded-md border border-border border-l-4 cursor-pointer bg-card px-2.5 py-2 min-w-0">
                      <div className="text-[13px] font-semibold truncate"><JobNo job={job} />{jobCardName(job)}{all.length > 1 && <span className="font-normal text-muted-foreground"> · day {k + 1}/{all.length}</span>}</div>
                      <div className="text-[12px] text-muted-foreground truncate">{[job.venue, job.event_time].filter(Boolean).join(' · ')}</div>
                      <div className="mt-1 flex items-center justify-between gap-2"><Pills job={job} awDone={awDone(job)} long onMarkAw={markAw(job)} onAddStaff={onAddStaff} /><OpsAvatars job={job} ops={ops} /><ReadyChip job={job} /></div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stage prompt — AW done, or all-set → ready */}
      {prompt && promptJob && (
        <Dialog open onOpenChange={(o) => { if (!o) closePrompt() }}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogTitle>{prompt.kind === 'aw' ? 'Artwork done?' : 'All set for the event'}</DialogTitle>
            <p className="text-[12px] text-muted-foreground -mt-2"><JobNo job={promptJob} />{jobCardName(promptJob)}</p>
            {prompt.kind === 'ready' ? (
              <>
                <div className="rounded-lg bg-muted/60 p-3 space-y-1.5 text-[13px]">
                  {[`Staff ${staffing(promptJob).assigned}/${staffing(promptJob).needed} assigned`, 'Artwork done', 'Inventory ready'].map((t) => (
                    <div key={t} className="flex items-center gap-2"><CircleCheck className="w-4 h-4 text-emerald-600" />{t}</div>
                  ))}
                </div>
                <p className="text-[13px]">Move to <b>{readyStageLabel}</b>?</p>
              </>
            ) : (
              <p className="text-[13px]">Move this job to <b>{awStageLabel}</b>.</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={closePrompt}>{prompt.kind === 'ready' ? 'Not now' : 'Cancel'}</Button>
              <Button size="sm" onClick={() => prompt.kind === 'aw' ? move(promptJob, AW_STAGE, awStageLabel) : move(promptJob, READY_STAGE, readyStageLabel)}>Move</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Undo — 5 s */}
      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 rounded-lg bg-foreground text-background px-4 py-2.5 text-[13px] shadow-lg">
          <Check className="w-4 h-4" /><span>{undo.text}</span>
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { onMove(undo.id, undo.from); setUndo(null) }}>Undo</button>
        </div>
      )}
    </div>
  )
}
