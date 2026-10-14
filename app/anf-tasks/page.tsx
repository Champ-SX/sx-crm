'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, format, isToday, isWeekend, parseISO } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, Plus, Search, X, Archive, Settings2 } from 'lucide-react'
import { useHydrated } from '@/hooks/use-hydrated'
import { useAuth } from '@/components/auth-provider'
import { useCRMStore } from '@/store/crm-store'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  ANF_COLUMNS, WAITING_REASONS, AUTO_ARCHIVE_DAYS, checklistProgress, fetchAnf, createAnfTask, updateAnfTask, deleteAnfTask, createAnfType, notifyCritical, uid,
  type AnfTask, type AnfTaskType, type AnfPlace, type AnfColumn,
} from '@/lib/supabase/anf-tasks'
import { AddTaskDialog } from '@/components/anf/add-task-dialog'
import { TaskDrawer } from '@/components/anf/task-drawer'
import { placeLine, typeOf } from '@/components/anf/task-ui'
import { AnfSettings } from '@/components/anf/anf-settings'
import { TaskCard, SortableTask, DropColumn } from '@/components/anf/task-card'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

const CAL_DAYS = 9
const iso = (d: Date) => format(d, 'yyyy-MM-dd')
const fromISO = (s: string) => parseISO(s + 'T00:00:00')

