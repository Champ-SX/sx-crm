import type { WonJob, CompanyAccount, Company, ContactPerson, Customer } from '@/types'
import { format, parseISO } from 'date-fns'

// ─── Title formatter ──────────────────────────────────────────────────────────
// Output: "2026.05.21 - 041 - LCA + Film - Event - Sephora@EastinGrand"

export function formatJobTitle(job: Pick<WonJob, 'event_date' | 'job_number' | 'product_type' | 'product_cat' | 'product_name' | 'place'>): string {
  const dateStr = job.event_date
    ? job.event_date.replace(/-/g, '.')   // "2026-05-21" → "2026.05.21"
    : '—'
  const num  = job.job_number  || '—'
  const type = job.product_type || '—'
  const cat  = job.product_cat  || '—'
  const name = job.product_name || '—'
  const place = job.place       || '—'
  return `${dateStr} - ${num} - ${type} - ${cat} - ${name}@${place}`
}

// Short version for card subtitle line
export function formatJobTitleShort(job: Pick<WonJob, 'product_cat' | 'product_name' | 'place'>): string {
  return `${job.product_cat} - ${job.product_name}@${job.place}`
}

// ─── Title parser (backward compat) ──────────────────────────────────────────
// Parses: "2026.05.21 - 041 - LCA + Film - Event - Sephora@EastinGrand"
// Returns partial WonJob fields; caller merges with existing data.

export function parseJobTitle(title: string): Partial<WonJob> {
  if (!title) return {}
  // Split on " - " but LCA + Film can have " + " inside — we limit splits
  const parts = title.split(' - ')
  if (parts.length < 5) return {}

  const rawDate   = parts[0].trim()                        // "2026.05.21"
  const jobNumber = parts[1].trim()                        // "041"
  const productType = parts[2].trim()                      // "LCA + Film"
  const productCat  = parts[3].trim()                      // "Event"
  const rest        = parts.slice(4).join(' - ').trim()    // "Sephora@EastinGrand"

  const atIdx = rest.lastIndexOf('@')
  const productName = atIdx > -1 ? rest.substring(0, atIdx) : rest
  const place       = atIdx > -1 ? rest.substring(atIdx + 1) : ''

  // "2026.05.21" → "2026-05-21"
  const eventDate = rawDate.replace(/\./g, '-')

  return { event_date: eventDate, job_number: jobNumber, product_type: productType, product_cat: productCat, product_name: productName, place }
}

// ─── Company → CompanyAccount bridge ─────────────────────────────────────────
// Converts a Company record (+ optional ContactPerson) into the CompanyAccount
// shape stored inside WonJob. Used by markAsWon() to auto-fill Section C.
// In Phase 5 this bridge will be removed once Section C reads Company directly.

export function companyToAccount(company: Company, contactPerson?: ContactPerson): CompanyAccount {
  return {
    company_name: company.company_name,
    contact_point: contactPerson?.name ?? '',
    phone_number: company.phone ?? '',
    line_id: company.line_id ?? '',
    email: company.email ?? '',
    tax_id: company.tax_id ?? '',
    company_address: company.registered_address ?? '',
    branch: company.branch_name ?? '',
    billing_notes: company.billing_notes ?? '',
    bank_name: company.bank_name ?? '',
    bank_account_number: company.bank_account_number ?? '',
    bank_account_name: company.bank_account_name ?? '',
    bank_branch: company.bank_branch ?? '',
  }
}

// ─── Customer → CompanyAccount bridge ────────────────────────────────────────
// Converts a Customer (legacy) record into CompanyAccount shape for WonJob Section C.
// Used by markAsWon() as a last-resort fallback when no Company is linked.

export function customerToAccount(customer: Customer): CompanyAccount {
  return {
    company_name: customer.company_name,
    contact_point: customer.billing_contact ?? customer.contact_person ?? '',
    phone_number: customer.phone ?? '',
    line_id: customer.line_id ?? '',
    email: customer.email ?? '',
    tax_id: customer.tax_id ?? '',
    company_address: customer.company_address ?? '',
    branch: customer.branch ?? '',
    billing_notes: customer.billing_notes ?? '',
    bank_name: customer.bank_name ?? '',
    bank_account_number: customer.bank_account_number ?? '',
    bank_account_name: customer.bank_account_name ?? '',
    bank_branch: customer.bank_branch ?? '',
  }
}

// ─── Empty company account ────────────────────────────────────────────────────
export function emptyCompanyAccount(): CompanyAccount {
  return {
    company_name: '',
    contact_point: '',
    phone_number: '',
    line_id: '',
    email: '',
    tax_id: '',
    company_address: '',
    branch: '',
    billing_notes: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
    bank_branch: '',
  }
}

// ─── Blank WonJob template (used when marking a lead as won) ─────────────────
export function blankWonJobFields(): Omit<WonJob, 'job_id' | 'job_number' | 'event_date' | 'product_name' | 'customer_name' | 'customer_id' | 'lead_op_id' | 'estimated_value' | 'owner' | 'op_stage' | 'created_at' | 'updated_at'> {
  return {
    product_type: '',
    product_cat: 'Event',
    place: '',
    event_display_name: '',
    event_time: '',
    venue: '',
    job_detail_notes: '',
    onsite_contact_name: '',
    onsite_contact_phone: '',
    onsite_line_id: '',
    install_point: '',
    team_meeting_time: '',
    onsite_notes: '',
    staff_list: [],
    company_account: emptyCompanyAccount(),
    payment_status: 'unpaid',
    staff_status: 'pending',
    doc_status: 'pending',
  }
}

// ─── Format event date for display ───────────────────────────────────────────
export function formatEventDate(isoDate: string): string {
  if (!isoDate) return '—'
  try {
    return format(parseISO(isoDate + 'T00:00:00'), 'EEEE, d MMMM yyyy')
  } catch {
    return isoDate
  }
}
