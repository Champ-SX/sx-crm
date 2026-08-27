// Shared constants + helpers for the ANF Order board (Orders + Stock).
import { VAT_RATE, type AnfOrder, type AnfOrderStatus, type AnfRemindOption } from '@/types'

export const ANF_ACCENT = '#7A5AA5'

export const STATUS: { key: AnfOrderStatus; label: string; dot: string }[] = [
  { key: 'to_order', label: 'To order', dot: 'bg-[#FF5B3F]' },
  { key: 'ordered',  label: 'Ordered',  dot: 'bg-[#D7FE3A] ring-1 ring-black/15' },
  { key: 'received', label: 'Received', dot: 'bg-[#3f9d5b]' },
]
export const statusMeta = (k: AnfOrderStatus) => STATUS.find((s) => s.key === k) ?? STATUS[0]

// Preset branches; pickers also absorb any branch already used, and you can add
// a new one inline. Each branch gets a stable colour. WAREHOUSE is the central
// source-of-truth location that deliveries fill and branches transfer out of.
export const WAREHOUSE = 'WAREHOUSE'
export const SEED_BRANCHES = ['WAREHOUSE', 'BACC', 'BTT', 'TRUE ALPHA', 'Cloud 11']
const BRANCH_COLORS: Record<string, string> = {
  'WAREHOUSE': '#5B6470', 'BACC': '#3F6EA5', 'BTT': '#2E8A9A', 'TRUE ALPHA': '#5A7D3F', 'Cloud 11': '#B8543F',
  'OFFICE': '#C9772E', // legacy alias (pre-rename rows)
}
const BRANCH_PALETTE = ['#3F6EA5', '#2E8A9A', '#5A7D3F', '#C9772E', '#7A5AA5', '#B8543F', '#9A6B2E', '#3F9D5B']
export function branchColor(name?: string | null): string {
  if (!name) return '#9a968d'
  if (BRANCH_COLORS[name]) return BRANCH_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return BRANCH_PALETTE[h % BRANCH_PALETTE.length]
}

// ─── Stock categories ────────────────────────────────────────────────────────
export type AnfStockCategory = 'paper' | 'cartridge' | 'ink' | 'sleeve' | 'other'
export const CATEGORIES: { key: AnfStockCategory; th: string; en: string; color: string }[] = [
  { key: 'paper',     th: 'กระดาษ',   en: 'Paper',         color: '#3F6EA5' },
  { key: 'cartridge', th: 'ตลับหมึก', en: 'Ink cartridge', color: '#C9772E' },
  { key: 'ink',       th: 'หมึก',     en: 'Ink',           color: '#7A5AA5' },
  { key: 'sleeve',    th: 'ซองใส',    en: 'Sleeve',        color: '#2E8A9A' },
  { key: 'other',     th: 'อื่นๆ',    en: 'Other',         color: '#8a8a8a' },
]
// Seed categories keep fixed colours; custom ones get a stable hashed colour.
const CATEGORY_PALETTE = ['#3F6EA5', '#C9772E', '#7A5AA5', '#2E8A9A', '#B8543F', '#5A7D3F', '#9A6B2E', '#3f9d5b']
export function categoryColor(key: string): string {
  const seed = CATEGORIES.find((c) => c.key === key)
  if (seed) return seed.color
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length]
}
// Category display meta; unknown (custom) keys render with the key as label.
export const categoryMeta = (k?: string | null): { key: string; th: string; en: string; color: string } => {
  const seed = CATEGORIES.find((c) => c.key === k)
  if (seed) return seed
  const key = k || 'other'
  return { key, th: key, en: '', color: categoryColor(key) }
}
// Seed order stock rows fall into first; custom categories follow (sorted).
export const CATEGORY_ORDER: string[] = ['paper', 'cartridge', 'ink', 'sleeve', 'other']
// Given the categories present, return them in board order.
export function orderedCategories(present: string[]): string[] {
  const seed = CATEGORY_ORDER.filter((c) => present.includes(c))
  const custom = present.filter((c) => !CATEGORY_ORDER.includes(c)).sort()
  return [...seed, ...custom]
}

// Guess a category from the item title. Precedence: ตลับ (cartridge) before
// หมึก (ink) — "ตลับซับหมึก" contains both.
export function inferCategory(item: string): AnfStockCategory {
  const s = item || ''
  if (/ตลับ/.test(s)) return 'cartridge'
  if (/หมึก/.test(s)) return 'ink'
  if (/ซอง/.test(s)) return 'sleeve'
  if (/กระดาษ|ฟิล|กรอบ|สติ๊กเกอร์|ปริ้น/.test(s)) return 'paper'
  return 'other'
}

export const REMIND: { key: AnfRemindOption; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: '1d', label: '1 day' },
  { key: '1w', label: '1 week' },
  { key: '1m', label: '1 month' },
  { key: 'custom', label: 'Custom date' },
]

export const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`
export const lineTotal = (o: Pick<AnfOrder, 'quantity' | 'unit_price' | 'with_vat'>) =>
  o.quantity * o.unit_price * (o.with_vat ? 1 + VAT_RATE : 1)
export const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) } catch { return iso }
}
export function computeRemindAt(neededBy: string | null, option: AnfRemindOption, customDate: string): string | null {
  if (option === 'none') return null
  if (option === 'custom') return customDate ? new Date(customDate).toISOString() : null
  if (!neededBy) return null
  const d = new Date(neededBy + 'T09:00:00')
  if (option === '1d') d.setDate(d.getDate() - 1)
  if (option === '1w') d.setDate(d.getDate() - 7)
  if (option === '1m') d.setMonth(d.getMonth() - 1)
  return d.toISOString()
}
