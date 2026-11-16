import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { detect, kbankDate, parseSheet, paySolutionMachine, type SaleRow } from './parse'
import { buildWorkbook, byMachine, selectRows } from './report'
import { machinesOf, SALES_GROUPS } from './groups'

// ── small sanitized fixtures (always run) ─────────────────────────────────────
describe('sales parsers · fixtures', () => {
  it('KBank: transposed Excel date resolved by ID time, text date kept, example row excluded', () => {
    expect(kbankDate('15/11/2026', '20261114-172325', '20261114').date).toBe('2026-11-15')
    // after-midnight local sale with previous-day REF3
    const serial = (y: number, m: number, d: number) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000
    expect(kbankDate(serial(2026, 1, 11), '20261031-165901', '20261031').date).toBe('2026-11-01')
    const rows = [
      ['PartnerID', 'PartnerName', 'PartnerShopID', 'MerchantID', 'MerchantName', 'TerminalID', 'PartnerTransactionUniqueID', 'Amount', 'TransactionStatus', 'SettlementStatus', 'TransactionDate', 'TransactionTime', 'REF1', 'REF2', 'REF3', 'REF4', 'PaymentType', 'RefID'],
      ['PTR1', 'ตัวอย่าง!!!', 'S1', 'KB1', 'x', null, 'SX0020220930-160608', 0, 'PAID', 'SETTLED', 44564, 0.04, 'X', 'SX00', '20220930', null, 'KPLUS', '1'],
      ['PTR1', 'SIXSHEET', 'S1', 'KB1', 'x', null, 'SX04420261103-031522', '180.00', 'PAID', 'SETTLED', '03/11/2026', '10:15:22', '44', 'SX044', '20261103', null, 'PROMPTPAY', '2'],
    ]
    const r = parseSheet(rows)
    expect(r.format).toBe('kbank'); expect(r.excluded).toHaveLength(1)
    expect(r.rows[0]).toMatchObject({ machine: 44, biz_date: '2026-11-03', amount_satang: 18000, channel: 'PromptPay', review: null })
  })
  it('Pay Solution: machine from ReferenceNo prefix, leading zeros kept', () => {
    expect(paySolutionMachine('044179473823')).toBe(44)
    expect(paySolutionMachine('44179473823')).toBe(44)
    expect(paySolutionMachine('004179474639')).toBe(4)
    expect(paySolutionMachine('123')).toBeNull()
  })
  it('CSV with BOM, Thai headers, quoted newline header and leading zeros', () => {
    const csv = '﻿OrderDateTime,ReferenceNo,OrderNo,MerchantID,Merchant Name,ProductDetail,Type,Total,totalAmount(THB),CardType,Status,StatusName,totalFee,Net,paymentDate\n' +
      '2026-11-02 10:00:00,044179473823,120000001,40594,SIXSHEET,SX044179473823,ONLINE,180,180,V,CP,Completed,5.04,174.6,2026-11-02 10:00:00\n'
    const wb = XLSX.read(csv, { type: 'string', raw: true })
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null })
    const r = parseSheet(rows)
    expect(r.format).toBe('paysolution')
    expect(r.rows[0]).toMatchObject({ txn_id: '044179473823', machine: 44, amount_satang: 18000, channel: 'Credit Card' })
    const cp = 'CHILLPAY\nMerchant : SIXSHEET\n\nNo,วันที่ทำรายการ,ชื่อลูกค้า/รหัสลูกค้า,เลขที่รายการ,ช่องทางชำระ,"ยอดชำระรวม \n(รวมค่าธรรมเนียม)","ยอดเงินโอน \nให้ร้านค้า"\n1,01/11/2026 09:00:00,"CAPTURES C073 ROOM 073",SXC07326110100000001,QRCode,195,188.58\n,Total,,,,195,188.58\n'
    const w2 = XLSX.read(cp, { type: 'string', raw: true })
    const r2 = parseSheet(XLSX.utils.sheet_to_json<unknown[]>(w2.Sheets[w2.SheetNames[0]], { header: 1, raw: true, defval: null }))
    expect(r2.format).toBe('chillpay')
    expect(r2.rows).toHaveLength(1); expect(r2.excluded[0].reason).toBe('Total footer')
    expect(r2.rows[0]).toMatchObject({ machine: 73, amount_satang: 19500, net_satang: 18858, biz_date: '2026-11-01' })
  })
  it('detects a combined (already-built) report', () => {
    expect(detect([['Date', 'Machine No.', 'Product Group', 'PartnerTransactionUniqueID', 'Amount (THB)', 'Payment Channel']]).format).toBe('combined')
  })
})

