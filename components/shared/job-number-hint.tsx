'use client'

import { useCRMStore } from '@/store/crm-store'
import { parseJobNumber, jobNumberOwner, nextFreeJobNumber, replaceJobNumber } from '@/lib/jobs'
import { fmtDate } from '@/lib/anf'

/** Under a lead title: warns when its job number is taken and offers the next free one. */
export function JobNumberHint({ title, selfLeadId, onChange }: { title: string; selfLeadId?: string | null; onChange: (title: string) => void }) {
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const leads = useCRMStore((s) => s.leadOpportunities)
  const num = parseJobNumber(title)
  if (!num) return null
  const owner = jobNumberOwner(num, wonJobs, leads, selfLeadId)
  if (!owner) return null
  const next = nextFreeJobNumber(wonJobs, leads.filter((l) => l.lead_op_id !== selfLeadId))
  return (
    <div className="mt-1.5 rounded-lg bg-amber-100 px-3 py-2 text-[12.5px] text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
      ⚠ <b>#{num} is already used</b> by “{owner.name}”{owner.date ? ` · ${fmtDate(owner.date)}` : ''} · {owner.kind === 'job' ? 'won job' : 'open lead'}
      <div className="mt-1.5 flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange(replaceJobNumber(title, next))} className="rounded-md bg-[#7A5AA5] px-2.5 py-1 text-[12px] font-semibold text-white">Use #{next} instead</button>
      </div>
    </div>
  )
}
