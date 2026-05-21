/**
 * FlowAccount OpenAPI Service — @flowaccount/openapi-sdk
 * Docs: https://developers.flowaccount.com/tutorial/how-to-use-sdk/example-type-script-sdk
 *
 * Credentials: set FLOWACCOUNT_CLIENT_ID + FLOWACCOUNT_CLIENT_SECRET in .env.local
 * Register: https://form.flowaccount.com/request-openapi
 */

import {
  AuthenticationApi,
  BillingNotesApi,
  CashInvoiceApi,
  QuotationsApi,
  TaxInvoiceApi,
  SimpleDocument,
  SimpleProductItem,
} from '@flowaccount/openapi-sdk'
import type { WonJob, Company, ContactPerson } from '@/types'

// ─── Payload types ────────────────────────────────────────────────────────────

export type FlowAccountDocType =
  | 'quotation'       // QT  — type 3  — pre-sale estimate
  | 'billing_note'    // BL  — type 5  — used before invoice
  | 'tax_invoice'     // INV — type 7  — VAT-registered sale
  | 'cash_invoice'    // CA  — type 35 — immediate payment

export interface DocumentLineItem {
  name: string
  description?: string
  quantity: number
  unitPrice: number
  unitName?: string          // default: 'งาน'
  sku?: string
}

export interface CreateDocumentPayload {
  // ── Contact (maps from Company + ContactPerson) ──
  contactName: string          // company / account name (legal entity)
  contactPerson?: string       // individual's name at that company
  contactTaxId?: string
  contactAddress?: string
  contactBranch?: string       // default: 'สำนักงานใหญ่'
  contactEmail?: string
  contactPhone?: string
  contactZipCode?: string
  contactGroup?: 1 | 3         // 1 = individual, 3 = legal entity (default: 3)

  // ── Document ──
  documentDate: string         // "YYYY-MM-DD"
  dueDate?: string             // defaults to documentDate
  creditDays?: number          // if set → creditType=1 (credit days)
  referenceNumber?: string
  salesName?: string
  projectName?: string
  note?: string

  // ── Line items ──
  lineItems: DocumentLineItem[]

  // ── Tax ──
  includeVat?: boolean         // true (default) = 7% VAT added on top of line totals
  discountPercentage?: number  // 0–100, applies to subtotal
}

// ── Unified response ──────────────────────────────────────────────────────────

export interface DocumentResult {
  success: boolean
  documentId?: string          // numeric ID as string
  documentSerial?: string      // human doc number, e.g. "QT2026/0001"
  totalAmount?: number
  grandTotal?: number
  error?: string
}

// ─── Token cache (server-side, per Node.js process) ───────────────────────────

let _tokenCache: { token: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  const clientId     = process.env.FLOWACCOUNT_CLIENT_ID
  const clientSecret = process.env.FLOWACCOUNT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing FlowAccount credentials. Add FLOWACCOUNT_CLIENT_ID and FLOWACCOUNT_CLIENT_SECRET to .env.local'
    )
  }

  // Return cached token if valid with 60-second buffer
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.token
  }

  const authApi = new AuthenticationApi()
  const res = await authApi.tokenPost(
    'application/x-www-form-urlencoded',
    'client_credentials',
    'flowaccount-api',
    clientId,
    clientSecret
  )

  const accessToken = res.body.accessToken
  const expiresIn   = res.body.expiresIn ?? 3600

  if (!accessToken) {
    throw new Error('FlowAccount: token response contained no accessToken')
  }

  _tokenCache = {
    token: accessToken,
    expiresAt: Date.now() + expiresIn * 1000,
  }

  return accessToken
}

// ─── SimpleDocument builder ───────────────────────────────────────────────────
// Single place that maps CreateDocumentPayload → SDK SimpleDocument.
// All previously-missing fields are now included.

