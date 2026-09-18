'use client'

import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { type PortalDocument, type PortalTier, createDocument, updateDocument, deleteDocument, uploadDoc } from '@/lib/supabase/portal'

export interface DocDraft { doc?: PortalDocument; company: string }

export function DocDialog({ draft, onClose, onSaved }: { draft: DocDraft; onClose: () => void; onSaved: () => void }) {
  const editing = draft.doc
  const [name, setName] = useState(editing?.name ?? '')
  const [tier, setTier] = useState<PortalTier>(editing?.tier ?? 'internal')
  const [file, setFile] = useState<File | null>(null)
  const [existingName, setExistingName] = useState(editing?.file_name ?? null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) { setFile(files[0]); if (!name.trim()) setName(files[0].name.replace(/\.[^.]+$/, '')) } },
    multiple: false,
  })

  async function save() {
    if (!name.trim()) { setErr('Name is required'); return }
    setBusy(true)
    try {
      let file_path = editing?.file_path ?? null
      let file_name = existingName
      if (file) { const up = await uploadDoc(draft.company, file); file_path = up.path; file_name = up.fileName }
      const base = { company: draft.company, tier, name: name.trim(), file_path, file_name, sort: editing?.sort ?? 99 }
      if (editing) await updateDocument(editing.id, base)
      else await createDocument(base)
      onSaved()
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!editing) return
    if (!window.confirm(`Delete “${editing.name}”?`)) return
    await deleteDocument(editing.id)
    onSaved()
  }

  const label = 'block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1'
  const chosen = file?.name ?? existingName

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <DialogTitle className="text-[15px] font-bold">{editing ? 'Edit document' : 'Add document'}</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={label}>Name *</label>
            <Input value={name} onChange={(e) => { setName(e.target.value); setErr('') }} placeholder="หนังสือรับรองบริษัท 2569" className="h-9" />
          </div>
          <div>
            <label className={label}>File</label>
            <div {...getRootProps()} className={`flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-3 cursor-pointer text-sm ${isDragActive ? 'border-[#7A5AA5] bg-muted/40' : 'border-border hover:bg-muted/30'}`}>
              <input {...getInputProps()} />
              {chosen ? <Check className="w-4 h-4 text-emerald-600" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
              <span className={chosen ? 'text-foreground' : 'text-muted-foreground'}>{chosen ? chosen : (isDragActive ? 'Drop the file…' : 'Click or drop a PDF / image')}</span>
            </div>
            {editing && existingName && !file && <p className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1"><FileText className="w-3 h-3" /> current file kept unless you choose a new one</p>}
          </div>
          <div className="w-40">
            <label className={label}>Visibility</label>
            <Select value={tier} onValueChange={(v) => { if (v) setTier(v as PortalTier) }}>
              <SelectTrigger className="h-9 w-full text-[13px]"><span className="capitalize">{tier}</span></SelectTrigger>
              <SelectContent><SelectItem value="public">Public</SelectItem><SelectItem value="internal">Internal</SelectItem></SelectContent>
            </Select>
          </div>
          {err && <p className="text-[12px] text-destructive">{err}</p>}
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          {editing && <button type="button" onClick={remove} className="text-destructive hover:opacity-80 text-sm mr-auto">Delete</button>}
          <Button type="button" variant="outline" size="sm" className={editing ? '' : 'ml-auto'} onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" disabled={busy} className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={save}>{busy ? 'Saving…' : editing ? 'Save' : 'Add'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
