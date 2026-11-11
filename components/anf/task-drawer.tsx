'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { LinkifyText } from '@/components/shared/linkify-text'
import { Archive, ArchiveRestore, Plus, Trash2, X, ExternalLink, MessageSquare } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { cn, parseDbDate } from '@/lib/utils'
import {
  ANF_COLUMNS, HEALTH, GRAPHIC_KINDS, GRAPHIC_STATUS, SUB_STATUS, subStatus, buildTaskTitle, checklistProgress, uid,
  type AnfTask, type AnfTaskType, type AnfPlace, type AnfColumn, type Checklist, type ChecklistItem, type AnfHealth, type AnfGraphic, type GraphicKind,
} from '@/lib/supabase/anf-tasks'
import { Chip, TypePill } from './task-ui'

const lbl = 'font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'
const when = (iso: string | null | undefined) => (iso ? format(parseDbDate(iso), 'd MMM HH:mm') : '')
const isUrl = (u: string) => /^https?:\/\//.test(u.trim())
const today = () => new Date().toISOString().slice(0, 10)

/** Tile colour per graphic type (the preview stand-in; Drive files are private). */
export const GRAPHIC_TILE: Record<GraphicKind, string> = {
  frame: 'linear-gradient(135deg,#f5d0fe,#c4b5fd)',
  gif: 'linear-gradient(135deg,#bae6fd,#a7f3d0)',
  welcome: 'linear-gradient(135deg,#fde68a,#fca5a5)',
  other: 'linear-gradient(135deg,#e5e7eb,#d1d5db)',
}

