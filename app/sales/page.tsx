'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { DelayedLoading } from '@/components/shared/delayed-loading'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth-provider'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { parseSheet, type SaleRow } from '@/lib/sales/parse'
import { SALES_GROUPS, ALL_ASSIGNED, groupOf, machinesOf, UNASSIGNED } from '@/lib/sales/groups'
import { buildWorkbook, downloadWorkbook, byMachine, fmtTHB, isAccepted, reportFileName, selectRows, DEFAULT_EXPORT, type ExportOpts } from '@/lib/sales/report'
import {
  classify, commitImport, deleteImport, fetchDateRange, salesCache, fetchImports, fetchReviewQueue, fetchSales, patchSale, useSalesAccess,
  type Classified, type ImportFileSummary, type SalesImport, type StoredSale,
} from '@/lib/supabase/sales'

type Tab = 'dash' | 'report' | 'upload' | 'review'
const pad = (n: number) => String(n).padStart(2, '0')
const monthBounds = (ym: string) => { const [y, m] = ym.split('-').map(Number); return { from: `${ym}-01`, to: `${ym}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}` } }
const thisMonth = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7)
const fmtDay = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const GW: Record<string, string> = { kbank: 'KBank', paysolution: 'Pay Solution', chillpay: 'ChillPay' }
const GROUP_COLORS: Record<string, string> = { Captures: '#2F6FDB', True: '#C9423B', BACC: '#1E9E62', C11: '#D9822B', BTT: '#7A5AA5', [UNASSIGNED]: '#A8A39A' }
const lbl = 'font-mono text-[10.5px] font-semibold tracking-[0.06em] text-muted-foreground'
const card = 'rounded-xl border border-border bg-card p-4'

