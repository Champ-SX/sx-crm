import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

// Phase 2.7 — fired by Supabase pg_cron (via pg_net) every few minutes.
// Finds Won jobs whose reminder time has arrived, notifies the owner + assignees
// (in-app notification + web push), and stamps due_notified_at so each fires once.
// Runs with the service-role key (no user session); gated by x-cron-secret.

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CRON_SECRET = process.env.CRON_SECRET
const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivate = process.env.VAPID_PRIVATE_KEY
const vapidMailto = process.env.VAPID_MAILTO ?? 'mailto:admin@example.com'

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidMailto, vapidPublic, vapidPrivate)
}

export async function POST(req: NextRequest) {
  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 })
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  // Pending jobs with a due date; final lead-time filter is applied in JS.
  const { data: jobs, error } = await sb
    .from('won_jobs')
    .select('job_id, event_display_name, product_name, job_number, owner, assignee_ids, due_at, due_lead_minutes')
    .not('due_at', 'is', null)
    .is('due_notified_at', null)
  if (error) {
    console.error('[cron/due-notify]', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const now = Date.now()
  const due = (jobs ?? []).filter((j) => {
    const notifyAt = new Date(j.due_at as string).getTime() - (j.due_lead_minutes ?? 0) * 60_000
    return notifyAt <= now
  })
  if (due.length === 0) return NextResponse.json({ ok: true, notified: 0 })

  // Resolve owner names → user ids.
  const { data: users } = await sb.from('users').select('id, name, email')
  const byName = new Map<string, { id: string; name: string | null; email: string | null }>()
  for (const u of users ?? []) {
    if (u.name) byName.set(u.name.toLowerCase(), u)
    if (u.email) byName.set(u.email.toLowerCase(), u)
  }
  const userById = new Map((users ?? []).map((u) => [u.id, u]))

  let notified = 0
  for (const j of due) {
    const title = j.event_display_name || j.product_name || `#${j.job_number}`
    const recipients = new Set<string>()
    const ownerUser = j.owner ? byName.get(j.owner.toLowerCase()) : undefined
    if (ownerUser) recipients.add(ownerUser.id)
    for (const id of (j.assignee_ids as string[] | null) ?? []) recipients.add(id)

    const whenLabel = new Date(j.due_at as string).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })

    for (const rid of recipients) {
      const u = userById.get(rid)
      await sb.from('notifications').insert({
        recipient_id: rid,
        recipient_name: u?.name || u?.email || '',
        actor: 'Reminder',
        entity_type: 'won_job',
        entity_id: j.job_id,
        entity_name: title,
        message: `Due ${whenLabel}`,
        read: false,
      })
      const { data: subs } = await sb.from('push_subscriptions').select('subscription').eq('user_id', rid)
      if (subs?.length && vapidPublic && vapidPrivate) {
        const payload = JSON.stringify({ title: 'Job due', body: `${title} — due ${whenLabel}`, url: '/won-ready-op' })
        await Promise.allSettled(subs.map((s) => webpush.sendNotification(s.subscription, payload)))
      }
    }

    // Stamp regardless (even if no recipients resolved) so it never re-loops.
    await sb.from('won_jobs').update({ due_notified_at: new Date().toISOString() }).eq('job_id', j.job_id)
    notified++
  }

  return NextResponse.json({ ok: true, notified })
}