export default function AnfTasksPage() {
  const hydrated = useHydrated()
  const { user, role } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const author = user?.user_metadata?.full_name ?? user?.email ?? 'Someone'

  const [tasks, setTasks] = useState<AnfTask[]>([])
  const [types, setTypes] = useState<AnfTaskType[]>([])
  const [places, setPlaces] = useState<AnfPlace[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadKey, setLoadKey] = useState(0)
  const reload = useCallback(() => setLoadKey((k) => k + 1), [])
  useEffect(() => {
    let alive = true
    fetchAnf()
      .then((r) => {
        if (!alive) return
        // Solved for more than AUTO_ARCHIVE_DAYS → archive, so the Solved column stays short.
        const cutoff = Date.now() - AUTO_ARCHIVE_DAYS * 86400000
        const stale = r.tasks.filter((t) => t.column_id === 'solved' && !t.is_archived && new Date(t.solved_at ?? t.updated_at).getTime() < cutoff)
        stale.forEach((t) => { void updateAnfTask(t.task_id, { is_archived: true }) })
        const staleIds = new Set(stale.map((t) => t.task_id))
        setTasks(r.tasks.map((t) => (staleIds.has(t.task_id) ? { ...t, is_archived: true } : t)))
        setTypes(r.types); setPlaces(r.places); setLoadError(null)
      })
      .catch((e) => { if (alive) setLoadError(e instanceof Error ? e.message : 'Could not load tasks') })
    return () => { alive = false }
  }, [loadKey])

  const [view, setView] = useState<'board' | 'calendar'>('board')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [waitFor, setWaitFor] = useState<{ id: string; reason: string; note: string; position?: number } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [calStart, setCalStart] = useState(() => iso(new Date()))

  // ── Writes (optimistic) ──
  const patch = (id: string, p: Partial<AnfTask>) => {
    const before = tasks.find((t) => t.task_id === id)
    // Became critical (or critical task got new people) → alert the assignees.
    if (before) {
      const after = { ...before, ...p }
      const newly = after.issue_level === 'critical' && before.issue_level !== 'critical' ? after.assignee_ids
        : after.issue_level === 'critical' && p.assignee_ids ? p.assignee_ids.filter((x) => !before.assignee_ids.includes(x)) : []
      if (newly.length) notifyCritical(after, author, teamMembers.filter((m) => newly.includes(m.id)))
    }
    setTasks((ts) => ts.map((t) => (t.task_id === id ? { ...t, ...p } : t)))
    updateAnfTask(id, p).catch((e) => { toast(`Couldn't save — ${e instanceof Error ? e.message : 'error'}`); reload() })
  }
  /** Column moves record who took / finished the task; Waiting asks why first. */
  const move = (id: string, col: AnfColumn, waiting?: { reason: string; note: string }, position = -1) => {
    const t = tasks.find((x) => x.task_id === id)
    if (!t || t.column_id === col) return
    if (col === 'waiting' && !waiting) { setWaitFor({ id, reason: '', note: '', position }); return }
    const now = new Date().toISOString()
    const p: Partial<AnfTask> = { column_id: col, position }
    if (col === 'progress' && !t.taken_by) Object.assign(p, { taken_by: author, taken_at: now })
    if (col === 'solved') Object.assign(p, { solved_by: author, solved_at: now })
    if (col !== 'solved' && t.solved_by) Object.assign(p, { solved_by: null, solved_at: null })
    if (col === 'waiting') Object.assign(p, { waiting_reason: waiting!.reason, waiting_note: waiting!.note || null })
    patch(id, p)
  }
  const create = (t: AnfTask) => {
    setTasks((ts) => [t, ...ts]); setAdding(false); setOpenId(t.task_id)
    if (t.issue_level === 'critical') notifyCritical(t, author, teamMembers.filter((m) => t.assignee_ids.includes(m.id)))
    createAnfTask(t).catch((e) => { toast(`Couldn't create — ${e instanceof Error ? e.message : 'error'}`); reload() })
  }
  const addType = async (name: string) => {
    const palette = ['#D85A30', '#BA7517', '#639922', '#993556', '#185FA5']
    const t: AnfTaskType = { type_id: uid('type'), name, color: palette[types.length % palette.length], default_checklist: [], is_issue: false, sort_order: 50 + types.length }
    try { await createAnfType(t); setTypes((x) => [...x, t]); return t } catch { toast("Couldn't add type"); return null }
  }

  // ── Filtering ──
  const q = search.trim().toLowerCase()
  const shown = useMemo(() => tasks
    .filter((t) => (showArchived ? t.is_archived : !t.is_archived))
    .filter((t) => !typeFilter || t.type_id === typeFilter)
    .filter((t) => !branchFilter || t.branch === branchFilter)
    .filter((t) => !q || [t.title, t.name, t.description, t.branch, t.room, typeOf(types, t.type_id)?.name].filter(Boolean).join(' ').toLowerCase().includes(q)),
  [tasks, showArchived, typeFilter, branchFilter, q, types])
  const byCol = (c: AnfColumn) => shown.filter((t) => t.column_id === c)
    .sort((a, b) => a.position - b.position || b.created_at.localeCompare(a.created_at))
  const archivedCount = tasks.filter((t) => t.is_archived).length
  const open = tasks.find((t) => t.task_id === openId)
  const branches = places.filter((p) => p.kind === 'branch')
  const people = (ids: string[]) => teamMembers.filter((m) => ids.includes(m.id))

  // ── Drag & drop (same feel as the Won board: mouse after 5px, touch after a hold) ──
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )
  const dragTask = dragId ? tasks.find((t) => t.task_id === dragId) : undefined
  function onDragEnd(e: DragEndEvent) {
    setDragId(null)
    const id = String(e.active.id)
    const overId = e.over ? String(e.over.id) : null
    const task = tasks.find((t) => t.task_id === id)
    if (!task || !overId || overId === id) return
    const overTask = tasks.find((t) => t.task_id === overId)
    const col = (overTask ? overTask.column_id : overId) as AnfColumn
    if (!ANF_COLUMNS.some((c) => c.id === col)) return
    // Re-number the target column with the card dropped at the hovered slot.
    const list = byCol(col).filter((t) => t.task_id !== id)
    const at = overTask ? list.findIndex((t) => t.task_id === overId) : list.length
    list.splice(at < 0 ? list.length : at, 0, task)
    const order = new Map(list.map((t, i) => [t.task_id, i]))
    setTasks((ts) => ts.map((t) => (order.has(t.task_id) && t.task_id !== id ? { ...t, position: order.get(t.task_id)! } : t)))
    list.forEach((t, i) => { if (t.task_id !== id && t.position !== i) void updateAnfTask(t.task_id, { position: i }) })
    if (col !== task.column_id) move(id, col, undefined, order.get(id))
    else patch(id, { position: order.get(id)! })
  }

  if (!hydrated) return null

  const card = (t: AnfTask, compact?: boolean) => (
    <TaskCard key={t.task_id} t={t} compact={compact} types={types} people={people(t.assignee_ids)} onOpen={() => setOpenId(t.task_id)} />
  )

  // ── Calendar ──
  const days = Array.from({ length: CAL_DAYS }, (_, i) => iso(addDays(fromISO(calStart), i)))
  const first = days[0], last = days[CAL_DAYS - 1]
  const dated = shown.filter((t) => t.due_date).map((t) => {
    const end = t.due_date!
    const start = t.start_date && t.start_date < end ? t.start_date : end
    return { t, start, end }
  }).filter((x) => x.end >= first && x.start <= last)
  const ranges = dated.filter((x) => x.start !== x.end)
  const singles = dated.filter((x) => x.start === x.end)
  const noDate = shown.filter((t) => !t.due_date && t.column_id !== 'solved')

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2">
        <MobileMenuButton />
        <div className="min-w-0">
          <h1 className="text-[15px] sm:text-[17px] font-semibold tracking-tight">Andy &amp; Fine. · Tasks</h1>
          <p className="text-[12px] text-muted-foreground hidden sm:block">{shown.filter((t) => t.column_id !== 'solved').length} open · {byCol('solved').length} solved</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="View">
          {([['board', 'Board', LayoutGrid], ['calendar', 'Calendar', CalendarDays]] as const).map(([v, l, Icon]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} aria-label={l} onClick={() => setView(v)}
              className={cn('h-7 px-2 sm:px-2.5 rounded-md inline-flex items-center gap-1.5 text-[12px] font-medium', view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>
              <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{l}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[140px] sm:flex-none sm:w-52">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…"
            className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-7 text-[13px] outline-none focus:border-primary" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-8 rounded-lg border border-border bg-card px-2 text-[12px]" aria-label="Filter by type">
          <option value="">All types</option>{types.map((t) => <option key={t.type_id} value={t.type_id}>{t.name}</option>)}
        </select>
        <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="h-8 rounded-lg border border-border bg-card px-2 text-[12px]" aria-label="Filter by branch">
          <option value="">All branches</option>{branches.map((b) => <option key={b.place_id}>{b.name}</option>)}
        </select>
        {(showArchived || archivedCount > 0) && (
          <button type="button" onClick={() => setShowArchived((v) => !v)}
            className={cn('h-8 px-2.5 rounded-lg border text-[12px] inline-flex items-center gap-1.5', showArchived ? 'bg-foreground text-background border-transparent' : 'border-border text-muted-foreground hover:text-foreground')}>
            <Archive className="w-3.5 h-3.5" />{showArchived ? 'Archived' : `Archived (${archivedCount})`}
          </button>
        )}
        {role === 'admin' && (
          <button type="button" onClick={() => setSettingsOpen(true)} title="Types, branches and rooms" aria-label="Board settings"
            className="ml-auto h-8 w-8 rounded-lg border border-border bg-card inline-flex items-center justify-center text-muted-foreground hover:text-foreground"><Settings2 className="w-4 h-4" /></button>
        )}
        <Button size="sm" onClick={() => setAdding(true)} className={cn(role !== 'admin' && 'ml-auto', ' gap-1.5 bg-[#FF809E] hover:bg-[#f06d8d] text-white')}>
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add task</span>
        </Button>
      </div>

      {loadError && <div className="px-6 py-2 text-[13px] text-destructive">Couldn&apos;t load tasks: {loadError}. Has the A&amp;F migration been run?</div>}

      {view === 'board' ? (
        <div className="flex-1 min-h-0 overflow-x-auto bg-background">
          <div className="flex gap-3 p-4 sm:p-6 h-full min-w-max items-start">
            <DndContext sensors={sensors} collisionDetection={pointerWithin}
              onDragStart={(e) => setDragId(String(e.active.id))}
              onDragCancel={() => setDragId(null)}
              onDragEnd={onDragEnd}>
              {ANF_COLUMNS.map((c) => {
                const list = byCol(c.id)
                return (
                  <DropColumn key={c.id} id={c.id}>
                    <div className="flex items-center gap-2 px-1.5 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.dot }} />
                      <span className="text-[13px] font-semibold">{c.label}</span>
                      <span className="text-[12px] text-muted-foreground">{c.th}</span>
                      <span className="ml-auto text-[12px] text-muted-foreground tabular-nums">{list.length}</span>
                    </div>
                    <SortableContext items={list.map((t) => t.task_id)} strategy={verticalListSortingStrategy}>
                      <div className="flex flex-col gap-2 overflow-y-auto min-h-[60px]">
                        {list.map((t) => (
                          <SortableTask key={t.task_id} id={t.task_id}>
                            {card(t)}
                          </SortableTask>
                        ))}
                        {list.length === 0 && <p className="text-[12px] text-muted-foreground text-center py-6">Drop tasks here</p>}
                      </div>
                    </SortableContext>
                  </DropColumn>
                )
              })}
              <DragOverlay dropAnimation={null}>
                {dragTask && <div className="w-[260px] rotate-2 shadow-xl rounded-lg">{card(dragTask)}</div>}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 pb-2 shrink-0">
            <button type="button" onClick={() => setCalStart(iso(addDays(fromISO(calStart), -CAL_DAYS)))} aria-label="Previous 9 days" className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <button type="button" onClick={() => setCalStart(iso(new Date()))} className="h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-medium">Today</button>
            <button type="button" onClick={() => setCalStart(iso(addDays(fromISO(calStart), CAL_DAYS)))} aria-label="Next 9 days" className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground"><ChevronRight className="w-4 h-4" /></button>
            <span className="text-[14px] font-semibold">{format(fromISO(first), 'd MMM')} – {format(fromISO(last), 'd MMM yyyy')}</span>
            <span className="ml-auto text-[12px] text-muted-foreground">{dated.length} due{noDate.length > 0 && ` · ${noDate.length} without date`}</span>
          </div>

          {/* Desktop grid */}
          <div className="hidden sm:flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            <div className="grid grid-cols-9 gap-1.5 sticky top-0 z-10 bg-background pb-1.5 border-b border-border">
              {days.map((d) => (
                <div key={d} className={cn('px-2 py-1 rounded-md', isWeekend(fromISO(d)) && 'bg-muted/60')}>
                  <div className="text-[11px] text-muted-foreground">{format(fromISO(d), 'EEE')}</div>
                  <div className={cn('text-[17px] font-semibold', isToday(fromISO(d)) && 'text-primary')}>{format(fromISO(d), 'd')}</div>
                </div>
              ))}
            </div>
            {ranges.length > 0 && (
              <div className="grid grid-cols-9 gap-1.5 pt-1.5 [grid-auto-flow:row_dense]">
                {ranges.map(({ t, start, end }) => {
                  const s = start < first ? first : start, e = end > last ? last : end
                  const col = days.indexOf(s) + 1, span = differenceInCalendarDays(fromISO(e), fromISO(s)) + 1
                  const type = typeOf(types, t.type_id), prog = checklistProgress(t)
                  return (
                    <div key={t.task_id} role="button" tabIndex={0} onClick={() => setOpenId(t.task_id)} style={{ gridColumn: `${col} / span ${span}`, borderLeftColor: type?.color }}
                      className="h-[26px] flex items-center gap-1.5 rounded-md border border-border border-l-4 bg-card px-2 text-[12px] cursor-pointer whitespace-nowrap overflow-hidden min-w-0">
                      <span className="font-semibold truncate">{t.name}</span>
                      <span className="text-muted-foreground shrink-0">· {placeLine(t) || type?.name}{prog.total > 0 && ` · ☑ ${prog.done}/${prog.total}`}</span>
                    </div>
                  )
                })}
              </div>
            )}
            <div className="grid grid-cols-9 gap-1.5 pt-1.5 flex-1">
              {days.map((d) => (
                <div key={d} className={cn('flex flex-col gap-1.5 rounded-md min-h-[180px] p-0.5', isWeekend(fromISO(d)) && 'bg-muted/40')}>
                  {singles.filter((x) => x.end === d).map(({ t }) => card(t, true))}
                </div>
              ))}
            </div>
            {noDate.length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] font-semibold text-muted-foreground mb-1.5">No due date ({noDate.length})</p>
                <div className="grid grid-cols-4 lg:grid-cols-6 gap-1.5">{noDate.map((t) => card(t, true))}</div>
              </div>
            )}
          </div>

          {/* Mobile agenda */}
          <div className="sm:hidden flex-1 min-h-0 overflow-y-auto px-4 pb-6">
            {days.map((d) => {
              const items = dated.filter((x) => x.start <= d && x.end >= d)
              return (
                <div key={d} className="grid grid-cols-[40px_1fr] gap-2 py-2.5 border-t border-border">
                  <div className="text-center"><div className="text-[11px] text-muted-foreground">{format(fromISO(d), 'EEE')}</div><div className={cn('text-[18px] font-semibold', isToday(fromISO(d)) && 'text-primary')}>{format(fromISO(d), 'd')}</div></div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    {items.length === 0 ? <span className="text-[12px] text-muted-foreground pt-2">—</span> : items.map(({ t }) => card(t, true))}
                  </div>
                </div>
              )
            })}
            {noDate.length > 0 && <div className="border-t border-border pt-3"><p className="text-[12px] font-semibold text-muted-foreground mb-1.5">No due date ({noDate.length})</p><div className="flex flex-col gap-1.5">{noDate.map((t) => card(t, true))}</div></div>}
          </div>
        </div>
      )}

      {settingsOpen && <AnfSettings types={types} places={places} onClose={() => setSettingsOpen(false)} onChange={(t, p) => { setTypes(t); setPlaces(p) }} />}
      {adding && <AddTaskDialog types={types} places={places} author={author} tasks={tasks} onClose={() => setAdding(false)} onCreate={create} onAddType={addType} />}
      {open && (
        <TaskDrawer key={open.task_id} task={open} types={types} places={places} onClose={() => setOpenId(null)}
          onPatch={(p) => patch(open.task_id, p)} onMove={(c) => move(open.task_id, c)}
          onDelete={() => { setOpenId(null); setTasks((ts) => ts.filter((t) => t.task_id !== open.task_id)); void deleteAnfTask(open.task_id) }} />
      )}

      {/* Waiting needs a reason */}
      {waitFor && (
        <Dialog open onOpenChange={(o) => !o && setWaitFor(null)}>
          <DialogContent className="sm:max-w-[380px]">
            <DialogTitle>Waiting for what?</DialogTitle>
            <div className="flex flex-wrap gap-1.5">
              {WAITING_REASONS.map((r) => (
                <button key={r.id} type="button" onClick={() => setWaitFor({ ...waitFor, reason: r.id })}
                  className={cn('rounded-lg border px-2.5 py-1.5 text-[13px]', waitFor.reason === r.id ? 'border-foreground font-medium' : 'border-border')}>{r.label}</button>
              ))}
            </div>
            <Input value={waitFor.note} onChange={(e) => setWaitFor({ ...waitFor, note: e.target.value })} placeholder="Note — e.g. TRUE technician booked Thu" className="text-[13px]" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setWaitFor(null)}>Cancel</Button>
              <Button size="sm" disabled={!waitFor.reason} onClick={() => { move(waitFor.id, 'waiting', { reason: waitFor.reason, note: waitFor.note }, waitFor.position); setWaitFor(null) }}>Move to Waiting</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
