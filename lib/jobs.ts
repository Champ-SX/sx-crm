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
  return `${dateStr} - ${num} - ${type} - ${cat} - ${joinNameAndPlace(name, place)}`
}

// Short version for card subtitle line
export function formatJobTitleShort(job: Pick<WonJob, 'product_cat' | 'product_name' | 'place'>): string {
  const name = job.product_name || job.product_cat || '—'
  const place = job.place || '—'
  return joinNameAndPlace(name, place)
}

// A stored value "looks canonical" when it starts with a YYYY.MM(.DD) date —
// i.e. someone typed the whole "2026.08.22 - 080 - …" string into a field.
function looksCanonical(s: string | null | undefined): boolean {
  return /^\s*\d{4}\.\d{2}/.test(s || '')
}

type JobTitleFields = Pick<WonJob, 'event_display_name' | 'event_date' | 'job_number' | 'product_type' | 'product_cat' | 'product_name' | 'place'>

// The FULL canonical string for a job, shown inside a single card (detail
// header, dialogs). Real data varies: some jobs store the whole canonical
// string in event_display_name or product_name; others have clean structured
// fields. Prefer a stored canonical string verbatim (so we never double-nest
// it), else compose one from the fields.
export function jobCanonicalTitle(job: JobTitleFields): string {
  if (looksCanonical(job.event_display_name)) return (job.event_display_name as string).trim()
  if (looksCanonical(job.product_name)) return (job.product_name as string).trim()
  return formatJobTitle(job)
}

// The SHORT name for a Won board card: the event name + place only. Derived by
// parsing the canonical string down to its name@place segment — so a card whose
// data holds the full string still shows a readable headline, not the whole
// "YYYY.MM.DD - ### - TYPE - CAT - …" line.
export function jobCardName(job: JobTitleFields): string {
  const canon = jobCanonicalTitle(job)
  const parsed = parseJobTitle(canon)
  if (parsed.product_name) {
    return joinNameAndPlace(parsed.product_name.trim(), (parsed.place || job.place || '').trim())
  }
  return formatJobTitleShort(job)
}

// Back-compat alias used by dialogs/drag overlay — the full canonical string.
export function jobDisplayTitle(job: JobTitleFields): string {
  return jobCanonicalTitle(job)
}

// Metadata breadcrumb for the detail header — product type · category.
// Excludes date/#num (already in the chip row above) and name/place (already
// the large title), and drops blank segments so we never render "— —" gaps.
// Output: "CAP*TURES · Roadshow"
export function formatJobMeta(job: Pick<WonJob, 'product_type' | 'product_cat'>): string {
  return [job.product_type || '', job.product_cat || ''].filter(Boolean).join(' · ')
}

// Join "name@place" without duplicating the venue. Product names sometimes
// already include the venue (e.g. "Rayban @Central World"), which previously
// produced "Rayban @Central World@Central World". Skip the suffix when the
// name already ends with the place (with or without a leading @).
function joinNameAndPlace(name: string, place: string): string {
  if (!place || place === '—') return name
  const n = name.trim()
  const p = place.trim()
  const tail = n.toLowerCase().replace(/\s*@\s*/g, '').slice(-p.length)
  if (tail === p.toLowerCase()) return n
  return `${n}@${p}`
}

// ─── Title parser (backward compat) ──────────────────────────────────────────
// Parses: "2026.05.21 - 041 - LCA + Film - Event - Sephora@EastinGrand"
// Returns partial WonJob fields; caller merges with existing data.

// The job number is the FIRST stand-alone integer segment (2–4 digits). Dates
// always contain a dot ("2026.09.18", "10.08"), so a bare number can't be a
// date — this locates the number even when the title has extra date segments
// (e.g. "2026.09.18 - 10.08 - 098 - …" → 098). Blank when the title has none.
export function parseJobNumber(title: string | null | undefined): string {
  if (!title) return ''
  const seg = title.split(' - ').map((s) => s.trim()).find((p) => /^\d{2,4}$/.test(p))
  return seg ?? ''
}

// ─── Event dates from the title ──────────────────────────────────────────────
// Everything before the job number is date(s):
//   "2026.09.26 - 120 - …"                → single day
//   "2026.09.26 - 10.04 - 120 - …"        → range (end = MM.DD, same year; rolls
//                                            into next year if the month is earlier)
//   "2026.09.26, 10.03, 10.10 - 120 - …"  → multiple separate days (commas)
// Returns ISO dates ("2026-09-26"). Empty when the title has no leading date.
export function parseJobDates(title: string | null | undefined): { start: string | null; end: string | null; dates: string[] } {
  const none = { start: null, end: null, dates: [] as string[] }
  if (!title) return none
  const parts = title.split(' - ').map((s) => s.trim())
  const numIdx = parts.findIndex((p) => /^\d{2,4}$/.test(p))
  const dateSegs = numIdx === -1 ? parts.slice(0, 1) : parts.slice(0, numIdx)
  const first = dateSegs[0]?.split(',').map((s) => s.trim()).filter(Boolean) ?? []
  const m = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(first[0] ?? '')
  if (!m) return none
  const year = Number(m[1])
  const start = `${m[1]}-${m[2]}-${m[3]}`
  // Resolve "MM.DD" (or a full "YYYY.MM.DD") relative to the start date.
  const resolve = (s: string): string | null => {
    const full = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(s)
    if (full) return `${full[1]}-${full[2]}-${full[3]}`
    const md = /^(\d{1,2})\.(\d{1,2})$/.exec(s)
    if (!md) return null
    const mm = md[1].padStart(2, '0'), dd = md[2].padStart(2, '0')
    const y = Number(mm) < Number(m[2]) ? year + 1 : year
    return `${y}-${mm}-${dd}`
  }
  if (first.length > 1) {                          // comma list → multiple days
    const dates = [start, ...first.slice(1).map(resolve).filter((d): d is string => !!d)]
    return { start, end: null, dates }
  }
  const endRaw = dateSegs[1]
  const end = endRaw ? resolve(endRaw) : null      // second segment → range end
  return { start, end: end && end > start ? end : null, dates: [start] }
}

