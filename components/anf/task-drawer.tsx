'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { ActivityPanel } from '@/components/shared/activity-panel'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { LinkifyText } from '@/components/shared/linkify-text'
import { Archive, ArchiveRestore, Plus, Trash2, X, UserCheck, CircleCheck, Hourglass } from 'lucide-react'
import { cn, parseDbDate } from '@/lib/utils'
import {
  ANF_COLUMNS, ISSUE_LEVELS, AREAS, WAITING_REASONS, buildTaskTitle, checklistProgress, uid,
  type AnfTask, type AnfTaskType, type AnfPlace, type AnfColumn, type Checklist,
} from '@/lib/supabase/anf-tasks'
import { Chip } from './task-ui'

const label = 'text-[11px] font-medium tracking-wide text-muted-foreground mb-1 block'
const when = (iso: string | null) => (iso ? format(parseDbDate(iso), 'd MMM HH:mm') : '')

export function TaskDrawer({ task, types, places, onClose, onPatch, onMove, onDelete }: {
  task: AnfTask; types: AnfTaskType[]; places: AnfPlace[]
  onClose: () => void
  onPatch: (patch: Partial<AnfTask>) => void
  onMove: (col: AnfColumn) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(task.name)
  const [desc, setDesc] = useState(task.description ?? '')
  const [editDesc, setEditDesc] = useState(false)
  const [newItem, setNewItem] = useState<Record<string, string>>({})
  const type = types.find((t) => t.type_id === task.type_id)
  const branches = places.filter((p) => p.kind === 'branch')
  const branchId = branches.find((b) => b.name === task.branch)?.place_id
  const rooms = places.filter((p) => p.kind === 'room' && (!p.branch_id || !branchId || p.branch_id === branchId))
  const prog = checklistProgress(task)

  // Title keeps its created date; name / branch / room rebuild the rest.
  const retitle = (p: Partial<AnfTask>) => {
    const n = { ...task, ...p }
    onPatch({ ...p, title: buildTaskTitle(n.name, n.branch, n.room, parseDbDate(task.created_at)) })
  }
  const setLists = (checklists: Checklist[]) => onPatch({ checklists })

  const details = (
    <div className="space-y-4">
      {/* Status strip */}
      <div className="flex flex-wrap gap-1.5">
        {ANF_COLUMNS.map((c) => (
          <button key={c.id} type="button" onClick={() => c.id !== task.column_id && onMove(c.id)}
            className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px]',
              task.column_id === c.id ? 'border-foreground font-semibold' : 'border-border text-muted-foreground hover:text-foreground')}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />{c.label}
          </button>
        ))}
      </div>

      {/* Owner trail (replaces the รับเรื่อง / เสร็จสิ้น checklist) */}
      {(task.taken_by || task.solved_by || task.column_id === 'waiting') && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1 text-[12px]">
          {task.taken_by && <div className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-amber-600" />รับเรื่อง: <b>{task.taken_by}</b> · {when(task.taken_at)}</div>}
          {task.column_id === 'waiting' && (
            <div className="flex items-center gap-1.5"><Hourglass className="w-3.5 h-3.5 text-blue-600" />Waiting: <b>{WAITING_REASONS.find((r) => r.id === task.waiting_reason)?.label ?? '—'}</b>{task.waiting_note && <> · {task.waiting_note}</>}</div>
          )}
          {task.solved_by && <div className="flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5 text-emerald-600" />เสร็จสิ้น: <b>{task.solved_by}</b> · {when(task.solved_at)}</div>}
        </div>
      )}

      <div>
        <span className={label}>TASK</span>
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== task.name && retitle({ name: name.trim() })} className="text-[14px] font-medium" />
        <p className="font-mono text-[11px] text-muted-foreground mt-1">{task.title}</p>
      </div>

      <div>
        <span className={label}>TYPE</span>
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <Chip key={t.type_id} on={task.type_id === t.type_id} onClick={() => onPatch({ type_id: t.type_id, ...(t.is_issue ? {} : { issue_level: null, area: null }) })} className="py-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name}
            </Chip>
          ))}
        </div>
      </div>
      {type?.is_issue && (
        <div className="space-y-1.5">
          <span className={label}>ISSUE LEVEL · AREA</span>
          <div className="flex flex-wrap gap-1.5">
            {ISSUE_LEVELS.map((l) => (
              <Chip key={l.id} on={task.issue_level === l.id} onClick={() => onPatch({ issue_level: task.issue_level === l.id ? null : l.id })} className="py-1">
                <span className={`rounded px-1.5 py-px text-[11px] font-medium ${l.cls}`}>{l.label}</span>
              </Chip>
            ))}
            {AREAS.map((a) => <Chip key={a.id} on={task.area === a.id} onClick={() => onPatch({ area: task.area === a.id ? null : a.id })} className="py-1">{a.label}</Chip>)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <span className={label}>BRANCH</span>
          <select value={task.branch ?? ''} onChange={(e) => retitle({ branch: e.target.value || null, room: null })} className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]">
            <option value="">—</option>{branches.map((b) => <option key={b.place_id}>{b.name}</option>)}
            {task.branch && !branches.some((b) => b.name === task.branch) && <option>{task.branch}</option>}
          </select>
        </div>
        <div>
          <span className={label}>ROOM / BOOTH</span>
          <select value={task.room ?? ''} onChange={(e) => retitle({ room: e.target.value || null })} className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]">
            <option value="">—</option>{rooms.map((r) => <option key={r.place_id}>{r.name}</option>)}
            {task.room && !rooms.some((r) => r.name === task.room) && <option>{task.room}</option>}
          </select>
        </div>
        <div>
          <span className={label}>START</span>
          <Input type="date" value={task.start_date ?? ''} onChange={(e) => onPatch({ start_date: e.target.value || null })} className="h-9 text-[13px]" />
        </div>
        <div>
          <span className={label}>DUE</span>
          <Input type="date" value={task.due_date ?? ''} onChange={(e) => onPatch({ due_date: e.target.value || null })} className="h-9 text-[13px]" />
        </div>
      </div>

      <div>
        <span className={label}>ASSIGNED</span>
        <AssigneePicker value={task.assignee_ids} onChange={(ids) => onPatch({ assignee_ids: ids })} />
      </div>

      <div>
        <span className={label}>DETAILS</span>
        {editDesc ? (
          <Textarea autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} rows={6} className="text-[13px]"
            onBlur={() => { setEditDesc(false); if ((desc.trim() || null) !== task.description) onPatch({ description: desc.trim() || null }) }} />
        ) : (
          <div onClick={() => setEditDesc(true)} className="min-h-[44px] rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 cursor-text text-[13px] whitespace-pre-wrap break-words">
            {task.description ? <LinkifyText text={task.description} /> : <span className="text-muted-foreground">Add details…</span>}
          </div>
        )}
      </div>

      {/* Checklists */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={label}>CHECKLISTS {prog.total > 0 && `· ${prog.done}/${prog.total}`}</span>
          <button type="button" onClick={() => setLists([...task.checklists, { id: uid('c'), name: 'Checklist', items: [] }])}
            className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" />Add checklist</button>
        </div>
        {task.checklists.map((cl) => {
          const up = (items = cl.items, nm = cl.name) => setLists(task.checklists.map((c) => (c.id === cl.id ? { ...c, items, name: nm } : c)))
          return (
            <div key={cl.id} className="rounded-lg border border-border p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <input defaultValue={cl.name} onBlur={(e) => e.target.value !== cl.name && up(cl.items, e.target.value)} className="flex-1 bg-transparent text-[13px] font-semibold outline-none" />
                <button type="button" aria-label="Delete checklist" onClick={() => window.confirm(`Delete checklist “${cl.name}”?`) && setLists(task.checklists.filter((c) => c.id !== cl.id))}
                  className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {cl.items.map((it) => (
                <label key={it.id} className="group flex items-center gap-2 py-1 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={it.done} onChange={() => up(cl.items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} className="w-4 h-4 accent-foreground" />
                  <span className={cn('flex-1', it.done && 'line-through text-muted-foreground')}>{it.text}</span>
                  <button type="button" aria-label="Remove item" onClick={(e) => { e.preventDefault(); up(cl.items.filter((x) => x.id !== it.id)) }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                </label>
              ))}
              <input value={newItem[cl.id] ?? ''} onChange={(e) => setNewItem({ ...newItem, [cl.id]: e.target.value })} placeholder="+ Add item"
                onKeyDown={(e) => {
                  const v = (newItem[cl.id] ?? '').trim()
                  if (e.key === 'Enter' && v) { up([...cl.items, { id: uid('i'), text: v, done: false }]); setNewItem({ ...newItem, [cl.id]: '' }) }
                }}
                className="mt-1 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground" />
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-border">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => onPatch({ is_archived: !task.is_archived })}>
          {task.is_archived ? <><ArchiveRestore className="w-4 h-4" />Restore</> : <><Archive className="w-4 h-4" />Archive</>}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => window.confirm('Delete this task permanently?') && onDelete()}>
          <Trash2 className="w-4 h-4" />Delete
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">by {task.created_by ?? '—'} · {when(task.created_at)}</span>
      </div>
    </div>
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false}
        className="!fixed !top-0 !left-0 !-translate-x-0 !-translate-y-0 !w-screen !h-[100dvh] !max-w-none !p-0 !gap-0 sm:!w-[85vw] sm:!h-[88vh] sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 !flex !flex-col !rounded-none sm:!rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type?.color ?? '#888' }} />
          <DialogTitle className="text-[15px] font-semibold truncate">{task.name}</DialogTitle>
          {task.is_archived && <span className="text-[11px] rounded bg-muted px-1.5 py-px text-muted-foreground">archived</span>}
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="relative flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-y-auto px-5 py-4">
            {details}
            {/* Mobile: activity under the details */}
            <div className="sm:hidden mt-6 space-y-4">
              <AddActivityForm entityType="anf_task" entityId={task.task_id} owner={task.created_by ?? ''} entityName={task.name} />
              <ActivityTimeline entityType="anf_task" entityId={task.task_id} entityName={task.name} />
            </div>
          </div>
          <ActivityPanel entityType="anf_task" entityId={task.task_id} owner={task.created_by ?? ''} entityName={task.name} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
