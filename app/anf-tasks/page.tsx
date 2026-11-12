'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { GanttChart, Images, LayoutGrid, Plus, Search, X, Archive, Settings2 } from 'lucide-react'
import { useHydrated } from '@/hooks/use-hydrated'
import { useAuth } from '@/components/auth-provider'
import { useCRMStore } from '@/store/crm-store'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  ANF_COLUMNS, AUTO_ARCHIVE_DAYS, fetchAnf, createAnfTask, updateAnfTask, deleteAnfTask, createAnfType, notifyCritical, uid,
  type AnfTask, type AnfTaskType, type AnfPlace, type AnfColumn,
} from '@/lib/supabase/anf-tasks'
import { AddTaskDialog } from '@/components/anf/add-task-dialog'
import { TaskDrawer } from '@/components/anf/task-drawer'
import { typeOf } from '@/components/anf/task-ui'
import { AnfSettings } from '@/components/anf/anf-settings'
import { TaskCard, SortableTask, DropColumn } from '@/components/anf/task-card'
import { AssetsView, TimelineView } from '@/components/anf/board-views'
import { useAllTaskOrders } from '@/components/anf/task-orders'
import { fetchAssets, saveAsset, deleteAsset, type AnfAsset } from '@/lib/supabase/anf-assets'
import { DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'


export default function AnfTasksPage() {
  const hydrated = useHydrated()
  const { user, role } = useAuth()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const author = user?.user_metadata?.full_name ?? user?.email ?? 'Someone'

  const [tasks, setTasks] = useState<AnfTask[]>([])
  const [types, setTypes] = useState<AnfTaskType[]>([])
  const [places, setPlaces] = useState<AnfPlace[]>([])
  const [assets, setAssets] = useState<AnfAsset[]>([])
  useEffect(() => { fetchAssets().then(setAssets).catch(() => setAssets([])) }, [])
  const saveA = (a: AnfAsset) => {
    setAssets((xs) => [...xs.filter((x) => x.asset_id !== a.asset_id), a])
    saveAsset(a).catch((e) => toast(`Couldn't save asset — ${e instanceof Error ? e.message : 'error'}`))
  }
  const deleteA = (id: string) => {
    setAssets((xs) => xs.filter((x) => x.asset_id !== id))
    deleteAsset(id).catch((e) => toast(`Couldn't delete — ${e instanceof Error ? e.message : 'error'}`))
  }
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
        const stale = r.tasks.filter((t) => t.column_id === 'done' && !t.is_archived && new Date(t.solved_at ?? t.updated_at).getTime() < cutoff)
        stale.forEach((t) => { void updateAnfTask(t.task_id, { is_archived: true }) })
        const staleIds = new Set(stale.map((t) => t.task_id))
        setTasks(r.tasks.map((t) => (staleIds.has(t.task_id) ? { ...t, is_archived: true } : t)))
        setTypes(r.types); setPlaces(r.places); setLoadError(null)
      })
      .catch((e) => { if (alive) setLoadError(e instanceof Error ? e.message : 'Could not load tasks') })
    return () => { alive = false }
  }, [loadKey])

  const [view, setView] = useState<'board' | 'timeline' | 'assets'>('board')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

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
  /** Column moves record who started / finished the task. */
  const move = (id: string, col: AnfColumn, position = -1) => {
    const t = tasks.find((x) => x.task_id === id)
    if (!t || t.column_id === col) return
    const now = new Date().toISOString()
    const p: Partial<AnfTask> = { column_id: col, position }
    if (col === 'progress' && !t.taken_by) Object.assign(p, { taken_by: author, taken_at: now })
    if (col === 'done') Object.assign(p, { solved_by: author, solved_at: now })
    if (col !== 'done' && t.solved_by) Object.assign(p, { solved_by: null, solved_at: null })
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
  const orderMap = useAllTaskOrders(tasks)
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
    if (col !== task.column_id) move(id, col, order.get(id))
    else patch(id, { position: order.get(id)! })
  }

  if (!hydrated) return null

  const card = (t: AnfTask, compact?: boolean) => (
    <TaskCard key={t.task_id} t={t} compact={compact} types={types} people={people(t.assignee_ids)} orders={orderMap.get(t.task_id)} onOpen={() => setOpenId(t.task_id)} />
  )


  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2">
        <MobileMenuButton />
        <div className="min-w-0">
          <h1 className="text-[15px] sm:text-[17px] font-semibold tracking-tight">Andy &amp; Fine. · Photohouse</h1>
          <p className="text-[12px] text-muted-foreground hidden sm:block">{shown.filter((t) => t.column_id !== 'done').length} open · {byCol('done').length} done</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="View">
          {([['board', 'Board', LayoutGrid], ['timeline', 'Timeline', GanttChart], ['assets', 'Graphic Assets and Camera Setting', Images]] as const).map(([v, l, Icon]) => (
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

      {view === 'timeline' ? (
        <TimelineView tasks={shown} types={types} onOpen={setOpenId} />
      ) : view === 'assets' ? (
        <AssetsView assets={assets} tasks={tasks} places={places} me={author} onSave={saveA} onDelete={deleteA} onOpenTask={setOpenId} onPlaces={setPlaces} onPatchTask={patch} />
      ) : view === 'board' ? (
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
      ) : null}

      {settingsOpen && <AnfSettings types={types} places={places} onClose={() => setSettingsOpen(false)} onChange={(t, p) => { setTypes(t); setPlaces(p) }} />}
      {adding && <AddTaskDialog types={types} places={places} author={author} tasks={tasks} onClose={() => setAdding(false)} onCreate={create} onAddType={addType} />}
      {open && (
        <TaskDrawer key={open.task_id} task={open} types={types} places={places} assets={assets} onSaveAsset={saveA} onClose={() => setOpenId(null)}
          onPatch={(p) => patch(open.task_id, p)} onMove={(c) => move(open.task_id, c)}
          onDelete={() => { setOpenId(null); setTasks((ts) => ts.filter((t) => t.task_id !== open.task_id)); void deleteAnfTask(open.task_id) }} />
      )}

    </div>
  )
}
