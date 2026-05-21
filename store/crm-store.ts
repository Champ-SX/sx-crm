'use client'

import { create } from 'zustand'
import type {
  Customer, Company, ContactPerson,
  LeadOpportunity, WonJob, Activity, Task, OPStage, StaffMember,
} from '@/types'
import {
  mockCustomers,
  mockCompanies,
  mockContactPersons,
  mockLeadOpportunities,
  mockWonJobs,
  mockActivities,
  mockTasks,
  mockStaff,
} from '@/lib/mock-data'
import { blankWonJobFields, companyToAccount, customerToAccount } from '@/lib/jobs'

interface CRMStore {
  // ── New relational entities (Phase 1+) ──────────────────────────────────────
  companies: Company[]
  contactPersons: ContactPerson[]

  // ── Legacy (Phase 1 compat — kept until Phase 5) ────────────────────────────
  customers: Customer[]

  leadOpportunities: LeadOpportunity[]
  wonJobs: WonJob[]
  activities: Activity[]
  tasks: Task[]
  staff: StaffMember[]

  // Companies
  addCompany: (c: Company) => void
  updateCompany: (id: string, updates: Partial<Company>) => void

  // ContactPersons
  addContactPerson: (cp: ContactPerson) => void
  updateContactPerson: (id: string, updates: Partial<ContactPerson>) => void

  // Customers (legacy)
  addCustomer: (c: Customer) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void

  // Leads & Opportunities
  addLeadOpportunity: (lop: LeadOpportunity) => void
  updateLeadOpportunity: (id: string, updates: Partial<LeadOpportunity>) => void
  markAsWon: (leadOpId: string) => WonJob
  markAsLost: (leadOpId: string) => void

  // Won Jobs (OP Kanban)
  addWonJob: (job: WonJob) => void
  updateWonJob: (id: string, updates: Partial<WonJob>) => void
  moveWonJobStage: (id: string, stage: OPStage) => void

  // Staff
  addStaff: (s: StaffMember) => void

  // Tasks
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void

  // Activities
  addActivity: (activity: Activity) => void
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  // ── New relational state ────────────────────────────────────────────────────
  companies: mockCompanies,
  contactPersons: mockContactPersons,

  // ── Legacy state ────────────────────────────────────────────────────────────
  customers: mockCustomers,

  leadOpportunities: mockLeadOpportunities,
  wonJobs: mockWonJobs,
  activities: mockActivities,
  tasks: mockTasks,
  staff: mockStaff,

  // ── Companies ───────────────────────────────────────────────────────────────
  addCompany: (c) =>
    set((s) => ({ companies: [...s.companies, c] })),

