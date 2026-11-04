'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { useBom } from '@/lib/supabase/bom'
import type { LeadOpportunity } from '@/types'

/** Mark a lead as Hold · จองไว้ — date is required; product + what to prepare show on the Ops calendar. */
export function HoldDialog({ lead, onClose, onSave }: {
  lead: LeadOpportunity; onClose: () => void
  onSave: (patch: Partial<LeadOpportunity>) => void
}) {
  const { products } = useBom()
  const [date, setDate] = useState((lead.event_date ?? '').slice(0, 10))
  const [product, setProduct] = useState(lead.hold_product ?? '')
  const [prepare, setPrepare] = useState(lead.hold_prepare ?? '')
  const [venue, setVenue] = useState(lead.venue ?? '')
  const [until, setUntil] = useState(lead.hold_until ?? '')
  const chip = (on: boolean) => `h-8 rounded-full border px-3 text-[12.5px] ${on ? 'border-foreground bg-foreground text-background font-semibold' : 'border-border hover:bg-muted'}`

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Hold this date? · จองวันไว้</DialogTitle>
          <DialogDescription>The client is holding the date and it&apos;s very likely to win. Ops will see it on their calendar (info only, nothing is reserved).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <p className="field-label">Event date *</p>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm w-48" />
          </div>
          <div>
            <p className="field-label">Event product</p>
            <div className="flex flex-wrap gap-1.5">
              {products.map((p) => <button key={p.product_id} type="button" onClick={() => setProduct(product === p.name ? '' : p.name)} className={chip(product === p.name)}>{p.name}</button>)}
            </div>
          </div>
          <div>
            <p className="field-label">What to prepare</p>
            <Input value={prepare} onChange={(e) => setPrepare(e.target.value)} placeholder="e.g. Passport 250 ชิ้น" className="h-9 text-sm" />
          </div>
          <div>
            <p className="field-label">Venue</p>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Splash Beach Resort, Phuket" className="h-9 text-sm" />
          </div>
          <div>
            <p className="field-label">Hold until (optional)</p>
            <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className="h-9 text-sm w-48" />
            <p className="mt-1 text-[11.5px] text-muted-foreground">The date the client should confirm or release it.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!date} className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => onSave({ status: 'hold', event_date: date, venue: venue.trim() || lead.venue, hold_product: product || null, hold_prepare: prepare.trim() || null, hold_until: until || null })}>
            Mark as Hold
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
