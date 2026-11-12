import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './client'
import { format } from 'date-fns'

// ── Andy & Fine. task board ───────────────────────────────────────────────────
export const ANF_BOARD = 'anf'

export type AnfColumn = 'idea' | 'planned' | 'progress' | 'review' | 'done'
export const ANF_COLUMNS: { id: AnfColumn; label: string; th: string; dot: string }[] = [
  { id: 'idea',     label: 'Idea / Backlog', th: 'ไอเดีย',          dot: '#94a3b8' },
  { id: 'planned',  label: 'Planned',        th: 'วางแผนแล้ว',      dot: '#378ADD' },
  { id: 'progress', label: 'In progress',    th: 'กำลังทำ',         dot: '#EF9F27' },
  { id: 'review',   label: 'Review',         th: 'รอตรวจ / อนุมัติ', dot: '#7A5AA5' },
  { id: 'done',     label: 'Done',           th: 'เสร็จแล้ว',        dot: '#639922' },
]

// Status update (Ops reports on a task). Latest one shows on the card.
export type AnfHealth = 'on_track' | 'at_risk' | 'blocked'
export const HEALTH: { id: AnfHealth; label: string; th: string; cls: string }[] = [
  { id: 'on_track', label: 'On track', th: 'ตามแผน',  cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { id: 'at_risk',  label: 'At risk',  th: 'เสี่ยง',   cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  { id: 'blocked',  label: 'Blocked',  th: 'ติดขัด',  cls: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' },
]

// Graphics live in Google Drive; the board keeps the link + where it's live.
export type GraphicKind = 'frame' | 'gif' | 'welcome' | 'other'
export const GRAPHIC_KINDS: { id: GraphicKind; label: string; icon: string }[] = [
  { id: 'frame', label: 'Frame', icon: '🖼️' }, { id: 'gif', label: 'GIF', icon: '🎞️' },
  { id: 'welcome', label: 'Welcome screen', icon: '👋' }, { id: 'other', label: 'Other', icon: '📎' },
]
export type GraphicStatus = 'draft' | 'approved' | 'live' | 'retired'
export const GRAPHIC_STATUS: { id: GraphicStatus; label: string; cls: string }[] = [
  { id: 'draft', label: 'Draft', cls: 'bg-muted text-muted-foreground' },
  { id: 'approved', label: 'Approved', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { id: 'live', label: 'Live', cls: 'bg-foreground text-background' },
  { id: 'retired', label: 'Retired', cls: 'bg-muted text-muted-foreground line-through' },
]
export interface AnfGraphic {
  id: string; kind: GraphicKind; name: string; url: string; status: GraphicStatus
  live_at: string[]             // branches where it's live
  version: number; old_urls?: string[]
  added_by: string | null; added_at: string
}

export type IssueLevel = 'critical' | 'major' | 'minor'
export const ISSUE_LEVELS: { id: IssueLevel; label: string; th: string; cls: string }[] = [
  { id: 'critical', label: 'Critical', th: 'แก้ไขด่วน',        cls: 'bg-red-700 text-white' },
  { id: 'major',    label: 'Major',    th: 'หนัก',             cls: 'bg-orange-500/20 text-orange-800 dark:text-orange-300' },
  { id: 'minor',    label: 'Minor',    th: 'ยังไม่กระทบมาก',   cls: 'bg-muted text-muted-foreground' },
]
export const AREAS = [
  { id: 'camera', label: '📷 Camera' }, { id: 'printer', label: '🖨️ Printer' },
  { id: 'software', label: '💻 Software' }, { id: 'internet', label: '🌐 Internet' },
]
export const WAITING_REASONS = [
  { id: 'parts', label: 'Parts / ของ' }, { id: 'customer', label: 'Customer / ลูกค้า' },
  { id: 'vendor', label: 'Vendor / ISP' }, { id: 'other', label: 'Other / อื่นๆ' },
]

export type SubStatus = 'todo' | 'doing' | 'done'
export const SUB_STATUS: { id: SubStatus; label: string; cls: string }[] = [
  { id: 'todo',  label: 'To do', cls: 'bg-slate-200 text-slate-700 dark:bg-slate-500/25 dark:text-slate-200' },
  { id: 'doing', label: 'Doing', cls: 'bg-orange-500 text-white' },
  { id: 'done',  label: 'Done',  cls: 'bg-emerald-600 text-white' },
]
/** Sub-task. `done` stays in sync with status (old items only have `done`). */
export interface ChecklistItem {
  id: string; text: string; done: boolean
  status?: SubStatus; owner?: string | null; due?: string | null
  note?: string | null; note_by?: string | null; note_at?: string | null   // latest report (summary)
  reports?: SubReport[]                                                      // newest first
}
export interface SubReport { id: string; text: string; by: string; at: string; photos: import('@/types').ActivityAttachment[] }
export const subStatus = (i: ChecklistItem): SubStatus => i.done ? 'done' : (i.status === 'doing' ? 'doing' : 'todo')
export interface Checklist { id: string; name: string; items: ChecklistItem[] }

export interface AnfTaskType { type_id: string; name: string; color: string; default_checklist: string[]; is_issue: boolean; sort_order: number }
export interface AnfPlace { place_id: string; kind: 'branch' | 'room'; name: string; branch_id: string | null; sort_order: number }

export interface AnfTask {
  task_id: string
  board_id: string
  column_id: AnfColumn
  position: number
  title: string
  name: string
  type_id: string | null
  issue_level: IssueLevel | null
  area: string | null
  branch: string | null
  room: string | null
  start_date: string | null
  due_date: string | null
  description: string | null
  assignee_ids: string[]
  checklists: Checklist[]
  tags: string[]
  waiting_reason: string | null
  waiting_note: string | null
  taken_by: string | null
  taken_at: string | null
  solved_by: string | null
  solved_at: string | null
  health?: AnfHealth | null
  health_note?: string | null
  health_by?: string | null
  health_at?: string | null
  graphics?: AnfGraphic[]          // legacy — moved to anf_assets
  asset_ids?: string[]             // linked room-kit assets
  is_archived: boolean
  trello_id?: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export const uid = (p = 'id') => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${p}-${Date.now()}-${Math.round(Math.random() * 1e6)}`

/** "261014-[BACC-A64] - Printer jams". Created date · [branch-room] · task. */
// Branch / room hold one or more names ("BACC, BTT") or the word "All branches" / "All rooms".
export const ALL_BRANCHES = 'All branches'
export const ALL_ROOMS = 'All rooms'
export const splitPlaces = (v: string | null | undefined): string[] => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)
export const joinPlaces = (names: string[]): string | null => (names.length ? names.join(', ') : null)
export const hasPlace = (v: string | null | undefined, name: string) => splitPlaces(v).includes(name)
export const renameInPlaces = (v: string | null, from: string, to: string | null) => joinPlaces(splitPlaces(v).flatMap((s) => (s === from ? (to ? [to] : []) : [s])))
const titlePart = (v: string | null | undefined) => splitPlaces(v).map((s) => (s === ALL_BRANCHES ? 'ALL' : s === ALL_ROOMS ? 'ALL' : s)).join('/')

export function buildTaskTitle(name: string, branch?: string | null, room?: string | null, created = new Date()): string {
  const place = [titlePart(branch), titlePart(room)].filter(Boolean).join('-')
  return `${format(created, 'yyMMdd')}${place ? `-[${place}]` : ''} - ${name.trim()}`
}

export function checklistProgress(t: Pick<AnfTask, 'checklists'>): { done: number; total: number } {
  let done = 0, total = 0
  for (const c of t.checklists ?? []) for (const i of c.items) { total++; if (i.done) done++ }
  return { done, total }
}

// ── Mock (local dev) ──────────────────────────────────────────────────────────
const MOCK_TYPES: AnfTaskType[] = [
  { type_id: 'frame', name: 'ลงเฟรม', color: '#D4537E', default_checklist: ['FRAME', 'GIF', 'PREVIEW', 'UI'], is_issue: false, sort_order: 1 },
  { type_id: 'rnd', name: 'R&D', color: '#7F77DD', default_checklist: [], is_issue: false, sort_order: 2 },
  { type_id: 'maintenance', name: 'Maintenance', color: '#1D9E75', default_checklist: [], is_issue: true, sort_order: 3 },
  { type_id: 'content', name: 'Content / PR', color: '#378ADD', default_checklist: [], is_issue: false, sort_order: 4 },
  { type_id: 'other', name: 'Other', color: '#888780', default_checklist: [], is_issue: false, sort_order: 9 },
]
const MOCK_PLACES: AnfPlace[] = [
  ...['BACC', 'BTT', 'True Alpha', 'CentralWorld', 'Cloud11'].map((n, i) => ({ place_id: n.toUpperCase().replace(' ', '-'), kind: 'branch' as const, name: n, branch_id: null, sort_order: i })),
  ...['A60', 'A62', 'A64', 'A65', 'A66', 'A80', 'Music room', 'Long Table'].map((n, i) => ({ place_id: n.toUpperCase(), kind: 'room' as const, name: n, branch_id: 'BACC', sort_order: 10 + i })),
  ...['K001', 'K05', 'K11'].map((n, i) => ({ place_id: n, kind: 'room' as const, name: n, branch_id: null, sort_order: 30 + i })),
]
const d = (offset: number) => format(new Date(Date.now() + offset * 86400000), 'yyyy-MM-dd')
const now = () => new Date().toISOString()
const mk = (p: Partial<AnfTask> & Pick<AnfTask, 'name' | 'column_id'>): AnfTask => ({
  task_id: uid('t'), board_id: ANF_BOARD, position: 0, title: buildTaskTitle(p.name, p.branch, p.room),
  type_id: null, issue_level: null, area: null, branch: null, room: null, start_date: null, due_date: null,
  description: null, assignee_ids: [], checklists: [], tags: [], waiting_reason: null, waiting_note: null,
  taken_by: null, taken_at: null, solved_by: null, solved_at: null, is_archived: false, created_by: 'Vitta',
  created_at: now(), updated_at: now(), ...p,
})
let mockTasks: AnfTask[] = [
  mk({ name: 'Printer jams on 4×6 · DNP RX1', column_id: 'idea', type_id: 'maintenance', issue_level: 'critical', area: 'printer', branch: 'BACC', room: 'A64', due_date: d(3), assignee_ids: ['u-nong'],
    checklists: [{ id: 'c1', name: 'Fix', items: [{ id: 'i1', text: 'Clean rollers', done: false }, { id: 'i2', text: 'Test print 10 sheets', done: false }] }] }),
  mk({ name: 'Graduation frame — Bag, Music', column_id: 'progress', type_id: 'frame', health: 'on_track', health_note: 'Frame done, GIF tomorrow', health_by: 'Andy', health_at: now(),
    graphics: [
    ],
    asset_ids: ['as-1', 'as-2', 'as-5'], branch: 'BACC', due_date: d(6), assignee_ids: ['u-andy'],
    checklists: [{ id: 'c2', name: 'SETUP', items: ['FRAME', 'GIF', 'PREVIEW', 'UI'].map((t, i) => ({ id: `s${i}`, text: t, done: i === 0 })) }] }),
  mk({ name: 'New Year campaign · all branches', column_id: 'planned', type_id: 'frame', due_date: d(20) }),
  mk({ name: 'Q1 marketing plan', column_id: 'review', type_id: 'content', health: 'at_risk', health_note: 'Waiting for Champ approval', health_at: now() }),
  mk({ name: 'MVP snap setup', column_id: 'progress', type_id: 'rnd', branch: 'BACC', room: 'Music room', start_date: d(0), due_date: d(4), assignee_ids: ['u-vitta'], taken_by: 'Vitta', taken_at: now() }),
  mk({ name: 'Internet TRUE slow at store', column_id: 'progress', type_id: 'maintenance', issue_level: 'minor', area: 'internet', branch: 'True Alpha', health: 'blocked', health_note: 'Waiting for vendor / ISP · TRUE technician booked Thu', health_at: now(), due_date: d(2) }),
  mk({ name: 'PR Promote WIMB', column_id: 'done', type_id: 'content', branch: 'CentralWorld', due_date: d(-2), solved_by: 'Andy', solved_at: now() }),
]

// ── Reads ─────────────────────────────────────────────────────────────────────
export async function fetchAnf(): Promise<{ tasks: AnfTask[]; types: AnfTaskType[]; places: AnfPlace[] }> {
  if (!isSupabaseConfigured) return { tasks: mockTasks.map((t) => structuredClone(t)), types: MOCK_TYPES, places: MOCK_PLACES }
  const [t, ty, pl] = await Promise.all([
    supabase.from('anf_tasks').select('*').eq('board_id', ANF_BOARD).order('position'),
    supabase.from('anf_task_types').select('*').order('sort_order'),
    supabase.from('anf_places').select('*').order('sort_order'),
  ])
  if (t.error) throw t.error
  return { tasks: (t.data ?? []) as AnfTask[], types: (ty.data ?? []) as AnfTaskType[], places: (pl.data ?? []) as AnfPlace[] }
}

// ── Writes ────────────────────────────────────────────────────────────────────
export async function createAnfTask(task: AnfTask): Promise<void> {
  if (!isSupabaseConfigured) { mockTasks = [task, ...mockTasks]; return }
  const { error } = await supabase.from('anf_tasks').insert(task)
  if (error) throw error
}
export async function updateAnfTask(id: string, patch: Partial<AnfTask>): Promise<void> {
  const p = { ...patch, updated_at: now() }
  if (!isSupabaseConfigured) { mockTasks = mockTasks.map((t) => (t.task_id === id ? { ...t, ...p } : t)); return }
  const { error } = await supabase.from('anf_tasks').update(p).eq('task_id', id)
  if (error) throw error
}
export async function deleteAnfTask(id: string): Promise<void> {
  if (!isSupabaseConfigured) { mockTasks = mockTasks.filter((t) => t.task_id !== id); return }
  const { error } = await supabase.from('anf_tasks').delete().eq('task_id', id)
  if (error) throw error
}
export async function createAnfType(t: AnfTaskType): Promise<void> {
  if (!isSupabaseConfigured) { MOCK_TYPES.push(t); return }
  const { error } = await supabase.from('anf_task_types').insert(t)
  if (error) throw error
}
export async function createAnfPlace(p: AnfPlace): Promise<void> {
  if (!isSupabaseConfigured) { MOCK_PLACES.push(p); return }
  const { error } = await supabase.from('anf_places').insert(p)
  if (error) throw error
}

// ── Board access (restricted boards) ──────────────────────────────────────────
export async function fetchBoardMembers(boardId: string): Promise<string[]> {
  if (!isSupabaseConfigured) return ['u-vitta', 'u-andy', 'u-nong']
  const { data, error } = await supabase.from('board_members').select('user_id').eq('board_id', boardId)
  if (error) return []
  return (data ?? []).map((r) => r.user_id as string)
}
export async function setBoardMember(boardId: string, userId: string, on: boolean): Promise<void> {
  if (!isSupabaseConfigured) return
  const q = on
    ? supabase.from('board_members').upsert({ board_id: boardId, user_id: userId })
    : supabase.from('board_members').delete().eq('board_id', boardId).eq('user_id', userId)
  const { error } = await q
  if (error) throw error
}

// ── Pick-list admin (types, branches, rooms) ──────────────────────────────────
export async function updateAnfType(id: string, patch: Partial<AnfTaskType>): Promise<void> {
  if (!isSupabaseConfigured) { const t = MOCK_TYPES.find((x) => x.type_id === id); if (t) Object.assign(t, patch); return }
  const { error } = await supabase.from('anf_task_types').update(patch).eq('type_id', id)
  if (error) throw error
}
export async function deleteAnfType(id: string): Promise<void> {
  if (!isSupabaseConfigured) { const i = MOCK_TYPES.findIndex((x) => x.type_id === id); if (i >= 0) MOCK_TYPES.splice(i, 1); return }
  const { error } = await supabase.from('anf_task_types').delete().eq('type_id', id)
  if (error) throw error
}
export async function updateAnfPlace(id: string, patch: Partial<AnfPlace>): Promise<void> {
  if (!isSupabaseConfigured) { const p = MOCK_PLACES.find((x) => x.place_id === id); if (p) Object.assign(p, patch); return }
  const { error } = await supabase.from('anf_places').update(patch).eq('place_id', id)
  if (error) throw error
}
export async function deleteAnfPlace(id: string): Promise<void> {
  if (!isSupabaseConfigured) { const i = MOCK_PLACES.findIndex((x) => x.place_id === id); if (i >= 0) MOCK_PLACES.splice(i, 1); return }
  const { error } = await supabase.from('anf_places').delete().eq('place_id', id)
  if (error) throw error
}

// ── Critical issue → in-app notification + web push to the assignees ──────────
export function notifyCritical(task: AnfTask, actor: string, people: { id: string; name: string; email: string }[]) {
  if (!isSupabaseConfigured) return
  const msg = `🚩 Critical · ${[task.branch, task.room].filter(Boolean).join(' ')} · ${task.name}`
  for (const m of people) {
    void supabase.from('notifications').insert({
      recipient_id: m.id, recipient_name: m.name || m.email, actor, entity_type: 'anf_task', entity_id: task.task_id,
      entity_name: task.name, message: msg, read: false, board_id: ANF_BOARD,
    })
    void fetch('/api/push/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: m.id, title: 'Critical issue — Andy & Fine.', body: msg, url: '/anf-tasks' }),
    }).catch(() => { /* push is best-effort */ })
  }
}

/** Solved tasks older than this are archived automatically. */
export const AUTO_ARCHIVE_DAYS = 14

// ── Task list for other pages (Requests "A&F task" picker) — loaded once, shared ──
let taskCache: AnfTask[] | null = null
let taskLoading: Promise<void> | null = null
const taskListeners = new Set<() => void>()
export function useAnfTaskList(): AnfTask[] {
  const [, force] = useState(0)
  useEffect(() => {
    const f = () => force((n) => n + 1)
    taskListeners.add(f)
    if (!taskCache && !taskLoading) taskLoading = fetchAnf().then((r) => { taskCache = r.tasks.filter((t) => !t.is_archived) }).catch(() => { taskCache = [] }).finally(() => taskListeners.forEach((l) => l()))
    return () => { taskListeners.delete(f) }
  }, [])
  return taskCache ?? []
}
