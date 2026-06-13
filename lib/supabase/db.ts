import { supabase } from './client'
import { transformStageFromDB, transformStagesFromDB } from './transformers'
import type {
  Company,
  ContactPerson,
  Customer,
  LeadOpportunity,
  WonJob,
  Activity,
  Task,
  StaffMember,
  DynamicOPStage,
  OPStage,
  TeamMember,
} from '@/types'

// ===== COMPANIES =====
export const userQueries = {
  // Team members = rows in the `users` table (people who signed in with Google).
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('name')
    if (error) throw error
    return (data || []) as TeamMember[]
  },
}

export const companyQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('company_name')
    if (error) throw error
    return (data || []) as Company[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('company_id', id)
      .single()
    if (error) throw error
    return data as Company
  },

  async create(company: Company) {
    const { data, error } = await supabase
      .from('companies')
      .insert([company])
      .select()
      .single()
    if (error) throw error
    return data as Company
  },

  async update(id: string, updates: Partial<Company>) {
    const { data, error } = await supabase
      .from('companies')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('company_id', id)
      .select()
      .single()
    if (error) throw error
    return data as Company
  },
}

// ===== CUSTOMERS (legacy) =====
export const customerQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('company_name')
    if (error) throw error
    return (data || []) as Customer[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('customer_id', id)
      .single()
    if (error) throw error
    return data as Customer
  },

  async create(customer: Customer) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single()
    if (error) throw error
    return data as Customer
  },

  async update(id: string, updates: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('customer_id', id)
      .select()
      .single()
    if (error) throw error
    return data as Customer
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('customer_id', id)
    if (error) throw error
  },
}

// ===== CONTACT PERSONS =====
export const contactPersonQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('contact_persons')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []) as ContactPerson[]
  },

  async getByCompany(companyId: string) {
    const { data, error } = await supabase
      .from('contact_persons')
      .select('*')
      .eq('company_id', companyId)
    if (error) throw error
    return (data || []) as ContactPerson[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('contact_persons')
      .select('*')
      .eq('contact_id', id)
      .single()
    if (error) throw error
    return data as ContactPerson
  },

  async create(contact: ContactPerson) {
    const { data, error } = await supabase
      .from('contact_persons')
      .insert([contact])
      .select()
      .single()
    if (error) throw error
    return data as ContactPerson
  },

  async update(id: string, updates: Partial<ContactPerson>) {
    const { data, error } = await supabase
      .from('contact_persons')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('contact_id', id)
      .select()
      .single()
    if (error) throw error
    return data as ContactPerson
  },
}

// ===== LEAD OPPORTUNITIES =====
export const leadOpportunityQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('lead_opportunities')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as LeadOpportunity[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('lead_opportunities')
      .select('*')
      .eq('lead_op_id', id)
      .single()
    if (error) throw error
    return data as LeadOpportunity
  },

  async getOpen() {
    const { data, error } = await supabase
      .from('lead_opportunities')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as LeadOpportunity[]
  },

  async create(lop: LeadOpportunity) {
    const { data, error } = await supabase
      .from('lead_opportunities')
      .insert([lop])
      .select()
      .single()
    if (error) throw error
    return data as LeadOpportunity
  },

  async update(id: string, updates: Partial<LeadOpportunity>) {
    const { data, error } = await supabase
      .from('lead_opportunities')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('lead_op_id', id)
      .select()
      .single()
    if (error) throw error
    return data as LeadOpportunity
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('lead_opportunities')
      .delete()
      .eq('lead_op_id', id)
    if (error) throw error
  },

  async markAsWon(id: string) {
    return this.update(id, { status: 'won' })
  },

  async markAsLost(id: string) {
    return this.update(id, { status: 'lost' })
  },
}

