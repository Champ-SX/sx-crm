import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { detect, kbankDate, parseSheet, paySolutionMachine, type SaleRow } from './parse'
import { buildWorkbook, byMachine, selectRows, utcStamp } from './report'
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
  it('KBank-format stamp is UTC (Thai − 7 h), previous day after midnight', () => {
    expect(utcStamp('2026-11-01', '10:18:04')).toBe('20261101-031804')
    expect(utcStamp('2026-11-02', '00:30:00')).toBe('20261101-173000')
    expect(utcStamp('2026-11-15', '22:02:48', 1)).toBe('20261115-150249')
  })
  it('KBank FTP file: REF2 empty → machine from the ID (2- or 3-digit)', () => {
    const h = ['PartnerID', 'PartnerName', 'PartnerShopID', 'MerchantID', 'MerchantName', 'TerminalID', 'PartnerTransactionUniqueID', 'Amount', 'TransactionStatus', 'SettlementStatus', 'TransactionDate', 'TransactionTime', 'REF1', 'REF2', 'REF3', 'REF4', 'PaymentType', 'RefID']
    const row = (id: string) => ['PTR1', 'SIX', 'S1', 'KB1', 'x', '', id, '180', 'PAID', 'SETTLED', '16/11/2026', '10:42:44', '', '', '', '', 'KPLUS', '1']
    const r = parseSheet([h, row('SX4420261116-034237'), row('SX01320261116-024416'), row('SX4020261116-052120')])
    expect(r.rows.map((x) => [x.machine, x.raw_machine, x.review])).toEqual([[44, 'SX44', null], [13, 'SX013', null], [40, 'SX40', null]])
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
    expect(data.every((r) => typeof r[6] === 'string' && /^SX\d+\d{8}-\d{6}$/.test(String(r[6])))).toBe(true)
    expect(new Set(data.map((r) => r[6])).size).toBe(data.length)   // every ID unique
    expect(back.Sheets.Transactions[XLSX.utils.encode_cell({ r: 1, c: 6 })].t).toBe('s')
    expect(t[0][7]).toBe('Machine No.'); expect(data.every((r) => typeof r[7] === 'number' && r[7] >= 40 && r[7] <= 50)).toBe(true)
    expect(back.SheetNames).toEqual(['Transactions'])
    // KBank master format: every row fully filled, status PAID / SETTLED
    expect(data.every((r) => r.slice(0, 12).every((c) => c !== null && c !== ''))).toBe(true)
    expect(t[0][12]).toBe('ref')
    const card = data.find((r) => r[9] === 'Credit Card')!
    expect(card.slice(2, 6)).toEqual(['PTR0000034', 'บริษัท ซิกชีท กรุ๊ป จำกัด (SIXSHEET)', 'SIXSIT001', 'KB000001662967'])
    expect([card[10], card[11]]).toEqual(['PAID', 'SETTLED'])
    // card: KBank-format ID (machine prefix + UTC), original ReferenceNo in ref; KBank rows: ref empty
    const src = rs.find((r) => r.gateway === 'paysolution' && r.txn_id === card[12])!
    expect(src).toBeTruthy()
    expect(card[6]).toBe(`${src.machine === 44 || src.machine === 47 || src.machine === 46 || src.machine === 45 ? 'SX' + src.machine : 'SX0' + src.machine}${utcStamp(src.biz_date, src.biz_time)}`)
    expect(data.filter((r) => r[9] !== 'Credit Card').every((r) => (r[12] ?? '') === '')).toBe(true)
    // ref column off → 12 columns
    const noRef = XLSX.read(XLSX.write(buildWorkbook(all, p, ms, { paySolutionId: 'reference', includeRef: false }).wb, { type: 'buffer', bookType: 'xlsx' }))
    const h2 = XLSX.utils.sheet_to_json<unknown[]>(noRef.Sheets.Transactions, { header: 1, raw: true, defval: null })[0]
    expect(h2.length).toBe(12); expect(h2[11]).toBe('SettlementStatus')
  })
  it('ChillPay alone · 1–15 Nov', () => {
    const rs = all.filter((r) => r.gateway === 'chillpay' && r.biz_date >= '2026-11-01' && r.biz_date <= '2026-11-15')
    expect(rs.length).toBe(661); expect(sum(rs)).toBe(13391523)
    expect(rs.filter((r) => r.method === 'QRCode').length).toBe(656)
    expect(rs.filter((r) => r.method === 'TrueMoney').length).toBe(5)
    expect(rs.filter((r) => r.machine === 0).length).toBe(2)
  })
  it('no KBank row is left with an unresolved date', () => {
    expect(all.filter((r) => r.review && r.gateway === 'kbank').map((r) => `${r.gateway} r${r.source_row}: ${r.review} ${r.alt_date ?? ''}`)).toEqual([])
    // the two ChillPay machine-000 payments (not booth sales) wait for a person
    expect(all.filter((r) => r.review).map((r) => `${r.gateway} r${r.source_row}: ${r.review}`)).toEqual(['chillpay r504: No booth: machine 000', 'chillpay r622: No booth: machine 000'])
  })
})

