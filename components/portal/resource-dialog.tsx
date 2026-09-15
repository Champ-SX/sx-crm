'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { type PortalResource, type PortalTier, createResource, updateResource, deleteResource } from '@/lib/supabase/portal'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  type: z.string().trim().optional(),
  th: z.string().trim().optional(),
  url: z.string().trim().url('Enter a valid URL').or(z.literal('')).optional(),
  owner: z.string().trim().optional(),
  tier: z.enum(['public', 'internal']),
  status: z.string().trim().optional(),
})
type FormValues = z.infer<typeof schema>

export interface ResourceDraft {
  resource?: PortalResource            // present → edit; absent → create
  company: string
  section: string
  tier: PortalTier
  name?: string                        // prefill for "+ Add link" on a known row
}

export function ResourceDialog({ draft, onClose, onSaved }: { draft: ResourceDraft; onClose: () => void; onSaved: () => void }) {
  const editing = draft.resource
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editing?.name ?? draft.name ?? '',
      type: editing?.type ?? '',
      th: editing?.th ?? '',
      url: editing?.url ?? '',
      owner: editing?.owner ?? '',
      tier: editing?.tier ?? draft.tier,
      status: editing?.status ?? 'active',
    },
  })
  const tier = watch('tier')

  async function onSubmit(v: FormValues) {
    const base = {
      company: draft.company, section: draft.section, tier: v.tier,
      name: v.name.trim(), type: v.type?.trim() || null, th: v.th?.trim() || null,
      url: v.url?.trim() || null, owner: v.owner?.trim() || null,
      status: v.status?.trim() || (v.url?.trim() ? 'active' : 'to add'),
      sort: editing?.sort ?? 99,
    }
    if (editing) await updateResource(editing.id, base)
    else await createResource(base)
    onSaved()
  }

  async function remove() {
    if (!editing) return
    if (!window.confirm(`Delete “${editing.name}”?`)) return
    await deleteResource(editing.id)
    onSaved()
  }

  const label = 'block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <DialogTitle className="text-[15px] font-bold">{editing ? 'Edit resource' : 'Add resource'}</DialogTitle>
          <span className="font-mono text-[11px] text-muted-foreground">· {draft.section}</span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-3">
          <div>
            <label className={label}>Name *</label>
            <Input {...register('name')} placeholder="FlowAccount" className="h-9" />
            {errors.name && <p className="text-[12px] text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Type</label><Input {...register('type')} placeholder="Accounting" className="h-9" /></div>
            <div><label className={label}>Owner</label><Input {...register('owner')} placeholder="Finance" className="h-9" /></div>
          </div>
          <div>
            <label className={label}>URL</label>
            <Input {...register('url')} placeholder="https://…" className="h-9" />
            {errors.url && <p className="text-[12px] text-destructive mt-1">{errors.url.message}</p>}
          </div>
          <div>
            <label className={label}>Thai gloss <span className="normal-case font-normal text-muted-foreground/70">· optional</span></label>
            <Input {...register('th')} placeholder="เอกสาร บริษัท" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Visibility</label>
              <Select value={tier} onValueChange={(v) => { if (v) setValue('tier', v as PortalTier) }}>
                <SelectTrigger className="h-9 w-full text-[13px]"><span className="capitalize">{tier}</span></SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className={label}>Status</label><Input {...register('status')} placeholder="active" className="h-9" /></div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            {editing && <button type="button" onClick={remove} className="text-destructive hover:opacity-80 text-sm mr-auto">Delete</button>}
            <Button type="button" variant="outline" size="sm" className={editing ? '' : 'ml-auto'} onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#FF5B3F] hover:opacity-90 text-white">{editing ? 'Save' : 'Add'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