function buildSimpleDocument(payload: CreateDocumentPayload): SimpleDocument {
  // ── Line items ──
  const items: SimpleProductItem[] = payload.lineItems.map((item) => {
    const si = new SimpleProductItem()
    si.name         = item.name
    si.description  = item.description ?? ''
    si.sku          = item.sku ?? ''
    si.type         = 1                             // 1 = Service
    si.quantity     = item.quantity
    si.pricePerUnit = item.unitPrice
    si.total        = Math.round(item.quantity * item.unitPrice * 100) / 100
    si.unitName     = item.unitName ?? 'งาน'
    si.sellChartOfAccountCode = '41110'             // Default revenue account
    si.buyChartOfAccountCode  = ''
    return si
  })

  // ── Totals ──
  const subTotal   = items.reduce((s, i) => s + (i.total ?? 0), 0)
  const discountPct = payload.discountPercentage ?? 0
  const discountAmt = Math.round(subTotal * (discountPct / 100) * 100) / 100
  const afterDisc  = subTotal - discountAmt
  const isVat      = payload.includeVat !== false
  const vatAmount  = isVat ? Math.round(afterDisc * 0.07 * 100) / 100 : 0
  const grandTotal = Math.round((afterDisc + vatAmount) * 100) / 100

  // ── Credit terms ──
  // creditType: 1 = Credit (days), 3 = Cash, 5 = Credit (no expiry)
  const hasCreditDays = typeof payload.creditDays === 'number' && payload.creditDays > 0
  const creditType    = hasCreditDays ? 1 : 3
  const creditDays    = hasCreditDays ? payload.creditDays! : 0

  // ── Document ──
  const doc = new SimpleDocument()

  // recordId=0 for new documents
  doc.recordId              = 0

  // Contact — contactName = company name, contactPerson = individual's name
  doc.contactName           = payload.contactName
  doc.contactPerson         = payload.contactPerson     ?? ''
  doc.contactTaxId          = payload.contactTaxId      ?? ''
  doc.contactAddress        = payload.contactAddress    ?? ''
  doc.contactBranch         = payload.contactBranch     ?? 'สำนักงานใหญ่'
  doc.contactEmail          = payload.contactEmail      ?? ''
  doc.contactNumber         = payload.contactPhone      ?? ''
  doc.contactZipCode        = payload.contactZipCode    ?? ''
  doc.contactGroup          = payload.contactGroup      ?? 3  // 3 = legal entity

  // Document dates & terms
  doc.publishedOn           = payload.documentDate
  doc.dueDate               = payload.dueDate ?? payload.documentDate
  doc.creditType            = creditType
  doc.creditDays            = creditDays

  // Optional meta
  doc.reference             = payload.referenceNumber   ?? ''
  doc.salesName             = payload.salesName         ?? ''
  doc.projectName           = payload.projectName       ?? ''
  doc.remarks               = payload.note              ?? ''

  // VAT
  doc.isVat                 = isVat
  doc.isVatInclusive        = false    // prices are always VAT-exclusive

  // Totals — all must be set explicitly per the API spec
  doc.subTotal              = subTotal
  doc.discountPercentage    = discountPct
  doc.discountAmount        = discountAmt
  doc.totalAfterDiscount    = afterDisc
  doc.vatAmount             = vatAmount
  doc.grandTotal            = grandTotal

  // Withholding tax — not used in standard photobooth invoices
  doc.documentShowWithholdingTax = false

  // Receipt deduction — not used for simple documents
  doc.useReceiptDeduction   = false

  // Structure type — required; 'Simple document' for SimpleDocument objects
  doc.documentStructureType = 'Simple document'

  doc.items                 = items

  return doc
}

// ─── Extract result from SDK response body ────────────────────────────────────

function extractResult(body: Record<string, unknown>): DocumentResult {
  const data = (body.data ?? body) as Record<string, unknown>
  return {
    success:        true,
    documentId:     String(data.recordId ?? data.documentId ?? data.id ?? ''),
    documentSerial: String(data.documentSerial ?? data.documentNumber ?? data.number ?? ''),
    totalAmount:    typeof data.totalAfterDiscount === 'number' ? data.totalAfterDiscount : undefined,
    grandTotal:     typeof data.grandTotal === 'number' ? data.grandTotal : undefined,
  }
}