// ===== WON JOBS =====
export const wonJobQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('won_jobs')
      .select('*')
      .order('op_stage', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []) as WonJob[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('won_jobs')
      .select('*')
      .eq('job_id', id)
      .single()
    if (error) throw error
    return data as WonJob
  },

  async getByStage(stage: string) {
    const { data, error } = await supabase
      .from('won_jobs')
      .select('*')
      .eq('op_stage', stage)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data || []) as WonJob[]
  },

  async create(job: WonJob) {
    const { data, error } = await supabase
      .from('won_jobs')
      .insert([job])
      .select()
      .single()
    if (error) throw error
    return data as WonJob
  },

  async update(id: string, updates: Partial<WonJob>) {
    const { data, error } = await supabase
      .from('won_jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('job_id', id)
      .select()
      .single()
    if (error) throw error
    return data as WonJob
  },

  async moveToStage(id: string, stage: OPStage) {
    return this.update(id, { op_stage: stage })
  },

  async reorderWithinStage(id: string, position: number) {
    return this.update(id, { position })
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('won_jobs')
      .delete()
      .eq('job_id', id)
    if (error) throw error
  },
}

// ===== DYNAMIC OP STAGES =====
export const opStageQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('dynamic_op_stages')
      .select('*')
      .order('order')
    if (error) throw error
    // Transform snake_case from DB to camelCase for TypeScript
    return transformStagesFromDB(data || [])
  },

  async create(stage: DynamicOPStage) {
    // Convert camelCase to snake_case for database insert
    const dbStage = {
      stage_id: stage.id,
      label: stage.label,
      order: stage.order,
      accent_color: stage.accentColor,
      dot_color: stage.dotColor,
      header_bg: stage.headerBg,
      column_bg: stage.columnBg,
      is_custom: stage.isCustom,
    }

    const { data, error } = await supabase
      .from('dynamic_op_stages')
      .insert([dbStage])
      .select()
      .single()
    if (error) throw error
    // Transform response back to camelCase
    return transformStageFromDB(data)
  },

  async update(id: string, updates: Partial<DynamicOPStage>) {
    // Convert camelCase fields to snake_case for database update
    const dbUpdates: any = {}
    if (updates.label !== undefined) dbUpdates.label = updates.label
    if (updates.order !== undefined) dbUpdates.order = updates.order
    if (updates.accentColor !== undefined) dbUpdates.accent_color = updates.accentColor
    if (updates.dotColor !== undefined) dbUpdates.dot_color = updates.dotColor
    if (updates.headerBg !== undefined) dbUpdates.header_bg = updates.headerBg
    if (updates.columnBg !== undefined) dbUpdates.column_bg = updates.columnBg
    if (updates.isCustom !== undefined) dbUpdates.is_custom = updates.isCustom

    const { data, error } = await supabase
      .from('dynamic_op_stages')
      .update(dbUpdates)
      .eq('stage_id', id)
      .select()
      .single()
    if (error) throw error
    // Transform response back to camelCase
    return transformStageFromDB(data)
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('dynamic_op_stages')
      .delete()
      .eq('stage_id', id)
    if (error) throw error
  },
}

// ===== ACTIVITIES =====
export const activityQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Activity[]
  },

  async getForEntity(entityType: string, entityId: string) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as Activity[]
  },

  async create(activity: Activity) {
    const { data, error } = await supabase
      .from('activities')
      .insert([activity])
      .select()
      .single()
    if (error) throw error
    return data as Activity
  },

  async update(id: string, updates: Partial<Activity>) {
    const { data, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('activity_id', id)
      .select()
      .single()
    if (error) throw error
    return data as Activity
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('activity_id', id)
    if (error) throw error
  },
}

// ===== TASKS =====
export const taskQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date')
    if (error) throw error
    return (data || []) as Task[]
  },

  async getByStatus(status: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('due_date')
    if (error) throw error
    return (data || []) as Task[]
  },

  async create(task: Task) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([task])
      .select()
      .single()
    if (error) throw error
    return data as Task
  },

  async update(id: string, updates: Partial<Task>) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('task_id', id)
      .select()
      .single()
    if (error) throw error
    return data as Task
  },
}

// ===== STAFF MEMBERS =====
export const staffQueries = {
  async getAll() {
    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .order('name')
    if (error) throw error
    return (data || []) as StaffMember[]
  },

  async create(staff: StaffMember) {
    const { data, error } = await supabase
      .from('staff_members')
      .insert([staff])
      .select()
      .single()
    if (error) throw error
    return data as StaffMember
  },
}