// ── finance's real samples (local only; skipped when the files aren't there) ──
const DIR = path.join(os.homedir(), 'Downloads', 'SX report excel sample')
const has = fs.existsSync(DIR)
const read = (f: string) => {
  const wb = XLSX.read(fs.readFileSync(path.join(DIR, f)))
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null })
}
describe.skipIf(!has)('sales · acceptance on supplied samples', () => {
  const all: SaleRow[] = has ? [
    ...parseSheet(read('SX_AUTOMAT_NOV_2026y (1).xlsx')).rows,
    ...parseSheet(read('orderlist (10).xlsx')).rows,
    ...parseSheet(read('M038447-settlement-20261116105110.xlsx')).rows,
  ] : []
  const sum = (rs: SaleRow[]) => rs.reduce((s, r) => s + r.amount_satang, 0)

  it('Machine 12 · 1–12 Nov matches the reference workbook', () => {
    const rs = selectRows(all, { from: '2026-11-01', to: '2026-11-12' }, [12])
    expect(rs.length).toBe(44); expect(sum(rs)).toBe(775000)
    const by = (c: string) => rs.filter((r) => r.channel === c)
    expect([by('PromptPay').length, sum(by('PromptPay'))]).toEqual([21, 336400])
    expect([by('KPlus').length, sum(by('KPlus'))]).toEqual([18, 318600])
    expect([by('Credit Card').length, sum(by('Credit Card'))]).toEqual([5, 120000])
    const ref = read('SX_November_2026_Machine12_withCC (1).xlsx')
    const refIds = ref.slice(1).map((r) => String(r[7] ?? '')).filter((s) => s.startsWith('SX'))
    expect(rs.filter((r) => r.gateway === 'kbank').map((r) => r.txn_id).sort()).toEqual(refIds.sort())
  })
  it('Machine 12 · 1–15 Nov', () => {
    const rs = selectRows(all, { from: '2026-11-01', to: '2026-11-15' }, [12])
    expect(rs.filter((r) => r.gateway === 'kbank').length).toBe(56)
    expect(rs.filter((r) => r.gateway === 'paysolution').length).toBe(6)
    expect(sum(rs)).toBe(1099000)
  })
  it('True preset · 1–15 Nov → one workbook, 423 / ฿70,360', () => {
    const ms = machinesOf(SALES_GROUPS.find((g) => g.id === 'true')!)
    const p = { from: '2026-11-01', to: '2026-11-15' }
    const rs = selectRows(all, p, ms)
    expect([rs.filter((r) => r.gateway === 'kbank').length, sum(rs.filter((r) => r.gateway === 'kbank'))]).toEqual([366, 6058000])
    expect([rs.filter((r) => r.gateway === 'paysolution').length, sum(rs.filter((r) => r.gateway === 'paysolution'))]).toEqual([57, 978000])
    expect([rs.length, sum(rs)]).toEqual([423, 7036000])
    const lines = byMachine(rs, ms); expect(lines).toHaveLength(11)
    const minus = selectRows(all, p, ms.filter((m) => m !== 44))
    expect(sum(rs) - sum(minus)).toBe(lines.find((l) => l.machine === 44)!.satang)
    // workbook round-trip: detail sum + ID cells as text
    const { wb } = buildWorkbook(all, p, ms)
    const back = XLSX.read(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
    const t = XLSX.utils.sheet_to_json<unknown[]>(back.Sheets.Transactions, { header: 1, raw: true, defval: null })
    const data = t.slice(1, 1 + rs.length)
    expect(Math.round(data.reduce((s, r) => s + Number(r[8]), 0) * 100)).toBe(7036000)
    expect(data.every((r) => typeof r[7] === 'string' && r[7] !== '')).toBe(true)
    expect(back.Sheets.Transactions[XLSX.utils.encode_cell({ r: 1, c: 7 })].t).toBe('s')
  })
  it('ChillPay alone · 1–15 Nov', () => {
    const rs = all.filter((r) => r.gateway === 'chillpay' && r.biz_date >= '2026-11-01' && r.biz_date <= '2026-11-15')
    expect(rs.length).toBe(661); expect(sum(rs)).toBe(13391523)
    expect(rs.filter((r) => r.method === 'QRCode').length).toBe(656)
    expect(rs.filter((r) => r.method === 'TrueMoney').length).toBe(5)
    expect(rs.filter((r) => r.machine === 0).length).toBe(2)
  })
  it('no KBank row is left with an unresolved date', () => {
    expect(all.filter((r) => r.review).map((r) => `${r.gateway} r${r.source_row}: ${r.review} ${r.alt_date ?? ''}`)).toEqual([])
  })
})
