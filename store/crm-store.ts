'use client'

import { create } from 'zustand'
import type { Customer, Lead, Opportunity, WonProject, Activity, Task } from '@/types'
import {
  mockCustomers,
  mockLeads,
  mockOpportunities,
  mockWonProjects,
  mockActivities,
  mockTasks,
} from '@/lib/mock-data'

interface CRMStore {
  customers: Customer[]
  leads: Lead[]
  opportunities: Opportunity[]
  wonProjects: WonProject[]
  activities: Activity[]
  tasks: Task[]

  addCustomer: (customer: Customer) => void
  updateCustomer: (id: string, updates: Partial<Customer>) => void

  addLead: (lead: Lead) => void
  updateLead: (id: string, updates: Partial<Lead>) => void
  convertLead: (leadId: string) => { customer: Customer; opportunity: Opportunity }

  addOpportunity: (opp: Opportunity) => void
  updateOpportunity: (id: string, updates: Partial<Opportunity>) => void
  moveOpportunityStage: (id: string, stage: Opportunity['stage']) => void
  markOpportunityWon: (id: string) => WonProject

  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void

  addActivity: (activity: Activity) => void
  getActivitiesForEntity: (entityType: Activity['entity_type'], entityId: string) => Activity[]
}

export const useCRMStore = create<CRMStore>((set, get) => ({
  customers: mockCustomers,
  leads: mockLeads,
  opportunities: mockOpportunities,
  wonProjects: mockWonProjects,
  activities: mockActivities,
  tasks: mockTasks,

  addCustomer: (customer) =>
    set((state) => ({ customers: [...state.customers, customer] })),

  updateCustomer: (id, updates) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.customer_id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
    })),

  addLead: (lead) =>
    set((state) => ({ leads: [...state.leads, lead] })),

  updateLead: (id, updates) =>
    set((state) => ({
      leads: state.leads.map((l) => (l.lead_id === id ? { ...l, ...updates } : l)),
    })),

  convertLead: (leadId) => {
    const state = get()
    const lead = state.leads.find((l) => l.lead_id === leadId)
    if (!lead) throw new Error('Lead not found')

    const now = new Date().toISOString()
    const newCustomer: Customer = {
      customer_id: crypto.randomUUID(),
      name: lead.contact_name,
      company_name: lead.company_name,
      customer_type: lead.company_name ? 'brand' : 'individual',
      email: lead.email,
      phone: lead.phone,
      line_id: lead.line_id,
      instagram: '',
      source: lead.source,
      tags: [lead.interested_service.toLowerCase()],
      notes: lead.notes,
      owner: lead.owner,
      created_at: now,
      updated_at: now,
    }

    const newOpportunity: Opportunity = {
      opportunity_id: crypto.randomUUID(),
      linked_customer_id: newCustomer.customer_id,
      linked_lead_id: leadId,
      deal_name: `${lead.contact_name} — ${lead.interested_service}`,
      service_type: lead.interested_service,
      estimated_value: 0,
      expected_close_date: '',
      event_date: lead.event_date || '',
      stage: 'New Opportunity',
      probability: 10,
      owner: lead.owner,
      next_action: 'Qualify and set up requirements call',
      next_follow_up_date: '',
      notes: lead.notes,
      created_at: now,
      updated_at: now,
    }

    set((state) => ({
      customers: [...state.customers, newCustomer],
      opportunities: [...state.opportunities, newOpportunity],
      leads: state.leads.map((l) =>
        l.lead_id === leadId ? { ...l, lead_status: 'qualified' } : l
      ),
      activities: [
        ...state.activities,
        {
          activity_id: crypto.randomUUID(),
          entity_type: 'lead',
          entity_id: leadId,
          activity_type: 'status_change',
          title: 'Lead converted to Customer + Opportunity',
          description: `Created customer record and opportunity: ${newOpportunity.deal_name}`,
          created_by: lead.owner,
          created_at: now,
        },
      ],
    }))

    return { customer: newCustomer, opportunity: newOpportunity }
  },

  addOpportunity: (opp) =>
    set((state) => ({ opportunities: [...state.opportunities, opp] })),

  updateOpportunity: (id, updates) =>
    set((state) => ({
      opportunities: state.opportunities.map((o) =>
        o.opportunity_id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o
      ),
    })),

  moveOpportunityStage: (id, stage) => {
    const now = new Date().toISOString()
    const stageProbability: Record<string, number> = {
      'New Opportunity': 10,
      Contacted: 20,
      'Requirement Collected': 35,
      'Proposal Sent': 50,
      Negotiation: 70,
      Confirmed: 90,
      Won: 100,
      Lost: 0,
    }
    set((state) => {
      const opp = state.opportunities.find((o) => o.opportunity_id === id)
      if (!opp) return state
      return {
        opportunities: state.opportunities.map((o) =>
          o.opportunity_id === id
            ? { ...o, stage, probability: stageProbability[stage] ?? o.probability, updated_at: now }
            : o
        ),
        activities: [
          ...state.activities,
          {
            activity_id: crypto.randomUUID(),
            entity_type: 'opportunity',
            entity_id: id,
            activity_type: 'status_change',
            title: `Stage moved to "${stage}"`,
            description: `Opportunity moved from "${opp.stage}" to "${stage}"`,
            created_by: opp.owner,
            created_at: now,
          },
        ],
      }
    })
  },

  markOpportunityWon: (id) => {
    const state = get()
    const opp = state.opportunities.find((o) => o.opportunity_id === id)
    if (!opp) throw new Error('Opportunity not found')
    const customer = state.customers.find((c) => c.customer_id === opp.linked_customer_id)
    const now = new Date().toISOString()

    const wonProject: WonProject = {
      project_id: crypto.randomUUID(),
      linked_opportunity_id: id,
      client_name: customer?.name || opp.deal_name,
      brand: customer?.company_name || '',
      service_used: opp.service_type,
      project_date: opp.event_date,
      project_value: opp.estimated_value,
      location: '',
      campaign_goal: opp.notes,
      deliverables: [],
      result_summary: '',
      photos_links: [],
      invoice_status: 'pending',
      reusable_case_study: false,
      notes: opp.notes,
    }

    set((state) => ({
      opportunities: state.opportunities.map((o) =>
        o.opportunity_id === id ? { ...o, stage: 'Won', probability: 100, updated_at: now } : o
      ),
      wonProjects: [...state.wonProjects, wonProject],
      activities: [
        ...state.activities,
        {
          activity_id: crypto.randomUUID(),
          entity_type: 'opportunity',
          entity_id: id,
          activity_type: 'deal_won',
          title: '🎉 Deal Won!',
          description: `${opp.deal_name} marked as Won. Won project record created.`,
          created_by: opp.owner,
          created_at: now,
        },
      ],
    }))

    return wonProject
  },

  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.task_id === id ? { ...t, ...updates } : t)),
    })),

  addActivity: (activity) =>
    set((state) => ({ activities: [...state.activities, activity] })),

  getActivitiesForEntity: (entityType, entityId) => {
    return get().activities.filter(
      (a) => a.entity_type === entityType && a.entity_id === entityId
    )
  },
}))
