import * as XLSX from 'xlsx-js-style'
import type { SaleRow } from './parse'
import { clientGroupOf, groupOf, SALES_GROUPS } from './groups'

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

export interface ExportOpts { paySolutionId: 'reference' | 'order'; includeRef?: boolean }   // includeRef: last 'ref' column (default on)
export const DEFAULT_EXPORT: ExportOpts = { paySolutionId: 'reference' }   // confirmed by finance: client ID = ReferenceNo
export const clientId = (r: SaleRow, o: ExportOpts) => (r.gateway === 'paysolution' && o.paySolutionId === 'order' ? (r.alt_ref ?? '') : r.txn_id)

export function reportFileName(p: Period, machines: number[]): string {
  const ms = [...machines].sort((a, b) => a - b)
  const g = SALES_GROUPS.find((x) => x.ms.length === ms.length && x.ms.every((n, i) => n === ms[i]))
  const month = p.from.slice(0, 7) === p.to.slice(0, 7) ? p.from.slice(0, 7) : `${p.from}_${p.to}`
  const what = g ? `${g.name.replace(/[^A-Za-z0-9]+/g, '')}_${g.ms[0]}-${g.ms[g.ms.length - 1]}` : ms.length === 1 ? `Machine${ms[0]}` : `Custom_${ms.length}machines`
  return `SX_${month}_${what}.xlsx`
}

export const DETAIL_HEADERS = ['Date', 'Product Group', 'PartnerID', 'PartnerName', 'PartnerShopID', 'MerchantID', 'PartnerTransactionUniqueID', 'Machine No.', 'Amount (THB)', 'Payment Channel', 'TransactionStatus', 'SettlementStatus', 'ref']

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
const MONEY = '#,##0.00'
type Cell = { v: string | number; t?: 's' | 'n'; s?: Style; z?: string }
function put(ws: XLSX.WorkSheet, r: number, c: number, cell: Cell) {
  ws[XLSX.utils.encode_cell({ r, c })] = { t: cell.t ?? (typeof cell.v === 'number' ? 'n' : 's'), v: cell.v, ...(cell.z ? { z: cell.z } : {}), ...(cell.s ? { s: cell.s } : {}) }
}
/** KBank is the master format: every client row carries these values (finance's rule). */
export const KBANK_MASTER = {
  partner_id: 'PTR0000034', partner_name: 'บริษัท ซิกชีท กรุ๊ป จำกัด (SIXSHEET)', partner_shop_id: 'SIXSIT001',
  merchant_id: 'KB000001662967', txn_status: 'PAID', settle_status: 'SETTLED',
}
/** The 12 client columns for one payment (KBank values kept; others filled from the master). */
// ── KBank-format IDs for card / ChillPay rows ─────────────────────────────────
// KBank: SX + machine + YYYYMMDD-HHMMSS in UTC (Thai time − 7 h). The machine
// prefix is per machine and not always 3 digits (SX47 but SX041), so copy it
// from that machine's KBank IDs; known 2-digit ones are listed as a fallback.
const KNOWN_PREFIX: Record<number, string> = { 40: 'SX40', 44: 'SX44', 45: 'SX45', 46: 'SX46', 47: 'SX47', 50: 'SX50' }
export function machinePrefixes(rows: SaleRow[]): Map<number, string> {
  const m = new Map<number, string>(Object.entries(KNOWN_PREFIX).map(([k, v]) => [Number(k), v]))
  for (const r of rows) {
    if (r.gateway !== 'kbank' || r.machine == null) continue
    const pre = /^(SX\d+?)\d{8}-\d{6}$/i.exec(r.txn_id)?.[1]
    if (pre) m.set(r.machine, pre.toUpperCase())
  }
  return m
}
const prefixFor = (m: Map<number, string>, n: number) => m.get(n) ?? `SX${String(n).padStart(3, '0')}`
/** Thai date + time → KBank's UTC stamp, plus `addSec` seconds. */
export function utcStamp(date: string, time: string | null, addSec = 0): string {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi, se] = (time ?? '00:00:00').split(':').map(Number)
  const t = new Date(Date.UTC(y, mo - 1, d, h - 7, mi, (se || 0) + addSec))
  const p2 = (n: number) => String(n).padStart(2, '0')
  return `${t.getUTCFullYear()}${p2(t.getUTCMonth() + 1)}${p2(t.getUTCDate())}-${p2(t.getUTCHours())}${p2(t.getUTCMinutes())}${p2(t.getUTCSeconds())}`
}
/** PartnerTransactionUniqueID + ref for every row. KBank rows unchanged (ref empty); others built, unique. */
export function clientIds(rows: SaleRow[], all: SaleRow[], o: ExportOpts = DEFAULT_EXPORT): Map<string, { id: string; ref: string }> {
  const pre = machinePrefixes(all)
  const used = new Set(all.filter((r) => r.gateway === 'kbank').map((r) => r.txn_id))
  const out = new Map<string, { id: string; ref: string }>()
  for (const r of rows) {
    if (r.gateway === 'kbank') { out.set(r.key, { id: r.txn_id, ref: '' }); continue }
    let k = 0, id = ''
    do { id = `${prefixFor(pre, r.machine ?? 0)}${utcStamp(r.biz_date, r.biz_time, k++)}` } while (used.has(id))
    used.add(id)
    out.set(r.key, { id, ref: clientId(r, o) })
  }
  return out
}

