import type { Activity, LeadOpportunity, WonJob } from '@/types'

// Dashboard insights: lost reasons, lead sources, and the pure calculations
// behind the Operation / Sales / Admin cards. No React, no Supabase.

export const LOST_REASONS = ['Price too high', 'Date not available', 'No budget / cancelled', 'Chose a competitor', 'No reply', 'Other'] as const
export const LEAD_SOURCES = ['LINE OA', 'Website', 'Repeat client', 'Referral', 'Agency', 'Instagram / FB', 'Other'] as const

export const READY_WINDOW_DAYS = 14   // readiness list looks this far ahead
export const URGENT_DAYS = 3          // red when the event is this close and something is missing
export const CLOSING_GRACE_DAYS = 7   // a finished event should be closed within this
export const STALE_DAYS = 7           // open lead with no activity this long needs a follow-up
export const MIN_CLOSED = 5           // win rate shows "—" below this many closed deals

const DAY = 86_400_000
/** Today's date in Bangkok as YYYY-MM-DD. */
export const bkkToday = (now = new Date()) => new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)
export const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY)

// Stages at or past "event done" — the job no longer needs prep.
const AFTER_EVENT = ['OP_EVENT_DONE', 'OP_WAIT_STAFF_PAYMENT_DOC_TERR', 'OP_DONE_PAYMENT']

/** Jobs with an event in the next 14 days (today included), soonest first. */
export function upcomingJobs(jobs: WonJob[], today: string): (WonJob & { daysLeft: number })[] {
  return jobs
    .filter((j) => !j.is_archived && j.event_date && !AFTER_EVENT.includes(j.op_stage))
    .map((j) => ({ ...j, daysLeft: daysBetween(today, j.event_date as string) }))
    .filter((j) => j.daysLeft >= 0 && j.daysLeft <= READY_WINDOW_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

export interface Readiness { staff: { have: number; need: number | null }; packed: { done: number; total: number } | null; missing: string[]; ready: boolean }
/** What's still missing for a job: staff short, equipment not packed / no product. */
export function readinessOf(job: WonJob, packed: { done: number; total: number } | null): Readiness {
  const have = (job.staff_list ?? []).length
  const need = job.staff_needed ?? null
  const missing: string[] = []
  if (need != null && have < need) missing.push('staff')
  if (job.is_ops) { /* internal jobs: no equipment expectation */ }
  else if (!packed || packed.total === 0) missing.push('equipment')
  else if (packed.done < packed.total) missing.push('equipment')
  return { staff: { have, need }, packed, missing, ready: missing.length === 0 }
}

/** Events that happened but the job isn't closed (paid + done). Overdue after 7 days. */
export function closingJobs(jobs: WonJob[], today: string): (WonJob & { daysSince: number; overdue: boolean; unpaid: number; unpaidThb: number })[] {
  return jobs
    .filter((j) => !j.is_archived && j.op_stage !== 'OP_DONE_PAYMENT' && (j.event_end_date || j.event_date))
    .map((j) => {
      const daysSince = daysBetween((j.event_end_date || j.event_date) as string, today)
      const staff = j.staff_list ?? []
      const unpaidList = j.is_ops ? [] : staff.filter((s) => !s.paid)
      return { ...j, daysSince, overdue: daysSince > CLOSING_GRACE_DAYS, unpaid: unpaidList.length, unpaidThb: unpaidList.reduce((n, s) => n + (s.fee_thb || 0), 0) }
    })
    .filter((j) => j.daysSince > 0)
    .sort((a, b) => b.daysSince - a.daysSince)
}

/** Last activity time per lead (falls back to the lead's own updated/created time). */
export function lastTouch(lead: LeadOpportunity, activities: Activity[]): string {
  let t = lead.updated_at || lead.created_at
  for (const a of activities) if (a.entity_id === lead.lead_op_id && a.created_at > t) t = a.created_at
  return t
}

/** Open / negotiating leads with no activity for 7+ days, longest silence first. */
export function staleLeads(leads: LeadOpportunity[], activities: Activity[], now = new Date()): (LeadOpportunity & { idleDays: number })[] {
  const byLead = new Map<string, Activity[]>()
  for (const a of activities) if (a.entity_type === 'lead_opportunity') byLead.set(a.entity_id, [...(byLead.get(a.entity_id) ?? []), a])
  return leads
    .filter((l) => !l.is_archived && (l.status === 'open' || l.status === 'negotiating'))
    .map((l) => ({ ...l, idleDays: Math.floor((now.getTime() - Date.parse(lastTouch(l, byLead.get(l.lead_op_id) ?? []))) / DAY) }))
    .filter((l) => l.idleDays >= STALE_DAYS)
    .sort((a, b) => b.idleDays - a.idleDays)
}

export type WinGroup = 'service' | 'owner' | 'size' | 'source'
export const sizeBand = (v: number) => (v < 30_000 ? 'Under ฿30k' : v < 80_000 ? '฿30–80k' : v < 150_000 ? '฿80–150k' : 'Over ฿150k')
const SIZE_ORDER = ['Under ฿30k', '฿30–80k', '฿80–150k', 'Over ฿150k']

/** Win rate = won / (won + lost) per group, over leads closed since `since`. Rate is null below MIN_CLOSED. */
export function winRates(leads: LeadOpportunity[], by: WinGroup, since: string): { key: string; won: number; lost: number; rate: number | null }[] {
  const keyOf = (l: LeadOpportunity) =>
    by === 'service' ? l.service_type || '—' : by === 'owner' ? l.owner || '—' : by === 'size' ? sizeBand(l.estimated_value || 0) : l.source || 'Not set'
  const m = new Map<string, { won: number; lost: number }>()
  for (const l of leads) {
    if ((l.status !== 'won' && l.status !== 'lost') || (l.updated_at || l.created_at) < since) continue
    const k = keyOf(l)
    const g = m.get(k) ?? { won: 0, lost: 0 }
    if (l.status === 'won') g.won++; else g.lost++
    m.set(k, g)
  }
  const rows = [...m].map(([key, g]) => ({ key, ...g, rate: g.won + g.lost >= MIN_CLOSED ? g.won / (g.won + g.lost) : null }))
  return by === 'size'
    ? rows.sort((a, b) => SIZE_ORDER.indexOf(a.key) - SIZE_ORDER.indexOf(b.key))
    : rows.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || (b.won + b.lost) - (a.won + a.lost))
}

/** Count of lost leads per reason (only leads that have one). */
export function lostReasons(leads: LeadOpportunity[]): { reason: string; n: number }[] {
  const m = new Map<string, number>()
  for (const l of leads) if (l.status === 'lost' && l.lost_reason) m.set(l.lost_reason, (m.get(l.lost_reason) ?? 0) + 1)
  return [...m].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n)
}
