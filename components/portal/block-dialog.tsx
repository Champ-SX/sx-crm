'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { type PortalDetailBlock, type PortalDetailLine, type PortalTier, createBlock, updateBlock, deleteBlock } from '@/lib/supabase/portal'

const ICON_OPTIONS = ['file-invoice', 'truck-delivery', 'building', 'credit-card', 'bank', 'mail']

export interface BlockDraft { block?: PortalDetailBlock; company: string }

export function BlockDialog({ draft, onClose, onSaved }: { draft: BlockDraft; onClose: () => void; onSaved: () => void }) {
  const editing = draft.block
  const [title, setTitle] = useState(editing?.title ?? '')
  const [th, setTh] = useState(editing?.th ?? '')
  const [tier, setTier] = useState<PortalTier>(editing?.tier ?? 'internal')
  const [icon, setIcon] = useState(editing?.icon ?? 'file-invoice')
  const [heading, setHeading] = useState(editing?.heading ?? '')
  const [subheading, setSubheading] = useState(editing?.subheading ?? '')
  const [lines, setLines] = useState<PortalDetailLine[]>(editing?.lines?.length ? editing.lines.map((l) => ({ ...l })) : [{ label: '', value: '' }])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const setLine = (i: number, patch: Partial<PortalDetailLine>) => setLines((ls) => ls.map((l, j) => j === i ? { ...l, ...patch } : l))
  const addLine = () => setLines((ls) => [...ls, { label: '', value: '' }])
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i))

  async function save() {
    if (!title.trim()) { setErr('Title is required'); return }
    const cleanLines = lines.map((l) => ({ label: l.label.trim(), value: l.value.trim() })).filter((l) => l.value)
    setBusy(true)
    try {
      const base = {
        company: draft.company, tier, title: title.trim(), th: th.trim() || null, icon,
        heading: heading.trim() || null, subheading: subheading.trim() || null,
        lines: cleanLines, sort: editing?.sort ?? 99,
      }
      if (editing) await updateBlock(editing.id, base)
      else await createBlock(base)
      onSaved()
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!editing) return
    if (!window.confirm(`Delete block “${editing.title}”?`)) return
    await deleteBlock(editing.id)
    onSaved()
  }

  const label = 'block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <DialogTitle className="text-[15px] font-bold">{editing ? 'Edit detail block' : 'Add detail block'}</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className={label}>Title *</label>
              <Input value={title} onChange={(e) => { setTitle(e.target.value); setErr('') }} placeholder="Document-header address" className="h-9" />
            </div>
            <div>
              <label className={label}>Visibility</label>
              <Select value={tier} onValueChange={(v) => { if (v) setTier(v as PortalTier) }}>
                <SelectTrigger className="h-9 w-[120px] text-[13px]"><span className="capitalize">{tier}</span></SelectTrigger>
                <SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="internal">Internal</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className={label}>Thai gloss <span className="normal-case font-normal text-muted-foreground/70">· optional</span></label>
            <Input value={th} onChange={(e) => setTh(e.target.value)} placeholder="ที่อยู่ออกหัวเอกสาร" className="h-9" />
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
            <div><label className={label}>Heading</label><Input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="บริษัท ซิกซีท กรุ๊ป จำกัด" className="h-9" /></div>
            <div><label className={label}>Subheading</label><Input value={subheading} onChange={(e) => setSubheading(e.target.value)} placeholder="SIXSHEET GROUP…" className="h-9" /></div>
            <div>
              <label className={label}>Icon</label>
              <Select value={icon} onValueChange={(v) => { if (v) setIcon(v) }}>
                <SelectTrigger className="h-9 w-[130px] text-[13px]"><span className="truncate">{icon}</span></SelectTrigger>
                <SelectContent>{ICON_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className={label}>Lines <span className="normal-case font-normal text-muted-foreground/70">· label + value, each copyable</span></label>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[130px_1fr_auto] gap-2 items-start">
                  <Input value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} placeholder="Tax ID · ภาษี" className="h-9" />
                  <Input value={l.value} onChange={(e) => setLine(i, { value: e.target.value })} placeholder="value…" className="h-9" />
                  <button type="button" onClick={() => removeLine(i)} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-destructive rounded-md border border-border" aria-label="Remove line"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button type="button" onClick={addLine} className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-[#FF5B3F] font-medium"><Plus className="w-4 h-4" /> Add line</button>
          </div>

          {err && <p className="text-[12px] text-destructive">{err}</p>}
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          {editing && <button type="button" onClick={remove} className="text-destructive hover:opacity-80 text-sm mr-auto">Delete</button>}
          <Button type="button" variant="outline" size="sm" className={editing ? '' : 'ml-auto'} onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" disabled={busy} className="bg-[#FF5B3F] hover:opacity-90 text-white" onClick={save}>{editing ? 'Save' : 'Add block'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