export function TaskDrawer({ task, types, places, onClose, onPatch, onMove, onDelete }: {
  task: AnfTask; types: AnfTaskType[]; places: AnfPlace[]
  onClose: () => void
  onPatch: (patch: Partial<AnfTask>) => void
  onMove: (col: AnfColumn) => void
  onDelete: () => void
}) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const addActivity = useCRMStore((s) => s.addActivity)
  const { user } = useAuth()
  const me = user?.user_metadata?.full_name ?? user?.email ?? 'Someone'

  const [name, setName] = useState(task.name)
  const [desc, setDesc] = useState(task.description ?? '')
  const [editDesc, setEditDesc] = useState(false)
  const [newItem, setNewItem] = useState<Record<string, string>>({})
  const [openSub, setOpenSub] = useState<string | null>(null)
  const [report, setReport] = useState('')
  const [health, setHealth] = useState<AnfHealth | null>(null)
  const [healthNote, setHealthNote] = useState('')
  const [side, setSide] = useState<'graphics' | 'activity'>('graphics')
  const [gFilter, setGFilter] = useState<GraphicKind | 'all'>('all')
  const [gOpen, setGOpen] = useState(false)
  const [gKind, setGKind] = useState<GraphicKind>('frame')
  const [gName, setGName] = useState('')
  const [gUrl, setGUrl] = useState('')

  const type = types.find((t) => t.type_id === task.type_id)
  const branches = places.filter((p) => p.kind === 'branch')
  const branchId = branches.find((b) => b.name === task.branch)?.place_id
  const rooms = places.filter((p) => p.kind === 'room' && (!p.branch_id || !branchId || p.branch_id === branchId))
  const prog = checklistProgress(task)
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0
  const graphics = task.graphics ?? []
  const curHealth = HEALTH.find((h) => h.id === task.health)

  const log = (title: string, description = '') => void addActivity({
    activity_id: uid('a'), entity_type: 'anf_task', entity_id: task.task_id, activity_type: 'note',
    title, description, created_by: me, created_at: new Date().toISOString(),
  })
  // Title keeps its created date; name / branch / room rebuild the rest.
  const retitle = (p: Partial<AnfTask>) => {
    const n = { ...task, ...p }
    onPatch({ ...p, title: buildTaskTitle(n.name, n.branch, n.room, parseDbDate(task.created_at)) })
  }
  const setLists = (checklists: Checklist[]) => onPatch({ checklists })
  const setItem = (clId: string, itemId: string, p: Partial<ChecklistItem>) =>
    setLists(task.checklists.map((c) => (c.id === clId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...p } : i)) } : c)))
  const setStatus = (clId: string, it: ChecklistItem, st: ChecklistItem['status']) => {
    setItem(clId, it.id, { status: st, done: st === 'done' })
    log(`☑ ${it.text}: ${SUB_STATUS.find((x) => x.id === st)?.label}`)
  }
  function postReport(clId: string, it: ChecklistItem) {
    const v = report.trim(); if (!v) return
    setItem(clId, it.id, { note: v, note_by: me, note_at: new Date().toISOString() })
    log(`💬 ${it.text}`, v)
    setReport('')
  }
  function postHealth() {
    if (!health) return
    const h = HEALTH.find((x) => x.id === health)!
    onPatch({ health, health_note: healthNote.trim() || null, health_by: me, health_at: new Date().toISOString() })
    log(`📊 Status: ${h.label}`, healthNote.trim())
    setHealth(null); setHealthNote('')
  }
  const setGraphics = (g: AnfGraphic[]) => onPatch({ graphics: g })
  const patchGraphic = (id: string, p: Partial<AnfGraphic>, note?: string) => {
    setGraphics(graphics.map((g) => (g.id === id ? { ...g, ...p } : g)))
    if (note) log(note)
  }
  function addGraphic() {
    if (!isUrl(gUrl) || !gName.trim()) return
    const g: AnfGraphic = { id: uid('g'), kind: gKind, name: gName.trim(), url: gUrl.trim(), status: 'draft', live_at: [], version: 1, added_by: me, added_at: new Date().toISOString() }
    setGraphics([...graphics, g])
    log(`🖼️ Graphic added: ${GRAPHIC_KINDS.find((k) => k.id === gKind)?.label} · ${g.name}`, g.url)
    setGName(''); setGUrl(''); setGOpen(false)
  }

  const field = (label: string, children: React.ReactNode) => (
    <div className="grid grid-cols-[92px_1fr] items-center gap-2 py-1 text-[13px]">
      <span className="text-muted-foreground">{label}</span><div className="min-w-0">{children}</div>
    </div>
  )
  const sel = 'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px]'

  // ── Left: info · sub-tasks · status ───────────────────────────────────────
  const left = (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {ANF_COLUMNS.map((c) => (
          <button key={c.id} type="button" onClick={() => c.id !== task.column_id && onMove(c.id)}
            className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium',
              task.column_id === c.id ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.dot }} />{c.label}
          </button>
        ))}
      </div>

      <div>
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== task.name && retitle({ name: name.trim() })}
          className="h-auto border-transparent px-0 text-[19px] font-semibold shadow-none hover:border-border focus:px-2" />
        <p className="font-mono text-[11px] text-muted-foreground">{task.title}</p>
      </div>

      <div>
        {field('Type', (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <button key={t.type_id} type="button" onClick={() => onPatch({ type_id: t.type_id })}
                className={cn('rounded px-1.5 py-0.5 font-mono text-[10.5px] font-semibold tracking-wide', task.type_id === t.type_id ? 'text-white' : 'bg-muted text-muted-foreground hover:text-foreground')}
                style={task.type_id === t.type_id ? { backgroundColor: t.color } : undefined}>{t.name}</button>
            ))}
          </div>
        ))}
        {field('Owner', <AssigneePicker value={task.assignee_ids} onChange={(ids) => onPatch({ assignee_ids: ids })} />)}
        {field('Dates', (
          <div className="flex items-center gap-1.5">
            <Input type="date" value={task.start_date ?? ''} onChange={(e) => onPatch({ start_date: e.target.value || null })} className="h-8 text-[13px]" aria-label="Start" />
            <span className="text-muted-foreground">→</span>
            <Input type="date" value={task.due_date ?? ''} onChange={(e) => onPatch({ due_date: e.target.value || null })} className="h-8 text-[13px]" aria-label="Due" />
          </div>
        ))}
        {field('Branch', (
          <div className="grid grid-cols-2 gap-1.5">
            <select value={task.branch ?? ''} onChange={(e) => retitle({ branch: e.target.value || null, room: null })} className={sel} aria-label="Branch">
              <option value="">— branch</option>{branches.map((b) => <option key={b.place_id}>{b.name}</option>)}
              {task.branch && !branches.some((b) => b.name === task.branch) && <option>{task.branch}</option>}
            </select>
            <select value={task.room ?? ''} onChange={(e) => retitle({ room: e.target.value || null })} className={sel} aria-label="Room">
              <option value="">— room / booth</option>{rooms.map((r) => <option key={r.place_id}>{r.name}</option>)}
              {task.room && !rooms.some((r) => r.name === task.room) && <option>{task.room}</option>}
            </select>
          </div>
        ))}
        {field('Progress', prog.total
          ? <span className="flex items-center gap-2"><b>{pct}%</b><span className="text-muted-foreground">· {prog.done} of {prog.total} sub-tasks done</span><span className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"><span className="block h-full bg-emerald-600" style={{ width: `${pct}%` }} /></span></span>
          : <span className="text-muted-foreground">No sub-tasks yet</span>)}
      </div>

      <div>
        <div className={cn(lbl, 'mb-1')}>DETAILS</div>
        {editDesc ? (
          <Textarea autoFocus value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} className="text-[13px]"
            onBlur={() => { setEditDesc(false); if ((desc.trim() || null) !== task.description) onPatch({ description: desc.trim() || null }) }} />
        ) : (
          <div onClick={() => setEditDesc(true)} className="min-h-[36px] rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 cursor-text text-[13px] whitespace-pre-wrap break-words">
            {task.description ? <LinkifyText text={task.description} /> : <span className="text-muted-foreground">Add details…</span>}
          </div>
        )}
      </div>

      {/* Sub-tasks */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className={lbl}>SUB-TASKS {prog.total > 0 && `· ${prog.done}/${prog.total}`}</span>
          <button type="button" onClick={() => setLists([...task.checklists, { id: uid('c'), name: 'Sub-tasks', items: [] }])}
            className="text-[12px] font-medium text-[#7A5AA5] inline-flex items-center gap-1"><Plus className="w-3 h-3" />Add group</button>
        </div>
        {task.checklists.length === 0 && (
          <button type="button" onClick={() => setLists([{ id: uid('c'), name: 'Sub-tasks', items: [] }])} className="w-full rounded-lg border border-dashed border-border py-3 text-[12.5px] text-muted-foreground hover:text-foreground">＋ Add the first sub-task</button>
        )}
        {task.checklists.map((cl) => (
          <div key={cl.id} className="mb-3">
            {(task.checklists.length > 1 || cl.name !== 'Sub-tasks') && (
              <div className="flex items-center gap-2 py-1">
                <input defaultValue={cl.name} onBlur={(e) => e.target.value !== cl.name && setLists(task.checklists.map((c) => (c.id === cl.id ? { ...c, name: e.target.value } : c)))} className="flex-1 bg-transparent text-[12.5px] font-semibold outline-none" aria-label="Group name" />
                <button type="button" aria-label="Delete group" onClick={() => window.confirm(`Delete “${cl.name}” and its sub-tasks?`) && setLists(task.checklists.filter((c) => c.id !== cl.id))}
                  className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
            {cl.items.map((it) => {
              const st = subStatus(it)
              const sc = SUB_STATUS.find((x) => x.id === st)!
              const next = st === 'todo' ? 'doing' : st === 'doing' ? 'done' : 'todo'
              const isOpen = openSub === it.id
              const late = it.due && st !== 'done' && it.due < today()
              return (
                <div key={it.id} className="group border-b border-border/70">
                  <div className="grid grid-cols-[18px_1fr_auto] sm:grid-cols-[18px_1fr_92px_104px_64px] items-center gap-2 py-1.5 text-[13px]">
                    <input type="checkbox" checked={st === 'done'} onChange={() => setStatus(cl.id, it, st === 'done' ? 'todo' : 'done')} className="w-4 h-4 accent-emerald-600" aria-label="Done" />
                    <button type="button" onClick={() => { setOpenSub(isOpen ? null : it.id); setReport('') }} className="min-w-0 text-left">
                      <span className={cn('block truncate', st === 'done' && 'line-through text-muted-foreground')}>{it.text}</span>
                      {it.note && <span className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground"><MessageSquare className="w-3 h-3 shrink-0" />{it.note}</span>}
                    </button>
                    <select value={it.owner ?? ''} onChange={(e) => setItem(cl.id, it.id, { owner: e.target.value || null })}
                      className={cn('hidden sm:block h-7 rounded border border-transparent bg-transparent text-[12px] hover:border-border', !it.owner && 'text-muted-foreground')} aria-label="Owner">
                      <option value="">owner</option>{teamMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                      {it.owner && !teamMembers.some((m) => (m.name || m.email) === it.owner) && <option>{it.owner}</option>}
                    </select>
                    <input type="date" value={it.due ?? ''} onChange={(e) => setItem(cl.id, it.id, { due: e.target.value || null })}
                      className={cn('hidden sm:block h-7 rounded border border-transparent bg-transparent text-[12px] hover:border-border', !it.due && 'text-muted-foreground', late && 'text-red-600 font-semibold')} aria-label="Due" />
                    <button type="button" onClick={() => setStatus(cl.id, it, next)} title={`Tap for ${SUB_STATUS.find((x) => x.id === next)?.label}`}
                      className={cn('rounded px-2 py-0.5 text-[11px] font-semibold text-center', sc.cls)}>{sc.label}</button>
                  </div>
                  {isOpen && (
                    <div className="mb-2 ml-[26px] rounded-lg bg-muted/50 p-2 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5 sm:hidden">
                        <select value={it.owner ?? ''} onChange={(e) => setItem(cl.id, it.id, { owner: e.target.value || null })} className={sel} aria-label="Owner">
                          <option value="">owner</option>{teamMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                        </select>
                        <Input type="date" value={it.due ?? ''} onChange={(e) => setItem(cl.id, it.id, { due: e.target.value || null })} className="h-8 text-[13px]" />
                      </div>
                      {it.note && <p className="text-[12.5px]"><b>Latest:</b> {it.note} <span className="text-[11px] text-muted-foreground">· {it.note_by} · {when(it.note_at)}</span></p>}
                      <div className="flex gap-2">
                        <Input autoFocus value={report} onChange={(e) => setReport(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postReport(cl.id, it)} placeholder="Report — what's going on?" className="h-8 bg-background text-[13px]" />
                        <Button size="sm" className="h-8" disabled={!report.trim()} onClick={() => postReport(cl.id, it)}>Post</Button>
                      </div>
                      <div className="flex justify-between text-[11.5px]">
                        <span className="text-muted-foreground">Reports also go to the activity log.</span>
                        <button type="button" onClick={() => window.confirm(`Delete “${it.text}”?`) && setLists(task.checklists.map((c) => (c.id === cl.id ? { ...c, items: c.items.filter((x) => x.id !== it.id) } : c)))} className="text-muted-foreground hover:text-destructive">Delete sub-task</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            <input value={newItem[cl.id] ?? ''} onChange={(e) => setNewItem({ ...newItem, [cl.id]: e.target.value })} placeholder="+ Add sub-task"
              onKeyDown={(e) => {
                const v = (newItem[cl.id] ?? '').trim()
                if (e.key === 'Enter' && v) { setLists(task.checklists.map((c) => (c.id === cl.id ? { ...c, items: [...c.items, { id: uid('i'), text: v, done: false, status: 'todo' as const }] } : c))); setNewItem({ ...newItem, [cl.id]: '' }) }
              }}
              className="mt-1 w-full bg-transparent py-1 text-[13px] outline-none placeholder:text-muted-foreground" />
          </div>
        ))}
      </div>

      {/* Status update (stays inside the task) */}
      <div>
        <div className={cn(lbl, 'mb-1.5')}>STATUS UPDATE · REPORT</div>
        {curHealth ? (
          <div className={cn('border-l-[3px] pl-2.5 py-0.5 mb-2 text-[13px]', task.health === 'on_track' ? 'border-emerald-600' : task.health === 'at_risk' ? 'border-amber-500' : 'border-red-600')}>
            <span className={cn('rounded px-1.5 py-px text-[11px] font-semibold', curHealth.cls)}>{curHealth.label}</span>
            {task.health_by && <span className="text-[11.5px] text-muted-foreground"> · {task.health_by} · {when(task.health_at)}</span>}
            {task.health_note && <div className="mt-0.5">{task.health_note}</div>}
          </div>
        ) : <p className="text-[12.5px] text-muted-foreground mb-2">No update yet.</p>}
        <div className="flex flex-wrap gap-1.5">
          {HEALTH.map((h) => (
            <button key={h.id} type="button" onClick={() => setHealth(health === h.id ? null : h.id)}
              className={cn('rounded-md px-2.5 py-1 text-[12px] font-medium', health === h.id ? h.cls : 'bg-muted text-muted-foreground hover:text-foreground')}>{h.label} · {h.th}</button>
          ))}
        </div>
        {health && (
          <div className="mt-2 flex gap-2">
            <Input autoFocus value={healthNote} onChange={(e) => setHealthNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && postHealth()} placeholder="Short note — e.g. BACC done, ICS tomorrow" className="h-8 text-[13px]" />
            <Button size="sm" className="h-8" onClick={postHealth}>Post update</Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => onPatch({ is_archived: !task.is_archived })}>
          {task.is_archived ? <><ArchiveRestore className="w-4 h-4" />Restore</> : <><Archive className="w-4 h-4" />Archive</>}
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive" onClick={() => window.confirm('Delete this task permanently?') && onDelete()}>
          <Trash2 className="w-4 h-4" />Delete
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground">by {task.created_by ?? '—'} · {when(task.created_at)}{task.solved_by && ` · done by ${task.solved_by}`}</span>
      </div>
    </div>
  )

  // ── Right: graphics · activity ────────────────────────────────────────────
  const shownG = graphics.filter((g) => gFilter === 'all' || g.kind === gFilter)
  const right = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex gap-1 p-1 rounded-lg bg-muted mb-3 shrink-0">
        {([['graphics', `Graphics${graphics.length ? ` · ${graphics.length}` : ''}`], ['activity', 'Activity']] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setSide(k)} className={cn('flex-1 rounded-md py-1 text-[12.5px] font-medium', side === k ? 'bg-background shadow-sm' : 'text-muted-foreground')}>{l}</button>
        ))}
      </div>
      {side === 'activity' ? (
        <div className="space-y-4">
          <AddActivityForm entityType="anf_task" entityId={task.task_id} owner={task.created_by ?? ''} entityName={task.name} />
          <ActivityTimeline entityType="anf_task" entityId={task.task_id} entityName={task.name} />
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
            {(['all', ...GRAPHIC_KINDS.map((k) => k.id)] as const).map((k) => {
              const n = k === 'all' ? graphics.length : graphics.filter((g) => g.kind === k).length
              if (k !== 'all' && !n) return null
              return <button key={k} type="button" onClick={() => setGFilter(k)} className={cn('rounded-full px-2.5 py-0.5 text-[12px]', gFilter === k ? 'bg-foreground text-background font-semibold' : 'bg-background border border-border text-muted-foreground')}>{k === 'all' ? 'All' : GRAPHIC_KINDS.find((x) => x.id === k)?.label} {n}</button>
            })}
            <button type="button" onClick={() => setGOpen((v) => !v)} className="ml-auto text-[12px] font-medium text-[#7A5AA5] inline-flex items-center gap-1"><Plus className="w-3 h-3" />Add link</button>
          </div>
          {gOpen && (
            <div className="rounded-lg border border-border bg-background p-2.5 mb-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">{GRAPHIC_KINDS.map((k) => <Chip key={k.id} on={gKind === k.id} onClick={() => setGKind(k.id)} className="py-1 text-[12px]">{k.label}</Chip>)}</div>
              <Input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Name — e.g. Xmas frame A 4×6" className="h-8 text-[13px]" />
              <div className="flex gap-2">
                <Input value={gUrl} onChange={(e) => setGUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addGraphic()} placeholder="https://drive.google.com/…" className="h-8 text-[13px]" />
                <Button size="sm" className="h-8" disabled={!gName.trim() || !isUrl(gUrl)} onClick={addGraphic}>Add</Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Google Drive file or folder link, shared with the team.</p>
            </div>
          )}
          {graphics.length === 0 && !gOpen && <p className="rounded-lg border border-dashed border-border py-6 text-center text-[12.5px] text-muted-foreground">No graphics yet.<br />Designers add Frame, GIF or Welcome screen links here.</p>}
          <div className="grid grid-cols-2 gap-2.5">
            {shownG.map((g) => {
              const k = GRAPHIC_KINDS.find((x) => x.id === g.kind)
              const st = GRAPHIC_STATUS.find((x) => x.id === g.status)!
              return (
                <div key={g.id} className="rounded-lg border border-border bg-background overflow-hidden">
                  <a href={g.url} target="_blank" rel="noopener noreferrer" title={`Open in Drive · ${g.url}`} className="flex h-20 items-end justify-between p-1.5" style={{ background: GRAPHIC_TILE[g.kind] }}>
                    <span className="rounded bg-black/60 px-1 font-mono text-[9.5px] font-semibold text-white">{k?.label.toUpperCase()}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-black/50" />
                  </a>
                  <div className="p-2 space-y-1.5">
                    <a href={g.url} target="_blank" rel="noopener noreferrer" className="block truncate text-[12.5px] font-semibold hover:underline">{g.name}</a>
                    <div className="flex items-center gap-1.5">
                      <select value={g.status} onChange={(e) => patchGraphic(g.id, { status: e.target.value as AnfGraphic['status'] }, `🖼️ ${g.name}: ${GRAPHIC_STATUS.find((x) => x.id === e.target.value)?.label}`)}
                        className={cn('h-5 rounded px-1 text-[10.5px] font-semibold border-0', st.cls)} aria-label="Graphic status">
                        {GRAPHIC_STATUS.map((x) => <option key={x.id} value={x.id}>{x.label.toUpperCase()}</option>)}
                      </select>
                      <span className="text-[10.5px] text-muted-foreground">v{g.version}</span>
                      <button type="button" className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remove graphic" onClick={() => { if (window.confirm(`Remove “${g.name}”? The Drive file is not touched.`)) { setGraphics(graphics.filter((x) => x.id !== g.id)); log(`🖼️ Graphic removed: ${g.name}`) } }}><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {branches.map((b) => {
                        const on = g.live_at.includes(b.name)
                        return <button key={b.place_id} type="button" title={on ? `Live at ${b.name}` : `Mark live at ${b.name}`}
                          onClick={() => { const live_at = on ? g.live_at.filter((x) => x !== b.name) : [...g.live_at, b.name]; patchGraphic(g.id, { live_at, ...(!on && g.status !== 'live' ? { status: 'live' as const } : {}) }, `🖼️ ${g.name} ${on ? 'removed from' : 'live at'} ${b.name}`) }}
                          className={cn('rounded px-1 py-px text-[10px]', on ? 'bg-foreground text-background font-semibold' : 'bg-muted text-muted-foreground')}>{b.name}</button>
                      })}
                    </div>
                    <button type="button" className="text-[11px] text-muted-foreground underline hover:text-foreground"
                      onClick={() => { const u = window.prompt('New version — paste the new Drive link', ''); if (u && isUrl(u)) patchGraphic(g.id, { url: u.trim(), version: g.version + 1, old_urls: [...(g.old_urls ?? []), g.url], status: 'draft' }, `🖼️ ${g.name}: new version v${g.version + 1}`) }}>New version</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent showCloseButton={false}
        className="!fixed !top-0 !left-0 !-translate-x-0 !-translate-y-0 !w-screen !h-[100dvh] !max-w-none !p-0 !gap-0 sm:!w-[90vw] sm:!max-w-[1180px] sm:!h-[90vh] sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 !flex !flex-col !rounded-none sm:!rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
          <TypePill type={type} />
          {curHealth && <span className={cn('rounded px-1.5 py-px text-[10.5px] font-semibold', curHealth.cls)}>{curHealth.label}</span>}
          <DialogTitle className="text-[14px] font-semibold truncate">{task.name}</DialogTitle>
          {task.is_archived && <span className="text-[11px] rounded bg-muted px-1.5 py-px text-muted-foreground">archived</span>}
          <button type="button" onClick={onClose} aria-label="Close" className="ml-auto p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden lg:grid lg:grid-cols-[1.35fr_1fr]">
          <div className="px-5 py-4 lg:overflow-y-auto lg:border-r border-border">{left}</div>
          <div className="px-5 py-4 bg-muted/30 border-t lg:border-t-0 border-border lg:overflow-y-auto">{right}</div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
