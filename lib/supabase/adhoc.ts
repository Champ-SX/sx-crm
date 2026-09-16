import { supabase, isSupabaseConfigured } from './client'
import type { StaffMember } from '@/types'

// A temp job inside an Adhoc Payment card — a title + its own staff payment list.
export interface AdhocJob {
  id: string
  title: string
  staff_list: StaffMember[]
}

export interface AdhocPayment {
  id: string
  board_id?: string
  month: string            // 'YYYY-MM'
  jobs: AdhocJob[]
  archived: boolean
  created_at?: string
  updated_at?: string
}

export const currentMonth = () => new Date().toISOString().slice(0, 7)
const mkId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `ah-${Date.now()}-${Math.round(Math.random() * 1e6)}`

// ── Mock data (local dev) ─────────────────────────────────────────────────────
let mockAdhoc: AdhocPayment[] = [
  {
    id: mkId(), board_id: 'won', month: currentMonth(), archived: false,
    jobs: [
      {
        id: mkId(), title: 'Setup — ANF popup booth',
        staff_list: [
          { staff_id: 'ah-bank', name: 'Bank Vittavin', nickname: 'Bank', phone: '', bank_name: 'KBANK', bank_account_number: '••6632', bank_account_name: '', bank_branch: '', fee_thb: 1500, paid: true },
          { staff_id: 'ah-nuii', name: 'Nuii', nickname: 'Nuii', phone: '', bank_name: 'SCB', bank_account_number: '••1180', bank_account_name: '', bank_branch: '', fee_thb: 1000, paid: true },
        ],
      },
      {
        id: mkId(), title: 'Teardown — warehouse',
        staff_list: [
          { staff_id: 'ah-bank', name: 'Bank Vittavin', nickname: 'Bank', phone: '', bank_name: 'KBANK', bank_account_number: '••6632', bank_account_name: '', bank_branch: '', fee_thb: 1000, paid: true },
          { staff_id: 'ah-golf', name: 'Golf', nickname: 'Golf', phone: '', bank_name: 'BBL', bank_account_number: '••4420', bank_account_name: '', bank_branch: '', fee_thb: 600, paid: false },
        ],
      },
    ],
  },
]

// ── Reads ─────────────────────────────────────────────────────────────────────
export async function fetchAdhoc(boardId = 'won'): Promise<AdhocPayment[]> {
  if (!isSupabaseConfigured) return mockAdhoc.map((a) => structuredClone(a))
  const { data, error } = await supabase.from('adhoc_payments').select('*').eq('board_id', boardId).order('month', { ascending: false })
  if (error) throw error
  return (data ?? []) as AdhocPayment[]
}

// ── Writes ────────────────────────────────────────────────────────────────────
export async function createAdhocMonth(month: string, boardId = 'won'): Promise<AdhocPayment> {
  const row: AdhocPayment = { id: mkId(), board_id: boardId, month, jobs: [], archived: false }
  if (!isSupabaseConfigured) { mockAdhoc = [row, ...mockAdhoc]; return structuredClone(row) }
  const { data, error } = await supabase.from('adhoc_payments').insert(row).select().single()
  if (error) throw error
  return data as AdhocPayment
}

export async function updateAdhoc(id: string, patch: Partial<AdhocPayment>): Promise<void> {
  if (!isSupabaseConfigured) {
    mockAdhoc = mockAdhoc.map((a) => a.id === id ? { ...a, ...patch } : a)
    return
  }
  const { error } = await supabase.from('adhoc_payments').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export interface AdhocSummary { paid: number; total: number; fee: number; paidFee: number; unpaidFee: number; unpaidCount: number; jobCount: number }

// Aggregate paid/unpaid staff + fees across all temp jobs (board-face dashboard).
export function adhocSummary(a: AdhocPayment | undefined): AdhocSummary {
  if (!a) return { paid: 0, total: 0, fee: 0, paidFee: 0, unpaidFee: 0, unpaidCount: 0, jobCount: 0 }
  let paid = 0, total = 0, fee = 0, paidFee = 0
  for (const j of a.jobs) for (const s of j.staff_list) {
    total++
    const f = s.fee_thb || 0
    fee += f
    if (s.paid) { paid++; paidFee += f }
  }
  return { paid, total, fee, paidFee, unpaidFee: fee - paidFee, unpaidCount: total - paid, jobCount: a.jobs.length }
}