export default function SalesPage() {
  const access = useSalesAccess()
  const [tab, setTab] = useState<Tab>('dash')
  const [reviewCount, setReviewCount] = useState(0)
  const refreshReview = useCallback(() => { void fetchReviewQueue().then((r) => setReviewCount(r.length)).catch(() => {}) }, [])
  useEffect(() => { if (access) refreshReview() }, [access, refreshReview])

  if (access === null) return <DelayedLoading />
  if (!access) return (
    <div className="p-8 max-w-md">
      <h1 className="text-lg font-semibold">Sales reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">You don&apos;t have access to this page. Ask an admin to tick “Sales” for you in Admin › Users.</p>
    </div>
  )
  const tabs: [Tab, string][] = [['dash', 'Dashboard'], ['report', 'Client report'], ['upload', 'Upload'], ['review', `Review${reviewCount ? ` · ${reviewCount}` : ''}`]]
  return (
    <div className="flex flex-col h-[100dvh]">
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3 shrink-0">
        <MobileMenuButton />
        <div className="mr-auto">
          <h1 className="text-[17px] font-semibold tracking-tight">Sales · Finance</h1>
          <p className="text-[12px] text-muted-foreground hidden sm:block">KBank · Pay Solution · ChillPay → dashboard and client reports</p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
              className={cn('h-7 px-3 rounded-md text-[12.5px] font-medium', tab === id ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground')}>{label}</button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-[1200px]">
          {tab === 'dash' && <Dashboard />}
          {tab === 'report' && <ReportBuilder />}
          {tab === 'upload' && <Upload onDone={refreshReview} />}
          {tab === 'review' && <Review onChange={refreshReview} />}
        </div>
      </div>
    </div>
  )
}

// ── Data hook ─────────────────────────────────────────────────────────────────
function useSales(from: string, to: string) {
  const k = `${from}|${to}`
  const [st, setSt] = useState<{ k: string; rows: StoredSale[] | null; err: string | null }>(() => ({ k, rows: salesCache.get(k) ?? null, err: null }))
  useEffect(() => {
    let on = true
    fetchSales(from, to).then((r) => { salesCache.set(k, r); if (on) setSt({ k, rows: r, err: null }) })
      .catch((e) => on && setSt((p) => ({ k, rows: p.k === k ? p.rows ?? [] : [], err: e instanceof Error ? e.message : String(e) })))
    return () => { on = false }
  }, [from, to, k])
  // Same period: show what we have (cache or last fetch) while refreshing; new period: cached copy or loading.
  return st.k === k ? { rows: st.rows, err: st.err } : { rows: salesCache.get(k) ?? null, err: null }
}
function useMonths(): string[] {
  const [months, setMonths] = useState<string[]>([thisMonth()])
  useEffect(() => {
    void fetchDateRange().then(({ min, max }) => {
      const end = [max?.slice(0, 7), thisMonth()].filter(Boolean).sort().pop()!
      let cur = min?.slice(0, 7) ?? end
      const out: string[] = []
      while (cur <= end && out.length < 36) { out.push(cur); const [y, m] = cur.split('-').map(Number); cur = m === 12 ? `${y + 1}-01` : `${y}-${pad(m + 1)}` }
      setMonths(out.reverse())
    }).catch(() => {})
  }, [])
  return months
}

// ── ① Dashboard ───────────────────────────────────────────────────────────────
function Dashboard() {
  const months = useMonths()
  const [picked, setMonth] = useState(thisMonth())
  const month = months.includes(picked) ? picked : (months[0] ?? picked)
  const [group, setGroup] = useState('all')
  const [machine, setMachine] = useState('all')
  const { from, to } = monthBounds(month)
  const { rows, err } = useSales(from, to)

  const ok = useMemo(() => (rows ?? []).filter(isAccepted)
    .filter((r) => group === 'all' || groupOf(r.machine) === group)
    .filter((r) => machine === 'all' || String(r.machine) === machine), [rows, group, machine])
  const pending = (rows ?? []).filter((r) => r.review || r.conflict).length
  const notSale = (rows ?? []).filter((r) => !r.review && r.status !== 'success').length
  const gross = ok.reduce((s, r) => s + r.amount_satang, 0)
  const days = [...new Set(ok.map((r) => r.biz_date))].sort()
  const machinesActive = new Set(ok.map((r) => r.machine)).size
  const sumBy = (k: (r: SaleRow) => string) => {
    const m = new Map<string, { n: number; s: number }>()
    for (const r of ok) { const x = m.get(k(r)) ?? { n: 0, s: 0 }; x.n++; x.s += r.amount_satang; m.set(k(r), x) }
    return [...m.entries()].sort((a, b) => b[1].s - a[1].s)
  }
  const gw = sumBy((r) => r.gateway)
  const methods = sumBy((r) => `${r.gateway}|${r.method}`)
  const groups = sumBy((r) => groupOf(r.machine))
  const allDays: string[] = []; for (let d = new Date(from + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= to; d.setUTCDate(d.getUTCDate() + 1)) allDays.push(d.toISOString().slice(0, 10))
  const daily = allDays.map((d) => ({ d, by: SALES_GROUPS.map((g) => g.name).concat(UNASSIGNED).map((g) => ({ g, s: ok.filter((r) => r.biz_date === d && groupOf(r.machine) === g).reduce((a, r) => a + r.amount_satang, 0) })) }))
  const maxDay = Math.max(1, ...daily.map((x) => x.by.reduce((a, b) => a + b.s, 0)))
  const mlines = byMachine(ok, [...new Set(ok.map((r) => r.machine!))]).sort((a, b) => b.satang - a.satang)
  const machineOpts = [...new Set((rows ?? []).filter(isAccepted).map((r) => r.machine))].filter((m): m is number => m != null).sort((a, b) => a - b)

  return (
    <div className="space-y-5">
      {rows == null && <DelayedLoading label="Loading sales…" className="py-6" />}
      <div className="flex flex-wrap items-end gap-2">
        <div className="mr-auto">
          <p className="text-[13px] text-muted-foreground">
            {rows == null ? 'Loading…' : days.length ? <>Data covers <b className="text-foreground">{fmtDay(days[0])} – {fmtDay(days[days.length - 1])}</b>{days[days.length - 1] < to && ' (partial month)'}</> : 'No sales in this month yet — upload files in the Upload tab.'}
          </p>
          {err && <p className="text-[12px] text-red-600">{err}</p>}
        </div>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 rounded-md border border-border bg-card px-2 text-[13px]" aria-label="Month">
          {months.map((m) => <option key={m} value={m}>{new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>)}
        </select>
        <select value={group} onChange={(e) => { setGroup(e.target.value); setMachine('all') }} className="h-8 rounded-md border border-border bg-card px-2 text-[13px]" aria-label="Group">
          <option value="all">All groups</option>{SALES_GROUPS.map((g) => <option key={g.id} value={g.name}>{g.name} · {g.from}–{g.to}</option>)}<option value={UNASSIGNED}>{UNASSIGNED}</option>
        </select>
        <select value={machine} onChange={(e) => setMachine(e.target.value)} className="h-8 rounded-md border border-border bg-card px-2 text-[13px]" aria-label="Machine">
          <option value="all">All machines</option>{machineOpts.filter((m) => group === 'all' || groupOf(m) === group).map((m) => <option key={m} value={String(m)}>#{m}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="GROSS SALES" value={fmtTHB(gross)} note="successful payments only" />
        <Kpi label="TRANSACTIONS" value={ok.length.toLocaleString()} note={[pending && `${pending} in review`, notSale && `${notSale} refunds/failed excluded`].filter(Boolean).join(' · ') || 'all accepted'} />
        <Kpi label="ACTIVE MACHINES" value={String(machinesActive)} note={`with at least one sale`} />
        <Kpi label="AVG / DAY WITH SALES" value={fmtTHB(days.length ? Math.round(gross / days.length) : 0)} note={`÷ ${days.length} day${days.length === 1 ? '' : 's'} with sales`} />
      </div>

      <div>
        <p className={cn(lbl, 'mb-2')}>BY GATEWAY · PAYMENT METHOD</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {(['kbank', 'paysolution', 'chillpay'] as const).map((g) => {
            const t = gw.find(([k]) => k === g)?.[1]
            const ms = methods.filter(([k]) => k.startsWith(g + '|'))
            return (
              <div key={g} className={card}>
                <p className={lbl}>{GW[g].toUpperCase()}</p>
                <p className="mt-1 text-[19px] font-bold tabular-nums">{fmtTHB(t?.s ?? 0)} <span className="text-[12px] font-normal text-muted-foreground">· {t?.n ?? 0} txns</span></p>
                <div className="mt-2 space-y-0.5">{ms.map(([k, v]) => (
                  <div key={k} className="flex justify-between text-[12px]"><span className="text-muted-foreground">{k.split('|')[1]}</span><span className="tabular-nums">{v.n} · {fmtTHB(v.s)}</span></div>
                ))}</div>
                {g === 'chillpay' && t && <p className="mt-1 text-[11.5px] text-muted-foreground">Net transfer {fmtTHB(ok.filter((r) => r.gateway === 'chillpay').reduce((s, r) => s + (r.net_satang ?? 0), 0))}</p>}
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <p className={cn(lbl, 'mb-2')}>BY CLIENT GROUP</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...SALES_GROUPS.map((g) => [g.name, `${g.from}–${g.to}`]), [UNASSIGNED, 'not in a range']].map(([name, range]) => {
            const v = groups.find(([k]) => k === name)?.[1]
            return (
              <div key={name} className={cn(card, name === UNASSIGNED && v && 'bg-amber-50 dark:bg-amber-500/10')}>
                <p className={lbl}>{name.toUpperCase()} · {range}</p>
                <p className="mt-1 text-[16px] font-bold tabular-nums">{fmtTHB(v?.s ?? 0)}</p>
                <p className="text-[11.5px] text-muted-foreground">{v?.n ?? 0} sales{gross ? ` · ${(((v?.s ?? 0) / gross) * 100).toFixed(1)}%` : ''}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className={lbl}>DAILY SALES · BY GROUP</p>
          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">{Object.entries(GROUP_COLORS).map(([g, c]) => <span key={g} className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: c }} />{g}</span>)}</div></div>
        <div className="mt-3 flex h-40 items-end gap-[3px]">
          {daily.map(({ d, by }) => {
            const tot = by.reduce((a, b) => a + b.s, 0)
            return (
              <div key={d} className="flex h-full flex-1 flex-col justify-end" title={`${fmtDay(d)} · ${fmtTHB(tot)}`}>
                <div className="flex flex-col-reverse overflow-hidden rounded-t-[3px]" style={{ height: `${(tot / maxDay) * 100}%` }}>
                  {by.filter((b) => b.s).map((b) => <span key={b.g} style={{ height: `${(b.s / tot) * 100}%`, background: GROUP_COLORS[b.g] }} />)}
                </div>
                {!tot && <span className="h-[3px] rounded bg-muted" />}
              </div>
            )
          })}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{fmtDay(from)}</span><span>{fmtDay(to)}</span></div>
      </div>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-3">
        <div className={card}>
          <p className={cn(lbl, 'mb-2')}>TOP 20 MACHINES</p>
          {mlines.slice(0, 20).map((l) => (
            <div key={l.machine} className="flex items-center gap-2 py-0.5 text-[12.5px]">
              <span className="w-10 font-mono">#{l.machine}</span>
              <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${(l.satang / (mlines[0]?.satang || 1)) * 100}%`, background: GROUP_COLORS[l.group] }} /></div>
              <span className="w-28 text-right tabular-nums">{fmtTHB(l.satang)}</span>
            </div>
          ))}
          {!mlines.length && <p className="text-[12.5px] text-muted-foreground">No sales.</p>}
        </div>
        <div className={card}>
          <p className={cn(lbl, 'mb-2')}>ALL MACHINES · {mlines.length}</p>
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-[12.5px] tabular-nums">
              <thead className="sticky top-0 bg-card text-[11px] text-muted-foreground"><tr><th className="py-1 text-left">Machine</th><th className="text-left">Group</th><th className="text-right">Sales</th><th className="text-right">Revenue</th><th className="text-right">%</th></tr></thead>
              <tbody>{mlines.map((l) => (
                <tr key={l.machine} className="border-t border-border/60"><td className="py-1 font-mono">#{l.machine}</td><td>{l.group}</td><td className="text-right">{l.count}</td><td className="text-right">{fmtTHB(l.satang)}</td><td className="text-right text-muted-foreground">{gross ? ((l.satang / gross) * 100).toFixed(2) : '0.00'}%</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className={card}><p className={lbl}>{label}</p><p className="mt-1 text-[22px] font-bold tabular-nums">{value}</p><p className="text-[11.5px] text-muted-foreground">{note}</p></div>
}

// ── ② Client report (combined Excel) ──────────────────────────────────────────
const ACC = '#C8643B'
const MIX: [string, string, (r: SaleRow) => boolean][] = [
  ['PromptPay', '#2F6FDB', (r) => r.channel === 'PromptPay'],
  ['KPlus', '#1E9E62', (r) => r.channel === 'KPlus'],
  ['Card', '#7A5AA5', (r) => r.gateway === 'paysolution'],
  ['ChillPay', '#D9822B', (r) => r.gateway === 'chillpay'],
]
const kfmt = (satang: number) => { const b = satang / 100; return b >= 1e6 ? `฿${(b / 1e6).toFixed(2)}M` : b >= 1e3 ? `฿${(b / 1e3).toFixed(1)}k` : `฿${b.toFixed(0)}` }

function ReportBuilder() {
  const m = monthBounds(thisMonth())
  const [from, setFrom] = useState(m.from)
  const [to, setTo] = useState(m.to)
  const { rows } = useSales(from, to)
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [q, setQ] = useState('')
  const [show, setShow] = useState<'selected' | 'all'>('all')
  const opts: ExportOpts = DEFAULT_EXPORT   // Pay Solution → ReferenceNo (confirmed by finance)
  const list = [...sel].sort((a, b) => a - b)
  const ok = useMemo(() => (rows ?? []).filter((r) => isAccepted(r) && r.biz_date >= from && r.biz_date <= to), [rows, from, to])
  const picked = useMemo(() => selectRows(rows ?? [], { from, to }, [...sel]), [rows, from, to, sel])
  const gross = picked.reduce((s, r) => s + r.amount_satang, 0)
  const mine = (rows ?? []).filter((r) => r.machine != null && sel.has(r.machine))
  const waiting = mine.filter((r) => r.review).length
  const disputed = mine.filter((r) => !r.review && r.conflict).length
  const noId = picked.filter((r) => !(r.gateway === 'paysolution' && opts.paySolutionId === 'order' ? r.alt_ref : r.txn_id)).length
  const unassigned = [...new Set(ok.filter((r) => groupOf(r.machine) === UNASSIGNED).map((r) => r.machine))]

  // per-machine stats for the table
  const stats = useMemo(() => {
    const m = new Map<number, { n: number; s: number; mix: number[]; last: string }>()
    for (const n of ALL_ASSIGNED) m.set(n, { n: 0, s: 0, mix: [0, 0, 0, 0], last: '' })
    for (const r of ok) {
      const x = m.get(r.machine!); if (!x) continue
      x.n++; x.s += r.amount_satang
      MIX.forEach(([, , f], i) => { if (f(r)) x.mix[i]++ })
      const t = `${r.biz_date} ${r.biz_time ?? ''}`; if (t > x.last) x.last = t
    }
    return m
  }, [ok])
  const groupTotal = (ms: number[]) => ms.reduce((a, n) => { const x = stats.get(n)!; return { n: a.n + x.n, s: a.s + x.s } }, { n: 0, s: 0 })
  const activeGroups = SALES_GROUPS.filter((g) => machinesOf(g).some((n) => sel.has(n)))
  const visible = ALL_ASSIGNED.filter((n) => (show === 'all' || !activeGroups.length || activeGroups.some((g) => n >= g.from && n <= g.to)) && (!q.trim() || String(n).includes(q.trim().replace('#', ''))))
  const toggle = (n: number) => setSel((s) => { const x = new Set(s); if (x.has(n)) x.delete(n); else x.add(n); return x })
  const setMany = (ms: number[], on: boolean) => setSel((s) => { const x = new Set(s); ms.forEach((n) => (on ? x.add(n) : x.delete(n))); return x })
  const allVisibleOn = visible.length > 0 && visible.every((n) => sel.has(n))
  const byGateway = (['kbank', 'paysolution', 'chillpay'] as const).map((g) => ({ g, s: picked.filter((r) => r.gateway === g).reduce((a, r) => a + r.amount_satang, 0) }))
  const fileName = list.length ? reportFileName({ from, to }, list) : ''
  const lastFmt = (t: string) => t ? `${fmtDay(t.slice(0, 10))}${t.length > 11 ? `, ${t.slice(11, 16)}` : ''}` : 'no sales'

  function download() {
    if (!rows || !list.length) return
    const { wb } = buildWorkbook(rows, { from, to }, list, opts)
    downloadWorkbook(wb, fileName)
  }
  const box = 'rounded-[10px] border border-border bg-card'
  const cb = (on: boolean) => cn('inline-grid h-[15px] w-[15px] place-items-center rounded-[4px] border-[1.5px] text-[10px] font-bold leading-none text-white', on ? 'border-transparent' : 'border-muted-foreground/40 bg-background')

  return (
    <div className="space-y-3">
      {/* Group cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[{ id: 'all', name: 'All machines', range: `(${ALL_ASSIGNED.length})`, ms: ALL_ASSIGNED }, ...SALES_GROUPS.map((g) => ({ id: g.id, name: g.name, range: `${g.from}–${g.to}`, ms: machinesOf(g) }))].map((g) => {
          const full = g.ms.every((n) => sel.has(n)); const t = groupTotal(g.ms)
          return (
            <button key={g.id} type="button" aria-pressed={full} onClick={() => { setMany(g.ms, !full); if (!full) setShow('selected') }}
              className={cn(box, 'px-3 py-2.5 text-left transition-shadow hover:border-foreground/25')} style={full ? { borderColor: ACC, boxShadow: `0 0 0 1px ${ACC}` } : undefined}>
              <div className="flex justify-between text-[12px] font-semibold"><span>{g.name}</span><span className="font-medium" style={{ color: ACC }}>{g.range}</span></div>
              <div className="mt-2 flex items-center justify-between">
                <b className="text-[18px] tabular-nums">{kfmt(t.s)}</b>
                <span className={cn('rounded-[5px] px-1.5 py-px text-[10.5px] font-medium', full ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-muted text-muted-foreground')}>{full ? '✓ selected' : t.n.toLocaleString()}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search machine #" className="h-8 w-[170px] text-[12.5px]" aria-label="Search machine" />
        <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2">
          <Input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-7 w-auto border-0 px-1 text-[12.5px] shadow-none" aria-label="From" />
          <span className="text-muted-foreground">–</span>
          <Input type="date" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-7 w-auto border-0 px-1 text-[12.5px] shadow-none" aria-label="To" />
        </div>
        <select onChange={(e) => { const back = Number(e.target.value); if (Number.isNaN(back)) return; const d = new Date(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - back); const b = monthBounds(d.toISOString().slice(0, 7)); setFrom(b.from); setTo(b.to); e.target.value = '' }}
          defaultValue="" className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px]" aria-label="Quick period">
          <option value="" disabled>Quick period</option><option value="0">This month</option><option value="1">Last month</option><option value="2">2 months ago</option>
        </select>
        <label className="ml-auto flex items-center gap-1.5 text-[12.5px] text-muted-foreground">Show
          <select value={show} onChange={(e) => setShow(e.target.value as 'selected' | 'all')} className="h-8 rounded-md border border-border bg-card px-2 text-[12.5px] text-foreground">
            <option value="selected">Selected group</option><option value="all">All machines</option>
          </select>
        </label>
      </div>

      {/* Table */}
      <div className={cn(box, 'overflow-hidden')}>
        <div className="max-h-[calc(100dvh-330px)] min-h-[240px] overflow-auto">
          <table className="w-full min-w-[760px] text-[12.5px] tabular-nums">
            <thead className="sticky top-0 z-10 bg-muted text-[11.5px] text-muted-foreground">
              <tr>
                <th className="w-9 px-3 py-2 text-left"><button type="button" aria-label={allVisibleOn ? 'Untick all shown' : 'Tick all shown'} onClick={() => setMany(visible, !allVisibleOn)} className={cb(allVisibleOn)} style={allVisibleOn ? { background: ACC } : undefined}>{allVisibleOn && '✓'}</button></th>
                <th className="px-2 text-left font-medium">Machine</th><th className="px-2 text-left font-medium">Group</th>
                {MIX.map(([k]) => <th key={k} className="px-2 text-right font-medium">{k}</th>)}
                <th className="px-2 text-right font-medium">Sales</th><th className="px-2 text-right font-medium">Amount</th>
                <th className="px-2 text-left font-medium">Mix</th><th className="px-3 text-left font-medium">Last sale</th>
              </tr>
            </thead>
            <tbody>
              {rows == null && <tr><td colSpan={11}><DelayedLoading label="Loading sales…" className="py-8" /></td></tr>}
              {rows != null && visible.map((n) => {
                const x = stats.get(n)!; const on = sel.has(n); const grp = groupOf(n)
                return (
                  <tr key={n} onClick={() => toggle(n)} className={cn('cursor-pointer border-t border-border/60 hover:bg-muted/40', !x.n && 'text-muted-foreground/60')} style={on ? { background: 'rgba(200,100,59,0.05)' } : undefined}>
                    <td className="px-3 py-1.5"><span className={cb(on)} style={on ? { background: ACC } : undefined}>{on && '✓'}</span></td>
                    <td className="px-2 font-mono font-semibold">#{n}</td>
                    <td className="px-2"><span className="rounded-[5px] px-1.5 py-px text-[10.5px] font-semibold" style={{ background: `${GROUP_COLORS[grp]}1A`, color: GROUP_COLORS[grp] }}>{grp}</span></td>
                    {x.mix.map((c, i) => <td key={i} className="px-2 text-right">{c || '–'}</td>)}
                    <td className="px-2 text-right">{x.n}</td>
                    <td className={cn('px-2 text-right', on && x.n && 'font-semibold')}>{fmtTHB(x.s)}</td>
                    <td className="px-2"><div className="flex h-1.5 w-[84px] overflow-hidden rounded-full bg-muted">{x.n > 0 && x.mix.map((c, i) => <span key={i} style={{ width: `${(c / x.n) * 100}%`, background: MIX[i][1] }} />)}</div></td>
                    <td className="px-3 whitespace-nowrap">{lastFmt(x.last)}</td>
                  </tr>
                )
              })}
              {!visible.length && <tr><td colSpan={11} className="py-6 text-center text-muted-foreground">No machines match.</td></tr>}
            </tbody>
          </table>
        </div>
        {/* Footer: selection + download */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2.5" style={{ background: 'rgba(200,100,59,0.06)' }}>
          <span className="text-[12.5px]"><b>{list.length}</b> machine{list.length === 1 ? '' : 's'} selected
            {list.length > 0 && <> · <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setSel(new Set())}>clear</button></>}</span>
          <span className="text-[12.5px] text-muted-foreground">{picked.length.toLocaleString()} sales · {fmtDay(from)} – {fmtDay(to)}</span>
          <span className="hidden text-[12px] text-muted-foreground md:inline">{byGateway.map((x) => `${GW[x.g]} ${kfmt(x.s)}`).join(' · ')}</span>
          <b className="ml-auto text-[16px] tabular-nums">{fmtTHB(gross)}</b>
          {list.length > 0 && (noId > 0 ? <span className="text-[12px] text-red-600">{noId} without ID</span> : <span className="text-[12px] text-emerald-700 dark:text-emerald-400">✓ all IDs present</span>)}
          <Button size="sm" disabled={!list.length || rows == null} onClick={download} style={list.length ? { background: ACC } : undefined} className="text-white">⬇ {list.length ? 'Download' : 'Tick machines'}</Button>
        </div>
      </div>
      {list.length > 0 && <p className="text-[11.5px] text-muted-foreground">File: <span className="font-mono">{fileName}</span> · one Transactions sheet · Pay Solution ID: {opts.paySolutionId === 'order' ? 'OrderNo' : 'ReferenceNo'}{list.filter((n) => !stats.get(n)!.n).length > 0 && ` · ${list.filter((n) => !stats.get(n)!.n).length} zero-sale machine(s) listed as 0`}</p>}
      {waiting > 0 && <p className="rounded-md bg-amber-50 px-3 py-1.5 text-[12px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">⚠ {waiting} row{waiting === 1 ? '' : 's'} for the selected machines wait in Review and are not included.</p>}
      {disputed > 0 && <p className="rounded-md bg-red-50 px-3 py-1.5 text-[12px] text-red-800 dark:bg-red-500/10 dark:text-red-300">⚠ {disputed} payment{disputed === 1 ? '' : 's'} for the selected machines have a conflicting re-upload — counted at the saved amount until decided in Review.</p>}
      {unassigned.length > 0 && <p className="text-[12px] text-muted-foreground">Sales from machines outside the groups ({unassigned.map((m) => `#${m}`).join(', ')}) are in company totals but not in client reports until assigned.</p>}
    </div>
  )
}

// ── ③ Upload ──────────────────────────────────────────────────────────────────
interface Pending { files: (ImportFileSummary & { note?: string })[]; items: Classified[]; excludedNotes: string[] }
async function readRows(f: File): Promise<unknown[][]> {
  const isCsv = /\.csv$/i.test(f.name)
  const wb = isCsv ? XLSX.read(await f.text(), { type: 'string', raw: true }) : XLSX.read(await f.arrayBuffer())
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null })
}
function Upload({ onDone }: { onDone: () => void }) {
  const { user } = useAuth()
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [history, setHistory] = useState<SalesImport[]>([])
  const loadHistory = () => { void fetchImports().then(setHistory).catch(() => {}) }
  useEffect(loadHistory, [])

  async function pick(list: FileList | null) {
    if (!list?.length) return
    setBusy(true)
    try {
      const files: Pending['files'] = []; const all: (SaleRow & { source_file: string })[] = []; const excludedNotes: string[] = []
      for (const f of Array.from(list)) {
        const res = parseSheet(await readRows(f))
        if (res.format === 'combined') { files.push({ name: f.name, format: 'combined', rows: 0, new: 0, dup: 0, conflict: 0, review: 0, excluded: 0, from: null, to: null, gross_satang: 0, note: 'Already an SX client report (output) — skipped.' }); continue }
        if (res.format === 'unknown') { files.push({ name: f.name, format: 'unknown', rows: 0, new: 0, dup: 0, conflict: 0, review: 0, excluded: 0, from: null, to: null, gross_satang: 0, note: 'Not a KBank, Pay Solution or ChillPay export — skipped.' }); continue }
        const rows = res.rows.map((r) => ({ ...r, source_file: f.name }))
        all.push(...rows)
        const ds = rows.map((r) => r.biz_date).filter(Boolean).sort()
        files.push({ name: f.name, format: res.format, rows: rows.length, new: 0, dup: 0, conflict: 0, review: 0, excluded: res.excluded.length, from: ds[0] ?? null, to: ds[ds.length - 1] ?? null, gross_satang: 0 })
        const reasons = [...new Set(res.excluded.map((e) => e.reason))]
        if (reasons.length) excludedNotes.push(`${f.name}: ${reasons.map((r) => `${res.excluded.filter((e) => e.reason === r).length}× ${r}`).join(', ')}`)
        const odd = rows.filter((r) => r.status !== 'success').length
        if (odd) excludedNotes.push(`${f.name}: ${odd} refund / failed / unknown-status rows kept aside (not in sales)`)
      }
      const items = await classify(all)
      for (const fs of files) {
        const mine = items.filter((i) => i.row.source_file === fs.name)
        fs.new = mine.filter((i) => i.kind === 'new').length; fs.dup = mine.filter((i) => i.kind === 'dup').length
        fs.conflict = mine.filter((i) => i.kind === 'conflict').length; fs.review = mine.filter((i) => i.kind === 'review').length
        fs.gross_satang = mine.filter((i) => i.kind === 'new' && i.row.status === 'success').reduce((s, i) => s + i.row.amount_satang, 0)
      }
      setPending({ files, items, excludedNotes })
    } catch (e) { toast(`Couldn't read: ${e instanceof Error ? e.message : String(e)}`) } finally { setBusy(false) }
  }
  async function removeImport(h: SalesImport) {
    const gross = h.files.reduce((a, f) => a + (f.gross_satang ?? 0), 0)
    const msg = `Delete this upload?\n\n${h.files.map((f) => `• ${f.name}`).join('\n')}\n\n${h.new_rows.toLocaleString()} payment${h.new_rows === 1 ? '' : 's'} (${fmtTHB(gross)}) it added will be removed from the dashboard and client reports. Payments that were already saved by an earlier upload stay. You can upload the corrected file again afterwards.`
    if (!window.confirm(msg)) return
    setBusy(true)
    try { const r = await deleteImport(h); toast(`Deleted — ${r.rows.toLocaleString()} payments (${fmtTHB(r.satang)}) removed`); loadHistory(); onDone() }
    catch (e) { toast(`Delete failed: ${e instanceof Error ? e.message : String(e)}`) } finally { setBusy(false) }
  }
  async function commit() {
    if (!pending) return
    setBusy(true)
    try {
      const imp = await commitImport(pending.items, pending.files.filter((f) => f.format !== 'combined' && f.format !== 'unknown'), user?.email ?? null)
      toast(`Imported ${imp.new_rows.toLocaleString()} new rows${imp.review_rows ? ` · ${imp.review_rows} to review` : ''}`)
      setPending(null); loadHistory(); onDone()
    } catch (e) { toast(`Import failed — nothing saved. ${e instanceof Error ? e.message : String(e)}`) } finally { setBusy(false) }
  }
  const toSave = pending ? pending.items.filter((i) => i.kind === 'new' || i.kind === 'review').length : 0
  const conflicts = pending ? pending.items.filter((i) => i.kind === 'conflict').length : 0
  return (
    <div className="space-y-5">
      <label onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; if (!drag) setDrag(true) }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false) }}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!busy) void pick(e.dataTransfer.files) }}
        className={cn('block cursor-pointer rounded-xl border-2 border-dashed bg-card p-8 text-center text-[13px] text-muted-foreground transition-colors hover:border-foreground/30',
          drag ? 'border-foreground bg-foreground/[0.04] text-foreground' : 'border-border', busy && 'opacity-60')}>
        <input type="file" multiple accept=".xlsx,.xls,.csv" className="sr-only" disabled={busy} onChange={(e) => { void pick(e.target.files); e.target.value = '' }} />
        ⬆ {drag ? <b className="text-foreground">Drop to read the files</b> : <><b className="text-foreground">Drag files here</b> or <b className="text-foreground underline">choose files</b></>} — KBank, Pay Solution and ChillPay exports (.xlsx or .csv), several at once.<br />
        <span className="text-[12px]">File names don&apos;t matter; the format is detected from the columns. Uploading the same rows again adds nothing.</span>
      </label>
      {pending && (
        <div className={card}>
          <p className={cn(lbl, 'mb-2')}>PREVIEW · NOTHING SAVED YET</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12.5px] tabular-nums">
              <thead className="text-[11px] text-muted-foreground"><tr><th className="text-left py-1">File</th><th className="text-left">Detected</th><th className="text-left">Dates</th><th className="text-right">New</th><th className="text-right">Duplicate</th><th className="text-right">Conflict</th><th className="text-right">Review</th><th className="text-right">Excluded</th><th className="text-right">Gross (new)</th></tr></thead>
              <tbody>{pending.files.map((f) => (
                <tr key={f.name} className="border-t border-border/60">
                  <td className="py-1.5 max-w-[240px] truncate" title={f.name}>{f.name}</td>
                  <td><span className={cn('rounded-full px-2 py-px text-[11px] font-semibold', f.note ? 'bg-muted text-muted-foreground' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300')}>{f.format === 'combined' ? 'Combined report' : f.format === 'unknown' ? 'Unknown' : GW[f.format]}</span></td>
                  {f.note ? <td colSpan={7} className="text-muted-foreground">{f.note}</td> : <>
                    <td>{f.from ? `${fmtDay(f.from)} – ${fmtDay(f.to!)}` : '—'}</td>
                    <td className="text-right">{f.new.toLocaleString()}</td><td className="text-right">{f.dup.toLocaleString()}</td>
                    <td className={cn('text-right', f.conflict && 'font-semibold text-red-600')}>{f.conflict}</td><td className={cn('text-right', f.review && 'font-semibold text-amber-700')}>{f.review}</td>
                    <td className="text-right">{f.excluded}</td><td className="text-right">{fmtTHB(f.gross_satang)}</td></>}
                </tr>
              ))}</tbody>
            </table>
          </div>
          {pending.excludedNotes.length > 0 && <ul className="mt-2 list-disc pl-5 text-[12px] text-muted-foreground">{pending.excludedNotes.map((n) => <li key={n}>{n}</li>)}</ul>}
          {conflicts > 0 && <p className="mt-2 text-[12px] text-red-700 dark:text-red-300">{conflicts} row{conflicts === 1 ? '' : 's'} share a transaction ID with a different amount, date or machine (already saved, or twice in these files) — flagged in Review; the first value is counted until someone decides.</p>}
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>Cancel</Button>
            <Button onClick={() => void commit()} disabled={busy || (!toSave && !conflicts)}>{busy ? 'Saving…' : toSave ? `Import ${toSave.toLocaleString()} rows` : 'Flag conflicts'}</Button>
          </div>
        </div>
      )}
      <div className={card}>
        <p className={cn(lbl, 'mb-2')}>UPLOAD HISTORY</p>
        {history.length === 0 && <p className="text-[12.5px] text-muted-foreground">No uploads yet.</p>}
        {history.map((h) => (
          <div key={h.import_id} className="border-t border-border/60 py-2 text-[12.5px] first:border-0">
            <div className="flex flex-wrap gap-x-3"><b>{new Date(h.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</b><span className="text-muted-foreground">{h.created_by ?? ''}</span>
              <span className="ml-auto tabular-nums">{h.new_rows.toLocaleString()} new · {h.dup_rows.toLocaleString()} dup · {h.review_rows} review</span>
              <button type="button" disabled={busy} onClick={() => void removeImport(h)} aria-label={`Delete upload from ${h.created_at}`}
                className="text-muted-foreground hover:text-destructive">🗑 Delete</button></div>
            <div className="text-[12px] text-muted-foreground">{h.files.map((f) => `${f.name} (${GW[f.format] ?? f.format})`).join(' · ')}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ④ Review ──────────────────────────────────────────────────────────────────
function Review({ onChange }: { onChange: () => void }) {
  const [rows, setRows] = useState<StoredSale[] | null>(null)
  const load = useCallback(() => { void fetchReviewQueue().then(setRows).catch((e) => toast(String(e))) }, [])
  useEffect(load, [load])
  const act = async (key: string, patch: Partial<StoredSale>, msg: string) => {
    try { await patchSale(key, patch); toast(msg); load(); onChange() } catch (e) { toast(`Failed: ${e instanceof Error ? e.message : String(e)}`) }
  }
  return (
    <div className="space-y-5">
      <div className={card}>
        <p className={cn(lbl, 'mb-1')}>WAITING FOR A DECISION · {rows?.length ?? '…'}</p>
        <p className="mb-3 text-[12px] text-muted-foreground">Flagged rows (unclear date, machine, missing ID) are left out of the dashboard and client reports. Conflicts are counted at the saved amount until someone decides.</p>
        {rows?.length === 0 && <p className="text-[12.5px] text-muted-foreground">Nothing to review 🎉</p>}
        <div className="space-y-2">
          {rows?.map((r) => {
            const cands = (r.alt_date ?? '').split(' / ').filter(Boolean)
            return (
              <div key={r.key} className="rounded-lg border border-border p-2.5 text-[12.5px]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {r.conflict && <span className="rounded-full bg-red-50 px-2 py-px text-[11px] font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-300">Conflict</span>}
                  {r.review && <span className="rounded-full bg-amber-50 px-2 py-px text-[11px] font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{r.review}</span>}
                  <span className="text-muted-foreground">{GW[r.gateway]} · {r.source_file ?? ''} row {r.source_row}</span>
                  <span className="ml-auto font-mono text-[11.5px]">{r.txn_id || '(no ID)'}</span>
                </div>
                <div className="mt-1 text-muted-foreground">Machine {r.machine ?? '?'} · {r.biz_date || 'date ?'} {r.biz_time ?? ''} · {fmtTHB(r.amount_satang)} · {r.channel}</div>
                {r.conflict && <div className="mt-1 text-red-700 dark:text-red-300">Later file “{r.conflict.file}” says: machine {r.conflict.machine ?? '?'} · {r.conflict.biz_date} · {fmtTHB(r.conflict.amount_satang)}</div>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.conflict && <>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => act(r.key, { conflict: null }, 'Kept the saved values')}>Keep saved</Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => act(r.key, { amount_satang: r.conflict!.amount_satang, biz_date: r.conflict!.biz_date, machine: r.conflict!.machine, conflict: null }, 'Updated from the newer file')}>Use newer file</Button>
                  </>}
                  {r.review && cands.map((d) => <Button key={d} size="sm" variant="outline" className="h-7" onClick={() => act(r.key, { biz_date: d, review: null, alt_date: null }, `Date set to ${d}`)}>Date = {d}</Button>)}
                  {r.review && /machine/i.test(r.review) && <Button size="sm" variant="outline" className="h-7" onClick={() => { const v = window.prompt('Machine number for this payment:', r.machine != null ? String(r.machine) : ''); if (v && /^\d+$/.test(v.trim())) void act(r.key, { machine: Number(v), review: null }, `Machine set to #${v}`) }}>Set machine…</Button>}
                  {r.review && r.biz_date && r.machine != null && r.txn_id && !cands.length && <Button size="sm" variant="outline" className="h-7" onClick={() => act(r.key, { review: null }, 'Accepted')}>Accept as is</Button>}
                  {r.review && <Button size="sm" variant="outline" className="h-7 text-muted-foreground" onClick={() => window.confirm('Leave this payment out of all sales and reports?') && act(r.key, { review: null, status: 'excluded' }, 'Excluded')}>Exclude</Button>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className={card}>
        <p className={cn(lbl, 'mb-2')}>REPORT SETTINGS</p>
        <div className="grid sm:grid-cols-3 gap-4 text-[12.5px]">
          <div><p className="font-semibold">Pay Solution · ID in client files</p>
            <p className="mt-1 text-muted-foreground"><b className="text-foreground">ReferenceNo</b> (e.g. 004179474639) — confirmed by finance. OrderNo is still stored for lookups.</p></div>
          <div><p className="font-semibold">ChillPay · amount</p><p className="mt-1 text-muted-foreground">Client files use ยอดชำระรวม (incl. fee). Fees and net transfer are stored and shown on the dashboard.</p></div>
          <div><p className="font-semibold">Machine groups</p><p className="mt-1 text-muted-foreground">{SALES_GROUPS.map((g) => `${g.name} ${g.from}–${g.to}`).join(' · ')}</p></div>
        </div>
      </div>
    </div>
  )
}