  updateCompany: (id, updates) =>
    set((s) => ({
      companies: s.companies.map((c) =>
        c.company_id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    })),

  // ── ContactPersons ──────────────────────────────────────────────────────────
  addContactPerson: (cp) =>
    set((s) => ({ contactPersons: [...s.contactPersons, cp] })),

  updateContactPerson: (id, updates) =>
    set((s) => ({
      contactPersons: s.contactPersons.map((cp) =>
        cp.contact_id === id ? { ...cp, ...updates, updated_at: new Date().toISOString() } : cp
      ),
    })),

  // ── Customers (legacy) ──────────────────────────────────────────────────────
  addCustomer: (c) =>
    set((s) => ({ customers: [...s.customers, c] })),

  updateCustomer: (id, updates) =>
    set((s) => ({
      customers: s.customers.map((c) =>
        c.customer_id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    })),

  // ── Leads & Opportunities ──────────────────────────────────────────────────
  addLeadOpportunity: (lop) =>
    set((s) => ({ leadOpportunities: [...s.leadOpportunities, lop] })),

  updateLeadOpportunity: (id, updates) =>
    set((s) => ({
      leadOpportunities: s.leadOpportunities.map((l) =>
        l.lead_op_id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      ),
    })),

  markAsWon: (leadOpId) => {
    const state = get()
    const lop = state.leadOpportunities.find((l) => l.lead_op_id === leadOpId)
    if (!lop) throw new Error('Lead/Opportunity not found')
    const now = new Date().toISOString()

    // Auto-generate job number (last job_number + 1)
    const lastJobNum = state.wonJobs
      .map((j) => parseInt(j.job_number, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => b - a)[0] ?? 0
    const newJobNumber = String(lastJobNum + 1).padStart(3, '0')

    const newJob: WonJob = {
      ...blankWonJobFields(),
      job_id: `job-${Date.now()}`,
      job_number: newJobNumber,
      // Map lead fields → WonJob title components
      event_date: lop.event_date ?? '',
      product_type: lop.service_type,            // e.g. "CAP*TURES"
      product_name: lop.name,                    // lead name as working title
      place: lop.venue ?? '',                    // lead venue → place
      // Pre-fill detail section A
      event_display_name: lop.name,
      venue: lop.venue ?? '',
      // Relations — new FKs (Phase 1+)
      company_id: lop.company_id,
      contact_person_id: lop.contact_person_id,
      // Relations — legacy (Phase 1 compat)
      customer_name: lop.customer_name,
      customer_id: lop.customer_id,
      lead_op_id: leadOpId,
      // Operations
      estimated_value: lop.estimated_value,
      op_stage: 'WON_JOB_LIST',
      owner: lop.owner,
      created_at: now,
      updated_at: now,
    }

    // Pre-populate Section C (company_account) from Company record if linked,
    // otherwise fall back to copying from the most recent job for the same company.
    const linkedCompany = lop.company_id
      ? state.companies.find((c) => c.company_id === lop.company_id)
      : undefined
    const linkedContact = lop.contact_person_id
      ? state.contactPersons.find((cp) => cp.contact_id === lop.contact_person_id)
      : undefined

    if (linkedCompany) {
      newJob.company_account = companyToAccount(linkedCompany, linkedContact)
    } else {
      // Fallback: reuse billing info from previous job for the same company
      const prevJob = state.wonJobs.find(
        (j) =>
          (j.company_id && j.company_id === lop.company_id) ||
          (j.customer_id && j.customer_id === lop.customer_id && j.company_account.company_name)
      )
      if (prevJob) {
        newJob.company_account = { ...prevJob.company_account }
      }
    }

    // Last-resort fallback: pull from Customer billing fields directly
    if (!newJob.company_account.company_name && lop.customer_id) {
      const linkedCustomer = state.customers.find((c) => c.customer_id === lop.customer_id)
      if (linkedCustomer && (linkedCustomer.bank_name || linkedCustomer.tax_id)) {
        newJob.company_account = customerToAccount(linkedCustomer)
      }
    }

    set((s) => ({
      leadOpportunities: s.leadOpportunities.map((l) =>
        l.lead_op_id === leadOpId
          ? { ...l, status: 'won', updated_at: now }
          : l
      ),
      wonJobs: [...s.wonJobs, newJob],
      activities: [
        ...s.activities,
        {
          activity_id: `act-${Date.now()}`,
          entity_type: 'lead_opportunity' as const,
          entity_id: leadOpId,
          activity_type: 'deal_won' as const,
          title: '🎉 Marked as Won',
          description: `Job #${newJobNumber} created and added to Won Job List.`,
          created_by: lop.owner,
          created_at: now,
        },
      ],
    }))

    return newJob
  },

  markAsLost: (leadOpId) => {
    const now = new Date().toISOString()
    const lop = get().leadOpportunities.find((l) => l.lead_op_id === leadOpId)
    if (!lop) return
    set((s) => ({
      leadOpportunities: s.leadOpportunities.map((l) =>
        l.lead_op_id === leadOpId ? { ...l, status: 'lost', updated_at: now } : l
      ),
      activities: [
        ...s.activities,
        {
          activity_id: `act-${Date.now()}`,
          entity_type: 'lead_opportunity' as const,
          entity_id: leadOpId,
          activity_type: 'deal_lost' as const,
          title: 'Marked as Lost',
          description: 'Opportunity closed as lost.',
          created_by: lop.owner,
          created_at: now,
        },
      ],
    }))
  },

  // ── Won Jobs ───────────────────────────────────────────────────────────────
  addWonJob: (job) =>
    set((s) => ({ wonJobs: [...s.wonJobs, job] })),

  updateWonJob: (id, updates) =>
    set((s) => ({
      wonJobs: s.wonJobs.map((j) =>
        j.job_id === id ? { ...j, ...updates, updated_at: new Date().toISOString() } : j
      ),
    })),

  moveWonJobStage: (id, stage) => {
    const now = new Date().toISOString()
    const job = get().wonJobs.find((j) => j.job_id === id)
    if (!job) return
    set((s) => ({
      wonJobs: s.wonJobs.map((j) =>
        j.job_id === id ? { ...j, op_stage: stage, updated_at: now } : j
      ),
      activities: [
        ...s.activities,
        {
          activity_id: `act-${Date.now()}`,
          entity_type: 'won_job' as const,
          entity_id: id,
          activity_type: 'status_change' as const,
          title: `Stage updated`,
          description: `Moved from "${job.op_stage}" to "${stage}"`,
          created_by: job.owner,
          created_at: now,
        },
      ],
    }))
  },

  // ── Staff ──────────────────────────────────────────────────────────────────
  addStaff: (s_member) =>
    set((s) => ({ staff: [...s.staff, s_member] })),

  // ── Tasks ──────────────────────────────────────────────────────────────────
  addTask: (task) =>
    set((s) => ({ tasks: [...s.tasks, task] })),

  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.task_id === id ? { ...t, ...updates } : t)),
    })),

  // ── Activities ─────────────────────────────────────────────────────────────
  addActivity: (activity) =>
    set((s) => ({ activities: [...s.activities, activity] })),
}))
