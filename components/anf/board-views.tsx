'use client'

import { useState } from 'react'
import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GRAPHIC_KINDS, GRAPHIC_STATUS, checklistProgress, type AnfTask, type AnfTaskType, type AnfPlace, type GraphicKind, type GraphicStatus } from '@/lib/supabase/anf-tasks'
import { TypePill, typeOf } from './task-ui'
import { GRAPHIC_TILE } from './task-drawer'

const pill = (on: boolean) => cn('rounded-full px-2.5 py-1 text-[12px] whitespace-nowrap', on ? 'bg-foreground text-background font-semibold' : 'bg-card border border-border text-muted-foreground hover:text-foreground')

/** Every graphic link across tasks: "what's live at ICS right now?". */
export function GraphicsView({ tasks, types, places, onOpen }: { tasks: AnfTask[]; types: AnfTaskType[]; places: AnfPlace[]; onOpen: (taskId: string) => void }) {
  const [kind, setKind] = useState<GraphicKind | 'all'>('all')
  const [status, setStatus] = useState<GraphicStatus | 'all'>('all')
  const [branch, setBranch] = useState('')
  const all = tasks.flatMap((t) => (t.graphics ?? []).map((g) => ({ g, t })))
  const shown = all
    .filter(({ g }) => kind === 'all' || g.kind === kind)
    .filter(({ g }) => status === 'all' || g.status === status)
    .filter(({ g }) => !branch || g.live_at.includes(branch))
    .sort((a, b) => (b.g.added_at ?? '').localeCompare(a.g.added_at ?? ''))
  const branches = places.filter((p) => p.kind === 'branch')

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button type="button" className={pill(kind === 'all')} onClick={() => setKind('all')}>All {all.length}</button>
        {GRAPHIC_KINDS.map((k) => {
          const n = all.filter(({ g }) => g.kind === k.id).length
          return n ? <button key={k.id} type="button" className={pill(kind === k.id)} onClick={() => setKind(k.id)}>{k.label}s {n}</button> : null
        })}
        <span className="mx-1 h-4 w-px bg-border" />
        <button type="button" className={pill(status === 'live')} onClick={() => setStatus(status === 'live' ? 'all' : 'live')}>Live now</button>
        <select value={status} onChange={(e) => setStatus(e.target.value as GraphicStatus | 'all')} className="h-7 rounded-full border border-border bg-card px-2 text-[12px]" aria-label="Status">
          <option value="all">Any status</option>{GRAPHIC_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="h-7 rounded-full border border-border bg-card px-2 text-[12px]" aria-label="Live at branch">
          <option value="">Any branch</option>{branches.map((b) => <option key={b.place_id}>{b.name}</option>)}
        </select>
      </div>
      {shown.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-muted-foreground">{all.length ? 'Nothing matches these filters.' : 'No graphics yet. Open a task → Graphics → Add link.'}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {shown.map(({ g, t }) => {
            const k = GRAPHIC_KINDS.find((x) => x.id === g.kind)
            const st = GRAPHIC_STATUS.find((x) => x.id === g.status)!
            return (
              <div key={`${t.task_id}-${g.id}`} className="rounded-lg border border-border bg-card overflow-hidden">
                <a href={g.url} target="_blank" rel="noopener noreferrer" title="Open in Drive" className="flex h-24 items-end justify-between p-1.5" style={{ background: GRAPHIC_TILE[g.kind] }}>
                  <span className="rounded bg-black/60 px-1 font-mono text-[9.5px] font-semibold text-white">{k?.label.toUpperCase()}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-black/50" />
                </a>
                <div className="p-2">
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[12.5px] font-semibold hover:underline">{g.name}</a>
                  <button type="button" onClick={() => onOpen(t.task_id)} className="block w-full truncate text-left text-[11.5px] text-muted-foreground hover:text-foreground hover:underline">{t.name}</button>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className={cn('rounded px-1 text-[10px] font-semibold', st.cls)}>{st.label.toUpperCase()}</span>
                    <span className="truncate text-[10.5px] text-muted-foreground">{g.status === 'live' && g.live_at.length ? g.live_at.join(', ') : `v${g.version}`}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {all.length > 0 && <p className="mt-4 text-[12px] text-muted-foreground">Tap a tile to open it in Google Drive · tap the task name to open the task.</p>}
    </div>
  )
}

const WEEKS = 8
/** Gantt-style: one row per task, bar from start to due, coloured by type. */
export function TimelineView({ tasks, types, onOpen }: { tasks: AnfTask[]; types: AnfTaskType[]; onOpen: (taskId: string) => void }) {
  const [from, setFrom] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const days = WEEKS * 7
  const to = addDays(from, days - 1)
  const pos = (d: string) => differenceInCalendarDays(parseISO(d + 'T00:00:00'), from)
  const rows = tasks
    .filter((t) => t.due_date || t.start_date)
    .map((t) => {
      const end = t.due_date ?? t.start_date!
      const start = t.start_date && t.start_date <= end ? t.start_date : end
      return { t, start, end }
    })
    .filter((r) => pos(r.end) >= 0 && pos(r.start) < days)
    .sort((a, b) => a.start.localeCompare(b.start))
  const noDate = tasks.filter((t) => !t.due_date && !t.start_date && t.column_id !== 'done')
  const todayX = differenceInCalendarDays(new Date(), from)

  return (
    <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <button type="button" onClick={() => setFrom(addDays(from, -28))} className="h-8 rounded-lg border border-border bg-card px-2.5 text-[12px]">‹ 4 weeks</button>
        <button type="button" onClick={() => setFrom(startOfWeek(new Date(), { weekStartsOn: 1 }))} className="h-8 rounded-lg border border-border bg-card px-3 text-[12px] font-medium">Today</button>
        <button type="button" onClick={() => setFrom(addDays(from, 28))} className="h-8 rounded-lg border border-border bg-card px-2.5 text-[12px]">4 weeks ›</button>
        <span className="text-[14px] font-semibold">{format(from, 'd MMM')} – {format(to, 'd MMM yyyy')}</span>
      </div>
      <div className="min-w-[760px] rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[240px_1fr] border-b border-border">
          <div className="px-3 py-2 font-mono text-[10.5px] font-semibold tracking-wide text-muted-foreground">TASK</div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
            {Array.from({ length: WEEKS }, (_, i) => <div key={i} className="border-l border-border px-1.5 py-2 font-mono text-[10.5px] text-muted-foreground">{format(addDays(from, i * 7), 'd MMM')}</div>)}
          </div>
        </div>
        {rows.length === 0 && <p className="py-10 text-center text-[13px] text-muted-foreground">No dated tasks in these weeks.</p>}
        {rows.map(({ t, start, end }) => {
          const type = typeOf(types, t.type_id)
          const s = Math.max(0, pos(start)), e = Math.min(days - 1, pos(end))
          const prog = checklistProgress(t)
          const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : null
          const late = t.due_date && t.column_id !== 'done' && pos(t.due_date) < todayX
          return (
            <div key={t.task_id} className="grid grid-cols-[240px_1fr] border-b border-border/60 last:border-0 hover:bg-muted/30">
              <button type="button" onClick={() => onOpen(t.task_id)} className="flex min-w-0 items-center gap-1.5 px-3 py-2 text-left text-[12.5px]">
                <TypePill type={type} /><span className={cn('truncate', t.column_id === 'done' && 'text-muted-foreground line-through')}>{t.name}</span>
              </button>
              <div className="relative h-10" style={{ backgroundImage: `repeating-linear-gradient(90deg, transparent 0 calc(100% / ${WEEKS} - 1px), var(--border) calc(100% / ${WEEKS} - 1px) calc(100% / ${WEEKS}))` }}>
                {todayX >= 0 && todayX < days && <span className="absolute top-0 bottom-0 w-px bg-red-500/70" style={{ left: `${((todayX + 0.5) / days) * 100}%` }} />}
                <button type="button" onClick={() => onOpen(t.task_id)}
                  className={cn('absolute top-2 h-6 rounded-md px-1.5 text-left text-[11px] font-semibold text-white overflow-hidden whitespace-nowrap', t.column_id === 'done' && 'opacity-50', late && 'ring-2 ring-red-500')}
                  style={{ left: `${(s / days) * 100}%`, width: `max(${((e - s + 1) / days) * 100}%, 22px)`, backgroundColor: type?.color ?? '#888' }}
                  title={`${t.name} · ${format(parseISO(start + 'T00:00:00'), 'd MMM')} → ${format(parseISO(end + 'T00:00:00'), 'd MMM')}${pct !== null ? ` · ${pct}%` : ''}`}>
                  {pct !== null && <span className="absolute inset-y-0 left-0 bg-black/15" style={{ width: `${pct}%` }} />}
                  <span className="relative">{pct !== null ? `${pct}%` : ''}{t.column_id === 'done' ? ' ✓' : ''}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {noDate.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-[12px] font-semibold text-muted-foreground">No dates yet ({noDate.length}) — set Dates in the task to show it here</p>
          <div className="flex flex-wrap gap-1.5">
            {noDate.map((t) => <button key={t.task_id} type="button" onClick={() => onOpen(t.task_id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1 text-[12px]"><TypePill type={typeOf(types, t.type_id)} />{t.name}</button>)}
          </div>
        </div>
      )}
    </div>
  )
}
