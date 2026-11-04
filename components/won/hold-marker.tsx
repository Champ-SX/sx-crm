'use client'

import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { useCRMStore } from '@/store/crm-store'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import type { LeadOpportunity } from '@/types'

// Leads on Hold (very likely to win) shown on the Ops calendar — striped,
// read-only, never mistaken for a confirmed job. Info only: no equipment is reserved.

export const HOLD_STRIPES = 'repeating-linear-gradient(135deg, rgba(245,158,11,.10) 0 6px, rgba(245,158,11,.22) 6px 12px)'

/** Holds whose event date falls on `day`. */
export const holdsOn = (leads: LeadOpportunity[], day: string) =>
  leads.filter((l) => l.status === 'hold' && !l.is_archived && (l.event_date ?? '').slice(0, 10) === day)

export function HoldMarker({ lead }: { lead: LeadOpportunity }) {
  const router = useRouter()
  const requestOpenEntity = useCRMStore((s) => s.requestOpenEntity)
  const date = lead.event_date ? format(parseISO(lead.event_date.slice(0, 10)), 'EEE d MMM yyyy') : '—'
  const rows: [string, string | null | undefined][] = [
    ['Date', date], ['Venue', lead.venue], ['Product', lead.hold_product], ['Prepare', lead.hold_prepare],
    ['Hold until', lead.hold_until && format(parseISO(lead.hold_until), 'd MMM yyyy')], ['Sales', lead.owner],
  ]
  return (
    <Popover>
      <PopoverTrigger style={{ backgroundImage: HOLD_STRIPES }}
          className="w-full text-left rounded-md border border-dashed border-amber-500/70 border-l-4 px-1.5 py-1 text-[11px] leading-tight text-amber-900 dark:text-amber-200 min-w-0">
          <span className="font-mono text-[9.5px] font-bold tracking-wide">HOLD</span> <span className="font-semibold">{lead.hold_product || lead.service_type}</span>
          <span className="block truncate opacity-80">{[lead.customer_name || lead.name, lead.hold_prepare].filter(Boolean).join(' · ')}</span>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="flex items-center gap-2">
          <b className="text-[13px] min-w-0 truncate">{lead.name}</b>
          <span className="ml-auto shrink-0 rounded bg-amber-200 px-1.5 font-mono text-[9.5px] font-bold text-amber-900">NOT CONFIRMED</span>
        </div>
        <div className="mt-2 divide-y divide-border text-[12.5px]">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-1"><span className="text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>
          ))}
        </div>
        <button type="button" onClick={() => { requestOpenEntity('lead_opportunity', lead.lead_op_id); router.push('/leads-opportunities') }}
          className="mt-2 text-[12px] underline text-muted-foreground hover:text-foreground">Open the lead →</button>
      </PopoverContent>
    </Popover>
  )
}
