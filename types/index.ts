// ─── Company ─────────────────────────────────────────────────────────────────
// Single source of truth for a business entity.
// One Company → many ContactPersons → many Leads / Won Jobs.

export type CompanyType = 'brand' | 'agency' | 'venue' | 'organizer' | 'individual' | 'partner'

export interface Company {
  company_id: string
  company_name: string            // required
  company_type?: CompanyType
  // General contact info (company-level, not person-level)
  phone?: string
  email?: string
  line_id?: string
  social?: string
  // Tax / Legal (for invoicing)
  tax_id?: string
  registered_address?: string
  branch_name?: string            // e.g. "สำนักงานใหญ่"
  branch_number?: string          // e.g. "00000"
  // Banking / Billing (written once, auto-fills Section C on new jobs)
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  bank_branch?: string
  billing_notes?: string
  // Meta
  notes?: string
  created_at: string
  updated_at: string
}

// ─── ContactPerson ────────────────────────────────────────────────────────────
// A named individual who belongs to a Company.
// company_id is required — every contact must belong to a company.

export interface ContactPerson {
  contact_id: string
  company_id: string              // required FK → Company
  name: string                    // required
  phone?: string
  email?: string
  line_id?: string
  role?: string                   // e.g. "Marketing Manager", "Event Coordinator"
  notes?: string
  created_at: string
  updated_at: string
}

// ─── Customer (legacy) ───────────────────────────────────────────────────────
// Phase 1 compatibility type: kept as-is so existing UI continues to compile.
// Internally: one Customer row = one Company + one ContactPerson merged.
// Will be removed in Phase 5 after all UI migrates to Company + ContactPerson.

export type CustomerType = CompanyType   // same set of values

export interface Customer {
  customer_id: string
  company_name: string      // Excel col A
  contact_person: string    // Excel col B
  phone: string             // Excel col C
  email: string             // Excel col D
  line_id?: string | null   // Excel col E
  social?: string | null    // Excel col F
  customer_type: CustomerType // Excel col G
  notes: string             // Excel col H
  // Billing / Company Account (written once, auto-fills Section C on new jobs)
  tax_id?: string | null
  company_address?: string | null
  branch?: string | null    // e.g. "สำนักงานใหญ่"
  billing_contact?: string | null // contact for billing (may differ from main contact)
  billing_notes?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  bank_branch?: string | null
  created_at: string
  updated_at: string
}

// ─── Leads & Opportunities (merged) ──────────────────────────────────────────
// ─── Team Member (a signed-in user; sourced from the Supabase `users` table) ───
// In production these are the people who signed in with Google. Locally (mock
// mode) they come from mockTeamMembers. Used to populate owner dropdowns + the
// Settings team list, replacing the old hardcoded OWNERS array.
export interface TeamMember {
  id: string
  name: string
  email: string
  role: string // 'admin' | 'operation' | 'sales' | 'user'
}

export type LeadOpStatus = 'open' | 'negotiating' | 'won' | 'lost'
export type ServiceType =
  | 'CAP*TURES'
  | 'Andy & Fine'
  | 'SX Event'
  | 'Booth Rental'
  | 'Custom Activation'
  | 'Other'

