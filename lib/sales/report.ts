import * as XLSX from 'xlsx-js-style'
import type { SaleRow } from './parse'
import { groupOf, SALES_GROUPS } from './groups'

// Dashboard, preview and Excel all use these on the same accepted rows.
export const isAccepted = (r: Pick<SaleRow, 'status' | 'review' | 'biz_date'>) => r.status === 'success' && !r.review && !!r.biz_date

export interface Period { from: string; to: string }   // inclusive yyyy-mm-dd
export const inPeriod = (r: Pick<SaleRow, 'biz_date'>, p: Period) => r.biz_date >= p.from && r.biz_date <= p.to

export function selectRows(rows: SaleRow[], p: Period, machines: number[]): SaleRow[] {
  const set = new Set(machines)
  return rows.filter((r) => isAccepted(r) && inPeriod(r, p) && r.machine != null && set.has(r.machine))
    .sort((a, b) => a.biz_date.localeCompare(b.biz_date) || (a.biz_time ?? '').localeCompare(b.biz_time ?? '') || (a.machine! - b.machine!) || a.txn_id.localeCompare(b.txn_id))
}

export interface MachineLine { machine: number; group: string; count: number; satang: number; byChannel: Record<string, { count: number; satang: number }>; fee: number; net: number }
export function byMachine(rows: SaleRow[], machines: number[]): MachineLine[] {
  const m = new Map<number, MachineLine>(machines.map((n) => [n, { machine: n, group: groupOf(n), count: 0, satang: 0, byChannel: {}, fee: 0, net: 0 }]))
  for (const r of rows) {
    const l = m.get(r.machine!); if (!l) continue
    l.count++; l.satang += r.amount_satang
    const c = (l.byChannel[r.channel] ??= { count: 0, satang: 0 }); c.count++; c.satang += r.amount_satang
    l.fee += r.fee_satang ?? 0; l.net += r.net_satang ?? (r.amount_satang - (r.fee_satang ?? 0))
  }
  return [...m.values()].sort((a, b) => a.machine - b.machine)
}
export const thb = (satang: number) => satang / 100
export const fmtTHB = (satang: number) => '฿' + (satang / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export interface ExportOpts { paySolutionId: 'reference' | 'order' }
export const DEFAULT_EXPORT: ExportOpts = { paySolutionId: 'reference' }   // confirmed by finance: client ID = ReferenceNo
export const clientId = (r: SaleRow, o: ExportOpts) => (r.gateway === 'paysolution' && o.paySolutionId === 'order' ? (r.alt_ref ?? '') : r.txn_id)

export function reportFileName(p: Period, machines: number[]): string {
  const ms = [...machines].sort((a, b) => a - b)
  const g = SALES_GROUPS.find((x) => ms.length === x.to - x.from + 1 && ms[0] === x.from && ms[ms.length - 1] === x.to)
  const month = p.from.slice(0, 7) === p.to.slice(0, 7) ? p.from.slice(0, 7) : `${p.from}_${p.to}`
  const what = g ? `${g.name}_${g.from}-${g.to}` : ms.length === 1 ? `Machine${ms[0]}` : `Custom_${ms.length}machines`
  return `SX_${month}_${what}.xlsx`
}

export const DETAIL_HEADERS = ['Date', 'Machine No.', 'Product Group', 'PartnerID', 'PartnerName', 'PartnerShopID', 'MerchantID', 'PartnerTransactionUniqueID', 'Amount (THB)', 'Payment Channel', 'TransactionStatus', 'SettlementStatus']

// ── Styles (xlsx-js-style) ────────────────────────────────────────────────────
type Style = Record<string, unknown>
const ACC = 'C8643B', ACC_BG = 'FBEDE6', ACC_LINE = 'F3D6C8', INK = '1C1A17', ZEBRA = 'FAF9F7', GRID = 'E3E1DC'
const FONT = 'Calibri'
const border = (c = GRID) => ({ top: { style: 'thin', color: { rgb: c } }, bottom: { style: 'thin', color: { rgb: c } }, left: { style: 'thin', color: { rgb: c } }, right: { style: 'thin', color: { rgb: c } } })
const S = {
  title: { font: { name: FONT, sz: 15, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: ACC } }, alignment: { vertical: 'center' } },
  meta: { font: { name: FONT, sz: 10, color: { rgb: '555555' } } },
  kpiLabel: { font: { name: FONT, sz: 8, bold: true, color: { rgb: '9A5A3C' } }, fill: { fgColor: { rgb: ACC_BG } }, border: border(ACC_LINE) },
  kpiValue: { font: { name: FONT, sz: 13, bold: true, color: { rgb: INK } }, fill: { fgColor: { rgb: ACC_BG } }, border: border(ACC_LINE), alignment: { horizontal: 'left' } },
  head: { font: { name: FONT, sz: 10, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: INK } }, border: border(INK), alignment: { vertical: 'center' } },
  cell: { font: { name: FONT, sz: 10, color: { rgb: INK } }, border: border() },
  zero: { font: { name: FONT, sz: 10, color: { rgb: 'AAAAAA' } }, border: border() },
  total: { font: { name: FONT, sz: 10, bold: true, color: { rgb: INK } }, fill: { fgColor: { rgb: ACC_BG } }, border: { ...border(ACC_LINE), top: { style: 'medium', color: { rgb: ACC } } } },
  note: { font: { name: FONT, sz: 9, italic: true, color: { rgb: '777777' } } },
}
const withFill = (st: Style, rgb: string): Style => ({ ...st, fill: { fgColor: { rgb } } })
const right = (st: Style, fmt?: string): Style => ({ ...st, alignment: { horizontal: 'right' }, ...(fmt ? { numFmt: fmt } : {}) })
const MONEY = '#,##0.00', INT = '#,##0'
type Cell = { v: string | number; t?: 's' | 'n'; s?: Style; z?: string }
function put(ws: XLSX.WorkSheet, r: number, c: number, cell: Cell) {
  ws[XLSX.utils.encode_cell({ r, c })] = { t: cell.t ?? (typeof cell.v === 'number' ? 'n' : 's'), v: cell.v, ...(cell.z ? { z: cell.z } : {}), ...(cell.s ? { s: cell.s } : {}) }
}
const fmtLong = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const machineList = (ms: number[]) => {
  const out: string[] = []; let i = 0
  while (i < ms.length) { let j = i; while (j + 1 < ms.length && ms[j + 1] === ms[j] + 1) j++; out.push(j - i >= 2 ? `${ms[i]}–${ms[j]}` : ms.slice(i, j + 1).join(', ')); i = j + 1 }
  return out.join(', ')
}
const CHANNEL_COLS: [string, (r: SaleRow) => boolean][] = [
  ['PromptPay', (r) => r.channel === 'PromptPay'], ['KPlus', (r) => r.channel === 'KPlus'],
  ['Credit Card', (r) => r.gateway === 'paysolution'], ['ChillPay', (r) => r.gateway === 'chillpay'],
]

