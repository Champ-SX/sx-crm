/**
 * AUTO-GENERATED TYPE DEFINITIONS from Supabase Schema
 * Generated: 2026-06-05
 * Project: sx-crm
 *
 * These types are derived from the actual database schema to ensure
 * TypeScript definitions always match the database structure.
 *
 * To regenerate: npx supabase gen types typescript --project-id=ujgiaqfuywnrimjjcekb
 */

// ─── ENUMS ───────────────────────────────────────────────────────────────

export type PaymentStatus = 'unpaid' | 'deposit' | 'partial' | 'paid'
export type StaffStatus = 'pending' | 'confirmed' | 'cancelled'
export type DocStatus = 'pending' | 'ready' | 'delivered'
export type OPStage =
  | 'WON_JOB_LIST'
  | 'OP_PREPARING_AW_DONE'
  | 'OP_READY_FOR_EVENT'
  | 'OP_WAIT_STAFF_PAYMENT_DOC_TERR'
  | 'OP_DONE_PAYMENT'

export type LeadOpStatus = 'open' | 'won' | 'lost'

// ─── TABLES ──────────────────────────────────────────────────────────────

export interface WonJob {
  job_id: string
  event_date: string | null
  job_number: string | null
  product_type: string | null
  product_cat: string | null
  product_name: string | null
  place: string | null
  event_display_name: string | null
  event_time: string | null
  venue: string | null
  job_detail_notes: string | null
  onsite_contact_name: string | null
  onsite_contact_phone: string | null
  onsite_line_id: string | null
  install_point: string | null
  team_meeting_time: string | null
  onsite_notes: string | null
  company_account: CompanyAccount | null
  estimated_value: number | null
  payment_status: PaymentStatus
  staff_status: StaffStatus
  doc_status: DocStatus
  op_stage: OPStage
  position: number
  owner: string | null
  company_id: string | null
  contact_person_id: string | null
  customer_name: string | null
  customer_id: string | null
  lead_op_id: string | null
  created_at: string
  updated_at: string
}

export interface CompanyAccount {
  company_name: string | null
  contact_point?: string | null
  phone_number?: string | null
  line_id?: string | null
  email?: string | null
  tax_id?: string | null
  company_address?: string | null
  branch?: string | null
  billing_notes?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  bank_branch?: string | null
}

export interface LeadOpportunity {
  lead_op_id: string
  name: string
  company_id: string | null
  contact_person_id: string | null
  customer_id: string | null
  customer_name: string
  contact_person: string
  service_type: string | null
  estimated_value: number | null
  event_date: string | null
  venue: string | null
  owner: string | null
  status: LeadOpStatus
  created_at: string
  updated_at: string
}

export interface Activity {
  activity_id: string
  entity_type: 'lead_opportunity' | 'won_job' | 'company' | 'contact_person'
  entity_id: string
  activity_type: 'deal_won' | 'deal_lost' | 'call' | 'email' | 'meeting' | 'note'
  title: string
  description: string | null
  created_by: string | null
  created_at: string
}

export interface Task {
  task_id: string
  title: string
  description: string | null
  due_date: string | null
  status: 'open' | 'completed' | 'cancelled'
  assigned_to: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Company {
  company_id: string
  company_name: string
  company_type?: string | null
  phone?: string | null
  email?: string | null
  line_id?: string | null
  social?: string | null
  tax_id?: string | null
  registered_address?: string | null
  branch_name?: string | null
  branch_number?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  bank_branch?: string | null
  billing_notes?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface ContactPerson {
  contact_id: string
  company_id: string
  name: string
  phone?: string | null
  email?: string | null
  line_id?: string | null
  role?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface StaffMember {
  staff_id: string
  name: string
  phone?: string | null
  email?: string | null
  line_id?: string | null
  role?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  customer_id: string
  company_name: string
  contact_person: string
  phone: string
  email: string
  line_id?: string | null
  social?: string | null
  customer_type: string
  notes: string
  tax_id?: string | null
  company_address?: string | null
  branch?: string | null
  billing_contact?: string | null
  billing_notes?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  bank_branch?: string | null
  created_at: string
  updated_at: string
}

export interface DynamicOPStage {
  stage_id: string
  label: string
  order: number
  accent_color: string
  dot_color: string
  header_bg: string
  column_bg: string
  is_custom: boolean
}