export interface LeadOpportunity {
  lead_op_id: string
  name: string
  // ── New relational FKs (Phase 1+) ──
  company_id?: string          // FK → Company
  contact_person_id?: string   // FK → ContactPerson
  // ── Legacy display cache (Phase 1 compat — removed in Phase 5) ──
  customer_id?: string         // old FK → Customer (deprecated)
  customer_name: string        // denormalized display name
  contact_person: string       // denormalized display name
  service_type: string
  event_date?: string
  venue?: string
  estimated_value: number
  owner: string
  notes: string
  status: LeadOpStatus
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

// ─── Dynamic OP Stage (supports both legacy fixed and custom user-created stages) ──
// Represents stages in the Kanban board for Won Jobs
export interface DynamicOPStage {
  id: string                    // unique identifier (e.g. "WON_JOB_LIST" or "custom_123")
  label: string                 // display name (e.g. "Won Job List")
  order: number                 // visual order in the kanban
  accentColor: string          // tailwind color for accent (e.g. "blue")
  dotColor: string             // tailwind color for dot indicator
  headerBg: string             // tailwind background for header
  columnBg: string             // tailwind background for column
  isCustom: boolean            // true if user-created, false if built-in
}

export type JobSortOption = 'created' | 'name' | 'value' | 'owner' | 'date' | 'freestyle'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'
export type StaffStatus = 'pending' | 'confirmed' | 'na'
export type DocStatus = 'pending' | 'ready' | 'na'

// ── Staff Member ──────────────────────────────────────────────────────────────
export interface StaffMember {
  staff_id: string
  name: string
  nickname: string
  phone: string
  bank_name: string
  bank_account_number: string
  bank_account_name: string
  bank_branch: string
}

// ── Company Account (for billing/invoicing) ───────────────────────────────────
export interface CompanyAccount {
  company_name: string | null // ชื่อบริษัท / Account
  contact_point?: string      // ผู้ติดต่อ
  phone_number?: string       // เบอร์โทร
  line_id?: string            // Line ID
  email?: string              // อีเมล
  tax_id?: string             // เลขประจำตัวผู้เสียภาษี
  company_address?: string    // ที่อยู่บริษัท
  branch?: string             // สาขา / สำนักงานใหญ่
  billing_notes?: string      // หมายเหตุการวางบิล
  bank_name?: string
  bank_account_number?: string
  bank_account_name?: string
  bank_branch?: string
}

// ── WonJob — full structured job card ────────────────────────────────────────
// Title format: YYYY.MM.DD - JOB_ID - PRODUCT_TYPE - PRODUCT_CAT - PRODUCT_NAME@PLACE
export interface WonJob {
  job_id: string

  // ── Title components (generate display title from these) ──
  event_date: string | null  // ISO "2026-05-21" → displayed as "2026.05.21" (nullable if not provided)
  job_number: string         // "041"
  product_type: string | null       // "LCA + Film" | "LCA" | "Pop Up" | "K15" | "SX Portable"
  product_cat: string | null        // "Event" | "Roadshow" | "Rental" | "Campaign"
  product_name: string | null       // short name for title, e.g. "Sephora"
  place: string | null              // short venue for title, e.g. "EastinGrand"

  // ── A: รายละเอียดงาน ──
  event_display_name: string | null // full event name, e.g. "Sephora Staff Party 2026"
  event_time: string | null         // e.g. "17.00-23.00"
  venue: string | null              // full venue name, e.g. "Eastin Grand Hotel Phayathai"
  job_detail_notes: string | null   // รายละเอียดงาน / Notes (replaces service_details + backdrop + job_notes)

  // ── B: ข้อมูลหน้างาน ──
  onsite_contact_name: string | null   // ชื่อผู้ติดต่อหน้างาน
  onsite_contact_phone: string | null  // เบอร์โทรผู้ติดต่อหน้างาน
  onsite_line_id: string | null        // Line ID ผู้ติดต่อหน้างาน
  install_point: string | null         // จุดติดตั้ง / Backdrop location
  team_meeting_time: string | null     // เวลานัดหมายทีม
  onsite_notes: string | null          // หมายเหตุหน้างาน
  staff_list: StaffMember[] | null     // Staff assigned to this job

  // ── C: Company Account ──
  company_account: CompanyAccount

  // ── Operations ──
  estimated_value: number | null
  payment_status: PaymentStatus
  staff_status: StaffStatus
  doc_status: DocStatus
  op_stage: OPStage
  position: number // Position within stage for vertical ordering (0 = first)
  owner: string | null

  // ── Relations ──
  // New relational FKs (Phase 1+)
  company_id?: string           // FK → Company
  contact_person_id?: string    // FK → ContactPerson
  // Legacy display cache (Phase 1 compat — removed in Phase 5)
  customer_name: string | null  // denormalized display name
  customer_id?: string          // old FK → Customer (deprecated)
  lead_op_id?: string
  created_at: string
  updated_at: string
}

// ─── Activity Attachment ───────────────────────────────────────────────────
export interface ActivityAttachment {
  filename: string
  size: number              // bytes
  type: string              // MIME type (e.g. "image/png")
  data: string              // base64 encoded file content
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
  entity_type: 'customer' | 'lead_opportunity' | 'won_job' | 'company' | 'contact_person'
  entity_id: string
  activity_type: ActivityType
  title: string
  description: string
  created_by: string
  created_at: string
  attachments?: ActivityAttachment[]
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
