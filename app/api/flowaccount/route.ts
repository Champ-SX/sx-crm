/**
 * Server-side proxy for FlowAccount API
 * Keeps client_id / client_secret out of the browser bundle.
 *
 * POST /api/flowaccount
 *   { action: 'create_document',  documentType: FlowAccountDocType, payload: CreateDocumentPayload }
 *   { action: 'create_quotation', payload: CreateDocumentPayload }   ← backward-compat alias
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  createDocument,
  type CreateDocumentPayload,
  type FlowAccountDocType,
} from '@/lib/flowaccount'

const VALID_ACTIONS = new Set([
  'create_document',
  'create_quotation',
  'create_billing_note',
  'create_tax_invoice',
  'create_cash_invoice',
])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!VALID_ACTIONS.has(body.action)) {
      return NextResponse.json(
        { success: false, error: `Unknown action "${body.action}". Valid actions: ${[...VALID_ACTIONS].join(', ')}` },
        { status: 400 }
      )
    }

    if (!process.env.FLOWACCOUNT_CLIENT_ID || !process.env.FLOWACCOUNT_CLIENT_SECRET) {
      return NextResponse.json(
        { success: false, error: 'FlowAccount API credentials are not configured. Add FLOWACCOUNT_CLIENT_ID and FLOWACCOUNT_CLIENT_SECRET to your .env.local file.' },
        { status: 503 }
      )
    }

    const payload: CreateDocumentPayload = body.payload

    // Resolve document type:
    //   create_document  → body.documentType (required)
    //   create_quotation → 'quotation'        (backward compat)
    //   create_*         → strip 'create_' prefix
    let docType: FlowAccountDocType

    if (body.action === 'create_document') {
      if (!body.documentType) {
        return NextResponse.json(
          { success: false, error: 'documentType is required when action is "create_document"' },
          { status: 400 }
        )
      }
      docType = body.documentType as FlowAccountDocType
    } else {
      // 'create_quotation' → 'quotation', 'create_billing_note' → 'billing_note', etc.
      docType = body.action.replace('create_', '') as FlowAccountDocType
    }

    const result = await createDocument(docType, payload)

    return NextResponse.json(result, { status: result.success ? 200 : 422 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
