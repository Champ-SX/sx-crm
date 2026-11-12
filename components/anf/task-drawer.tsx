'use client'

import { PlaceMulti, roomsFor } from './place-multi'
import { ALL_BRANCHES, ALL_ROOMS, hasPlace } from '@/lib/supabase/anf-tasks'
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
import { Archive, ArchiveRestore, Plus, Trash2, X, MessageSquare, Camera, Link2 } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { toast } from '@/lib/toast'
import { useAuth } from '@/components/auth-provider'
import { cn, parseDbDate } from '@/lib/utils'
import {
  ANF_COLUMNS, HEALTH, SUB_STATUS, subStatus, buildTaskTitle, checklistProgress, uid,
  type AnfTask, type AnfTaskType, type AnfPlace, type AnfColumn, type Checklist, type ChecklistItem, type AnfHealth, type SubReport,
} from '@/lib/supabase/anf-tasks'
import { TypePill } from './task-ui'
import { RequestDialog, type TaskLink } from './purchasing-ui'
import { OrderChip, TaskOrdersSection, useOpenRequest, useTaskOrders } from './task-orders'
import { addDaysIso } from '@/lib/task-orders'
import type { ActivityAttachment } from '@/types'
import { assetPlace, type AnfAsset } from '@/lib/supabase/anf-assets'
import { AssetCard, AssetChip, MentionInput, MentionText, PhotoButton, PhotoStrip, kindLabel } from './asset-ui'

const lbl = 'font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'
const when = (iso: string | null | undefined) => (iso ? format(parseDbDate(iso), 'd MMM HH:mm') : '')
const today = () => new Date().toISOString().slice(0, 10)


