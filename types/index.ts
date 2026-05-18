export type CustomerType = 'brand' | 'agency' | 'venue' | 'organizer' | 'individual' | 'partner'

export interface Customer {
  customer_id: string
  name: string
  company_name: string
  customer_type: CustomerType
  email: string
  phone: string
  line_id?: string
  instagram?: string
  source: string
  tags: string[]
  notes: string
  owner: string
  created_at: string
  updated_at: string
}

export type LeadSource = 'website' | 'ig' | 'line' | 'referral' | 'walk-in' | 'event' | 'manual'
export type InterestedService = 'CAP*TURES' | 'Andy & Fine' | 'SX Event' | 'Booth Rental' | 'Custom Activation'
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'unqualified'

export interface Lead {
  lead_id: string
  contact_name: string
  company_name: string
  email: string
  phone: string
  line_id?: string
  source: LeadSource
  interested_service: InterestedService
  budget_range: string
  event_date?: string
  event_location: string
  lead_status: LeadStatus
  lead_score: number
  notes: string
  owner: string
  created_at: string
}

export type OpportunityStage =
  | 'New Opportunity'
  | 'Contacted'
  | 'Requirement Collected'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Confirmed'
  | 'Won'
  | 'Lost'

export interface Opportunity {
  opportunity_id: string
  linked_customer_id?: string
  linked_lead_id?: string
  deal_name: string
  service_type: string
  estimated_value: number
  expected_close_date: string
  event_date: string
  stage: OpportunityStage
  probability: number
  owner: string
  next_action: string
  next_follow_up_date: string
  notes: string
  created_at: string
  updated_at: string
}

export interface WonProject {
  project_id: string
  linked_opportunity_id?: string
  client_name: string
  brand: string
  service_used: string
  project_date: string
  project_value: number
  location: string
  campaign_goal: string
  deliverables: string[]
  result_summary: string
  photos_links: string[]
  invoice_status: 'pending' | 'sent' | 'paid' | 'overdue'
  reusable_case_study: boolean
  reactivation_date?: string
  notes: string
}

export type ActivityType = 'note' | 'call' | 'email' | 'follow_up' | 'status_change' | 'proposal_sent' | 'deal_won' | 'deal_lost' | 'task'

export interface Activity {
  activity_id: string
  entity_type: 'customer' | 'lead' | 'opportunity'
  entity_id: string
  activity_type: ActivityType
  title: string
  description: string
  created_by: string
  created_at: string
}

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'pending' | 'in_progress' | 'done'

export interface Task {
  task_id: string
  title: string
  description: string
  due_date: string
  priority: TaskPriority
  status: TaskStatus
  linked_entity_type?: 'customer' | 'lead' | 'opportunity'
  linked_entity_id?: string
  linked_entity_name?: string
  owner: string
  created_at: string
}
