import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import { neededByAlert, thaiToday } from '@/lib/purchasing-rules'
import type { AnfOrder, AnfRequest } from '@/types'

// Same accounts as lib/supabase/purchasing.ts (kept here so the cron needs no client code).
const BUYER_EMAIL = 'admin@sixsheet.me'
const APPROVER_EMAIL = 'champ@sixsheet.me'

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
    .select('job_id, event_display_name, product_name, job_number, owner, assignee_ids, due_at, due_lead_minutes, board_id')
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
        board_id: (j.board_id as string | null) ?? 'captures',
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

  // ── ANF Order reminders (Phase 4.0) — same pattern, own table ──────────────
  let anfNotified = 0
  try {
    const { data: orders } = await sb
      .from('anf_orders')
      .select('order_id, item, branch, assignee_id, assignee_ids, requested_by, remind_at, needed_by')
      .not('remind_at', 'is', null)
      .is('remind_notified_at', null)

    const dueOrders = (orders ?? []).filter((o) => new Date(o.remind_at as string).getTime() <= now)
    for (const o of dueOrders) {
      const recipients = new Set<string>()
      // All assignees (multi), plus the legacy single field for old rows.
      for (const id of (o.assignee_ids as string[] | null) ?? []) recipients.add(id)
      if (o.assignee_id) recipients.add(o.assignee_id as string)
      const reqUser = o.requested_by ? byName.get((o.requested_by as string).toLowerCase()) : undefined
      if (reqUser) recipients.add(reqUser.id)

      const label = o.needed_by
        ? `needed by ${new Date((o.needed_by as string) + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`
        : 'reminder'
      const title = `${o.item}${o.branch ? ` · ${o.branch}` : ''}`

      for (const rid of recipients) {
        const u = userById.get(rid)
        try {
          await sb.from('notifications').insert({
            recipient_id: rid,
            recipient_name: u?.name || u?.email || '',
            actor: 'Reminder',
            entity_type: 'anf_order',
            entity_id: o.order_id,
            entity_name: title,
            message: `Order ${label}`,
            read: false,
            board_id: 'anf-order',
          })
        } catch (e) { console.warn('[cron] anf notification insert skipped', e) }
        const { data: subs } = await sb.from('push_subscriptions').select('subscription').eq('user_id', rid)
        if (subs?.length && vapidPublic && vapidPrivate) {
          const payload = JSON.stringify({ title: 'Order reminder', body: `${title} — ${label}`, url: '/anf-order' })
          await Promise.allSettled(subs.map((s) => webpush.sendNotification(s.subscription, payload)))
        }
      }
      await sb.from('anf_orders').update({ remind_notified_at: new Date().toISOString() }).eq('order_id', o.order_id)
      anfNotified++
    }
  } catch (e) {
    console.warn('[cron/due-notify] anf_orders skipped (pre-migration?)', e)
  }

  // ── Order requests: "Needed by" alerts ───────────────────────────────────
  // soon → not ordered yet, ≤3 days left: buyer (or Champ while it still waits for approval).
  // late → past Needed by, not all received: buyer + requester. Each stamped so it fires once.
  let reqNotified = 0
  try {
    const today = thaiToday(now)
    const { data: reqs } = await sb
      .from('anf_requests')
      .select('request_id, number, project_name, needed_by, status, created_by, created_by_id, soon_notified_at, late_notified_at')
      .not('needed_by', 'is', null)
      .in('status', ['pending', 'approved'])
    const open = (reqs ?? []).filter((r) => !r.late_notified_at)
    const ids = open.map((r) => r.request_id as string)
    const { data: lines } = ids.length
      ? await sb.from('anf_orders').select('request_id, status, archived_at').in('request_id', ids)
      : { data: [] as { request_id: string; status: string; archived_at: string | null }[] }
    const buyer = byName.get(BUYER_EMAIL)
    const approver = byName.get(APPROVER_EMAIL)
    for (const r of open) {
      const items = (lines ?? []).filter((l) => l.request_id === r.request_id) as { status: AnfOrder['status']; archived_at: string | null }[]
      const alert = neededByAlert(r as { needed_by: string; status: AnfRequest['status'] }, items, today)
      if (!alert || (alert === 'soon' && r.soon_notified_at)) continue
      const when = new Date(`${r.needed_by}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      const recipients = new Set<string>()
      if (alert === 'soon') {
        const who = r.status === 'pending' ? approver : buyer
        if (who) recipients.add(who.id)
      } else {
        if (buyer) recipients.add(buyer.id)
        const requester = (r.created_by_id && userById.get(r.created_by_id as string)) || (r.created_by ? byName.get((r.created_by as string).toLowerCase()) : undefined)
        if (requester) recipients.add(requester.id)
      }
      const message = alert === 'late'
        ? `was needed by ${when} · not received yet`
        : r.status === 'pending' ? `needed by ${when} · still waiting for your approval` : `needed by ${when} · not ordered yet`
      const title = `${r.number}${r.project_name ? ` · ${r.project_name}` : ''}`
      for (const rid of recipients) {
        const u = userById.get(rid)
        try {
          await sb.from('notifications').insert({
            recipient_id: rid, recipient_name: u?.name || u?.email || '', actor: 'Reminder',
            entity_type: 'anf_request', entity_id: r.request_id, entity_name: title, message, read: false, board_id: 'anf-order',
          })
        } catch (e) { console.warn('[cron] request alert insert skipped', e) }
        const { data: subs } = await sb.from('push_subscriptions').select('subscription').eq('user_id', rid)
        if (subs?.length && vapidPublic && vapidPrivate) {
          const payload = JSON.stringify({ title: alert === 'late' ? 'Order late' : 'Order needed soon', body: `${title} — ${message}`, url: '/anf-order' })
          await Promise.allSettled(subs.map((s) => webpush.sendNotification(s.subscription, payload)))
        }
      }
      await sb.from('anf_requests').update(alert === 'late' ? { late_notified_at: new Date().toISOString() } : { soon_notified_at: new Date().toISOString() }).eq('request_id', r.request_id)
      reqNotified++
    }
  } catch (e) {
    console.warn('[cron/due-notify] request alerts skipped (pre-migration?)', e)
  }

  return NextResponse.json({ ok: true, notified, anfNotified, reqNotified })
}
