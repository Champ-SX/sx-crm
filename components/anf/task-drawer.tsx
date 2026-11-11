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
import { Archive, ArchiveRestore, Plus, Trash2, X, UserCheck, CircleCheck, ExternalLink } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { cn, parseDbDate } from '@/lib/utils'
import {
  ANF_COLUMNS, ISSUE_LEVELS, AREAS, HEALTH, GRAPHIC_KINDS, GRAPHIC_STATUS, buildTaskTitle, checklistProgress, uid,
  type AnfTask, type AnfTaskType, type AnfPlace, type AnfColumn, type Checklist, type AnfHealth, type AnfGraphic, type GraphicKind,
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
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const addActivity = useCRMStore((s) => s.addActivity)
  const { user } = useAuth()
  const me = user?.user_metadata?.full_name ?? user?.email ?? 'Someone'
  const [health, setHealth] = useState<AnfHealth | null>(null)
  const [healthNote, setHealthNote] = useState('')
  const [gKind, setGKind] = useState<GraphicKind>('frame')
  const [gName, setGName] = useState('')
  const [gUrl, setGUrl] = useState('')
  const [gOpen, setGOpen] = useState(false)
  const graphics = task.graphics ?? []
  const setGraphics = (g: AnfGraphic[]) => onPatch({ graphics: g })
  const log = (title: string, description = '') => void addActivity({
    activity_id: uid('a'), entity_type: 'anf_task', entity_id: task.task_id, activity_type: 'note',
    title, description, created_by: me, created_at: new Date().toISOString(),
  })
  function postUpdate() {
    if (!health) return
    const h = HEALTH.find((x) => x.id === health)!
    onPatch({ health, health_note: healthNote.trim() || null, health_by: me, health_at: new Date().toISOString() })
    log(`📊 Status: ${h.label}`, healthNote.trim())
    setHealth(null); setHealthNote('')
  }
  function addGraphic() {
    const url = gUrl.trim()
    if (!/^https?:\/\//.test(url) || !gName.trim()) return
    const g: AnfGraphic = { id: uid('g'), kind: gKind, name: gName.trim(), url, status: 'draft', live_at: [], version: 1, added_by: me, added_at: new Date().toISOString() }
    setGraphics([...graphics, g])
    log(`🖼️ Graphic added: ${GRAPHIC_KINDS.find((k) => k.id === gKind)?.label} · ${g.name}`, url)
    setGName(''); setGUrl(''); setGOpen(false)
  }
  const patchGraphic = (id: string, p: Partial<AnfGraphic>, note?: string) => {
    setGraphics(graphics.map((g) => (g.id === id ? { ...g, ...p } : g)))
    if (note) log(note)
  }

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
      {(task.taken_by || task.solved_by) && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1 text-[12px]">
          {task.taken_by && <div className="flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5 text-amber-600" />Started: <b>{task.taken_by}</b> · {when(task.taken_at)}</div>}
          {task.solved_by && <div className="flex items-center gap-1.5"><CircleCheck className="w-3.5 h-3.5 text-emerald-600" />Done: <b>{task.solved_by}</b> · {when(task.solved_at)}</div>}
        </div>
      )}

      {/* Status update (report) */}
      <div className="rounded-lg border border-border p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(label, 'mb-0')}>STATUS</span>
          {task.health ? (() => { const h = HEALTH.find((x) => x.id === task.health)!; return (
            <span className="flex items-center gap-1.5 min-w-0 text-[12.5px]"><span className={cn('rounded px-1.5 py-px text-[11.5px] font-semibold', h.cls)}>{h.label}</span>
              {task.health_note && <span className="min-w-0">{task.health_note}</span>}
              {task.health_at && <span className="text-[11px] text-muted-foreground">· {task.health_by ? `${task.health_by} · ` : ''}{when(task.health_at)}</span>}</span>
          ) })() : <span className="text-[12px] text-muted-foreground">No update yet</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {HEALTH.map((h) => (
            <button key={h.id} type="button" onClick={() => setHealth(health === h.id ? null : h.id)}
              className={cn('rounded-md border px-2 py-0.5 text-[12px]', health === h.id ? 'border-foreground font-semibold' : 'border-border text-muted-foreground hover:text-foreground')}>{h.label} · {h.th}</button>
          ))}
        </div>
        {health && (
          <div className="mt-2 flex gap-2">
            <Input autoFocus value={healthNote} onChange={(e) => setHealthNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postUpdate()} placeholder="What's happening? e.g. BACC uploaded, ICS tomorrow" className="h-8 text-[13px]" />
            <Button size="sm" className="h-8" onClick={postUpdate}>Post update</Button>
          </div>
        )}
      </div>

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
          <span className={label}>SUB-TASKS {prog.total > 0 && `· ${prog.done}/${prog.total} · ${Math.round((prog.done / prog.total) * 100)}%`}</span>
          <button type="button" onClick={() => setLists([...task.checklists, { id: uid('c'), name: 'Sub-tasks', items: [] }])}
            className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" />Add group</button>
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
                <div key={it.id} className="group flex items-center gap-2 py-1 text-[13px]">
                  <label className="flex flex-1 min-w-0 items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={it.done} onChange={() => up(cl.items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} className="w-4 h-4 accent-foreground" />
                    <span className={cn('flex-1 min-w-0', it.done && 'line-through text-muted-foreground')}>{it.text}</span>
                  </label>
                  <select value={it.owner ?? ''} onChange={(e) => up(cl.items.map((x) => (x.id === it.id ? { ...x, owner: e.target.value || null } : x)))}
                    className={cn('h-6 max-w-[96px] rounded border border-transparent bg-transparent text-[11.5px] hover:border-border', it.owner ? 'text-foreground' : 'text-muted-foreground')} aria-label="Owner">
                    <option value="">owner</option>{teamMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                    {it.owner && !teamMembers.some((m) => (m.name || m.email) === it.owner) && <option>{it.owner}</option>}
                  </select>
                  <input type="date" value={it.due ?? ''} onChange={(e) => up(cl.items.map((x) => (x.id === it.id ? { ...x, due: e.target.value || null } : x)))}
                    className={cn('h-6 w-[108px] rounded border border-transparent bg-transparent text-[11.5px] hover:border-border', !it.due && 'text-muted-foreground', it.due && !it.done && it.due < new Date().toISOString().slice(0, 10) && 'text-red-600 font-semibold')} aria-label="Due" />
                  <button type="button" aria-label="Remove item" onClick={() => up(cl.items.filter((x) => x.id !== it.id))}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <input value={newItem[cl.id] ?? ''} onChange={(e) => setNewItem({ ...newItem, [cl.id]: e.target.value })} placeholder="+ Add sub-task"
                onKeyDown={(e) => {
                  const v = (newItem[cl.id] ?? '').trim()
                  if (e.key === 'Enter' && v) { up([...cl.items, { id: uid('i'), text: v, done: false }]); setNewItem({ ...newItem, [cl.id]: '' }) }
                }}
                className="mt-1 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground" />
            </div>
          )
        })}
      </div>

      {/* Graphics: Google Drive links */}
      <div>
        <div className="flex items-center justify-between">
          <span className={label}>GRAPHICS · GOOGLE DRIVE {graphics.length > 0 && `· ${graphics.length}`}</span>
          <button type="button" onClick={() => setGOpen((v) => !v)} className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" />Add link</button>
        </div>
        {gOpen && (
          <div className="rounded-lg border border-border p-2.5 mb-2 space-y-2">
            <div className="flex flex-wrap gap-1.5">{GRAPHIC_KINDS.map((k) => <Chip key={k.id} on={gKind === k.id} onClick={() => setGKind(k.id)} className="py-1">{k.icon} {k.label}</Chip>)}</div>
            <Input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Name — e.g. Xmas frame A 4×6" className="h-8 text-[13px]" />
            <div className="flex gap-2">
              <Input value={gUrl} onChange={(e) => setGUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGraphic()} placeholder="https://drive.google.com/…" className="h-8 text-[13px]" />
              <Button size="sm" className="h-8" disabled={!gName.trim() || !/^https?:\/\//.test(gUrl.trim())} onClick={addGraphic}>Add</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">File or folder link. Share it with the team in Drive.</p>
          </div>
        )}
        {graphics.length === 0 && !gOpen && <p className="text-[12px] text-muted-foreground">No graphics yet. Designers add Frame, GIF or Welcome screen links here.</p>}
        <div className="space-y-1.5">
          {graphics.map((g) => {
            const k = GRAPHIC_KINDS.find((x) => x.id === g.kind)
            const st = GRAPHIC_STATUS.find((x) => x.id === g.status)!
            return (
              <div key={g.id} className="rounded-lg border border-border px-2.5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[16px]" title={k?.label}>{k?.icon}</span>
                  <a href={g.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[13px] font-medium hover:underline" title={g.url}>{g.name} <ExternalLink className="inline w-3 h-3 text-muted-foreground" /></a>
                  <span className="text-[10.5px] text-muted-foreground">v{g.version}</span>
                  <select value={g.status} onChange={(e) => patchGraphic(g.id, { status: e.target.value as AnfGraphic['status'] }, `🖼️ ${g.name}: ${GRAPHIC_STATUS.find((x) => x.id === e.target.value)?.label}`)}
                    className={cn('h-6 rounded px-1 text-[11px] font-semibold border-0', st.cls)} aria-label="Graphic status">
                    {GRAPHIC_STATUS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11.5px]">
                  <span className="text-muted-foreground mr-0.5">{k?.label} · live at</span>
                  {branches.map((b) => {
                    const on = g.live_at.includes(b.name)
                    return <button key={b.place_id} type="button" onClick={() => { const live_at = on ? g.live_at.filter((x) => x !== b.name) : [...g.live_at, b.name]; patchGraphic(g.id, { live_at, ...(!on && g.status !== 'live' ? { status: 'live' as const } : {}) }, `🖼️ ${g.name} ${on ? 'removed from' : 'live at'} ${b.name}`) }}
                      className={cn('rounded border px-1.5 py-px', on ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground')}>{on ? '✓ ' : ''}{b.name}</button>
                  })}
                  <span className="ml-auto flex gap-2">
                    <button type="button" className="text-muted-foreground hover:text-foreground underline" onClick={() => { const u = window.prompt('New version — paste the new Drive link', ''); if (u && /^https?:\/\//.test(u.trim())) patchGraphic(g.id, { url: u.trim(), version: g.version + 1, old_urls: [...(g.old_urls ?? []), g.url], status: 'draft' }, `🖼️ ${g.name}: new version v${g.version + 1}`) }}>New version</button>
                    <button type="button" className="text-muted-foreground hover:text-destructive" aria-label="Remove graphic" onClick={() => window.confirm(`Remove “${g.name}”? The Drive file is not touched.`) && (setGraphics(graphics.filter((x) => x.id !== g.id)), log(`🖼️ Graphic removed: ${g.name}`))}><Trash2 className="w-3.5 h-3.5" /></button>
                  </span>
                </div>
              </div>
            )
          })}
        </div>
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
