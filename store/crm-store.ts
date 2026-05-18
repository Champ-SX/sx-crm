'use client'

import { create } from 'zustand'
import type { Customer, LeadOpportunity, WonJob, Activity, Task, OPStage } from '@/types'
import {
  mockCustomers,
  mockLeadOpportunities,
  mockWonJobs,
  mockActivities,
  mockTasks,
} from '@/lib/mock-data'

interface CRMStore {
  customers: Customer[]
  leadOpportunities: LeadOpportunity[]
  wonJobs: WonJob[]
  activities: Activity[]
  tasks: Task[]

  // Customers
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

  // Tasks
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void

  // Activities
  addActivity: (activity: Activity) => void
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  customers: mockCustomers,
  leadOpportunities: mockLeadOpportunities,
  wonJobs: mockWonJobs,
  activities: mockActivities,
  tasks: mockTasks,

  // ── Customers ──────────────────────────────────────────────────────────────
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
      job_id: `job-${Date.now()}`,
      job_number: newJobNumber,
      event_name: lop.name,
      customer_name: lop.customer_name,
      customer_id: lop.customer_id,
      contact_person: lop.contact_person,
      service_type: lop.service_type,
      event_date: lop.event_date ?? '',
      venue: lop.venue ?? '',
      estimated_value: lop.estimated_value,
      payment_status: 'unpaid',
      staff_status: 'pending',
      doc_status: 'pending',
      op_stage: 'WON_JOB_LIST',
      owner: lop.owner,
      notes: lop.notes,
      lead_op_id: leadOpId,
      created_at: now,
      updated_at: now,
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