// ─── Document creation functions ──────────────────────────────────────────────

export async function createQuotation(payload: CreateDocumentPayload): Promise<DocumentResult> {
  const token = `Bearer ${await getAccessToken()}`
  const doc   = buildSimpleDocument(payload)
  const api   = new QuotationsApi()
  const res   = await api.quotationsPost(token, doc)
  return extractResult(res.body as Record<string, unknown>)
}

export async function createBillingNote(payload: CreateDocumentPayload): Promise<DocumentResult> {
  const token = `Bearer ${await getAccessToken()}`
  const doc   = buildSimpleDocument(payload)
  const api   = new BillingNotesApi()
  const res   = await api.billingNotesPost(token, doc)
  return extractResult(res.body as Record<string, unknown>)
}

export async function createTaxInvoice(payload: CreateDocumentPayload): Promise<DocumentResult> {
  const token = `Bearer ${await getAccessToken()}`
  const doc   = buildSimpleDocument(payload)
  const api   = new TaxInvoiceApi()
  const res   = await api.taxInvoicesPost(token, doc)
  return extractResult(res.body as Record<string, unknown>)
}

export async function createCashInvoice(payload: CreateDocumentPayload): Promise<DocumentResult> {
  const token = `Bearer ${await getAccessToken()}`
  const doc   = buildSimpleDocument(payload)
  const api   = new CashInvoiceApi()
  const res   = await api.cashInvoicesPost(token, doc)
  return extractResult(res.body as Record<string, unknown>)
}

/** Dispatch to the correct document type */
export async function createDocument(
  type: FlowAccountDocType,
  payload: CreateDocumentPayload
): Promise<DocumentResult> {
  switch (type) {
    case 'quotation':    return createQuotation(payload)
    case 'billing_note': return createBillingNote(payload)
    case 'tax_invoice':  return createTaxInvoice(payload)
    case 'cash_invoice': return createCashInvoice(payload)
    default:             throw new Error(`Unknown FlowAccount document type: ${type}`)
  }
}

// ─── CRM helper: WonJob → FlowAccount document ───────────────────────────────
// Builds a ready-to-send payload directly from a WonJob + linked Company/Contact.
// The caller still chooses which document type to issue (quotation, invoice, etc.)

export function buildPayloadFromJob(
  job: WonJob,
  company: Company,
  contact: ContactPerson,
  options?: {
    documentDate?: string
    dueDate?: string
    creditDays?: number
    referenceNumber?: string
    salesName?: string
    includeVat?: boolean
  }
): CreateDocumentPayload {
  const today = new Date().toISOString().split('T')[0]

  // Determine contactGroup from company type
  const contactGroup: 1 | 3 = company.company_type === 'individual' ? 1 : 3

  // Single line item representing the job
  const lineItem: DocumentLineItem = {
    name:        `${job.product_type} #${job.job_number}`,
    description: [job.event_display_name, job.venue].filter(Boolean).join(' — '),
    quantity:    1,
    unitPrice:   job.estimated_value,
    unitName:    'งาน',
  }

  return {
    // Contact info — pulled from Company + ContactPerson (single source of truth)
    contactName:    company.company_name,
    contactPerson:  contact.name,
    contactTaxId:   company.tax_id,
    contactAddress: company.registered_address,
    contactBranch:  company.branch_name ?? 'สำนักงานใหญ่',
    contactEmail:   company.email ?? contact.email,
    contactPhone:   company.phone ?? contact.phone,
    contactGroup,

    // Document dates
    documentDate:    options?.documentDate ?? today,
    dueDate:         options?.dueDate,
    creditDays:      options?.creditDays,
    referenceNumber: options?.referenceNumber ?? `JOB-${job.job_number}`,
    salesName:       options?.salesName ?? job.owner,
    projectName:     job.event_display_name,
    note:            job.job_detail_notes || undefined,

    lineItems:   [lineItem],
    includeVat:  options?.includeVat ?? true,
  }
}

// ─── Backward compat alias (old callers used CreateQuotationPayload) ──────────
// Removed — use CreateDocumentPayload directly.
