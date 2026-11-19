'use client'

// Insights › Booths & events: sales by booth type (machine sheet), each Won event job
// matched to its booth's payments, event booth calendar, Lead forecasts, and a check list.
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { fmtTHB } from '@/lib/sales/report'
import type { StoredSale } from '@/lib/supabase/sales'
import { fetchLeadsLite, fetchMachineSales, fetchWonJobsLite } from '@/lib/supabase/sales'
import { BOOTH_TYPES, MACHINES, boothCodesIn, eventLabel, machineOf, typeOf } from '@/lib/sales/machines'
import { addDays, dayRange, daysBetween, eventAt, eventsFromJobs, type BoothEvent, type CheckItem, type LeadLite, type WonJobLite } from '@/lib/sales/events'

const lbl = 'font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'
const card = 'rounded-xl border border-border bg-card p-4'
const EVENT_NOS = MACHINES.filter((m) => m.type === 'event').map((m) => m.no)
const fmtD = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const span = (a: string, b: string) => (a === b ? fmtD(a) : `${fmtD(a)} – ${fmtD(b)}`)
const k = (s: number) => { const b = s / 100; return b >= 1e6 ? `฿${(b / 1e6).toFixed(2)}M` : b >= 1e3 ? `฿${(b / 1e3).toFixed(0)}k` : `฿${b.toFixed(0)}` }
const Code = ({ children, warn }: { children: React.ReactNode; warn?: boolean }) =>
  <span className={cn('mr-1 whitespace-nowrap rounded px-1.5 py-px font-mono text-[11px]', warn ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200' : 'bg-muted')}>{children}</span>
const Deal = ({ e }: { e: { deal: string; gp: number | null } }) =>
  e.deal === 'gp_share'
    ? <span className="whitespace-nowrap rounded-full bg-orange-100 px-2 py-px text-[11px] text-orange-800 dark:bg-orange-500/15 dark:text-orange-200">GP{e.gp != null ? ` ${e.gp}%` : ''}</span>
    : <span className="whitespace-nowrap rounded-full bg-muted px-2 py-px text-[11px] text-muted-foreground">{e.deal === 'fixed' ? 'Fixed' : '—'}</span>

export function BoothInsights({ rows, month, today }: { rows: StoredSale[]; month: string; today: string }) {
  const [jobs, setJobs] = useState<WonJobLite[] | null>(null)
  const [leads, setLeads] = useState<LeadLite[]>([])
  const [hist, setHist] = useState<{ machine: number; biz_date: string; amount_satang: number }[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const histFrom = addDays(today, -365)
  useEffect(() => {
    let on = true
    Promise.all([fetchWonJobsLite(), fetchLeadsLite().catch(() => []), fetchMachineSales(EVENT_NOS, histFrom, addDays(today, 60))])
      .then(([j, l, h]) => { if (on) { setJobs(j); setLeads(l); setHist(h) } })
      .catch((e) => on && setErr(e instanceof Error ? e.message : String(e)))
    return () => { on = false }
  }, [histFrom, today])

  const [y, m] = month.split('-').map(Number)
  const mFrom = `${month}-01`, mTo = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  const { events, checks } = useMemo(() => (jobs ? eventsFromJobs(jobs) : { events: [] as BoothEvent[], checks: [] as CheckItem[] }), [jobs])

  // ① by booth type (this month)
  const byType = useMemo(() => {
    const t = new Map<string, { g: number; n: number; days: Set<string>; booths: Set<number> }>()
    for (const r of rows) {
      const id = typeOf(r.machine)
      const x = t.get(id) ?? { g: 0, n: 0, days: new Set<string>(), booths: new Set<number>() }
      x.g += r.amount_satang; x.n++; if (r.machine != null) { x.days.add(`${r.machine}|${r.biz_date}`); x.booths.add(r.machine) }
      t.set(id, x)
    }
    return t
  }, [rows])

  // Event-booth sales by machine+date (history covers this month too)
  const evDay = useMemo(() => {
    const mp = new Map<string, { g: number; n: number }>()
    for (const r of hist ?? []) { const key = `${r.machine}|${r.biz_date}`; const x = mp.get(key) ?? { g: 0, n: 0 }; x.g += r.amount_satang; x.n++; mp.set(key, x) }
    return mp
  }, [hist])
  const statOf = (e: BoothEvent) => {
    let g = 0, n = 0
    for (const b of e.booths) for (let d = e.from; d <= e.to; d = addDays(d, 1)) { const x = evDay.get(`${b}|${d}`); if (x) { g += x.g; n += x.n } }
    return { g, n, perDay: g / Math.max(1, e.days * e.booths.length) }
  }
  const monthEvents = events.filter((e) => e.from <= mTo && e.to >= mFrom)

  // Event-day samples (past events only) for forecasts, by deal type
  // Past events only. Free-play events (no payments at all) are counted separately, not as ฿0 days,
  // so a forecast says "usually free play" instead of a ฿0–฿0 range.
  const samples = useMemo(() => {
    const s: Record<string, number[]> = { gp_share: [], fixed: [], other: [] }
    const ev: Record<string, { paid: number; free: number }> = { gp_share: { paid: 0, free: 0 }, fixed: { paid: 0, free: 0 }, other: { paid: 0, free: 0 } }
    const byBooth = new Map<number, number[]>()
    for (const e of events) if (e.to < today) {
      const days: [number, number][] = []
      for (const b of e.booths) for (let d = e.from; d <= e.to; d = addDays(d, 1)) days.push([b, evDay.get(`${b}|${d}`)?.g ?? 0])
      if (!days.some(([, g]) => g > 0)) { ev[e.deal].free++; continue }
      ev[e.deal].paid++
      for (const [b, g] of days) { s[e.deal].push(g); byBooth.set(b, [...(byBooth.get(b) ?? []), g]) }
    }
    return { s, byBooth, ev }
  }, [events, evDay, today])
  const forecasts = leads
    .filter((l) => l.event_date && l.event_date >= today && !/^(won|lost)$/i.test(l.status ?? ''))
    .map((l) => {
      const booths = boothCodesIn(l.name).filter((c) => c.known && machineOf(c.no)?.type === 'event')
      const deal = l.value_type === 'gp_share' ? 'gp_share' : l.value_type === 'fixed' ? 'fixed' : 'other'
      const own = booths.length === 1 ? samples.byBooth.get(booths[0].no) ?? [] : []
      const r = dayRange(own.length >= 5 ? own : samples.s[deal])
      const c = samples.ev[deal], freeShare = c.paid + c.free ? c.free / (c.paid + c.free) : 0
      const kind = deal === 'gp_share' ? 'GP-share' : deal === 'fixed' ? 'fixed-fee' : ''
      return { l, booths, deal, r, freeShare, basis: own.length >= 5 ? `${own.length} past ${booths[0].code} event-days with sales` : `${samples.s[deal].length} past ${kind} event-days with sales`,
        freeNote: c.free ? `${c.free} of ${c.paid + c.free} past ${kind} events were free play` : '' }
    })
    .filter((f) => f.booths.length)
    .sort((a, b) => a.l.event_date!.localeCompare(b.l.event_date!))

  // Event booths selling outside any job's dates (this month)
  const outside = useMemo(() => {
    const mp = new Map<number, { n: number; g: number; days: Set<string> }>()
    for (const r of rows) if (typeOf(r.machine) === 'event' && !eventAt(events, r.machine, r.biz_date)) {
      const x = mp.get(r.machine!) ?? { n: 0, g: 0, days: new Set<string>() }; x.n++; x.g += r.amount_satang; x.days.add(r.biz_date); mp.set(r.machine!, x)
    }
    return [...mp.entries()].sort((a, b) => b[1].g - a[1].g)
  }, [rows, events])

  const monthDays = daysBetween(mFrom, mTo)
  const laneBooths = [...new Set(monthEvents.flatMap((e) => e.booths))].sort((a, b) => a - b)
  const relevantChecks = checks.filter((c) => jobs?.some((j) => c.id.split('|').includes(j.job_id) && (j.event_date ?? '') >= addDays(mFrom, -31)))

  return (
    <div className="space-y-4">
      <p className={cn(lbl, 'pt-2')}>BOOTHS &amp; EVENTS</p>
      {err && <p className="text-[12.5px] text-red-600">{err}</p>}

      {/* ① type tiles */}
      <div className={card}>
        <p className={cn(lbl, 'mb-2')}>BY BOOTH TYPE — FROM THE MACHINE SHEET</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
          {BOOTH_TYPES.map((t) => {
            const x = byType.get(t.id)
            return (
              <div key={t.id} className="rounded-lg border border-border border-t-4 px-3 py-2" style={{ borderTopColor: t.color }}>
                <b className="block text-[18px] tabular-nums">{x ? k(x.g) : '฿0'}</b>
                <span className="block text-[12px] font-medium">{t.label}</span>
                <span className="block text-[11px] text-muted-foreground">{t.sub}</span>
                {x && <span className="mt-0.5 block text-[11px] text-muted-foreground tabular-nums">{x.booths.size} booth{x.booths.size === 1 ? "" : "s"} · {fmtTHB(Math.round(x.g / Math.max(1, x.days.size)))} / booth-day</span>}
              </div>
            )
          })}
        </div>
        <p className="mt-2 text-[11.5px] text-muted-foreground">“Booth-day” = a day a booth had at least one payment, so a 2-day event and a store open all month compare fairly.</p>
      </div>

      {/* ② events */}
      <div className={cn(card, 'overflow-x-auto')}>
        <p className={cn(lbl, 'mb-2')}>EVENTS THIS MONTH — WON JOBS × THEIR BOOTH&apos;S PAYMENTS ON THE EVENT DATES</p>
        {!jobs ? <p className="text-[12.5px] text-muted-foreground">Loading Won jobs…</p> : monthEvents.length === 0 ? <p className="text-[12.5px] text-muted-foreground">No Won jobs with a booth code this month.</p> : (
          <table className="w-full min-w-[760px] text-[12.5px] tabular-nums">
            <thead className="text-[11px] text-muted-foreground"><tr><th className="py-1 text-left">Dates</th><th className="text-left">Job</th><th className="text-left">Booth</th><th className="text-left">Event @ venue</th><th className="text-left">Deal</th><th className="text-right">Payments</th><th className="text-right">Gross</th><th className="text-right">Per booth-day</th></tr></thead>
            <tbody>{monthEvents.map((e) => {
              const s = statOf(e), future = e.from > today
              const clash = events.filter((o) => o.id !== e.id && o.booths.some((b) => e.booths.includes(b)) && o.from <= e.to && e.from <= o.to)
              return (
                <tr key={e.id} className="border-t border-border/60 align-top">
                  <td className="py-1.5 pr-2 whitespace-nowrap">{span(e.from, e.to)}</td>
                  <td className="pr-2">{e.job}</td>
                  <td className="pr-2">{e.booths.map((b) => <Code key={b}>{machineOf(b)?.code}</Code>)}</td>
                  <td className="pr-2 max-w-[320px]">{e.label}{clash.length > 0 && <span className="block text-[11px] text-amber-700 dark:text-amber-300">⚠ same booth &amp; dates as job {clash.map((o) => o.job).join(', ')} — payments counted in both</span>}</td>
                  <td className="pr-2"><Deal e={e} /></td>
                  <td className="text-right">{future ? '—' : s.n.toLocaleString()}</td>
                  <td className="text-right">{future ? <span className="text-muted-foreground">upcoming</span> : fmtTHB(s.g)}</td>
                  <td className="text-right">{future ? '—' : s.n === 0 && e.deal === 'fixed' ? <span className="text-muted-foreground">free play</span> : fmtTHB(Math.round(s.perDay))}</td>
                </tr>
              )
            })}</tbody>
          </table>
        )}
        <p className="mt-2 text-[11.5px] text-muted-foreground">Fixed-fee events often run as free play, so ฿0 there is normal. GP-share events are where booth sales matter.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ③ calendar */}
        <div className={card}>
          <p className={cn(lbl, 'mb-2')}>EVENT BOOTH CALENDAR</p>
          {laneBooths.length === 0 ? <p className="text-[12.5px] text-muted-foreground">No event bookings this month.</p> : (
            <div className="space-y-1">
              {laneBooths.map((b) => (
                <div key={b} className="grid grid-cols-[110px_1fr] items-center gap-2">
                  <span className="truncate text-[11.5px]" title={machineOf(b)?.name}><Code>{machineOf(b)?.code}</Code></span>
                  <div className="relative h-6 rounded-md bg-muted/60">
                    {monthEvents.filter((e) => e.booths.includes(b)).map((e) => {
                      const a = e.from < mFrom ? mFrom : e.from, z = e.to > mTo ? mTo : e.to
                      const left = (daysBetween(mFrom, a) - 1) / monthDays * 100, w = daysBetween(a, z) / monthDays * 100
                      return <span key={e.id} title={`${e.label} · ${span(e.from, e.to)} · job ${e.job}`}
                        className={cn('absolute top-0.5 h-5 truncate rounded px-1.5 text-[10.5px] leading-5 text-white', e.deal === 'gp_share' ? 'bg-[#C8643B]' : 'bg-slate-400 dark:bg-slate-500')}
                        style={{ left: `${left}%`, width: `max(${w}%, 6px)` }}>{e.label}</span>
                    })}
                  </div>
                </div>
              ))}
              <div className="flex justify-between pl-[118px] text-[10.5px] text-muted-foreground"><span>{fmtD(mFrom)}</span><span>{fmtD(mTo)}</span></div>
            </div>
          )}
          <p className="mt-2 text-[11.5px] text-muted-foreground">Orange = GP share · grey = fixed fee. Hover a bar for the event and job.</p>
        </div>

        {/* ④ forecast */}
        <div className={card}>
          <p className={cn(lbl, 'mb-2')}>FORECAST FOR UPCOMING LEADS WITH A BOOTH CODE</p>
          {forecasts.length === 0 ? <p className="text-[12.5px] text-muted-foreground">No open Leads name an event booth yet.</p> : (
            <table className="w-full text-[12.5px]">
              <tbody>{forecasts.slice(0, 12).map((f) => (
                <tr key={f.l.lead_op_id} className="border-t border-border/60 align-top first:border-0">
                  <td className="py-1.5 pr-2">{eventLabel(f.l.name ?? '')}<span className="block text-[11px] text-muted-foreground">{fmtD(f.l.event_date!)} · {f.l.status}</span></td>
                  <td className="pr-2">{f.booths.map((b) => <Code key={b.code}>{b.code}</Code>)}<Deal e={{ deal: f.deal, gp: f.l.gp_share_pct }} /></td>
                  <td className="text-right tabular-nums">{f.r ? <><b>{k(f.r.lo * f.booths.length)}–{k(f.r.hi * f.booths.length)}</b><span className="block text-[11px] text-muted-foreground">per day if paid · {f.basis}</span></> : <span className="text-[11.5px] text-muted-foreground">not enough history ({f.basis})</span>}
                    {f.freeNote && <span className={cn('block text-[11px]', f.freeShare >= 0.5 ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-muted-foreground')}>{f.freeShare >= 0.5 ? 'usually free play — ' : ''}{f.freeNote}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <p className="mt-2 text-[11.5px] text-muted-foreground">Middle half of past event-days for the same booth (or the same deal type), × booths. Needs at least 5 past days.</p>
        </div>
      </div>

      {/* ⑤ checks */}
      {(relevantChecks.length > 0 || outside.length > 0) && (
        <div className={card}>
          <p className={cn(lbl, 'mb-2')}>PLEASE CHECK</p>
          <div className="space-y-1.5">
            {outside.map(([no, x]) => (
              <p key={`o${no}`} className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[12.5px] dark:bg-amber-500/10">
                <Code warn>{machineOf(no)?.code}</Code> sold {x.n} payment{x.n === 1 ? "" : "s"} ({fmtTHB(x.g)}) on {[...x.days].sort().map(fmtD).join(', ')} with <b>no Won job</b> for those dates — missing job, or wrong booth code?
              </p>
            ))}
            {relevantChecks.map((c) => (
              <p key={c.id + c.what} className="rounded-md bg-amber-50 px-2.5 py-1.5 text-[12.5px] dark:bg-amber-500/10">
                <b>Job {c.job}</b> · {c.what}<span className="block truncate text-[11px] text-muted-foreground" title={c.title}>{c.title}</span>
              </p>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-muted-foreground">Fix the booth code or dates on the Won job — this list updates by itself.</p>
        </div>
      )}
    </div>
  )
}
