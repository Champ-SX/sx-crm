import type { SaleRow } from './parse'
import { groupOf, SALES_GROUPS, machinesOf, UNASSIGNED } from './groups'

// Insights for one month of accepted payments (pure: dashboard-tested on finance's files).

export interface MachineStat { machine: number; group: string; n: number; satang: number; days: number; first: string; last: string; perDay: number; ticket: number; event: boolean }
export interface Insights {
  month: string; monthDays: number; from: string; to: string; dataEnd: string | null; coveredDays: number
  n: number; gross: number; fees: number; net: number; ticket: number
  topPrices: [number, number][]
  machines: MachineStat[]; eventMachines: number[]; eventGross: number; permGross: number; permPerDay: number
  daily: { date: string; event: number; perm: number }[]
  heat: number[][]           // [Mon..Sun][0..23] satang
  weekendShare: number; peakHour: number | null
  groups: { name: string; n: number; satang: number; active: number; card: number }[]
  channels: { name: string; n: number; satang: number; fee: number }[]
  forecast: { low: number; expected: number; high: number; done: boolean }
  alerts: { kind: 'stopped' | 'few' | 'never' | 'unassigned' | 'strong'; text: string; machine?: number }[]
  whatIf: { label: string; satang: number }[]
}

const pad = (n: number) => String(n).padStart(2, '0')
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
const median = (xs: number[]) => { const a = [...xs].sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0 }
const fmtD = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const baht = (s: number) => '฿' + Math.round(s / 100).toLocaleString('en-US')

