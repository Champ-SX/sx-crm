/**
 * FlowAccount OpenAPI Service
 * Docs: https://developers.flowaccount.com
 *
 * Auth: OAuth2 Client Credentials
 * Set FLOWACCOUNT_CLIENT_ID and FLOWACCOUNT_CLIENT_SECRET in .env.local
 * Get credentials from: FlowAccount → My Company → Connect OpenAPI
 */

export const FLOWACCOUNT_BASE_URL = 'https://openapi.flowaccount.com/v1'
export const FLOWACCOUNT_TOKEN_URL = `${FLOWACCOUNT_BASE_URL}/token`

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FlowAccountTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

export interface QuotationItem {
  description: string    // product/service description
  quantity: number
  unitPrice: number      // price per unit, before tax
  unitName?: string      // e.g. "job", "day", "piece"
  discountAmount?: number
}

export interface CreateQuotationPayload {
  contactName: string       // customer name
  contactTaxId?: string     // Thai tax ID (optional)
  contactAddress?: string
  contactEmail?: string
  contactPhone?: string
  documentDate: string      // ISO date e.g. "2026-05-18"
  dueDate?: string
  note?: string
  productItems: QuotationItem[]
  includeVat?: boolean      // default true (7% VAT)
  creditDays?: number       // payment due in N days
  referenceNumber?: string  // your internal ref
}

export interface QuotationResponse {
  success: boolean
  documentId?: string
  documentNumber?: string
  totalAmount?: number
  viewUrl?: string
  error?: string
}

// ─── Token cache (server-side, per process) ───────────────────────────────────
let _tokenCache: { token: string; expiresAt: number } | null = null

export async function getAccessToken(): Promise<string> {
  const clientId = process.env.FLOWACCOUNT_CLIENT_ID
  const clientSecret = process.env.FLOWACCOUNT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('FLOWACCOUNT_CLIENT_ID and FLOWACCOUNT_CLIENT_SECRET are not set in environment variables.')
  }

  // Return cached token if still valid (with 60s buffer)
  if (_tokenCache && _tokenCache.expiresAt > Date.now() + 60_000) {
    return _tokenCache.token
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'read write',
  })

  const res = await fetch(FLOWACCOUNT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`FlowAccount token error ${res.status}: ${text}`)
  }

  const data: FlowAccountTokenResponse = await res.json()
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }

  return data.access_token
}

// ─── Create Quotation ─────────────────────────────────────────────────────────

export async function createQuotation(payload: CreateQuotationPayload): Promise<QuotationResponse> {
  const token = await getAccessToken()

  // Build FlowAccount quotation body
  // Reference: https://developers.flowaccount.com/api-reference
  const body = {
    documentDate: payload.documentDate,
    dueDate: payload.dueDate ?? payload.documentDate,
    creditDays: payload.creditDays ?? 0,
    referenceNumber: payload.referenceNumber ?? '',
    note: payload.note ?? '',
    showSignatureField: true,

    // Contact / Customer
    contactName: payload.contactName,
    contactTaxId: payload.contactTaxId ?? '',
    contactAddress: payload.contactAddress ?? '',
    contactEmail: payload.contactEmail ?? '',
    contactPhone: payload.contactPhone ?? '',
    contactBranch: 'head office',

    // Line items
    productItems: payload.productItems.map((item, i) => ({
      itemOrder: i + 1,
      description: item.description,
      quantity: item.quantity,
      unitName: item.unitName ?? 'งาน',
      pricePerUnit: item.unitPrice,
      discountAmount: item.discountAmount ?? 0,
    })),

    // Tax settings — Thai standard: 7% VAT included or excluded
    taxType: payload.includeVat !== false ? 1 : 0, // 0=no vat, 1=vat included, 2=vat excluded
    discount: 0,
  }

  const res = await fetch(`${FLOWACCOUNT_BASE_URL}/quotations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    return {
      success: false,
      error: data.message ?? data.error ?? `API error ${res.status}`,
    }
  }

  return {
    success: true,
    documentId: data.id ?? data.documentId,
    documentNumber: data.documentNumber ?? data.number,
    totalAmount: data.totalAmount ?? data.total,
    viewUrl: data.publicUrl ?? data.shareUrl,
  }
}
