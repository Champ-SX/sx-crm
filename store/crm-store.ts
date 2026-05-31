'use client'

import { create } from 'zustand'
import type {
  Customer, Company, ContactPerson,
  LeadOpportunity, WonJob, Activity, Task, OPStage, StaffMember,
  DynamicOPStage, JobSortOption,
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
import * as db from '@/lib/supabase/db'

// === SUPABASE INTEGRATION MODE ===
// Set to true to use Supabase; false to use local mock data
const USE_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('[CRM Store] USE_SUPABASE =', USE_SUPABASE, {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'not set',
})

// ── REMOVED: localStorage persist middleware ──────────────────────────────────
// The persist middleware was broken (merge function always received undefined).
// Instead, we rely on:
// 1. Database sync in all action functions (addLeadOpportunity, updateLeadOpportunity, etc.)
// 2. initializeData() to load from database on app startup
// This makes the database the source of truth, which is more reliable.

const DEFAULT_OP_STAGES: DynamicOPStage[] = [
  {
    id: 'WON_JOB_LIST',
    label: 'Job List',
    order: 1,
    accentColor: 'blue',
    dotColor: '#3B82F6',
    headerBg: 'bg-blue-50',
    columnBg: 'bg-blue-50/30',
    isCustom: false,
  },
  {
    id: 'PRE_JOB',
    label: 'Pre Job',
    order: 2,
    accentColor: 'purple',
    dotColor: '#A855F7',
    headerBg: 'bg-purple-50',
    columnBg: 'bg-purple-50/30',
    isCustom: false,
  },
  {
    id: 'ON_SITE',
    label: 'On Site',
    order: 3,
    accentColor: 'green',
    dotColor: '#10B981',
    headerBg: 'bg-green-50',
    columnBg: 'bg-green-50/30',
    isCustom: false,
  },
  {
    id: 'OP_DONE_PAYMENT',
    label: 'Payment Done',
    order: 4,
    accentColor: 'amber',
    dotColor: '#F59E0B',
    headerBg: 'bg-amber-50',
    columnBg: 'bg-amber-50/30',
    isCustom: false,
  },
]

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

  // ── OP Kanban Stages (dynamic) ──────────────────────────────────────────────
  opStages: DynamicOPStage[]
  stageSortOptions: Record<string, JobSortOption>  // stageId → sortOption

  // ── State management ────────────────────────────────────────────────────────
  isLoading: boolean
  error: string | null

  // ── Data initialization ────────────────────────────────────────────────────
  initializeData: () => Promise<void>

  // Companies
  addCompany: (c: Company) => Promise<void>
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>

  // ContactPersons
  addContactPerson: (cp: ContactPerson) => Promise<void>
  updateContactPerson: (id: string, updates: Partial<ContactPerson>) => Promise<void>

  // Customers (legacy)
  // Customer management functions
  addCustomer: (c: Customer) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void
  deleteCustomer: (id: string) => void

  // Leads & Opportunities
  addLeadOpportunity: (lop: LeadOpportunity) => Promise<void>
  updateLeadOpportunity: (id: string, updates: Partial<LeadOpportunity>) => Promise<void>
  deleteLeadOpportunity: (id: string) => Promise<void>
  markAsWon: (leadOpId: string) => Promise<WonJob>
  markAsLost: (leadOpId: string) => Promise<void>

  // Won Jobs (OP Kanban)
  addWonJob: (job: WonJob) => Promise<void>
  updateWonJob: (id: string, updates: Partial<WonJob>) => Promise<void>
  moveWonJobStage: (id: string, stage: OPStage) => Promise<void>
  deleteWonJob: (id: string) => Promise<void>
  reorderWonJobWithinStage: (id: string, newPosition: number, stage: OPStage) => Promise<void>

  // OP Stages (dynamic management)
  addOpStage: (stage: DynamicOPStage) => Promise<void>
  updateOpStage: (id: string, updates: Partial<DynamicOPStage>) => Promise<void>
  updateOpStageLabel: (id: string, label: string) => Promise<void>
  deleteOpStage: (id: string) => Promise<void>
  setStageSortOption: (stageId: string, sortOption: JobSortOption) => void

  // Staff
  addStaff: (s: StaffMember) => Promise<void>

  // Tasks
  addTask: (task: Task) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>

  // Activities
  addActivity: (activity: Activity) => Promise<void>
}

