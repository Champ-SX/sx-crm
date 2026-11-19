// Won jobs / Leads → booth periods, for Insights. Pure logic (no I/O) — see lib/supabase/sales.ts for fetching.
import { boothCodesIn, eventLabel, machineOf } from './machines'

export interface WonJobLite {
  job_id: string; job_number: string | null; event_date: string | null; event_end_date: string | null
  product_name: string | null; event_display_name: string | null; venue: string | null
  value_type: string | null; gp_share_pct: number | null; is_ops?: boolean | null; is_archived?: boolean | null
}
export interface LeadLite { lead_op_id: string; name: string | null; event_date: string | null; venue: string | null; status: string | null; value_type: string | null; gp_share_pct: number | null }

export interface BoothEvent {
  id: string; job: string; from: string; to: string; days: number
  booths: number[]; label: string; venue: string | null; title: string
  deal: 'fixed' | 'gp_share' | 'other'; gp: number | null
}
export interface CheckItem { id: string; job: string; what: string; title: string }

const DAY = 864e5
export const addDays = (iso: string, n: number) => new Date(Date.parse(iso + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10)
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY) + 1
const titleDate = (t: string | null) => { const m = /^(\d{4})\.(\d{2})\.(\d{2})/.exec(t ?? ''); return m ? `${m[1]}-${m[2]}-${m[3]}` : null }

/** Won jobs that name a booth → event periods, plus anything that needs a person to check. */
export function eventsFromJobs(jobs: WonJobLite[]): { events: BoothEvent[]; checks: CheckItem[] } {
  const events: BoothEvent[] = [], checks: CheckItem[] = []
  for (const j of jobs) {
    if (j.is_ops || /^OPS/i.test(j.job_number ?? '')) continue
    const a = boothCodesIn(j.product_name), b = boothCodesIn(j.event_display_name)
    if (!a.length && !b.length) continue                       // LCA / services: not a sales booth
    const job = j.job_number ?? '—'
    const title = j.event_display_name || j.product_name || ''
    // The event name is the field people keep up to date; the title keeps old codes. Use the event name's
    // booths when it has any, else the title's. Disagreements still go to the check list.
    const pick = b.some((c) => c.known) ? b : a
    const known = [...new Set(pick.filter((c) => c.known).map((c) => c.no))].sort((x, y) => x - y)
    const unknown = [...a, ...b].filter((c) => !c.known).map((c) => c.code)
    const sa = a.filter((c) => c.known).map((c) => c.no).sort().join(','), sb = b.filter((c) => c.known).map((c) => c.no).sort().join(',')
    if (unknown.length) checks.push({ id: j.job_id, job, title, what: `Booth code ${[...new Set(unknown)].join(', ')} isn't in the machine sheet` })
    else if (a.length && b.length && sa !== sb) checks.push({ id: j.job_id, job, title, what: `Title says ${a.map((c) => c.code).join(', ')}, event name says ${b.map((c) => c.code).join(', ')}` })
    if (!j.event_date) { checks.push({ id: j.job_id, job, title, what: 'No event date on the job' }); continue }
    const td = titleDate(j.event_display_name) ?? titleDate(j.product_name)
    if (td && td !== j.event_date) checks.push({ id: j.job_id, job, title, what: `Title dated ${td}, event date ${j.event_date}` })
    if (!known.length) continue
    const from = j.event_date, to = j.event_end_date && j.event_end_date >= from ? j.event_end_date : from
    events.push({
      id: j.job_id, job, from, to, days: daysBetween(from, to), booths: known, title,
      label: eventLabel(title), venue: j.venue, gp: j.gp_share_pct,
      deal: j.value_type === 'gp_share' ? 'gp_share' : j.value_type === 'fixed' ? 'fixed' : 'other',
    })
  }
  // Same booth on two jobs whose dates overlap
  for (let i = 0; i < events.length; i++) for (let k = i + 1; k < events.length; k++) {
    const x = events[i], y = events[k]
    const shared = x.booths.filter((n) => y.booths.includes(n))
    if (shared.length && x.from <= y.to && y.from <= x.to)
      checks.push({ id: `${x.id}|${y.id}`, job: `${x.job} + ${y.job}`, title: `${x.label} / ${y.label}`, what: `${shared.map((n) => machineOf(n)?.code).join(', ')} booked on both (${x.from}–${x.to} and ${y.from}–${y.to})` })
  }
  return { events: events.sort((p, q) => q.from.localeCompare(p.from)), checks }
}

/** Event (if any) a booth was at on a date. */
export function eventAt(events: BoothEvent[], machine: number | null, date: string): BoothEvent | undefined {
  if (machine == null) return undefined
  return events.find((e) => e.booths.includes(machine) && date >= e.from && date <= e.to)
}

/** Middle-50% gross range for one event-day, from past event-days. null when < 5 comparable days. */
export function dayRange(samples: number[]): { lo: number; mid: number; hi: number; n: number } | null {
  if (samples.length < 5) return null
  const s = [...samples].sort((a, b) => a - b), q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]
  return { lo: q(0.25), mid: q(0.5), hi: q(0.75), n: s.length }
}
