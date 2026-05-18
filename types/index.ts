// ─── Customer ────────────────────────────────────────────────────────────────
// Flat, Excel-import-ready structure. Each field maps to one spreadsheet column.
export type CustomerType = 'brand' | 'agency' | 'venue' | 'organizer' | 'individual' | 'partner'

export interface Customer {
  customer_id: string
  company_name: string      // Excel col A
  contact_person: string    // Excel col B
  phone: string             // Excel col C
  email: string             // Excel col D
  line_id?: string          // Excel col E
  social?: string           // Excel col F  (IG / FB / etc.)
  customer_type: CustomerType // Excel col G
  notes: string             // Excel col H
  created_at: string
  updated_at: string
}

// ─── Leads & Opportunities (merged) ─────────────────────────────────────────
export type LeadOpStatus = 'open' | 'won' | 'lost'
export type ServiceType =
  | 'CAP*TURES'
  | 'Andy & Fine'
  | 'SX Event'
  | 'Booth Rental'
  | 'Custom Activation'
  | 'Other'

export interface LeadOpportunity {
  lead_op_id: string
  name: string              // Lead / Opportunity name
  customer_id?: string      // linked customer record (optional)
  customer_name: string     // manual or pulled from customer record
  contact_person: string
  service_type: string
  event_date?: string
  venue?: string
  estimated_value: number
  owner: string
  notes: string
  status: LeadOpStatus      // open | won | lost
  created_at: string
  updated_at: string
}

// ─── Won & Ready for OP (OP Kanban) ──────────────────────────────────────────
export type OPStage =
  | 'WON_JOB_LIST'
  | 'OP_PREPARING_AW_DONE'
  | 'OP_READY_FOR_EVENT'
  | 'OP_WAIT_STAFF_PAYMENT_DOC_TERR'
  | 'OP_DONE_PAYMENT'

export const OP_STAGE_LABELS: Record<OPStage, string> = {
  WON_JOB_LIST: 'Won Job List',
  OP_PREPARING_AW_DONE: 'OP Preparing - AW DONE',
  OP_READY_FOR_EVENT: 'OP - พร้อมออกงาน',
  OP_WAIT_STAFF_PAYMENT_DOC_TERR: 'OP - wait Staff / Payment / Doc [TERR]',
  OP_DONE_PAYMENT: 'OP - Done Payment',
}

export const OP_STAGES: OPStage[] = [
  'WON_JOB_LIST',
  'OP_PREPARING_AW_DONE',
  'OP_READY_FOR_EVENT',
  'OP_WAIT_STAFF_PAYMENT_DOC_TERR',
  'OP_DONE_PAYMENT',
]

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'
export type StaffStatus = 'pending' | 'confirmed' | 'na'
export type DocStatus = 'pending' | 'ready' | 'na'

export interface WonJob {
  job_id: string
  job_number: string        // e.g. "041"
  event_name: string        // e.g. "Sephora Annual Campaign"
  customer_name: string
  customer_id?: string
  contact_person: string
  service_type: string      // e.g. "LCA + Film"
  event_date: string        // ISO date string
  venue: string
  estimated_value: number
  payment_status: PaymentStatus
  staff_status: StaffStatus
  doc_status: DocStatus
  op_stage: OPStage
  owner: string
  notes: string
  lead_op_id?: string       // originating lead/opportunity
  created_at: string
  updated_at: string
}

// ─── Activity ────────────────────────────────────────────────────────────────
export type ActivityType =
  | 'note'
  | 'call'
  | 'email'
  | 'follow_up'
  | 'status_change'
  | 'deal_won'
  | 'deal_lost'

export interface Activity {
  activity_id: string
  entity_type: 'customer' | 'lead_opportunity' | 'won_job'
  entity_id: string
  activity_type: ActivityType
  title: string
  description: string
  created_by: string
  created_at: string
}

// ─── Task ────────────────────────────────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export interface Task {
  task_id: string
  title: string
  description: string
  due_date: string
  priority: TaskPriority
  status: TaskStatus
  linked_entity_type?: 'customer' | 'lead_opportunity' | 'won_job'
  linked_entity_id?: string
  linked_entity_name?: string
  owner: string
  created_at: string
}
