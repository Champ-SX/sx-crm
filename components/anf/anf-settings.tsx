'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  createAnfType, updateAnfType, deleteAnfType, createAnfPlace, updateAnfPlace, deleteAnfPlace, uid,
  type AnfTaskType, type AnfPlace,
} from '@/lib/supabase/anf-tasks'

const COLORS = ['#D4537E', '#7F77DD', '#1D9E75', '#378ADD', '#D85A30', '#BA7517', '#639922', '#888780']
const slug = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || uid('p')

/** Admin: task types (colour, default checklist, issue fields), branches and rooms. */
export function AnfSettings({ types, places, onClose, onChange }: {
  types: AnfTaskType[]; places: AnfPlace[]
  onClose: () => void
  onChange: (types: AnfTaskType[], places: AnfPlace[]) => void
}) {
  const [tab, setTab] = useState<'types' | 'places'>('types')
  const [newName, setNewName] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [newRoom, setNewRoom] = useState({ name: '', branch: '' })
  const fail = (e: unknown) => toast(`Couldn't save — ${e instanceof Error ? e.message : 'error'}`)

  const patchType = (id: string, p: Partial<AnfTaskType>) => {
    onChange(types.map((t) => (t.type_id === id ? { ...t, ...p } : t)), places)
    updateAnfType(id, p).catch(fail)
  }
  const addType = () => {
    if (!newName.trim()) return
    const t: AnfTaskType = { type_id: uid('type'), name: newName.trim(), color: COLORS[types.length % COLORS.length], default_checklist: [], is_issue: false, sort_order: 50 + types.length }
    onChange([...types, t], places); setNewName('')
    createAnfType(t).catch(fail)
  }
  const removeType = (t: AnfTaskType) => {
    if (!window.confirm(`Delete type “${t.name}”? Tasks keep working but lose this type.`)) return
    onChange(types.filter((x) => x.type_id !== t.type_id), places)
    deleteAnfType(t.type_id).catch(fail)
  }
  const addPlace = (p: AnfPlace) => { onChange(types, [...places, p]); createAnfPlace(p).catch(fail) }
  const renamePlace = (p: AnfPlace, name: string) => {
    if (!name.trim() || name === p.name) return
    onChange(types, places.map((x) => (x.place_id === p.place_id ? { ...x, name: name.trim() } : x)))
    updateAnfPlace(p.place_id, { name: name.trim() }).catch(fail)
  }
  const removePlace = (p: AnfPlace) => {
    if (!window.confirm(`Remove “${p.name}” from the pick-list? Existing tasks keep their value.`)) return
    onChange(types, places.filter((x) => x.place_id !== p.place_id))
    deleteAnfPlace(p.place_id).catch(fail)
  }

  const branches = places.filter((p) => p.kind === 'branch')
  const rooms = places.filter((p) => p.kind === 'room')
  const label = 'text-[11px] font-medium tracking-wide text-muted-foreground'

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto">
        <DialogTitle>Andy &amp; Fine. · Board settings</DialogTitle>
        <div className="flex gap-1 border-b border-border -mt-1">
          {([['types', 'Task types'], ['places', 'Branches & rooms']] as const).map(([id, l]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={cn('px-3 py-2 text-[13px] font-medium border-b-2 -mb-px', tab === id ? 'border-foreground' : 'border-transparent text-muted-foreground')}>{l}</button>
          ))}
        </div>

        {tab === 'types' ? (
          <div className="space-y-2.5">
            {types.map((t) => (
              <div key={t.type_id} className="rounded-lg border border-border p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {COLORS.map((c) => (
                      <button key={c} type="button" aria-label={`Colour ${c}`} onClick={() => patchType(t.type_id, { color: c })}
                        className={cn('w-4 h-4 rounded-full', t.color === c && 'ring-2 ring-offset-1 ring-foreground')} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <input defaultValue={t.name} onBlur={(e) => e.target.value.trim() && e.target.value !== t.name && patchType(t.type_id, { name: e.target.value.trim() })}
                    className="flex-1 bg-transparent text-[14px] font-semibold outline-none border-b border-transparent focus:border-border" />
                  <label className="text-[12px] text-muted-foreground inline-flex items-center gap-1.5 cursor-pointer" title="Shows issue level + area when adding a task">
                    <input type="checkbox" checked={t.is_issue} onChange={() => patchType(t.type_id, { is_issue: !t.is_issue })} className="accent-foreground" />Issue
                  </label>
                  <button type="button" aria-label={`Delete ${t.name}`} onClick={() => removeType(t)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div>
                  <span className={label}>DEFAULT CHECKLIST (comma-separated)</span>
                  <input defaultValue={t.default_checklist.join(', ')} placeholder="e.g. FRAME, GIF, PREVIEW, UI"
                    onBlur={(e) => {
                      const items = e.target.value.split(',').map((x) => x.trim()).filter(Boolean)
                      if (items.join('|') !== t.default_checklist.join('|')) patchType(t.type_id, { default_checklist: items })
                    }}
                    className="w-full h-8 rounded-md border border-border bg-background px-2 text-[13px]" />
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addType()} placeholder="New type name" className="h-9 text-[13px]" />
              <Button size="sm" variant="outline" onClick={addType} className="gap-1"><Plus className="w-4 h-4" />Add type</Button>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <span className={label}>BRANCHES</span>
              {branches.map((b) => (
                <div key={b.place_id} className="flex items-center gap-2">
                  <input defaultValue={b.name} onBlur={(e) => renamePlace(b, e.target.value)} className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-[13px]" />
                  <button type="button" aria-label={`Remove ${b.name}`} onClick={() => removePlace(b)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <Input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder="New branch" className="h-8 text-[13px]"
                  onKeyDown={(e) => { if (e.key === 'Enter' && newBranch.trim()) { addPlace({ place_id: slug(newBranch), kind: 'branch', name: newBranch.trim(), branch_id: null, sort_order: 10 + branches.length }); setNewBranch('') } }} />
                <Button size="sm" variant="outline" className="h-8" onClick={() => { if (newBranch.trim()) { addPlace({ place_id: slug(newBranch), kind: 'branch', name: newBranch.trim(), branch_id: null, sort_order: 10 + branches.length }); setNewBranch('') } }}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <span className={label}>ROOMS / BOOTHS</span>
              <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                {rooms.map((r) => (
                  <div key={r.place_id} className="flex items-center gap-2">
                    <input defaultValue={r.name} onBlur={(e) => renamePlace(r, e.target.value)} className="flex-1 h-8 rounded-md border border-border bg-background px-2 text-[13px]" />
                    <select value={r.branch_id ?? ''} onChange={(e) => { const v = e.target.value || null; onChange(types, places.map((x) => (x.place_id === r.place_id ? { ...x, branch_id: v } : x))); updateAnfPlace(r.place_id, { branch_id: v }).catch(fail) }}
                      className="h-8 rounded-md border border-border bg-background px-1 text-[12px] w-[96px]" aria-label="Branch">
                      <option value="">Any branch</option>{branches.map((b) => <option key={b.place_id} value={b.place_id}>{b.name}</option>)}
                    </select>
                    <button type="button" aria-label={`Remove ${r.name}`} onClick={() => removePlace(r)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Input value={newRoom.name} onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })} placeholder="New room" className="h-8 text-[13px]" />
                <select value={newRoom.branch} onChange={(e) => setNewRoom({ ...newRoom, branch: e.target.value })} className="h-8 rounded-md border border-border bg-background px-1 text-[12px] w-[96px]" aria-label="New room branch">
                  <option value="">Any</option>{branches.map((b) => <option key={b.place_id} value={b.place_id}>{b.name}</option>)}
                </select>
                <Button size="sm" variant="outline" className="h-8" onClick={() => {
                  if (!newRoom.name.trim()) return
                  addPlace({ place_id: slug(newRoom.name), kind: 'room', name: newRoom.name.trim(), branch_id: newRoom.branch || null, sort_order: 100 + rooms.length })
                  setNewRoom({ name: '', branch: '' })
                }}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
