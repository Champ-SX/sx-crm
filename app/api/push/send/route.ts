import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
const vapidMailto = process.env.VAPID_MAILTO ?? 'mailto:admin@example.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidMailto, vapidPublicKey, vapidPrivateKey)
}

export async function POST(req: NextRequest) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 503 })
  }

  try {
    const { recipientId, title, body, url } = await req.json()
    if (!recipientId) {
      return NextResponse.json({ error: 'recipientId required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify caller is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load all push subscriptions for the recipient
    const { data: rows, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', recipientId)

    if (error) throw error
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/dashboard', tag: recipientId })

    const results = await Promise.allSettled(
      rows.map((row) => webpush.sendNotification(row.subscription, payload))
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) console.warn(`[push/send] ${failed} push(es) failed for recipient ${recipientId}`)

    return NextResponse.json({ ok: true, sent, failed })
  } catch (err) {
    console.error('[push/send]', err)
    return NextResponse.json({ error: 'Failed to send push' }, { status: 500 })
  }
}
