'use client'
import { GROUP_COLORS } from '@/lib/sales/groups'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { computeInsights, type Insights } from '@/lib/sales/insights'
import type { SaleRow } from '@/lib/sales/parse'

const baht = (s: number) => '฿' + Math.round(s / 100).toLocaleString('en-US')
const kb = (s: number) => { const b = s / 100; return b >= 1e6 ? `฿${(b / 1e6).toFixed(2)}M` : b >= 1e3 ? `฿${(b / 1e3).toFixed(1)}k` : `฿${Math.round(b)}` }
const fmtD = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`
const card = 'rounded-xl border border-border bg-card p-4 min-w-0'
const lbl = 'font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'
const h2 = 'font-mono text-[11px] font-semibold tracking-[0.08em] text-muted-foreground mt-6 mb-2'
const EV = '#E8A25A', PM = '#4F86D9', ACC = '#C8643B'
const GCOL = GROUP_COLORS
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Tip({ children }: { children: React.ReactNode }) {
  return <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">💡 {children}</div>
}

export function InsightsView({ rows, month }: { rows: SaleRow[]; month: string }) {
  const i = useMemo(() => computeInsights(rows, month), [rows, month])
  if (!i.n) return <p className="py-16 text-center text-[13px] text-muted-foreground">No sales this month yet — upload files in the Upload tab.</p>
  const partial = !!i.dataEnd && i.dataEnd < i.to
  return (
    <div>
      <p className="text-[13px] text-muted-foreground">Data {fmtD(i.from)} – {i.dataEnd ? fmtD(i.dataEnd) : '—'}{partial && ' (partial month)'} · {i.n.toLocaleString()} payments · Thai time</p>

      {/* 1 · Overview */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="GROSS" value={baht(i.gross)} note={i.eventGross ? `incl. event booths ${kb(i.eventGross)}` : `${i.coveredDays} days`} />
        <Kpi label="NET AFTER FEES" value={baht(i.net)} note={`fees ${baht(i.fees)} · ${pct(i.gross ? i.fees / i.gross : 0, 2)}`} />
        <Kpi label="PAYMENTS" value={i.n.toLocaleString()} note={`${Math.round(i.n / Math.max(1, i.coveredDays)).toLocaleString()} / day`} />
        <Kpi label="AVERAGE TICKET" value={`฿${(i.ticket / 100).toFixed(1)}`} note={`most common ${i.topPrices.slice(0, 2).map(([p]) => '฿' + p).join(' · ')}`} />
        <Kpi accent label={i.forecast.done ? 'MONTH TOTAL' : 'MONTH FORECAST'} value={i.forecast.done ? baht(i.gross) : `${kb(i.forecast.low)} – ${kb(i.forecast.high)}`}
          note={i.forecast.done ? 'complete month' : `expected ${kb(i.forecast.expected)} · permanent ${kb(i.permPerDay)}/day`} />
      </div>

      {/* 2 · Daily */}
      <p className={h2}>DAILY SALES · {i.eventMachines.length ? 'EVENT VS PERMANENT BOOTHS' : 'BY DAY'}</p>
      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <div className={card}>
          <div className="flex flex-wrap gap-3 text-[11.5px] text-muted-foreground">
            {i.eventMachines.length > 0 && <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: EV }} />Event booths {i.eventMachines.map((n) => '#' + n).join(' ')}</span>}
            <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: PM }} />Permanent booths</span>
            {partial && <span>┄ forecast</span>}
          </div>
          <DailyChart i={i} />
          {i.eventMachines.length > 0 && <Tip><b>Event booths {i.eventMachines.map((n) => '#' + n).join(', ')} sold {baht(i.eventGross)}</b> ({pct(i.eventGross / i.gross)} of the month) and then stopped. Without them, permanent booths run at about <b>{baht(i.permPerDay)} a day</b>. Plan the two separately.</Tip>}
        </div>
        <div className={card}>
          <p className={lbl}>BY CLIENT GROUP</p>
          <table className="mt-2 w-full text-[12.5px] tabular-nums">
            <thead className="text-[11px] text-muted-foreground"><tr><th className="py-1 text-left font-medium">Group</th><th className="text-right font-medium">Gross</th><th className="font-medium" /><th className="text-right font-medium">฿ / active machine</th></tr></thead>
            <tbody>{[...i.groups].filter((g) => g.n).sort((a, b) => b.satang - a.satang).map((g) => (
              <tr key={g.name} className="border-t border-border/60">
                <td className="py-1.5"><i className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: GCOL[g.name] }} />{g.name}</td>
                <td className="text-right">{kb(g.satang)}</td>
                <td className="w-[28%] px-2"><div className="h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full" style={{ width: pct(g.satang / i.gross), background: ACC }} /></div></td>
                <td className="text-right">{g.name === 'Unassigned' ? '–' : kb(g.satang / Math.max(1, g.active))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      {/* 3 · When + price */}
      <p className={h2}>WHEN PEOPLE PAY · DAY × HOUR (THAI TIME)</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={card}>
          <Heatmap i={i} />
          <Tip><b>Sat + Sun = {pct(i.weekendShare)} of sales</b>{i.peakHour != null && <>, peak around <b>{String(i.peakHour).padStart(2, '0')}:00</b></>}. Service machines in the quiet hours; run promos in the weakest daytime slots.</Tip>
        </div>
        <div className={card}>
          <p className={lbl}>PRICE POINTS · NUMBER OF SALES</p>
          <PriceChart i={i} />
          <Tip>{i.topPrices.slice(0, 2).map(([p, n]) => <span key={p}><b>฿{p}</b> {pct(n / i.n)} · </span>)}these prices drive volume. Lower prices are candidates for a small price test, tracked here afterwards.</Tip>
        </div>
      </div>

      {/* 4 · Where */}
      <p className={h2}>WHERE · MACHINE PERFORMANCE</p>
      <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
        <div className={card}>
          <p className={lbl}>REVENUE PER ACTIVE DAY × AVERAGE TICKET</p>
          <Quadrant i={i} />
          <p className="mt-1 text-[11.5px] text-muted-foreground">Top-right = stars · top-left = busy but cheap (upsell) · bottom-right = high price, low traffic (visibility?) · bottom-left = review. Hover a dot for details.</p>
        </div>
        <div className={card}>
          <p className={lbl}>ALERTS · NEEDS A LOOK</p>
          <div className="mt-1">
            {i.alerts.length === 0 && <p className="py-3 text-[12.5px] text-muted-foreground">Nothing unusual.</p>}
            {i.alerts.map((a, k) => (
              <div key={k} className="flex items-start gap-2 border-t border-border/60 py-2 text-[12.5px] first:border-0">
                <span className={cn('whitespace-nowrap rounded px-1.5 py-px text-[10.5px] font-bold',
                  a.kind === 'stopped' ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : a.kind === 'strong' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200')}>
                  {{ stopped: 'No sales', few: 'Few days', never: 'Not selling', unassigned: 'Unassigned', strong: 'Strong' }[a.kind]}
                </span>
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5 · Channels */}
      <p className={h2}>PAYMENT CHANNELS · MIX AND COST</p>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className={card}>
          <table className="w-full text-[12.5px] tabular-nums">
            <thead className="text-[11px] text-muted-foreground"><tr><th className="py-1 text-left font-medium">Channel</th><th className="text-right font-medium">Share</th><th className="text-right font-medium">Fee</th><th className="text-right font-medium">Fee %</th></tr></thead>
            <tbody>{i.channels.map((c) => <tr key={c.name} className="border-t border-border/60"><td className="py-1.5">{c.name}</td><td className="text-right">{pct(c.satang / i.gross, 1)}</td><td className="text-right">{baht(c.fee)}</td><td className={cn('text-right', c.fee / c.satang > 0.02 && 'font-semibold text-red-600')}>{pct(c.fee / c.satang, 1)}</td></tr>)}</tbody>
          </table>
        </div>
        <div className={card}>
          <p className={lbl}>WHAT IT TELLS US</p>
          {(() => {
            const qr = i.channels.filter((c) => c.name === 'PromptPay' || c.name === 'KPlus').reduce((a, c) => a + c.satang, 0)
            const cp = i.channels.filter((c) => c.name === 'QRCode' || c.name === 'TrueMoney')
            const cpS = cp.reduce((a, c) => a + c.satang, 0), cpF = cp.reduce((a, c) => a + c.fee, 0)
            const card2 = i.channels.find((c) => c.name === 'Credit Card')
            return <p className="mt-2 text-[12.5px] text-muted-foreground">KBank QR (PromptPay + KPlus) = <b className="text-foreground">{pct(qr / i.gross)} of sales at 0% fee</b>.
              {card2 && <> Card costs {pct(card2.fee / card2.satang, 1)} and is {pct(card2.satang / i.gross)} of sales.</>}
              {cpS > 0 && <> ChillPay costs {pct(cpF / cpS, 1)} — moving those booths to KBank QR would save about <b className="text-foreground">{baht(cpF * (i.monthDays / Math.max(1, i.coveredDays)))}/month</b>.</>}</p>
          })()}
        </div>
        <div className={card}>
          <p className={lbl}>CARD SHARE BY GROUP · TOURIST / PREMIUM SIGNAL</p>
          <table className="mt-2 w-full text-[12.5px] tabular-nums"><tbody>
            {[...i.groups].filter((g) => g.n && g.name !== 'Unassigned').sort((a, b) => b.card - a.card).map((g) => <tr key={g.name} className="border-t border-border/60 first:border-0"><td className="py-1.5">{g.name}</td><td className="text-right">{pct(g.card, 1)}</td></tr>)}
          </tbody></table>
        </div>
      </div>

      {/* 6 · Planning */}
      <p className={h2}>PLANNING</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className={card}>
          <p className={lbl}>{i.forecast.done ? 'MONTH RESULT' : 'MONTH ESTIMATE · RANGE'}</p>
          <div className="mt-3 flex items-end gap-4">
            {(i.forecast.done ? [['Total', i.gross, true]] as const : [['Low', i.forecast.low, false], ['Expected', i.forecast.expected, true], ['High', i.forecast.high, false]] as const).map(([k, v, main]) => (
              <div key={k} className="text-center text-[11px] text-muted-foreground">
                <div className="mx-auto mb-1 w-11 rounded-t-md" style={{ height: `${Math.max(20, (v / i.forecast.high) * 120)}px`, background: main ? ACC : '#EAD9C9' }} />
                {k}<br /><b className="text-[12.5px] text-foreground">{kb(v)}</b>
              </div>
            ))}
            {!i.forecast.done && <p className="flex-1 text-[12px] text-muted-foreground">Earned so far {kb(i.gross)}{i.eventGross > 0 && ` (event ${kb(i.eventGross)} done)`} + permanent booths at {kb(i.permPerDay)}/day for the {i.monthDays - i.coveredDays} days left, ±20%.</p>}
          </div>
        </div>
        <div className={card}>
          <p className={lbl}>WHAT-IF · MONTHLY IMPACT</p>
          <table className="mt-2 w-full text-[12.5px] tabular-nums"><tbody>
            {i.whatIf.map((w) => <tr key={w.label} className="border-t border-border/60 first:border-0"><td className="py-1.5 pr-2">{w.label}</td><td className="whitespace-nowrap text-right font-semibold text-emerald-700 dark:text-emerald-400">+ {kb(w.satang)}</td></tr>)}
          </tbody></table>
          <p className="mt-2 text-[11px] text-muted-foreground">Rough estimates from this month&apos;s own numbers — a starting point for decisions, not a promise.</p>
        </div>
      </div>

      <p className={h2}>NEEDS MORE DATA</p>
      <div className="grid gap-3 text-[12.5px] text-muted-foreground lg:grid-cols-3">
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3"><b className="text-foreground">Year-over-year &amp; seasonality</b><br />Upload past months (ideally 12) to compare with last year and forecast peaks.</div>
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3"><b className="text-foreground">Targets</b><br />A monthly target per group shows “on pace / behind” and the gap.</div>
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-3"><b className="text-foreground">Campaign calendar</b><br />Name + dates + machines → automatic before/after uplift per campaign.</div>
      </div>
    </div>
  )
}

function Kpi({ label, value, note, accent }: { label: string; value: string; note: string; accent?: boolean }) {
  return <div className={card} style={accent ? { borderColor: ACC } : undefined}><p className={lbl}>{label}</p><p className="mt-1 text-[21px] font-bold tabular-nums">{value}</p><p className="text-[11.5px] text-muted-foreground">{note}</p></div>
}

function DailyChart({ i }: { i: Insights }) {
  const W = 700, H = 220, L = 42, B = 24
  const max = Math.max(1, ...i.daily.map((d) => d.event + d.perm), i.permPerDay) * 1.08
  const bw = (W - L - 6) / i.daily.length, y = (v: number) => H - B - (v / max) * (H - B - 10)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const endIdx = i.eventMachines.length ? Math.max(...i.machines.filter((m) => m.event).map((m) => i.daily.findIndex((d) => d.date === m.last))) : -1
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-[220px] w-full" role="img" aria-label="Daily sales">
      {ticks.map((t) => <g key={t}><line x1={L} x2={W} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" /><text x={L - 5} y={y(t) + 3} fontSize="9" textAnchor="end" className="fill-muted-foreground">{kb(t)}</text></g>)}
      {i.daily.map((d, k) => {
        const x = L + k * bw + 1.5, w = Math.max(1, bw - 3)
        const has = d.event + d.perm > 0, future = !!i.dataEnd && d.date > i.dataEnd
        return <g key={d.date}>
          <title>{fmtD(d.date)} · {baht(d.event + d.perm)}{d.event ? ` (event ${baht(d.event)})` : ''}</title>
          {has && <><rect x={x} y={y(d.perm)} width={w} height={H - B - y(d.perm)} fill={PM} rx="2" /><rect x={x} y={y(d.perm + d.event)} width={w} height={y(d.perm) - y(d.perm + d.event)} fill={EV} rx="2" /></>}
          {future && <rect x={x} y={y(i.permPerDay)} width={w} height={H - B - y(i.permPerDay)} fill="none" stroke={PM} strokeDasharray="3 2" rx="2" />}
          {(k % 3 === 0) && <text x={x + w / 2} y={H - 8} fontSize="9" textAnchor="middle" className="fill-muted-foreground">{k + 1}</text>}
        </g>
      })}
      {endIdx >= 0 && <><line x1={L + (endIdx + 1) * bw} x2={L + (endIdx + 1) * bw} y1="6" y2={H - B} stroke={ACC} strokeDasharray="4 3" /><text x={L + (endIdx + 1) * bw + 4} y="16" fontSize="10" fill={ACC}>event ends</text></>}
    </svg>
  )
}

function Heatmap({ i }: { i: Insights }) {
  const hrs = Array.from({ length: 14 }, (_, k) => k + 9)
  const max = Math.max(1, ...i.heat.flat())
  return (
    <div className="grid gap-[2px] text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `34px repeat(${hrs.length}, 1fr)` }}>
      <div />{hrs.map((h) => <div key={h} className="text-center">{h}</div>)}
      {i.heat.map((row, d) => [
        <div key={'d' + d} className="flex items-center">{DOW[d]}</div>,
        ...hrs.map((h) => { const a = row[h] / max; return <div key={d + '-' + h} title={`${DOW[d]} ${h}:00 · ${baht(row[h])}`} className="grid h-[22px] place-items-center rounded-[3px] text-[9.5px] font-semibold" style={{ background: `rgba(200,100,59,${0.06 + a * 0.94})`, color: a > 0.55 ? '#fff' : 'transparent' }}>{kb(row[h]).replace('฿', '')}</div> }),
      ])}
    </div>
  )
}

function PriceChart({ i }: { i: Insights }) {
  const P = i.topPrices.filter(([, n]) => n >= Math.max(5, i.n * 0.005)).sort((a, b) => a[0] - b[0]).slice(0, 12)
  const W = 520, H = 210, B = 26, max = Math.max(1, ...P.map(([, n]) => n)), bw = (W - 20) / Math.max(1, P.length)
  const top = new Set(i.topPrices.slice(0, 2).map(([p]) => p))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-[210px] w-full" role="img" aria-label="Price points">
      {P.map(([p, n], k) => { const h = (n / max) * (H - B - 22), x = 10 + k * bw; return <g key={p}>
        <rect x={x + 6} y={H - B - h} width={bw - 12} height={h} rx="3" fill={top.has(p) ? ACC : '#E3B79D'} />
        <text x={x + bw / 2} y={H - B - h - 4} fontSize="10" textAnchor="middle" className="fill-muted-foreground">{n.toLocaleString()}</text>
        <text x={x + bw / 2} y={H - 8} fontSize="10" textAnchor="middle" className="fill-muted-foreground">฿{p}</text></g> })}
    </svg>
  )
}

function Quadrant({ i }: { i: Insights }) {
  const [hover, setHover] = useState<number | null>(null)
  const ms = i.machines.filter((m) => m.machine !== 0)
  if (!ms.length) return null
  const W = 700, H = 290, L = 46, B = 30
  const maxPd = Math.max(...ms.map((m) => m.perDay)) * 1.05
  const tks = ms.map((m) => m.ticket / 100), minT = Math.floor(Math.min(...tks) / 10) * 10 - 10, maxT = Math.ceil(Math.max(...tks) / 10) * 10 + 10
  const X = (t: number) => L + ((t - minT) / Math.max(1, maxT - minT)) * (W - L - 12)
  const Y = (pd: number) => H - B - (Math.sqrt(pd) / Math.sqrt(maxPd)) * (H - B - 12)
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
  const mT = med(tks), mPd = med(ms.map((m) => m.perDay))
  const yt = [100000, 500000, 2000000, 6000000].filter((v) => v < maxPd)
  const xt = Array.from({ length: 5 }, (_, k) => Math.round(minT + ((maxT - minT) * k) / 4))
  const h = ms.find((m) => m.machine === hover)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-[290px] w-full" role="img" aria-label="Machine performance">
      <line x1={X(mT)} x2={X(mT)} y1="6" y2={H - B} stroke="currentColor" strokeDasharray="4 3" className="text-border" />
      <line x1={L} x2={W - 12} y1={Y(mPd)} y2={Y(mPd)} stroke="currentColor" strokeDasharray="4 3" className="text-border" />
      {yt.map((v) => <text key={v} x={L - 6} y={Y(v) + 3} fontSize="9" textAnchor="end" className="fill-muted-foreground">{kb(v)}</text>)}
      {xt.map((v) => <text key={v} x={X(v)} y={H - 12} fontSize="9" textAnchor="middle" className="fill-muted-foreground">฿{v}</text>)}
      <text x={L} y="12" fontSize="9.5" className="fill-muted-foreground">฿ per active day (√ scale)</text>
      <text x={W - 14} y="14" fontSize="10" textAnchor="end" fill="#1E8A57">★ stars</text>
      {ms.map((m) => { const cx = X(m.ticket / 100), cy = Y(m.perDay); return <g key={m.machine} onMouseEnter={() => setHover(m.machine)} onMouseLeave={() => setHover(null)}>
        <circle cx={cx} cy={cy} r={m.event ? 7 : 5} fill={GCOL[m.group] ?? '#999'} fillOpacity={hover == null || hover === m.machine ? 0.85 : 0.3} stroke={m.event ? EV : 'none'} strokeWidth="2" />
        {(m.event || m.perDay >= mPd * 3) && <text x={cx + 8} y={cy + 3} fontSize="9.5" className="fill-muted-foreground">#{m.machine}</text>}
      </g> })}
      {h && <g pointerEvents="none"><rect x={Math.min(W - 190, X(h.ticket / 100) + 10)} y={Math.max(4, Y(h.perDay) - 44)} width="180" height="40" rx="6" className="fill-card" stroke="currentColor" strokeOpacity=".15" />
        <text x={Math.min(W - 182, X(h.ticket / 100) + 18)} y={Math.max(4, Y(h.perDay) - 44) + 16} fontSize="11" className="fill-foreground" fontWeight="600">#{h.machine} · {h.group}{h.event ? ' · event' : ''}</text>
        <text x={Math.min(W - 182, X(h.ticket / 100) + 18)} y={Math.max(4, Y(h.perDay) - 44) + 31} fontSize="10.5" className="fill-muted-foreground">{baht(h.perDay)}/day · avg ฿{(h.ticket / 100).toFixed(0)} · {h.days} days</text></g>}
    </svg>
  )
}