// Compact date label for the small Won card:
//   one day   → "26 Sep 26"
//   range     → "26 Sep – 04 Oct 26"   (year once when both in the same year)
//   multi-day → "26 Sep 26 · +2"
export function formatEventDateShort(job: Pick<WonJob, 'event_date' | 'event_end_date' | 'event_display_name' | 'product_name'>): string {
  const parsed = parseJobDates(job.event_display_name || job.product_name)
  const start = job.event_date || parsed.start
  if (!start) return ''
  const end = job.event_end_date || parsed.end
  const d = (iso: string, pat: string) => format(parseISO(iso + 'T00:00:00'), pat)
  if (end && end > start) {
    return start.slice(0, 4) === end.slice(0, 4)
      ? `${d(start, 'dd MMM')} – ${d(end, 'dd MMM yy')}`
      : `${d(start, 'dd MMM yy')} – ${d(end, 'dd MMM yy')}`
  }
  if (parsed.dates.length > 1) return `${d(start, 'dd MMM yy')} · +${parsed.dates.length - 1}`
  return d(start, 'dd MMM yy')
}

// Full label for tooltips / the detail drawer, e.g. "26 Sep 26 – 04 Oct 26 (9 days)".
export function formatEventDateLong(job: Pick<WonJob, 'event_date' | 'event_end_date' | 'event_display_name' | 'product_name'>): string {
  const parsed = parseJobDates(job.event_display_name || job.product_name)
  const start = job.event_date || parsed.start
  if (!start) return ''
  const end = job.event_end_date || parsed.end
  const d = (iso: string) => format(parseISO(iso + 'T00:00:00'), 'dd MMM yy')
  if (end && end > start) {
    const days = Math.round((parseISO(end).getTime() - parseISO(start).getTime()) / 864e5) + 1
    return `${d(start)} – ${d(end)} (${days} days)`
  }
  if (parsed.dates.length > 1) return parsed.dates.map(d).join(', ')
  return d(start)
}

export function parseJobTitle(title: string): Partial<WonJob> {
  if (!title) return {}
  // " - " separated; note "LCA + Film" can contain " + " inside one segment.
  const parts = title.split(' - ').map((s) => s.trim())
  if (parts.length < 3) return {}

  // Anchor on the job number (first bare 2–4 digit segment), not on position —
  // titles may carry one or two leading date segments before it.
  const numIdx = parts.findIndex((p) => /^\d{2,4}$/.test(p))
  if (numIdx === -1) return {}   // no number → let display fall back to fields

  const jobNumber   = parts[numIdx]
  const rawDate     = parts[0].split(',')[0].trim()              // "2026.05.21" (first of a comma list)
  const productType = parts[numIdx + 1] ?? ''
  const productCat  = parts[numIdx + 2] ?? ''
  const rest        = parts.slice(numIdx + 3).join(' - ').trim() // "Sephora@EastinGrand"

  const atIdx = rest.lastIndexOf('@')
  const productName = atIdx > -1 ? rest.substring(0, atIdx).trim() : rest
  const place       = atIdx > -1 ? rest.substring(atIdx + 1).trim() : ''

  const out: Partial<WonJob> = { job_number: jobNumber, product_type: productType, product_cat: productCat, product_name: productName, place }
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(rawDate)) out.event_date = rawDate.replace(/\./g, '-')  // "2026.05.21" → "2026-05-21"
  return out
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
    product_type: null,      // Nullable - use null instead of empty string
    product_cat: null,       // Nullable - use null instead of default
    place: null,             // Nullable - use null instead of empty string
    event_display_name: null, // Nullable - use null instead of empty string
    event_time: null,        // Nullable - use null instead of empty string
    venue: null,             // Nullable - use null instead of empty string
    job_detail_notes: null,  // Nullable - use null instead of empty string
    onsite_contact_name: null, // Nullable - use null instead of empty string
    onsite_contact_phone: null, // Nullable - use null instead of empty string
    onsite_line_id: null,    // Nullable - use null instead of empty string
    install_point: null,     // Nullable - use null instead of empty string
    team_meeting_time: null, // Nullable - use null instead of empty string
    onsite_notes: null,      // Nullable - use null instead of empty string
    staff_list: null,        // Nullable - initially no staff assigned
    company_account: { company_name: null }, // Simplified: just empty account
    payment_status: 'unpaid',
    staff_status: 'pending',
    doc_status: 'pending',
    position: 0,
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