/** One workbook: Summary (every selected machine, zero-sale too) + Transactions (all rows). */
export function buildWorkbook(all: SaleRow[], p: Period, machines: number[], o: ExportOpts = DEFAULT_EXPORT, generatedAt = new Date()): { wb: XLSX.WorkBook; rows: SaleRow[]; lines: MachineLine[] } {
  const ms = [...machines].sort((a, b) => a - b)
  const rows = selectRows(all, p, ms)
  const lines = byMachine(rows, ms)
  const total = rows.reduce((s, r) => s + r.amount_satang, 0)
  const days = new Set(rows.map((r) => r.biz_date)).size
  const hasChill = rows.some((r) => r.gateway === 'chillpay')
  const groups = [...new Set(ms.map(groupOf))]
  const g = SALES_GROUPS.find((x) => ms.length === x.to - x.from + 1 && ms[0] === x.from && ms[ms.length - 1] === x.to)
  const who = g ? `${g.name} (machines ${g.from}–${g.to})` : groups.length === 1 ? `${groups[0]} (machines ${machineList(ms)})` : `Machines ${machineList(ms)}`

  // ── Summary ──
  const head = ['Machine No.', 'Group', ...CHANNEL_COLS.map(([k]) => k), 'Sales', 'Amount (THB)', ...(hasChill ? ['ChillPay fees (THB)', 'ChillPay net (THB)'] : [])]
  const W = head.length
  const wsS: XLSX.WorkSheet = {}
  put(wsS, 0, 0, { v: `SIXSHEET · Sales report — ${who}`, s: S.title })
  for (let c = 1; c < W; c++) put(wsS, 0, c, { v: '', s: S.title })
  put(wsS, 1, 0, { v: `Period: ${fmtLong(p.from)} – ${fmtLong(p.to)}   ·   Machines: ${machineList(ms)}`, s: S.meta })
  put(wsS, 1, W - 1, { v: `Generated ${generatedAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })}`, s: right(S.meta) })
  const kpis: [string, number, string][] = [
    ['TOTAL SALES (THB)', thb(total), MONEY], ['TRANSACTIONS', rows.length, INT],
    ['ACTIVE MACHINES', lines.filter((l) => l.count).length, INT], ['AVG / DAY WITH SALES (THB)', days ? Math.round(total / days) / 100 : 0, MONEY],
  ]
  const span = Math.max(1, Math.floor(W / 4))
  const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: W - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, W - 3) } }]
  kpis.forEach(([label, v, fmt], i) => {
    const c0 = i * span, c1 = i === 3 ? W - 1 : c0 + span - 1
    for (let c = c0; c <= c1; c++) { put(wsS, 3, c, { v: c === c0 ? label : '', s: S.kpiLabel }); put(wsS, 4, c, c === c0 ? { v, z: fmt, s: { ...S.kpiValue, numFmt: fmt } } : { v: '', s: S.kpiValue }) }
    if (c1 > c0) merges.push({ s: { r: 3, c: c0 }, e: { r: 3, c: c1 } }, { s: { r: 4, c: c0 }, e: { r: 4, c: c1 } })
  })
  const H = 6
  head.forEach((h, c) => put(wsS, H, c, { v: h, s: c >= 2 ? right(S.head) : S.head }))
  lines.forEach((l, i) => {
    const r = H + 1 + i
    const base = !l.count ? S.zero : i % 2 ? withFill(S.cell, ZEBRA) : S.cell
    const mine = rows.filter((x) => x.machine === l.machine)
    const chill = mine.filter((x) => x.gateway === 'chillpay')
    const vals: (string | number)[] = [String(l.machine), l.group, ...CHANNEL_COLS.map(([, f]) => mine.filter(f).length), l.count, thb(l.satang),
      ...(hasChill ? [thb(chill.reduce((s, x) => s + (x.fee_satang ?? 0), 0)), thb(chill.reduce((s, x) => s + (x.net_satang ?? 0), 0))] : [])]
    vals.forEach((v, c) => put(wsS, r, c, c < 2 ? { v: String(v), t: 's', s: base } : { v, z: c >= W - (hasChill ? 3 : 1) ? MONEY : INT, s: right(base, c >= W - (hasChill ? 3 : 1) ? MONEY : INT) }))
  })
  const T = H + 1 + lines.length
  const chillAll = rows.filter((x) => x.gateway === 'chillpay')
  const tv: (string | number)[] = ['TOTAL', g ? `${g.from}–${g.to}` : `${ms.length} machines`, ...CHANNEL_COLS.map(([, f]) => rows.filter(f).length), rows.length, thb(total),
    ...(hasChill ? [thb(chillAll.reduce((s, x) => s + (x.fee_satang ?? 0), 0)), thb(chillAll.reduce((s, x) => s + (x.net_satang ?? 0), 0))] : [])]
  tv.forEach((v, c) => put(wsS, T, c, c < 2 ? { v: String(v), t: 's', s: S.total } : { v, z: c >= W - (hasChill ? 3 : 1) ? MONEY : INT, s: right(S.total, c >= W - (hasChill ? 3 : 1) ? MONEY : INT) }))
  put(wsS, T + 2, 0, { v: 'Amounts are gross collected per payment. Every payment is listed on the “Transactions” sheet.', s: S.note })
  wsS['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: T + 2, c: W - 1 } })
  wsS['!merges'] = merges
  wsS['!cols'] = head.map((h, c) => ({ wch: c === 0 ? 13 : c === 1 ? 12 : Math.max(11, h.length + 2) }))
  wsS['!rows'] = [{ hpt: 26 }, { hpt: 16 }, { hpt: 6 }, { hpt: 14 }, { hpt: 22 }, { hpt: 6 }, { hpt: 18 }]
  wsS['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }

  // ── Transactions — same 12 columns as the old per-machine file ──
  const kb = (r: SaleRow, v: string | null) => (r.gateway === 'kbank' ? (v ?? '') : '')
  const wsT: XLSX.WorkSheet = {}
  DETAIL_HEADERS.forEach((h, c) => put(wsT, 0, c, { v: h, s: c === 8 ? right(S.head) : S.head }))
  rows.forEach((r, i) => {
    const st = i % 2 ? withFill(S.cell, ZEBRA) : S.cell
    const vals = [r.biz_date, String(r.machine), groupOf(r.machine), kb(r, r.partner_id), kb(r, r.partner_name), kb(r, r.partner_shop_id),
      r.gateway === 'chillpay' ? '' : r.merchant_id, clientId(r, o), thb(r.amount_satang), r.channel,
      r.gateway === 'chillpay' ? '' : (r.txn_status ?? ''), r.gateway === 'kbank' ? (r.settle_status ?? '') : '']
    vals.forEach((v, c) => put(wsT, i + 1, c, c === 8 ? { v, t: 'n', z: MONEY, s: right(st, MONEY) } : { v: String(v), t: 's', z: '@', s: st }))
  })
  const TT = rows.length + 1
  for (let c = 0; c < 12; c++) put(wsT, TT, c, c === 0 ? { v: 'TOTAL', s: S.total } : c === 7 ? { v: `${rows.length.toLocaleString('en-US')} payments`, s: S.total } : c === 8 ? { v: thb(total), t: 'n', z: MONEY, s: right(S.total, MONEY) } : { v: '', s: S.total })
  wsT['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: TT, c: 11 } })
  wsT['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, rows.length), c: 11 } }) }
  wsT['!cols'] = [11, 11, 13, 12, 32, 13, 16, 26, 13, 15, 16, 16].map((w) => ({ wch: w }))
  ;(wsT as Record<string, unknown>)['!views'] = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2' }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsS, 'Summary')
  XLSX.utils.book_append_sheet(wb, wsT, 'Transactions')
  return { wb, rows, lines }
}

/** Save in the browser — must use the styled writer, or colours are dropped. */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx', cellStyles: true, compression: true })
}
