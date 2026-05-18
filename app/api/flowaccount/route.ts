/**
 * Server-side proxy for FlowAccount API
 * Keeps client_id / client_secret out of the browser bundle.
 *
 * POST /api/flowaccount  { action: 'create_quotation', payload: { ... } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createQuotation, type CreateQuotationPayload } from '@/lib/flowaccount'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (body.action !== 'create_quotation') {
      return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
    }

    if (!process.env.FLOWACCOUNT_CLIENT_ID || !process.env.FLOWACCOUNT_CLIENT_SECRET) {
      return NextResponse.json(
        { success: false, error: 'FlowAccount API credentials are not configured. Add FLOWACCOUNT_CLIENT_ID and FLOWACCOUNT_CLIENT_SECRET to your .env.local file.' },
        { status: 503 }
      )
    }

    const payload: CreateQuotationPayload = body.payload
    const result = await createQuotation(payload)

    return NextResponse.json(result, { status: result.success ? 200 : 422 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
