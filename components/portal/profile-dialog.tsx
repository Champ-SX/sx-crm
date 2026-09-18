'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { type PortalCompany, updateCompany } from '@/lib/supabase/portal'

const schema = z.object({
  tagline: z.string().trim().optional(),
  established: z.string().trim().optional(),
  sector: z.string().trim().optional(),
  hq: z.string().trim().optional(),
})
type FormValues = z.infer<typeof schema>

export function ProfileDialog({ company, onClose, onSaved }: { company: PortalCompany; onClose: () => void; onSaved: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tagline: company.tagline ?? '',
      established: company.established ?? '', sector: company.sector ?? '', hq: company.hq ?? '',
    },
  })

  async function onSubmit(v: FormValues) {
    await updateCompany(company.key, {
      tagline: v.tagline?.trim() || null,
      established: v.established?.trim() || null,
      sector: v.sector?.trim() || null,
      hq: v.hq?.trim() || null,
    })
    onSaved()
  }

  const label = 'block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <DialogTitle className="text-[15px] font-bold">Edit profile</DialogTitle>
          <span className="font-mono text-[11px] text-muted-foreground">· {company.name}</span>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-3">
          <div>
            <label className={label}>Tagline · ข้อมูลบริษัท</label>
            <Textarea {...register('tagline')} rows={2} className="text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={label}>Established · ก่อตั้งเมื่อ</label><Input {...register('established')} className="h-9" /></div>
            <div><label className={label}>Sector · ประเภทธุรกิจ</label><Input {...register('sector')} className="h-9" /></div>
            <div><label className={label}>HQ · สำนักงานใหญ่</label><Input {...register('hq')} className="h-9" /></div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-[#FF5B3F] hover:opacity-90 text-white">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
