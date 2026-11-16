// Payment-gateway export readers (KBank · Pay Solution · ChillPay).
// Input is a sheet as rows of cells (SheetJS `sheet_to_json(ws, { header: 1, raw: true })`).
// CSV is read with `raw: true` so every cell is text — leading zeros survive.
// Pure functions: no I/O, so they are unit-tested against the sample files.

export type Gateway = 'kbank' | 'paysolution' | 'chillpay'
export type SaleStatus = 'success' | 'refund' | 'failed' | 'unknown' | 'excluded'

export interface SaleRow {
  key: string                 // gateway|merchant|txn — the dedupe key
  gateway: Gateway
  merchant_id: string
  txn_id: string              // client-facing PartnerTransactionUniqueID (KBank ID · Pay Solution ReferenceNo · ChillPay เลขที่รายการ)
  alt_ref: string | null      // KBank RefID · Pay Solution OrderNo
  machine: number | null
  raw_machine: string | null  // SX012 · SXC073 · 044 …
  biz_date: string            // yyyy-mm-dd, local (Asia/Bangkok)
  biz_time: string | null     // HH:mm:ss
  amount_satang: number       // gross collected
  fee_satang: number | null
  net_satang: number | null   // ChillPay: transferred to shop
  method: string              // PromptPay · KPlus · Card V · AL · QRCode · TrueMoney …
  channel: string             // client-file "Payment Channel": PromptPay · KPlus · Credit Card · QRCode · TrueMoney
  status: SaleStatus
  txn_status: string | null
  settle_status: string | null
  partner_id: string | null
  partner_name: string | null
  partner_shop_id: string | null
  source_row: number          // 1-based row in the sheet
  review: string | null       // why it needs a person (null = fine)
  alt_date: string | null     // the other candidate when the date was unclear
}
export interface Excluded { row: number; reason: string }
export interface ParseResult {
  format: Gateway | 'combined' | 'unknown'
  rows: SaleRow[]
  excluded: Excluded[]
}