export function computeInsights(rows: SaleRow[], month: string): Insights {
  const [y, m] = month.split('-').map(Number)
  const monthDays = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const from = `${month}-01`, to = `${month}-${pad(monthDays)}`
  const r = rows.filter((x) => x.biz_date >= from && x.biz_date <= to)
  const dates = [...new Set(r.map((x) => x.biz_date))].sort()
  const dataEnd = dates.length ? dates[dates.length - 1] : null
  const coveredDays = dataEnd ? daysBetween(from, dataEnd) + 1 : 0
  const gross = r.reduce((a, x) => a + x.amount_satang, 0)
  const fees = r.reduce((a, x) => a + (x.fee_satang ?? 0), 0)

  // Machines
  const byM = new Map<number, SaleRow[]>()
  for (const x of r) if (x.machine != null) byM.set(x.machine, [...(byM.get(x.machine) ?? []), x])
  let machines: MachineStat[] = [...byM].map(([machine, xs]) => {
    const ds = [...new Set(xs.map((x) => x.biz_date))].sort()
    const satang = xs.reduce((a, x) => a + x.amount_satang, 0)
    return { machine, group: groupOf(machine), n: xs.length, satang, days: ds.length, first: ds[0], last: ds[ds.length - 1], perDay: satang / ds.length, ticket: satang / xs.length, event: false }
  })
  // Event booth = short burst that stopped, earning far above a normal booth's day.
  const normalDay = median(machines.filter((x) => x.machine !== 0).map((x) => x.perDay))
  machines = machines.map((x) => ({
    ...x, event: x.machine !== 0 && !!dataEnd && x.days <= 10 && daysBetween(x.last, dataEnd) >= 5 && x.perDay >= 3 * normalDay && x.perDay >= 500000,
  }))
  const ev = new Set(machines.filter((x) => x.event).map((x) => x.machine))
  const eventGross = r.filter((x) => x.machine != null && ev.has(x.machine)).reduce((a, x) => a + x.amount_satang, 0)
  const permGross = gross - eventGross
  const permPerDay = coveredDays ? permGross / coveredDays : 0

  const daily: Insights['daily'] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const xs = r.filter((x) => x.biz_date === d)
    const e = xs.filter((x) => x.machine != null && ev.has(x.machine)).reduce((a, x) => a + x.amount_satang, 0)
    daily.push({ date: d, event: e, perm: xs.reduce((a, x) => a + x.amount_satang, 0) - e })
  }

  // When
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0) as number[])
  for (const x of r) {
    const dow = (new Date(x.biz_date + 'T00:00:00Z').getUTCDay() + 6) % 7
    const h = Number((x.biz_time ?? '').slice(0, 2)); if (Number.isFinite(h)) heat[dow][h] += x.amount_satang
  }
  const weekendShare = gross ? (heat[5].reduce((a, b) => a + b, 0) + heat[6].reduce((a, b) => a + b, 0)) / gross : 0
  const hours = Array.from({ length: 24 }, (_, h) => heat.reduce((a, row) => a + row[h], 0))
  const peakHour = gross ? hours.indexOf(Math.max(...hours)) : null

  const price = new Map<number, number>()
  for (const x of r) { const p = Math.round(x.amount_satang / 100); price.set(p, (price.get(p) ?? 0) + 1) }
  const topPrices = [...price].sort((a, b) => b[1] - a[1])

  // Groups + channels
  const groups = [...SALES_GROUPS.map((g) => g.name), UNASSIGNED].map((name) => {
    const xs = r.filter((x) => groupOf(x.machine) === name)
    const satang = xs.reduce((a, x) => a + x.amount_satang, 0)
    return { name, n: xs.length, satang, active: new Set(xs.map((x) => x.machine)).size, card: satang ? xs.filter((x) => x.gateway === 'paysolution').reduce((a, x) => a + x.amount_satang, 0) / satang : 0 }
  })
  const chMap = new Map<string, { n: number; satang: number; fee: number }>()
  for (const x of r) { const c = chMap.get(x.channel) ?? { n: 0, satang: 0, fee: 0 }; c.n++; c.satang += x.amount_satang; c.fee += x.fee_satang ?? 0; chMap.set(x.channel, c) }
  const channels = [...chMap].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.satang - a.satang)

  // Forecast: event money already earned + permanent booths at their daily rate, ±20% on the days still to come.
  const left = dataEnd ? Math.max(0, daysBetween(dataEnd, to)) : monthDays
  const rest = permPerDay * left
  const forecast = { expected: gross + rest, low: gross + rest * 0.8, high: gross + rest * 1.2, done: left === 0 }

  // Alerts
  const alerts: Insights['alerts'] = []
  if (dataEnd) {
    for (const x of machines.filter((x) => !x.event && x.machine !== 0 && daysBetween(x.last, dataEnd) >= 4).sort((a, b) => b.perDay - a.perDay))
      alerts.push({ kind: 'stopped', machine: x.machine, text: `#${x.machine} · ${x.group} — no sales since ${fmtD(x.last)} (${daysBetween(x.last, dataEnd)} days). Earned ${baht(x.perDay)}/day before that.` })
    for (const x of machines.filter((x) => !x.event && x.machine !== 0 && daysBetween(x.last, dataEnd) < 4 && x.days < coveredDays * 0.4))
      alerts.push({ kind: 'few', machine: x.machine, text: `#${x.machine} · ${x.group} — sold on only ${x.days} of ${coveredDays} days.` })
    for (const g of SALES_GROUPS) {
      const none = machinesOf(g).filter((n) => !byM.has(n))
      if (none.length && none.length < machinesOf(g).length) alerts.push({ kind: 'never', text: `${g.name} — no sales this month on ${none.length} of ${machinesOf(g).length} machine numbers: ${none.map((n) => '#' + n).join(' ')}. Installed?` })
    }
    const un = groups.find((g) => g.name === UNASSIGNED)!
    if (un.n) alerts.push({ kind: 'unassigned', text: `${un.n} payments (${baht(un.satang)}) from machines outside every group. Assign or exclude them.` })
    const best = machines.filter((x) => !x.event && x.machine !== 0 && x.days === coveredDays).sort((a, b) => b.perDay - a.perDay)[0]
    if (best) alerts.push({ kind: 'strong', machine: best.machine, text: `#${best.machine} · ${best.group} sold every day — ${baht(best.perDay)}/day, the best permanent booth.` })
  }

  // What-if (monthly)
  const scale = coveredDays ? monthDays / coveredDays : 0
  const low = r.filter((x) => x.amount_satang >= 14000 && x.amount_satang <= 16000)
  const lowMonthN = low.length * scale, lowAvg = low.length ? low.reduce((a, x) => a + x.amount_satang, 0) / low.length : 0
  const stopped = machines.filter((x) => !x.event && x.machine !== 0 && dataEnd && daysBetween(x.last, dataEnd) >= 4)
  const chill = r.filter((x) => x.gateway === 'chillpay').reduce((a, x) => a + (x.fee_satang ?? 0), 0) * scale
  const whatIf: Insights['whatIf'] = []
  if (low.length) whatIf.push({ label: `+฿20 on ฿140–160 sales (${low.length.toLocaleString()} so far; assume −5% volume)`, satang: lowMonthN * 0.95 * (lowAvg + 2000) - lowMonthN * lowAvg })
  if (stopped.length) whatIf.push({ label: `Fix ${stopped.map((x) => '#' + x.machine).join(' + ')} for the rest of the month (at their own daily average)`, satang: stopped.reduce((a, x) => a + x.perDay * Math.max(0, daysBetween(x.last, to)), 0) })
  if (chill) whatIf.push({ label: 'Move ChillPay booths to KBank QR (no fee)', satang: chill })
  if (eventGross) whatIf.push({ label: `One more event like ${[...ev].map((n) => '#' + n).join(' ')}`, satang: eventGross })

  return {
    month, monthDays, from, to, dataEnd, coveredDays, n: r.length, gross, fees, net: gross - fees, ticket: r.length ? gross / r.length : 0, topPrices,
    machines, eventMachines: [...ev].sort((a, b) => a - b), eventGross, permGross, permPerDay, daily, heat, weekendShare, peakHour,
    groups, channels, forecast, alerts, whatIf,
  }
}
