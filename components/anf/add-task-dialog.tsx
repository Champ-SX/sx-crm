'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { Plus } from 'lucide-react'
import {
  ISSUE_LEVELS, AREAS, ANF_BOARD, buildTaskTitle, uid,
  type AnfTask, type AnfTaskType, type AnfPlace, type IssueLevel,
} from '@/lib/supabase/anf-tasks'
import { Chip } from './task-ui'

/**
 * + Add task — same idea as + Add Lead/Opp: a short form; the title builds
 * itself (YYMMDD-[BRANCH-ROOM] - task) and the type pre-fills its checklist.
 */
export function AddTaskDialog({ types, places, author, onClose, onCreate, onAddType }: {
  types: AnfTaskType[]; places: AnfPlace[]; author: string
  onClose: () => void
  onCreate: (t: AnfTask) => void
  onAddType: (name: string) => Promise<AnfTaskType | null>
}) {
  const [typeId, setTypeId] = useState<string | null>(null)
  const [level, setLevel] = useState<IssueLevel | null>(null)
  const [area, setArea] = useState<string | null>(null)
  const [branch, setBranch] = useState('')
  const [room, setRoom] = useState('')
  const [due, setDue] = useState('')
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [assignees, setAssignees] = useState<string[]>([])
  const [newType, setNewType] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  const type = types.find((t) => t.type_id === typeId)
  const branches = places.filter((p) => p.kind === 'branch')
  const branchId = branches.find((b) => b.name === branch)?.place_id
  const rooms = places.filter((p) => p.kind === 'room' && (!p.branch_id || !branchId || p.branch_id === branchId))
  const title = name.trim() ? buildTaskTitle(name, branch || null, room || null) : ''
  const missing = !name.trim() ? 'Enter what the task is' : !typeId ? 'Pick a type of task' : null

  function create() {
    setTried(true)
    if (missing) return
    const now = new Date().toISOString()
    onCreate({
      task_id: uid('t'), board_id: ANF_BOARD, column_id: 'new', position: -1,
      title, name: name.trim(), type_id: typeId,
      issue_level: type?.is_issue ? level : null, area: type?.is_issue ? area : null,
      branch: branch || null, room: room || null, start_date: null, due_date: due || null,
      description: desc.trim() || null, assignee_ids: assignees, tags: [],
      // Each type brings its own default checklist (ลงเฟรม → FRAME / GIF / PREVIEW / UI).
      checklists: type?.default_checklist.length
        ? [{ id: uid('c'), name: type.name, items: type.default_checklist.map((t) => ({ id: uid('i'), text: t, done: false })) }]
        : [],
      waiting_reason: null, waiting_note: null, taken_by: null, taken_at: null, solved_by: null, solved_at: null,
      is_archived: false, created_by: author, created_at: now, updated_at: now,
    })
  }

  const label = 'text-[11px] font-medium tracking-wide text-muted-foreground mb-1.5 block'
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogTitle>New task · Andy &amp; Fine.</DialogTitle>

        <div>
          <span className={label}>TYPE OF TASK</span>
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <Chip key={t.type_id} on={typeId === t.type_id} onClick={() => setTypeId(t.type_id)}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name}
              </Chip>
            ))}
            {newType === null ? (
              <Chip on={false} onClick={() => setNewType('')} className="text-muted-foreground"><Plus className="w-3.5 h-3.5" />Add type</Chip>
            ) : (
              <span className="inline-flex gap-1">
                <Input autoFocus value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Type name" className="h-8 w-36 text-[13px]"
                  onKeyDown={async (e) => {
                    if (e.key === 'Escape') setNewType(null)
                    if (e.key === 'Enter' && newType.trim()) { const t = await onAddType(newType.trim()); if (t) setTypeId(t.type_id); setNewType(null) }
                  }} />
              </span>
            )}
          </div>
        </div>

        {type?.is_issue && (
          <div className="space-y-2">
            <span className={label}>ISSUE LEVEL</span>
            <div className="flex flex-wrap gap-1.5">
              {ISSUE_LEVELS.map((l) => (
                <Chip key={l.id} on={level === l.id} onClick={() => setLevel(level === l.id ? null : l.id)}>
                  <span className={`rounded px-1.5 py-px text-[11px] font-medium ${l.cls}`}>{l.label}</span>{l.th}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[12px] text-muted-foreground mr-1">Area</span>
              {AREAS.map((a) => <Chip key={a.id} on={area === a.id} onClick={() => setArea(area === a.id ? null : a.id)} className="py-1">{a.label}</Chip>)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          <div>
            <span className={label}>BRANCH</span>
            <select value={branch} onChange={(e) => { setBranch(e.target.value); setRoom('') }} className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]">
              <option value="">—</option>{branches.map((b) => <option key={b.place_id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>ROOM / BOOTH</span>
            <select value={room} onChange={(e) => setRoom(e.target.value)} className="h-9 w-full rounded-md border border-border bg-background px-2 text-[13px]">
              <option value="">—</option>{rooms.map((r) => <option key={r.place_id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <span className={label}>DUE DATE</span>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-9 text-[13px]" />
          </div>
        </div>

        <div>
          <span className={label}>WHAT&apos;S THE TASK</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Printer jams on 4×6 · DNP RX1" className="text-[14px]" />
        </div>
        <div>
          <span className={label}>DETAILS <span className="font-normal">(optional)</span></span>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What happened, contact on site, anything the team should know…" className="text-[13px]" />
        </div>
        <div>
          <span className={label}>ASSIGN</span>
          <AssigneePicker value={assignees} onChange={setAssignees} />
        </div>

        <div className="rounded-md bg-muted/60 px-3 py-2 font-mono text-[12px]">
          <span className="text-muted-foreground">Title → </span>{title || <span className="text-muted-foreground">YYMMDD-[BRANCH-ROOM] - task</span>}
        </div>
        {tried && missing && <p className="text-[13px] text-destructive -mt-2">{missing}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create} className="bg-[#FF809E] hover:bg-[#f06d8d] text-white">Create task</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
