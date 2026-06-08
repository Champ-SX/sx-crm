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
  isInitialized: boolean

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
  reorderStages: (stageIds: string[]) => Promise<void>
  updateStageColor: (stageId: string, colorName: string) => Promise<void>

  // Staff
  addStaff: (s: StaffMember) => Promise<void>

  // Tasks
  addTask: (task: Task) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>

  // Activities
  addActivity: (activity: Activity) => Promise<void>
  removeActivityAttachment: (activityId: string, attachmentIndex: number) => Promise<void>
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
      isInitialized: false,

      // ── Data initialization ────────────────────────────────────────────────────
      initializeData: async () => {
        console.log('[CRM Store] initializeData called')

        const currentState = get()

        // FIX C: Runtime safety check - if USE_SUPABASE is false, use mock data gracefully
        if (!USE_SUPABASE) {
          const warnMsg = '⚠️ [CRM Store] USE_SUPABASE is false. Using mock data. Check your Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY) in Vercel settings.'
          console.warn(warnMsg)
          // Mark initialization as complete with mock data loaded (already in initial state)
          set({ error: warnMsg, isInitialized: true, isLoading: false })
          return
        }

        // FIX B: Only initialize once (prevent redundant API calls)
        if (currentState.isInitialized) {
          console.log('[CRM Store] Already initialized, skipping')
          return
        }

        console.log('[CRM Store] Starting data initialization...')
        set({ isLoading: true, error: null })

        try {
          // Load all data in parallel
          const [companies, contactPersons, leadOpportunities, activities, tasks, staff, opStages, wonJobs] =
            await Promise.all([
              db.companyQueries.getAll(),
              db.contactPersonQueries.getAll(),
              db.leadOpportunityQueries.getAll(),
              db.activityQueries.getAll(),
              db.taskQueries.getAll(),
              db.staffQueries.getAll(),
              db.opStageQueries.getAll(),
              db.wonJobQueries.getAll(),
            ])

          // Load customers separately with fallback to empty array if table doesn't exist
          let customers: Customer[] = []
          try {
            customers = await db.customerQueries.getAll()
          } catch (err) {
            console.warn('[CRM Store] Could not load customers (table may not exist yet):',
              err instanceof Error ? err.message : String(err))
          }

          console.log('[CRM Store] Data loaded successfully:', {
            companies: companies.length,
            contacts: contactPersons.length,
            leads: leadOpportunities.length,
            wonJobs: wonJobs.length,
            activities: activities.length,
          })

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
            isInitialized: true,
            error: null,
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error('[CRM Store] Database initialization error:', errorMsg, error)
          set({
            error: errorMsg,
            isLoading: false,
            isInitialized: false,
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
        console.log('[CRM Store] Customer created successfully:', c.customer_id)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error('[CRM Store] Failed to create customer:', c.customer_id, errorMsg, error)
        set({ error: `Failed to create customer: ${errorMsg}` })
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
      event_date: lop.event_date || null,       // Send null for invalid dates, not empty string
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

    // Sync to Supabase if enabled (before optimistic update)
    if (USE_SUPABASE) {
      try {
        // Remove fields that don't exist in the database schema before sending
        const { staff_list, ...jobToCreate } = newJob as any

        // Create wonJob FIRST - this is the critical operation
        await db.wonJobQueries.create(jobToCreate as WonJob)
        console.log('[CRM Store] Successfully created wonJob:', newJob.job_id)

        // Then update lead status and create activity
        await Promise.all([
          db.leadOpportunityQueries.update(leadOpId, { status: 'won' }),
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
        // Extract error message from various error formats
        let errorMsg = 'Unknown error'
        if (error instanceof Error) {
          errorMsg = error.message
        } else if (typeof error === 'object' && error !== null) {
          // Handle Supabase error objects
          const err = error as any
          errorMsg = err.message || err.error_description || err.msg || JSON.stringify(err)
        } else {
          errorMsg = String(error)
        }

        console.error('[CRM Store] Failed to mark lead as won:', {
          leadOpId,
          jobId: newJob.job_id,
          newJob, // Log the full payload to see what was sent
          errorMsg,
          errorType: error instanceof Error ? 'Error' : typeof error,
          fullError: error,
        })
        set({ error: `Failed to mark as won: ${errorMsg}` })
        // Don't update UI if Supabase operation failed
        return newJob // Return early, don't proceed with UI updates
      }
    }

    // Only update UI if database operation succeeded (or if not using Supabase)
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
          created_by: job.owner || 'system',
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
            created_by: job.owner || 'system',
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
          created_by: job.owner || 'system',
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
            created_by: job.owner || 'system',
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
    // Optimistically add to store first
    set((s) => ({ opStages: [...s.opStages, stage] }))

    if (USE_SUPABASE) {
      try {
        console.log('[addOpStage] Attempting to save stage to database:', stage)
        const result = await db.opStageQueries.create(stage)
        console.log('[addOpStage] ✅ Stage saved successfully:', result)
        // Stage already in store from optimistic update, no need to update again
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to save stage to database'
        console.error('[addOpStage] ❌ Error saving stage to database:', errorMsg, error)

        // Show error toast to user
        set({ error: `Stage created locally but failed to save: ${errorMsg}. Try refreshing the page if it disappears.` })

        // Log full error for debugging
        if (error instanceof Error) {
          console.error('[addOpStage] Full error details:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          })
        }
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

  reorderStages: async (stageIds: string[]) => {
    set((s) => ({
      opStages: stageIds
        .map((id) => s.opStages.find((stage) => stage.id === id))
        .filter((stage): stage is DynamicOPStage => stage !== undefined)
        .map((stage, index) => ({ ...stage, order: index })),
    }))
    if (USE_SUPABASE) {
      try {
        const updates = stageIds.map((id, index) => ({ id, order: index }))
        await Promise.all(updates.map(({ id, order }) => db.opStageQueries.update(id, { order })))
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to reorder stages' })
      }
    }
  },

  updateStageColor: async (stageId: string, colorName: string) => {
    // Map color name to full Tailwind classes
    const colorMappings: Record<string, { accentColor: string; dotColor: string; headerBg: string; columnBg: string }> = {
      slate: { accentColor: 'border-t-slate-400', dotColor: 'bg-slate-400', headerBg: 'bg-slate-50', columnBg: 'bg-slate-50/60' },
      blue: { accentColor: 'border-t-blue-400', dotColor: 'bg-blue-400', headerBg: 'bg-blue-50/60', columnBg: 'bg-blue-50/30' },
      teal: { accentColor: 'border-t-teal-500', dotColor: 'bg-teal-500', headerBg: 'bg-teal-50/60', columnBg: 'bg-teal-50/20' },
      green: { accentColor: 'border-t-green-500', dotColor: 'bg-green-500', headerBg: 'bg-green-50/60', columnBg: 'bg-green-50/20' },
      amber: { accentColor: 'border-t-amber-400', dotColor: 'bg-amber-400', headerBg: 'bg-amber-50/60', columnBg: 'bg-amber-50/20' },
      orange: { accentColor: 'border-t-orange-400', dotColor: 'bg-orange-400', headerBg: 'bg-orange-50/60', columnBg: 'bg-orange-50/20' },
      red: { accentColor: 'border-t-red-500', dotColor: 'bg-red-500', headerBg: 'bg-red-50/60', columnBg: 'bg-red-50/20' },
      purple: { accentColor: 'border-t-purple-500', dotColor: 'bg-purple-500', headerBg: 'bg-purple-50/60', columnBg: 'bg-purple-50/20' },
    }

    const mapping = colorMappings[colorName]
    if (!mapping) return

    set((s) => ({
      opStages: s.opStages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              accentColor: mapping.accentColor,
              dotColor: mapping.dotColor,
              headerBg: mapping.headerBg,
              columnBg: mapping.columnBg
            }
          : stage
      ),
    }))
    if (USE_SUPABASE) {
      try {
        await db.opStageQueries.update(stageId, {
          accentColor: mapping.accentColor,
          dotColor: mapping.dotColor,
          headerBg: mapping.headerBg,
          columnBg: mapping.columnBg
        })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to update stage color' })
      }
    }
  },

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

  removeActivityAttachment: async (activityId, attachmentIndex) => {
    console.log('[removeActivityAttachment] Removing attachment from activity:', { activityId, attachmentIndex })

    set((s) => ({
      activities: s.activities.map((a) => {
        if (a.activity_id === activityId && a.attachments) {
          const updatedAttachments = a.attachments.filter((_, idx) => idx !== attachmentIndex)
          console.log('[removeActivityAttachment] Updated attachments:', { before: a.attachments.length, after: updatedAttachments.length })
          return {
            ...a,
            attachments: updatedAttachments,
          }
        }
        return a
      }),
    }))

    // Sync to Supabase if enabled
    if (USE_SUPABASE) {
      try {
        const activity = get().activities.find((a) => a.activity_id === activityId)
        if (activity) {
          console.log('[removeActivityAttachment] Syncing to Supabase:', { activityId, attachmentCount: activity.attachments?.length ?? 0 })
          const result = await db.activityQueries.update(activityId, {
            attachments: activity.attachments,
          })
          console.log('[removeActivityAttachment] Supabase update successful:', result)
        } else {
          console.error('[removeActivityAttachment] Activity not found in store:', activityId)
        }
      } catch (error) {
        console.error('[removeActivityAttachment] Supabase sync failed:', error)
        set({ error: error instanceof Error ? error.message : 'Failed to remove attachment' })
      }
    }
  },
}));