export const useCRMStore = create<CRMStore>()((set, get) => ({
      // ── New relational state ────────────────────────────────────────────────────
      // When using Supabase, start with empty arrays so initializeData() will load from DB
      // When using mock data, start with mock data
      companies: USE_SUPABASE ? [] : mockCompanies,
      contactPersons: USE_SUPABASE ? [] : mockContactPersons,

      // ── Legacy state ────────────────────────────────────────────────────────────
      customers: USE_SUPABASE ? [] : mockCustomers,

      leadOpportunities: USE_SUPABASE ? [] : mockLeadOpportunities,
      wonJobs: USE_SUPABASE ? [] : mockWonJobs,
      activities: USE_SUPABASE ? [] : mockActivities,
      tasks: USE_SUPABASE ? [] : mockTasks,
      staff: USE_SUPABASE ? [] : mockStaff,

      // ── OP Kanban Stages ────────────────────────────────────────────────────────
      opStages: DEFAULT_OP_STAGES,
      stageSortOptions: {},

      // ── State management ────────────────────────────────────────────────────────
      isLoading: false,
      error: null,

      // ── Data initialization ────────────────────────────────────────────────────
      initializeData: async () => {
        if (!USE_SUPABASE) {
          return
        }

        // Get current state to check if we have persisted data
        const currentState = get()

        // Skip database sync if we have any persisted data (companies or leads indicate app was used before)
        // This prevents overwriting locally-created/modified data with stale database data
        if (currentState.companies.length > 0 || currentState.leadOpportunities.length > 0) {
          return
        }

        set({ isLoading: true, error: null })
        try {
          const [companies, contactPersons, leadOpportunities, wonJobs, activities, tasks, staff, opStages] =
            await Promise.all([
              db.companyQueries.getAll(),
              db.contactPersonQueries.getAll(),
              db.leadOpportunityQueries.getAll(),
              db.wonJobQueries.getAll(),
              db.activityQueries.getAll(),
              db.taskQueries.getAll(),
              db.staffQueries.getAll(),
              db.opStageQueries.getAll(),
            ])

          // Load customers separately with fallback to empty array if table doesn't exist
          let customers: Customer[] = []
          try {
            customers = await db.customerQueries.getAll()
          } catch (err) {
            console.warn('[CRM Store] Could not load customers (table may not exist yet):',
              err instanceof Error ? err.message : String(err))
            // Continue with empty customers array
          }

          set({
            companies,
            contactPersons,
            customers,
            leadOpportunities,
            wonJobs,
            activities,
            tasks,
            staff,
            opStages: opStages.length > 0 ? opStages : DEFAULT_OP_STAGES,
            isLoading: false,
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error('[CRM Store] Database initialization error:', errorMsg, error)
          set({
            error: errorMsg,
            isLoading: false,
          })
        }
      },

  // ── Companies ───────────────────────────────────────────────────────────────
  addCompany: async (c: Company) => {
    set((s) => ({ companies: [...s.companies, c] }))
    if (USE_SUPABASE) {
      try {
        await db.companyQueries.create(c)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create company' })
      }
    }
  },

  updateCompany: async (id, updates) => {
    set((s) => ({
      companies: s.companies.map((c) =>
        c.company_id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.companyQueries.update(id, updates)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update company' })
      }
    }
  },

  // ── ContactPersons ──────────────────────────────────────────────────────────
  addContactPerson: async (cp) => {
    set((s) => ({ contactPersons: [...s.contactPersons, cp] }))
    if (USE_SUPABASE) {
      try {
        await db.contactPersonQueries.create(cp)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create contact person' })
      }
    }
  },

  updateContactPerson: async (id, updates) => {
    set((s) => ({
      contactPersons: s.contactPersons.map((cp) =>
        cp.contact_id === id ? { ...cp, ...updates, updated_at: new Date().toISOString() } : cp
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.contactPersonQueries.update(id, updates)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update contact person' })
      }
    }
  },

  // ── Customers (legacy) ──────────────────────────────────────────────────────
  addCustomer: async (c) => {
    set((s) => ({ customers: [...s.customers, c] }))
    if (USE_SUPABASE) {
      try {
        await db.customerQueries.create(c)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create customer' })
      }
    }
  },

  updateCustomer: async (id, updates) => {
    set((s) => ({
      customers: s.customers.map((c) =>
        c.customer_id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.customerQueries.update(id, updates)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update customer' })
      }
    }
  },

  deleteCustomer: async (id) => {
    set((s) => ({
      customers: s.customers.filter((c) => c.customer_id !== id),
      // Clear customer references in leads and won jobs
      leadOpportunities: s.leadOpportunities.map((l) =>
        l.customer_id === id ? { ...l, customer_id: undefined, customer_name: '' } : l
      ),
      wonJobs: s.wonJobs.map((j) =>
        j.customer_id === id ? { ...j, customer_id: undefined, customer_name: '' } : j
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.customerQueries.delete(id)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete customer' })
      }
    }
  },

  // ── Leads & Opportunities ──────────────────────────────────────────────────
  addLeadOpportunity: async (lop) => {
    set((s) => ({
      leadOpportunities: [...s.leadOpportunities, lop],
    }))
    if (USE_SUPABASE) {
      try {
        await db.leadOpportunityQueries.create(lop)
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('[CRM Store] Failed to create lead opportunity:', msg)
        set({ error: msg })
      }
    }
  },

  updateLeadOpportunity: async (id, updates) => {
    set((s) => ({
      leadOpportunities: s.leadOpportunities.map((l) =>
        l.lead_op_id === id ? { ...l, ...updates, updated_at: new Date().toISOString() } : l
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.leadOpportunityQueries.update(id, updates)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update lead opportunity' })
      }
    }
  },

  deleteLeadOpportunity: async (id) => {
    set((s) => ({
      leadOpportunities: s.leadOpportunities.filter((l) => l.lead_op_id !== id),
    }))
    if (USE_SUPABASE) {
      try {
        await db.leadOpportunityQueries.delete(id)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete lead opportunity' })
      }
    }
  },

  markAsWon: async (leadOpId) => {
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
      job_id: crypto.randomUUID(),
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
      // Fallback 1: Reuse billing info from previous job for same company_id or customer_id
      // (Removed requirement for previous job to have company_name filled)
      const prevJob = state.wonJobs.find(
        (j) =>
          (lop.company_id && j.company_id && j.company_id === lop.company_id) ||
          (lop.customer_id && j.customer_id && j.customer_id === lop.customer_id)
      )
      if (prevJob && prevJob.company_account.company_name) {
        newJob.company_account = { ...prevJob.company_account }
      }
    }

    // Fallback 2: If company_id is set but Company record not found, warn
    if (!newJob.company_account.company_name && lop.company_id) {
      // company_id reference exists but Company record is missing
      console.warn(`Lead "${lop.name}" has company_id "${lop.company_id}" but Company record not found`)
    }

    // Fallback 3: Pull from Customer billing fields if still empty
    if (!newJob.company_account.company_name && lop.customer_id) {
      const linkedCustomer = state.customers.find((c) => c.customer_id === lop.customer_id)
      if (linkedCustomer) {
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
          activity_id: crypto.randomUUID(),
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

    // Sync to Supabase if enabled
    if (USE_SUPABASE) {
      try {
        await Promise.all([
          db.leadOpportunityQueries.update(leadOpId, { status: 'won' }),
          db.wonJobQueries.create(newJob),
          db.activityQueries.create({
            activity_id: crypto.randomUUID(),
            entity_type: 'lead_opportunity',
            entity_id: leadOpId,
            activity_type: 'deal_won',
            title: '🎉 Marked as Won',
            description: `Job #${newJobNumber} created and added to Won Job List.`,
            created_by: lop.owner,
            created_at: now,
          }),
        ])
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to mark as won' })
      }
    }

    return newJob
  },

  markAsLost: async (leadOpId) => {
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
          activity_id: crypto.randomUUID(),
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

    // Sync to Supabase if enabled
    if (USE_SUPABASE) {
      try {
        await Promise.all([
          db.leadOpportunityQueries.update(leadOpId, { status: 'lost' }),
          db.activityQueries.create({
            activity_id: crypto.randomUUID(),
            entity_type: 'lead_opportunity',
            entity_id: leadOpId,
            activity_type: 'deal_lost',
            title: 'Marked as Lost',
            description: 'Opportunity closed as lost.',
            created_by: lop.owner,
            created_at: now,
          }),
        ])
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to mark as lost' })
      }
    }
  },

  // ── Won Jobs ───────────────────────────────────────────────────────────────
  addWonJob: async (job) => {
    set((s) => ({ wonJobs: [...s.wonJobs, job] }))
    if (USE_SUPABASE) {
      try {
        await db.wonJobQueries.create(job)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create won job' })
      }
    }
  },

  updateWonJob: async (id, updates) => {
    set((s) => ({
      wonJobs: s.wonJobs.map((j) =>
        j.job_id === id ? { ...j, ...updates, updated_at: new Date().toISOString() } : j
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.wonJobQueries.update(id, updates)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update won job' })
      }
    }
  },

  moveWonJobStage: async (id, stage) => {
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
          activity_id: crypto.randomUUID(),
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

    // Sync to Supabase if enabled
    if (USE_SUPABASE) {
      try {
        await Promise.all([
          db.wonJobQueries.moveToStage(id, stage),
          db.activityQueries.create({
            activity_id: crypto.randomUUID(),
            entity_type: 'won_job',
            entity_id: id,
            activity_type: 'status_change',
            title: 'Stage updated',
            description: `Moved from "${job.op_stage}" to "${stage}"`,
            created_by: job.owner,
            created_at: now,
          }),
        ])
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to move won job stage' })
      }
    }
  },

  deleteWonJob: async (id) => {
    const now = new Date().toISOString()
    const job = get().wonJobs.find((j) => j.job_id === id)
    if (!job) return

    set((s) => ({
      wonJobs: s.wonJobs.filter((j) => j.job_id !== id),
      activities: [
        ...s.activities,
        {
          activity_id: crypto.randomUUID(),
          entity_type: 'won_job' as const,
          entity_id: id,
          activity_type: 'status_change' as const,
          title: '🗑️ Job archived',
          description: `Job #${job.job_number} (${job.product_name}) archived and removed from board`,
          created_by: job.owner,
          created_at: now,
        },
      ],
    }))

    // Sync to Supabase if enabled
    if (USE_SUPABASE) {
      try {
        await Promise.all([
          db.wonJobQueries.delete(id),
          db.activityQueries.create({
            activity_id: crypto.randomUUID(),
            entity_type: 'won_job',
            entity_id: id,
            activity_type: 'status_change',
            title: '🗑️ Job archived',
            description: `Job #${job.job_number} (${job.product_name}) archived and removed from board`,
            created_by: job.owner,
            created_at: now,
          }),
        ])
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete won job' })
      }
    }
  },

  reorderWonJobWithinStage: async (id, newPosition, stage) => {
    const now = new Date().toISOString()
    const state = get()
    const job = state.wonJobs.find((j) => j.job_id === id)
    if (!job) return

    // Get all jobs in the stage, sorted by position
    const stageJobs = state.wonJobs
      .filter((j) => j.op_stage === stage)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    const oldIndex = stageJobs.findIndex((j) => j.job_id === id)
    if (oldIndex === -1 || newPosition < 0) return

    // Calculate actual new index (clamped within valid range)
    const actualNewIndex = Math.min(newPosition, stageJobs.length - 1)

    // Reorder: move item from oldIndex to actualNewIndex
    const reorderedJobs = [...stageJobs]
    const [movedItem] = reorderedJobs.splice(oldIndex, 1)
    reorderedJobs.splice(actualNewIndex, 0, movedItem)

    // Update positions sequentially for all jobs in the stage
    const updatedJobs = reorderedJobs.map((j, idx) => ({
      ...j,
      position: idx,
      updated_at: now,
    }))

    // Update store with reordered jobs
    set((s) => ({
      wonJobs: s.wonJobs.map((j) => {
        const updated = updatedJobs.find((u) => u.job_id === j.job_id)
        return updated || j
      }),
    }))

    // Sync to Supabase if enabled
    if (USE_SUPABASE) {
      try {
        // Update all affected jobs in Supabase
        for (const updatedJob of updatedJobs) {
          await db.wonJobQueries.reorderWithinStage(updatedJob.job_id, updatedJob.position)
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to reorder won jobs' })
      }
    }
  },

  // ── OP Stages (dynamic management) ──────────────────────────────────────────
  addOpStage: async (stage) => {
    set((s) => ({ opStages: [...s.opStages, stage] }))
    if (USE_SUPABASE) {
      try {
        await db.opStageQueries.create(stage)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create stage' })
      }
    }
  },

  updateOpStage: async (id, updates) => {
    set((s) => ({
      opStages: s.opStages.map((stage) =>
        stage.id === id ? { ...stage, ...updates } : stage
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.opStageQueries.update(id, updates)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update stage' })
      }
    }
  },

  updateOpStageLabel: async (id, label) => {
    set((s) => ({
      opStages: s.opStages.map((stage) =>
        stage.id === id ? { ...stage, label } : stage
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.opStageQueries.update(id, { label })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update stage label' })
      }
    }
  },

  deleteOpStage: async (id) => {
    set((s) => ({
      opStages: s.opStages.filter((stage) => stage.id !== id),
    }))
    if (USE_SUPABASE) {
      try {
        await db.opStageQueries.delete(id)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete stage' })
      }
    }
  },

  setStageSortOption: (stageId, sortOption) =>
    set((s) => ({
      stageSortOptions: { ...s.stageSortOptions, [stageId]: sortOption },
    })),

  // ── Staff ──────────────────────────────────────────────────────────────────
  addStaff: async (s_member) => {
    set((s) => ({ staff: [...s.staff, s_member] }))
    if (USE_SUPABASE) {
      try {
        await db.staffQueries.create(s_member)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create staff member' })
      }
    }
  },

  // ── Tasks ──────────────────────────────────────────────────────────────────
  addTask: async (task) => {
    set((s) => ({ tasks: [...s.tasks, task] }))
    if (USE_SUPABASE) {
      try {
        await db.taskQueries.create(task)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create task' })
      }
    }
  },

  updateTask: async (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.task_id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t)),
    }))
    if (USE_SUPABASE) {
      try {
        await db.taskQueries.update(id, updates)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update task' })
      }
    }
  },

  // ── Activities ─────────────────────────────────────────────────────────────
  addActivity: async (activity) => {
    set((s) => ({ activities: [...s.activities, activity] }))
    if (USE_SUPABASE) {
      try {
        await db.activityQueries.create(activity)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to create activity' })
      }
    }
  },
}));