describe.skipIf(!has)('sales · insights on supplied samples', () => {
  it('detects the 1–7 Nov event booths and forecasts permanent booths separately', async () => {
    const { computeInsights } = await import('./insights')
    const { isAccepted } = await import('./report')
    const all = [
      ...parseSheet(read('SX_AUTOMAT_NOV_2026y (1).xlsx')).rows,
      ...parseSheet(read('orderlist (10).xlsx')).rows,
      ...parseSheet(read('M038447-settlement-20261116105110.xlsx')).rows,
    ].filter(isAccepted)
    const i = computeInsights(all, '2026-11')
    expect(i.eventMachines).toEqual([9, 32, 33])
    expect(i.eventGross).toBe(56625000)
    expect(i.gross).toBe(125855000)   // excludes the 2 machine-000 ChillPay payments (฿8,120.23) now in Review
    expect(i.coveredDays).toBe(15)
    expect(Math.round(i.weekendShare * 100)).toBe(47)
    expect(i.peakHour).toBe(15)
    expect(i.alerts.some((a) => a.kind === 'stopped' && a.machine === 17)).toBe(true)
    expect(i.alerts.some((a) => a.kind === 'stopped' && a.machine === 41)).toBe(true)
    expect(i.daily.reduce((a, d) => a + d.event + d.perm, 0)).toBe(i.gross)
  })
  it('ChillPay API export: Success only, settlement-compatible key', () => {
    const csv = '\ufefftransactionId,transactionDate,merchant,customer,orderNo,paymentChannel,paymentDate,amount,refundAmount,fee,discount,totalAmount,currency,routeNo,status,settled,description\n' +
      '1,17/11/2026 10:39:24,x,CAPTURES C073 ROOM 073,SXC07326111795036928,TrueMoney,17/11/2026 11:09:24,195.00,0,0,0,195.00,THB,1,Cancel,false,Photo session\n' +
      '2,17/11/2026 10:41:00,x,CAPTURES C073 ROOM 073,SXC07326111705879007,QRCode,17/11/2026 10:41:15,195.00,0,0,0,195.00,THB,1,Success,false,Photo session\n'
    const wb = XLSX.read(csv, { type: 'string', raw: true })
    const r = parseSheet(XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null }))
    expect(r.format).toBe('chillpay')
    expect(r.rows).toHaveLength(1)
    expect(r.excluded).toHaveLength(1)
    expect(r.rows[0]).toMatchObject({ key: 'chillpay|SIXSHEET TECH Co., Ltd.|SXC07326111705879007', machine: 73, biz_date: '2026-11-17', amount_satang: 19500, review: null })
  })
  it('ChillPay machine 000 goes to Review', () => {
    const csv = '\ufefftransactionId,transactionDate,merchant,customer,orderNo,paymentChannel,paymentDate,amount,refundAmount,fee,discount,totalAmount,currency,routeNo,status,settled,description\n' +
      '1,03/11/2026 15:54:23,x,a89cbbd184304a70919acd404bbf8bea,SXC00026110385800893,QRCode,03/11/2026 15:54:30,7479.30,0,0,0,7479.30,THB,1,Success,false,x\n'
    const wb = XLSX.read(csv, { type: 'string', raw: true })
    const r = parseSheet(XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null }))
    expect(r.rows[0]).toMatchObject({ machine: 0, review: 'No booth: machine 000' })
  })
})