// ── helpers ───────────────────────────────────────────────────────────────────
const norm = (v: unknown) => String(v ?? '').replace(/^﻿/, '').replace(/\s+/g, ' ').trim()
const txt = (v: unknown): string => (v == null ? '' : typeof v === 'number' ? String(v) : String(v).trim())
const nz = (s: string) => (s ? s : null)
const pad = (n: number) => String(n).padStart(2, '0')
export function toSatang(v: unknown): number {
  const s = typeof v === 'number' ? v.toFixed(2) : String(v ?? '').replace(/[,฿\s]/g, '')
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) : NaN
}
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
const validYmd = (y: number, m: number, d: number) => {
  if (m < 1 || m > 12 || d < 1) return false
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate()
}
/** Excel serial → {y,m,d} (1900 date system, no TZ). */
function serialParts(n: number) {
  const dt = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000)
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() }
}
function timeOf(v: unknown): string | null {
  if (typeof v === 'number') { const s = Math.round((v % 1) * 86400); return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` }
  const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(String(v ?? ''))
  return m ? `${pad(+m[1])}:${m[2]}:${m[3] ?? '00'}` : null
}
const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

function headerIndex(rows: unknown[][], must: string[], scan = 30): number {
  for (let i = 0; i < Math.min(rows.length, scan); i++) {
    const cells = (rows[i] ?? []).map(norm)
    if (must.every((h) => cells.includes(h))) return i
  }
  return -1
}
function colMap(row: unknown[]) {
  const m = new Map<string, number>()
  row.forEach((c, i) => { const k = norm(c); if (k && !m.has(k)) m.set(k, i) })
  return (name: string) => m.get(name) ?? -1
}

// ── detection ─────────────────────────────────────────────────────────────────
const SIGS: { format: ParseResult['format']; must: string[] }[] = [
  { format: 'combined', must: ['Date', 'Machine No.', 'PartnerTransactionUniqueID', 'Amount (THB)', 'Payment Channel'] },
  { format: 'kbank', must: ['PartnerID', 'PartnerTransactionUniqueID', 'Amount', 'TransactionDate', 'REF2', 'PaymentType'] },
  { format: 'paysolution', must: ['ReferenceNo', 'OrderNo', 'ProductDetail', 'totalAmount(THB)', 'paymentDate'] },
  { format: 'chillpay', must: ['เลขที่รายการ', 'วันที่ทำรายการ', 'ชื่อลูกค้า/รหัสลูกค้า'] },
]
export function detect(rows: unknown[][]): { format: ParseResult['format']; header: number } {
  for (const s of SIGS) { const h = headerIndex(rows, s.must); if (h >= 0) return { format: s.format, header: h } }
  return { format: 'unknown', header: -1 }
}

export function parseSheet(rows: unknown[][]): ParseResult {
  const { format, header } = detect(rows)
  if (format === 'kbank') return parseKbank(rows, header)
  if (format === 'paysolution') return parsePaySolution(rows, header)
  if (format === 'chillpay') return parseChillPay(rows, header)
  return { format, rows: [], excluded: [] }
}

// ── KBank ─────────────────────────────────────────────────────────────────────
// TransactionDate is the local business date. Text cells (15/11/2026) are DD/MM.
// Native Excel dates arrive day↔month transposed (1 Nov stored as 11 Jan). The
// ID / REF3 carry a UTC stamp, so we check both candidates against the ID's
// time + 7 h (Bangkok); after-midnight sales legitimately sit one day past REF3.
export function kbankDate(cell: unknown, idStamp: string | null, ref3: string | null): { date: string | null; alt: string | null } {
  let cands: string[] = []
  if (typeof cell === 'number') {
    const { y, m, d } = serialParts(cell)
    cands = [validYmd(y, d, m) ? ymd(y, d, m) : '', ymd(y, m, d)].filter(Boolean)
  } else {
    const s = txt(cell)
    let mt = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s)
    if (mt && validYmd(+mt[3], +mt[2], +mt[1])) return { date: ymd(+mt[3], +mt[2], +mt[1]), alt: null }
    mt = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
    if (mt) cands = [ymd(+mt[1], +mt[2], +mt[3]), validYmd(+mt[1], +mt[3], +mt[2]) ? ymd(+mt[1], +mt[3], +mt[2]) : ''].filter(Boolean)
  }
  cands = [...new Set(cands)]
  if (cands.length === 1) return { date: cands[0], alt: null }
  const expect: string[] = []
  const st = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/.exec(idStamp ?? '')
  if (st) {
    const local = new Date(Date.UTC(+st[1], +st[2] - 1, +st[3], +st[4] + 7, +st[5], +st[6]))
    expect.push(local.toISOString().slice(0, 10))
  }
  const r3 = /^(\d{4})(\d{2})(\d{2})$/.exec(txt(ref3))
  if (r3) { const base = `${r3[1]}-${r3[2]}-${r3[3]}`; expect.push(base, addDays(base, 1)) }
  for (const e of expect) { const hit = cands.filter((c) => c === e); if (hit.length === 1) return { date: hit[0], alt: null } }
  return { date: null, alt: cands.join(' / ') || null }
}

function parseKbank(rows: unknown[][], h: number): ParseResult {
  const c = colMap(rows[h])
  const out: SaleRow[] = [], excluded: Excluded[] = []
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    const id = txt(r[c('PartnerTransactionUniqueID')])
    if (!r.some((x) => txt(x))) continue
    const name = txt(r[c('PartnerName')])
    const amount = toSatang(r[c('Amount')])
    if (name.includes('ตัวอย่าง')) { excluded.push({ row: i + 1, reason: 'Example row (ตัวอย่าง)' }); continue }
    const ref2 = txt(r[c('REF2')])
    const machineRef2 = /^SX0*(\d+)$/i.exec(ref2)
    const machineId = /^SX(\d{3})\d{8}-\d{6}$/i.exec(id)
    const machine = machineRef2 ? Number(machineRef2[1]) : machineId ? Number(machineId[1]) : null
    const ref1 = Number(txt(r[c('REF1')]))
    const reasons: string[] = []
    if (!id) reasons.push('Missing ID')
    if (machine == null) reasons.push('No machine')
    else if ((machineId && Number(machineId[1]) !== machine) || (Number.isFinite(ref1) && txt(r[c('REF1')]) !== '' && ref1 !== machine)) reasons.push('Machine refs disagree')
    if (!Number.isFinite(amount)) reasons.push('Bad amount')
    const stamp = /(\d{8}-\d{6})$/.exec(id)?.[1] ?? null
    const { date, alt } = kbankDate(r[c('TransactionDate')], stamp, txt(r[c('REF3')]) || null)
    if (!date) reasons.push('Date unclear')
    const ts = txt(r[c('TransactionStatus')]).toUpperCase(), ss = txt(r[c('SettlementStatus')]).toUpperCase()
    const status: SaleStatus = ts === 'PAID' ? 'success' : /REFUND|VOID/.test(ts) ? 'refund' : /FAIL|CANCEL|REJECT/.test(ts) ? 'failed' : 'unknown'
    const pt = txt(r[c('PaymentType')]).toUpperCase()
    const method = pt === 'KPLUS' ? 'KPlus' : pt === 'PROMPTPAY' ? 'PromptPay' : pt || 'Unknown'
    const merchant = txt(r[c('MerchantID')])
    out.push({
      key: `kbank|${merchant}|${id || `row${i + 1}`}`, gateway: 'kbank', merchant_id: merchant, txn_id: id,
      alt_ref: nz(txt(r[c('RefID')])), machine, raw_machine: nz(ref2), biz_date: date ?? '', biz_time: timeOf(r[c('TransactionTime')]),
      amount_satang: Number.isFinite(amount) ? amount : 0, fee_satang: null, net_satang: null, method, channel: method,
      status, txn_status: nz(ts), settle_status: nz(ss), partner_id: nz(txt(r[c('PartnerID')])), partner_name: nz(name),
      partner_shop_id: nz(txt(r[c('PartnerShopID')])), source_row: i + 1, review: reasons.join(' · ') || null, alt_date: alt,
    })
  }
  return { format: 'kbank', rows: out, excluded }
}

// ── Pay Solution ──────────────────────────────────────────────────────────────
// Machine: ProductDetail = "SX" + ReferenceNo; drop the final 9 digits, the rest
// is the machine (SX044179473823 → 44). ReferenceNo is kept as text (leading 0s).
export function paySolutionMachine(ref: string): number | null {
  const m = /^(\d{2,3})(\d{9})$/.exec(ref)
  return m ? Number(m[1]) : null
}
const CARD_BRANDS: Record<string, string> = { V: 'Card Visa', M: 'Card Mastercard', J: 'Card JCB', A: 'Card Amex', C: 'Card' }

function parsePaySolution(rows: unknown[][], h: number): ParseResult {
  const c = colMap(rows[h])
  const out: SaleRow[] = [], excluded: Excluded[] = []
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    if (!r.some((x) => txt(x))) continue
    const ref = txt(r[c('ReferenceNo')]), orderNo = txt(r[c('OrderNo')]), pd = txt(r[c('ProductDetail')])
    const reasons: string[] = []
    if (!ref) reasons.push('Missing ID')
    else if (pd && pd.toUpperCase() !== `SX${ref}`) reasons.push('ProductDetail ≠ SX+ReferenceNo')
    const machine = ref ? paySolutionMachine(ref) : null
    if (ref && machine == null) reasons.push('No machine')
    const when = txt(r[c('paymentDate')]) || txt(r[c('OrderDateTime')])
    const dm = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(when)
    if (!dm) reasons.push('Date unclear')
    const amount = toSatang(r[c('totalAmount(THB)')])
    if (!Number.isFinite(amount)) reasons.push('Bad amount')
    const statusName = txt(r[c('StatusName')]), st = txt(r[c('Status')])
    const status: SaleStatus = /^completed$/i.test(statusName) ? 'success' : /refund|void/i.test(statusName) ? 'refund' : /fail|cancel|reject|expire/i.test(statusName) ? 'failed' : 'unknown'
    const card = txt(r[c('CardType')]).toUpperCase()
    const fee = toSatang(r[c('totalFee')]), net = toSatang(r[c('Net')])
    const merchant = txt(r[c('MerchantID')])
    out.push({
      key: `paysolution|${merchant}|${ref || orderNo || `row${i + 1}`}`, gateway: 'paysolution', merchant_id: merchant, txn_id: ref,
      alt_ref: nz(orderNo), machine, raw_machine: nz(ref.slice(0, -9)), biz_date: dm ? `${dm[1]}-${dm[2]}-${dm[3]}` : '', biz_time: dm ? dm[4] : null,
      amount_satang: Number.isFinite(amount) ? amount : 0, fee_satang: Number.isFinite(fee) ? fee : null, net_satang: Number.isFinite(net) ? net : null,
      method: CARD_BRANDS[card] ?? (card || 'Unknown'), channel: 'Credit Card',
      status, txn_status: nz(statusName), settle_status: nz(st), partner_id: null, partner_name: null, partner_shop_id: null,
      source_row: i + 1, review: reasons.join(' · ') || null, alt_date: null,
    })
  }
  return { format: 'paysolution', rows: out, excluded }
}

// ── ChillPay (settlement report) ──────────────────────────────────────────────
function parseChillPay(rows: unknown[][], h: number): ParseResult {
  const c = colMap(rows[h])
  const gross = c('ยอดชำระรวม (รวมค่าธรรมเนียม)'), net = c('ยอดเงินโอน ให้ร้านค้า')
  const feeCols = ['ค่าธรรมเนียม ธนาคาร (รวมภาษี)', 'ค่าบริการ (ไม่รวมภาษี)', 'ภาษีค่าบริการ'].map(c)
  const merchant = rows.slice(0, h).flat().map(txt).map((s) => /^Merchant\s*:\s*(.+)$/i.exec(s)?.[1]?.trim()).find(Boolean) ?? 'chillpay'
  const out: SaleRow[] = [], excluded: Excluded[] = []
  for (let i = h + 1; i < rows.length; i++) {
    const r = rows[i] ?? []
    if (!r.some((x) => txt(x))) continue
    const no = txt(r[c('No')])
    if (!/^\d+$/.test(no)) { excluded.push({ row: i + 1, reason: r.map(txt).some((s) => /^total$/i.test(s)) ? 'Total footer' : 'Not a numbered record' }); continue }
    const id = txt(r[c('เลขที่รายการ')]), cust = txt(r[c('ชื่อลูกค้า/รหัสลูกค้า')])
    const reasons: string[] = []
    if (!id) reasons.push('Missing ID')
    const mId = /^SXC(\d{3})/i.exec(id), mName = /(\d{3})\s*$/.exec(cust)
    const machine = mId ? Number(mId[1]) : null
    if (machine == null) reasons.push('No machine')
    else if (mName && Number(mName[1]) !== machine) reasons.push('Machine refs disagree')
    const dm = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)/.exec(txt(r[c('วันที่ทำรายการ')]))
    if (!dm || !validYmd(+dm[3], +dm[2], +dm[1])) reasons.push('Date unclear')
    const amount = toSatang(r[gross])
    if (!Number.isFinite(amount)) reasons.push('Bad amount')
    const fees = feeCols.filter((k) => k >= 0).map((k) => toSatang(r[k])).filter(Number.isFinite)
    const netS = net >= 0 ? toSatang(r[net]) : NaN
    const method = txt(r[c('ช่องทางชำระ')]) || 'Unknown'
    out.push({
      key: `chillpay|${merchant}|${id || `row${i + 1}`}`, gateway: 'chillpay', merchant_id: merchant, txn_id: id, alt_ref: null,
      machine, raw_machine: mId ? `SXC${mId[1]}` : null,
      biz_date: dm && validYmd(+dm[3], +dm[2], +dm[1]) ? ymd(+dm[3], +dm[2], +dm[1]) : '', biz_time: dm ? timeOf(dm[4]) : null,
      amount_satang: Number.isFinite(amount) ? amount : 0, fee_satang: fees.length ? fees.reduce((a, b) => a + b, 0) : null,
      net_satang: Number.isFinite(netS) ? netS : null, method, channel: method,
      status: 'success', txn_status: null, settle_status: 'Settlement report', partner_id: null, partner_name: nz(cust), partner_shop_id: null,
      source_row: i + 1, review: reasons.join(' · ') || null, alt_date: null,
    })
  }
  return { format: 'chillpay', rows: out, excluded }
}
