import { supabase, isSupabaseConfigured } from './client'
import { format } from 'date-fns'

// ── Andy & Fine. task board ───────────────────────────────────────────────────
export const ANF_BOARD = 'anf'

export type AnfColumn = 'new' | 'progress' | 'waiting' | 'solved'
export const ANF_COLUMNS: { id: AnfColumn; label: string; th: string; dot: string }[] = [
  { id: 'new',      label: 'New',         th: 'แจ้งใหม่',          dot: '#E24B4A' },
  { id: 'progress', label: 'In progress', th: 'ดำเนินการอยู่',     dot: '#EF9F27' },
  { id: 'waiting',  label: 'Waiting',     th: 'รอของ / ลูกค้า',    dot: '#378ADD' },
  { id: 'solved',   label: 'Solved',      th: 'แก้ไขเรียบร้อย',    dot: '#639922' },
]

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

export interface ChecklistItem { id: string; text: string; done: boolean }
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
  is_archived: boolean
  trello_id?: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export const uid = (p = 'id') => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${p}-${Date.now()}-${Math.round(Math.random() * 1e6)}`

/** "261014-[BACC-A64] - Printer jams". Created date · [branch-room] · task. */
export function buildTaskTitle(name: string, branch?: string | null, room?: string | null, created = new Date()): string {
  const place = [branch, room].filter(Boolean).join('-')
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
  ...['BACC', 'BTT', 'True Alpha', 'CentralWorld'].map((n, i) => ({ place_id: n.toUpperCase().replace(' ', '-'), kind: 'branch' as const, name: n, branch_id: null, sort_order: i })),
  ...['A60', 'A64', 'A65', 'A66', 'A80', 'Music room', 'Long Table'].map((n, i) => ({ place_id: n.toUpperCase(), kind: 'room' as const, name: n, branch_id: 'BACC', sort_order: 10 + i })),
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
  mk({ name: 'Printer jams on 4×6 · DNP RX1', column_id: 'new', type_id: 'maintenance', issue_level: 'critical', area: 'printer', branch: 'BACC', room: 'A64', due_date: d(3), assignee_ids: ['u-nong'],
    checklists: [{ id: 'c1', name: 'Fix', items: [{ id: 'i1', text: 'Clean rollers', done: false }, { id: 'i2', text: 'Test print 10 sheets', done: false }] }] }),
  mk({ name: 'Graduation frame — Bag, Music', column_id: 'new', type_id: 'frame', branch: 'BACC', due_date: d(6), assignee_ids: ['u-andy'],
    checklists: [{ id: 'c2', name: 'SETUP', items: ['FRAME', 'GIF', 'PREVIEW', 'UI'].map((t, i) => ({ id: `s${i}`, text: t, done: i === 0 })) }] }),
  mk({ name: 'MVP snap setup', column_id: 'progress', type_id: 'rnd', branch: 'BACC', room: 'Music room', start_date: d(0), due_date: d(4), assignee_ids: ['u-vitta'], taken_by: 'Vitta', taken_at: now() }),
  mk({ name: 'Internet TRUE slow at store', column_id: 'waiting', type_id: 'maintenance', issue_level: 'minor', area: 'internet', branch: 'True Alpha', waiting_reason: 'vendor', waiting_note: 'TRUE technician booked Thu', due_date: d(2) }),
  mk({ name: 'PR Promote WIMB', column_id: 'solved', type_id: 'content', branch: 'CentralWorld', due_date: d(-2), solved_by: 'Andy', solved_at: now() }),
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
