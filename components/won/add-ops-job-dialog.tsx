'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AssigneePicker } from '@/components/shared/assignee-picker'
import { useCRMStore } from '@/store/crm-store'
import { blankWonJobFields } from '@/lib/jobs'
import type { WonJob } from '@/types'

/** Next number in the OPS-01, OPS-02… series (own series, never clashes with client job #). */
export function nextOpsNumber(jobs: Pick<WonJob, 'job_number'>[]): string {
  const max = jobs.reduce((m, j) => {
    const n = /^OPS-(\d+)$/i.exec(j.job_number ?? '')?.[1]
    return n ? Math.max(m, parseInt(n, 10)) : m
  }, 0)
  return `OPS-${String(max + 1).padStart(2, '0')}`
}

/**
 * + Add job — internal Ops job straight onto Won & Ready (no lead, no deal
 * value, no per-job staff pay). Lands at the top of the first column.
 */
export function AddOpsJobDialog({ owner, onClose, onCreated }: { owner: string; onClose: () => void; onCreated: (jobId: string) => void }) {
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const addWonJob = useCRMStore((s) => s.addWonJob)
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [end, setEnd] = useState('')
  const [venue, setVenue] = useState('')
  const [need, setNeed] = useState('')
  const [assignees, setAssignees] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [tried, setTried] = useState(false)
  const number = nextOpsNumber(wonJobs)
  const endError = end && date && end < date ? 'End date is before the start date' : null
  const missing = !name.trim() ? 'Enter what the job is' : endError

  function create() {
    setTried(true)
    if (missing) return
    const now = new Date().toISOString()
    const needN = parseInt(need, 10)
    const job: WonJob = {
      ...blankWonJobFields(),
      job_id: crypto.randomUUID(),
      job_number: number,
      is_ops: true,
      board_id: activeBoardId ?? undefined,
      event_date: date || null,
      ...(end && end > date ? { event_end_date: end } : {}),
      product_name: name.trim(),
      // Clean canonical title — Ops jobs have no product type / category segments.
      event_display_name: [date ? date.replace(/-/g, '.') : null, number, `${name.trim()}${venue.trim() ? ` @${venue.trim()}` : ''}`].filter(Boolean).join(' - '),
      venue: venue.trim() || null,
      place: venue.trim() || null,
      job_detail_notes: notes.trim() || null,
      staff_needed: Number.isFinite(needN) && needN >= 0 ? needN : null,
      assignee_ids: assignees,
      customer_name: '',
      customer_id: '',
      lead_op_id: undefined,
      estimated_value: 0,
      owner,
      op_stage: 'WON_JOB_LIST',
      position: -1,
      created_at: now,
      updated_at: now,
    }
    void addWonJob(job)
    onCreated(job.job_id)
  }

  const label = 'text-[11px] font-medium tracking-wide text-muted-foreground mb-1.5 block'
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <div>
          <DialogTitle>New Ops job</DialogTitle>
          <p className="text-[12px] text-muted-foreground mt-1">
            Internal operation task — no lead, no value, no per-job staff payment. Number <span className="font-mono font-semibold text-foreground">{number}</span>.
          </p>
        </div>

        <div>
          <span className={label}>JOB / TASK</span>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Booth maintenance round — Siam Paragon" className="text-[14px]" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <span className={label}>DATE</span>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div>
            <span className={label}>END DATE <span className="font-normal">(optional)</span></span>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="h-9 text-[13px]" />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_110px] gap-2.5">
          <div>
            <span className={label}>VENUE</span>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Warehouse / venue" className="h-9 text-[13px]" />
          </div>
          <div>
            <span className={label}>STAFF NEEDED</span>
            <Input type="number" min={0} value={need} onChange={(e) => setNeed(e.target.value)} placeholder="—" className="h-9 text-[13px]" />
          </div>
        </div>
        <div>
          <span className={label}>ASSIGN (Operation)</span>
          <AssigneePicker value={assignees} onChange={setAssignees} />
        </div>
        <div>
          <span className={label}>NOTES <span className="font-normal">(รายละเอียดงาน)</span></span>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="text-[13px]" placeholder="What needs doing…" />
        </div>

        {tried && missing && <p className="text-[13px] text-destructive -mt-2">{missing}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={create}>Create Ops job</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