/** The 13 client columns for one payment (KBank values kept; others filled from the master). */
export function clientRow(r: SaleRow, ids: { id: string; ref: string }): (string | number)[] {
  const k = r.gateway === 'kbank'
  const pick = (own: string | null, master: string) => (k && own ? own : master)
  return [
    r.biz_date, clientGroupOf(r.machine),
    pick(r.partner_id, KBANK_MASTER.partner_id), pick(r.partner_name, KBANK_MASTER.partner_name), pick(r.partner_shop_id, KBANK_MASTER.partner_shop_id),
    pick(r.merchant_id, KBANK_MASTER.merchant_id), ids.id, r.machine ?? 0, thb(r.amount_satang), r.channel,
    r.status === 'success' ? KBANK_MASTER.txn_status : (r.txn_status ?? ''), pick(r.settle_status, KBANK_MASTER.settle_status), ids.ref,
  ]
}

/** One workbook, one sheet: Transactions (all selected payments + TOTAL row). */
export function buildWorkbook(all: SaleRow[], p: Period, machines: number[], o: ExportOpts = DEFAULT_EXPORT): { wb: XLSX.WorkBook; rows: SaleRow[]; lines: MachineLine[] } {
  const ms = [...machines].sort((a, b) => a - b)
  const rows = selectRows(all, p, ms)
  const lines = byMachine(rows, ms)
  const total = rows.reduce((s, r) => s + r.amount_satang, 0)
  const wsT: XLSX.WorkSheet = {}
  const NC = o.includeRef === false ? 12 : 13
  DETAIL_HEADERS.slice(0, NC).forEach((h, c) => put(wsT, 0, c, { v: h, s: c === 8 || c === 7 ? right(S.head) : S.head }))
  const ids = clientIds(rows, all, o)
  rows.forEach((r, i) => {
    const st = i % 2 ? withFill(S.cell, ZEBRA) : S.cell
    clientRow(r, ids.get(r.key)!).slice(0, NC).forEach((v, c) => put(wsT, i + 1, c,
      c === 8 ? { v, t: 'n', z: MONEY, s: right(st, MONEY) }
        : c === 7 ? { v: Number(v), t: 'n', z: '0', s: right(st) }   // Machine No. as a number (no "stored as text" flags)
          : { v: String(v), t: 's', z: '@', s: st }))
  })
  const TT = rows.length + 1
  for (let c = 0; c < NC; c++) put(wsT, TT, c, c === 0 ? { v: 'TOTAL', s: S.total } : c === 6 ? { v: `${rows.length.toLocaleString('en-US')} payments`, s: S.total } : c === 8 ? { v: thb(total), t: 'n', z: MONEY, s: right(S.total, MONEY) } : { v: '', s: S.total })
  wsT['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: TT, c: NC - 1 } })
  wsT['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(1, rows.length), c: NC - 1 } }) }
  wsT['!cols'] = [11, 13, 12, 32, 13, 16, 24, 11, 13, 15, 16, 16, 22].slice(0, NC).map((w) => ({ wch: w }))
  ;(wsT as Record<string, unknown>)['!views'] = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2' }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsT, 'Transactions')
  return { wb, rows, lines }
}

/** Save in the browser — must use the styled writer, or colours are dropped. */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  XLSX.writeFile(wb, fileName, { bookType: 'xlsx', cellStyles: true, compression: true })
}