export function TaskDrawer({ task, types, places, assets, onSaveAsset, onClose, onPatch, onMove, onDelete }: {
  task: AnfTask; types: AnfTaskType[]; places: AnfPlace[]
  assets: AnfAsset[]; onSaveAsset: (a: AnfAsset) => void
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
  const [reportPhotos, setReportPhotos] = useState<ActivityAttachment[]>([])
  const [peek, setPeek] = useState<AnfAsset | null>(null)
  const [reqLink, setReqLink] = useState<TaskLink | null>(null)
  const orders = useTaskOrders(task)
  const openRequest = useOpenRequest()
  const allSubs = task.checklists.flatMap((c) => c.items)
  const requestFor = (it?: ChecklistItem) => setReqLink({
    task_id: task.task_id, subtask_id: it?.id ?? null,
    title: it ? `${task.name} › ${it.text}` : task.name,
    needed_by: (it?.due ?? task.due_date) ? addDaysIso((it?.due ?? task.due_date)!, -2) : null,
  })
  const [linking, setLinking] = useState(false)
  const [linkQ, setLinkQ] = useState('')

  const type = types.find((t) => t.type_id === task.type_id)
  const branches = places.filter((p) => p.kind === 'branch')
  const rooms = roomsFor(places, task.branch)
  const prog = checklistProgress(task)
  const pct = prog.total ? Math.round((prog.done / prog.total) * 100) : 0
  const linked = (task.asset_ids ?? []).map((id) => assets.find((a) => a.asset_id === id)).filter((a): a is AnfAsset => !!a)
  const linkHits = assets.filter((a) => !task.asset_ids?.includes(a.asset_id))
    .filter((a) => !linkQ.trim() || [a.code, a.name, a.branch, a.room, kindLabel(a.kind)].filter(Boolean).join(' ').toLowerCase().includes(linkQ.trim().toLowerCase()))
    .sort((a, b) => Number(hasPlace(task.branch, b.branch ?? '')) - Number(hasPlace(task.branch, a.branch ?? ''))).slice(0, 8)
  const link = (a: AnfAsset) => { onPatch({ asset_ids: [...(task.asset_ids ?? []), a.asset_id] }); log(`🔗 Linked ${a.code} · ${a.name}`) }
  const unlink = (a: AnfAsset) => { onPatch({ asset_ids: (task.asset_ids ?? []).filter((x) => x !== a.asset_id) }); log(`🔗 Unlinked ${a.code}`) }
  const reportsOf = (it: ChecklistItem): SubReport[] => it.reports ?? (it.note ? [{ id: 'legacy', text: it.note, by: it.note_by ?? '', at: it.note_at ?? '', photos: [] }] : [])
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
    const v = report.trim(); if (!v && !reportPhotos.length) return
    const at = new Date().toISOString()
    const r: SubReport = { id: uid('r'), text: v, by: me, at, photos: reportPhotos }
    setItem(clId, it.id, { reports: [r, ...reportsOf(it).filter((x) => x.id !== 'legacy' || !it.reports)], note: v || '📷 photo', note_by: me, note_at: at })
    void addActivity({ activity_id: uid('a'), entity_type: 'anf_task', entity_id: task.task_id, activity_type: 'note', title: `💬 ${it.text}`, description: v, created_by: me, created_at: at, attachments: reportPhotos })
    setReport(''); setReportPhotos([])
  }
  function postHealth() {
    if (!health) return
    const h = HEALTH.find((x) => x.id === health)!
    onPatch({ health, health_note: healthNote.trim() || null, health_by: me, health_at: new Date().toISOString() })
    log(`📊 Status: ${h.label}`, healthNote.trim())
    setHealth(null); setHealthNote('')
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
          <PlaceMulti label="Branch" value={task.branch} options={branches.map((b) => b.name)} allLabel={ALL_BRANCHES}
            onChange={(v) => retitle({ branch: v })} />
        ))}
        {field('Room', (
          <PlaceMulti label="Room" value={task.room} options={[...new Set(rooms.map((r) => r.name))]} allLabel={ALL_ROOMS}
            onChange={(v) => retitle({ room: v })} />
        ))}
        {field('Progress', prog.total
          ? <span className="flex items-center gap-2"><b>{pct}%</b><span className="text-muted-foreground">· {prog.done} of {prog.total} sub-tasks done</span><span className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden"><span className="block h-full bg-emerald-600" style={{ width: `${pct}%` }} /></span></span>
          : <span className="text-muted-foreground">No sub-tasks yet</span>)}
      </div>

      {/* Linked room-kit assets */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={lbl}>LINKED ASSETS {linked.length > 0 && `· ${linked.length}`}</span>
          <button type="button" onClick={() => { setLinking((v) => !v); setLinkQ('') }} className="text-[12px] font-medium text-[#7A5AA5] inline-flex items-center gap-1"><Link2 className="w-3 h-3" />Link asset</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {linked.map((a) => <AssetChip key={a.asset_id} a={a} onOpen={() => setPeek(a)} onRemove={() => unlink(a)} />)}
          {linked.length === 0 && !linking && <span className="text-[12.5px] text-muted-foreground">Frames, GIFs, welcome UI or camera / flash presets this task uses. Or type # in a report.</span>}
        </div>
        {linking && (
          <div className="mt-2 rounded-lg border border-border bg-background p-1.5">
            <Input autoFocus value={linkQ} onChange={(e) => setLinkQ(e.target.value)} placeholder="Search code, name, room…" className="h-8 text-[13px] mb-1" />
            {linkHits.map((a) => (
              <button key={a.asset_id} type="button" onClick={() => link(a)} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12.5px] hover:bg-muted">
                <span className="font-mono text-[10.5px] font-semibold text-[#7A5AA5]">{a.code}</span><span className="truncate">{a.name}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{kindLabel(a.kind)} · {assetPlace(a)}</span>
              </button>
            ))}
            {linkHits.length === 0 && <p className="px-2 py-1.5 text-[12px] text-muted-foreground">Nothing found. Add assets in the “Graphic Assets and Camera Setting” tab.</p>}
          </div>
        )}
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
              const subOrders = orders.filter((o) => o.r.anf_subtask_id === it.id)
              const waitingParts = st !== 'done' && subOrders.some((o) => o.stage < 4)
              const next = st === 'todo' ? 'doing' : st === 'doing' ? 'done' : 'todo'
              const isOpen = openSub === it.id
              const late = it.due && st !== 'done' && it.due < today()
              return (
                <div key={it.id} className="group border-b border-border/70">
                  <div className="grid grid-cols-[18px_1fr_auto] sm:grid-cols-[18px_1fr_92px_104px_64px] items-center gap-2 py-1.5 text-[13px]">
                    <input type="checkbox" checked={st === 'done'} onChange={() => setStatus(cl.id, it, st === 'done' ? 'todo' : 'done')} className="w-4 h-4 accent-emerald-600" aria-label="Done" />
                    <button type="button" onClick={() => { setOpenSub(isOpen ? null : it.id); setReport(''); setReportPhotos([]) }} className="min-w-0 text-left">
                      <span className={cn('block truncate', st === 'done' && 'line-through text-muted-foreground')}>{it.text}</span>
                      {reportsOf(it).length > 0 && (() => { const rs = reportsOf(it); const ph = rs.reduce((n, r) => n + r.photos.length, 0); return (
                        <span className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground"><MessageSquare className="w-3 h-3 shrink-0" />{rs.length} report{rs.length > 1 ? 's' : ''}{ph > 0 && <> · <Camera className="w-3 h-3" />{ph}</>} · {rs[0].text || 'photo'}</span>
                      ) })()}
                    </button>
                    <select value={it.owner ?? ''} onChange={(e) => setItem(cl.id, it.id, { owner: e.target.value || null })}
                      className={cn('hidden sm:block h-7 rounded border border-transparent bg-transparent text-[12px] hover:border-border', !it.owner && 'text-muted-foreground')} aria-label="Owner">
                      <option value="">owner</option>{teamMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                      {it.owner && !teamMembers.some((m) => (m.name || m.email) === it.owner) && <option>{it.owner}</option>}
                    </select>
                    <input type="date" value={it.due ?? ''} onChange={(e) => setItem(cl.id, it.id, { due: e.target.value || null })}
                      className={cn('hidden sm:block h-7 rounded border border-transparent bg-transparent text-[12px] hover:border-border', !it.due && 'text-muted-foreground', late && 'text-red-600 font-semibold')} aria-label="Due" />
                    <button type="button" onClick={() => setStatus(cl.id, it, next)} title={`Tap for ${SUB_STATUS.find((x) => x.id === next)?.label}`}
                      className={cn('rounded px-2 py-0.5 text-[11px] font-semibold text-center', waitingParts ? 'bg-teal-700 text-white' : sc.cls)}>{waitingParts ? 'Waiting parts' : sc.label}</button>
                  </div>
                  {subOrders.length > 0 && <div className="-mt-0.5 mb-1.5 ml-[20px] flex flex-wrap gap-1">{subOrders.map((o) => <OrderChip key={o.r.request_id} o={o} onOpen={() => openRequest(o.r.request_id)} />)}</div>}
                  {isOpen && (
                    <div className="mb-2 ml-[26px] rounded-lg bg-muted/50 p-2 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5 sm:hidden">
                        <select value={it.owner ?? ''} onChange={(e) => setItem(cl.id, it.id, { owner: e.target.value || null })} className={sel} aria-label="Owner">
                          <option value="">owner</option>{teamMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                        </select>
                        <Input type="date" value={it.due ?? ''} onChange={(e) => setItem(cl.id, it.id, { due: e.target.value || null })} className="h-8 text-[13px]" />
                      </div>
                      {reportsOf(it).map((r) => (
                        <div key={r.id} className="border-l-2 border-border pl-2.5 text-[12.5px]">
                          <div className="text-[11px] text-muted-foreground">{r.by} · {when(r.at)}</div>
                          {r.text && <MentionText text={r.text} assets={assets} onOpen={setPeek} />}
                          {r.photos.length > 0 && <div className="mt-1"><PhotoStrip photos={r.photos} size={72} /></div>}
                        </div>
                      ))}
                      {reportPhotos.length > 0 && <PhotoStrip photos={reportPhotos} size={56} onRemove={(i) => setReportPhotos(reportPhotos.filter((_, j) => j !== i))} />}
                      <div className="flex gap-2">
                        <MentionInput value={report} onChange={setReport} onEnter={() => postReport(cl.id, it)} assets={assets} placeholder="Report — what's going on? Type # for an asset" className="h-8 bg-background text-[13px]" />
                        <PhotoButton onAdd={(p) => setReportPhotos([...reportPhotos, ...p])} />
                        <Button size="sm" className="h-8" disabled={!report.trim() && !reportPhotos.length} onClick={() => postReport(cl.id, it)}>Post</Button>
                      </div>
                      <div className="flex justify-between text-[11.5px]">
                        <button type="button" onClick={() => requestFor(it)} className="font-medium text-teal-700 hover:underline dark:text-teal-400">📦 Request items for this sub-task</button>
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

      <TaskOrdersSection orders={orders} onOpen={openRequest} onRequest={() => requestFor()}
        subName={(id) => allSubs.find((i) => i.id === id)?.text ?? null} />

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

  const right = (
    <div className="space-y-4">
      <div className={lbl}>ACTIVITY</div>
      <AddActivityForm entityType="anf_task" entityId={task.task_id} owner={task.created_by ?? ''} entityName={task.name} />
      <ActivityTimeline entityType="anf_task" entityId={task.task_id} entityName={task.name} />
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
      {reqLink && <RequestDialog request={null} link={reqLink} onClose={() => setReqLink(null)} onCreatePO={() => { setReqLink(null); toast('Approved — the buyer creates the PO in Purchasing') }} />}
      {peek && (
        <Dialog open onOpenChange={(o) => !o && setPeek(null)}>
          <DialogContent className="sm:max-w-[520px] p-4">
            <DialogTitle className="text-[14px]">{peek.code} · {peek.name} <span className="font-normal text-muted-foreground">· {assetPlace(peek)}</span></DialogTitle>
            <AssetCard a={assets.find((x) => x.asset_id === peek.asset_id) ?? peek} me={me} onSave={(a) => { onSaveAsset(a); setPeek(a) }} />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  )
}
