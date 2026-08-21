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
// a new one inline. Each branch gets a stable colour. OFFICE is a branch too.
export const SEED_BRANCHES = ['BACC', 'BTT', 'OFFICE', 'TRUE ALPHA', 'Cloud 11']
const BRANCH_COLORS: Record<string, string> = {
  'BACC': '#3F6EA5', 'BTT': '#2E8A9A', 'OFFICE': '#C9772E', 'TRUE ALPHA': '#5A7D3F', 'Cloud 11': '#B8543F',
}
const BRANCH_PALETTE = ['#3F6EA5', '#2E8A9A', '#5A7D3F', '#C9772E', '#7A5AA5', '#B8543F', '#9A6B2E', '#3F9D5B']
export function branchColor(name?: string | null): string {
  if (!name) return '#9a968d'
  if (BRANCH_COLORS[name]) return BRANCH_COLORS[name]
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return BRANCH_PALETTE[h % BRANCH_PALETTE.length]
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
