import * as XLSX from 'xlsx'
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
export const DEFAULT_EXPORT: ExportOpts = { paySolutionId: 'reference' }
export const clientId = (r: SaleRow, o: ExportOpts) => (r.gateway === 'paysolution' && o.paySolutionId === 'order' ? (r.alt_ref ?? '') : r.txn_id)

export function reportFileName(p: Period, machines: number[]): string {
  const ms = [...machines].sort((a, b) => a - b)
  const g = SALES_GROUPS.find((x) => ms.length === x.to - x.from + 1 && ms[0] === x.from && ms[ms.length - 1] === x.to)
  const month = p.from.slice(0, 7) === p.to.slice(0, 7) ? p.from.slice(0, 7) : `${p.from}_${p.to}`
  const what = g ? `${g.name}_${g.from}-${g.to}` : ms.length === 1 ? `Machine${ms[0]}` : `Custom_${ms.length}machines`
  return `SX_${month}_${what}.xlsx`
}

export const DETAIL_HEADERS = ['Date', 'Machine No.', 'Product Group', 'PartnerID', 'PartnerName', 'PartnerShopID', 'MerchantID', 'PartnerTransactionUniqueID', 'Amount (THB)', 'Payment Channel', 'TransactionStatus', 'SettlementStatus']

/** One workbook: Summary (every selected machine, zero-sale too) + Transactions (all rows). */
export function buildWorkbook(all: SaleRow[], p: Period, machines: number[], o: ExportOpts = DEFAULT_EXPORT): { wb: XLSX.WorkBook; rows: SaleRow[]; lines: MachineLine[] } {
  const rows = selectRows(all, p, machines)
  const lines = byMachine(rows, machines)
  const channels = [...new Set(rows.map((r) => r.channel))].sort()
  const total = rows.reduce((s, r) => s + r.amount_satang, 0)

  // Summary
  const sum: (string | number)[][] = [
    ['SX sales report'], ['Period', `${p.from} to ${p.to}`], ['Machines', machines.length], [],
    ['Machine No.', 'Product Group', ...channels.flatMap((c) => [`${c} (count)`, `${c} (THB)`]), 'Sales', 'Amount (THB)', 'Fees (THB)', 'Net (THB)'],
    ...lines.map((l) => [String(l.machine), l.group, ...channels.flatMap((c) => [l.byChannel[c]?.count ?? 0, thb(l.byChannel[c]?.satang ?? 0)]), l.count, thb(l.satang), thb(l.fee), thb(l.net)]),
    ['Total', '', ...channels.flatMap((c) => { const k = rows.filter((r) => r.channel === c); return [k.length, thb(k.reduce((s, r) => s + r.amount_satang, 0))] }),
      rows.length, thb(total), thb(lines.reduce((s, l) => s + l.fee, 0)), thb(lines.reduce((s, l) => s + l.net, 0))],
  ]
  const wsS = XLSX.utils.aoa_to_sheet(sum)

  // Transactions — same 12 columns as the old per-machine file; Total sits below a blank row.
  const kb = (r: SaleRow, v: string | null) => (r.gateway === 'kbank' ? (v ?? '') : '')
  const det: (string | number)[][] = [DETAIL_HEADERS, ...rows.map((r) => [
    r.biz_date, String(r.machine), groupOf(r.machine), kb(r, r.partner_id), kb(r, r.partner_name), kb(r, r.partner_shop_id),
    r.gateway === 'chillpay' ? '' : r.merchant_id, clientId(r, o), thb(r.amount_satang), r.channel,
    r.gateway === 'chillpay' ? '' : (r.txn_status ?? ''), r.gateway === 'kbank' ? (r.settle_status ?? '') : '',
  ]), [], ['Total', '', '', '', '', '', '', '', thb(total), '', '', '']]
  const wsT = XLSX.utils.aoa_to_sheet(det)
  // IDs and machine numbers as text cells (leading zeros stay).
  for (let i = 1; i <= rows.length; i++) for (const col of [1, 3, 5, 6, 7]) {
    const a = XLSX.utils.encode_cell({ r: i, c: col }); const cell = wsT[a]; if (cell) { cell.t = 's'; cell.v = String(cell.v); cell.z = '@' }
  }
  for (let i = 1; i <= rows.length; i++) { const a = XLSX.utils.encode_cell({ r: i, c: 8 }); if (wsT[a]) wsT[a].z = '#,##0.00' }
  wsT['!cols'] = [12, 11, 14, 12, 34, 13, 16, 26, 13, 15, 16, 16].map((w) => ({ wch: w }))
  wsS['!cols'] = [12, 14, ...channels.flatMap(() => [10, 12]), 8, 14, 12, 14].map((w) => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsS, 'Summary')
  XLSX.utils.book_append_sheet(wb, wsT, 'Transactions')
  return { wb, rows, lines }
}
