'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { formatDistanceToNow } from 'date-fns'
import { parseDbDate } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { UserAvatar } from '@/components/shared/user-avatar'

// Where a notification's record lives (its list page).
const ENTITY_ROUTE: Record<string, string> = {
  customer: '/customers',
  lead_opportunity: '/leads-opportunities',
  won_job: '/won-ready-op',
}

export function NotificationBell() {
  const router = useRouter()
  const { user } = useAuth()
  const notifications = useCRMStore((s) => s.notifications)
  const markNotificationRead = useCRMStore((s) => s.markNotificationRead)
  const markAllNotificationsRead = useCRMStore((s) => s.markAllNotificationsRead)
  const requestOpenEntity = useCRMStore((s) => s.requestOpenEntity)
  const [open, setOpen] = useState(false)

  // Only notifications addressed to the current user (by team id, name, or email).
  const mine = notifications.filter(
    (n) =>
      n.recipient_id === user?.id ||
      n.recipient_name === user?.user_metadata?.full_name ||
      n.recipient_name === user?.email
  )
  const unread = mine.filter((n) => !n.read).length

  function handleClick(n: (typeof mine)[number]) {
    markNotificationRead(n.id)
    setOpen(false)
    const route = ENTITY_ROUTE[n.entity_type]
    if (!route) {
      router.push('/dashboard')
      return
    }
    // Signal the target page to open this exact record. A reactive store value
    // (not a one-shot URL param) fires every click, even when already on the
    // page. Navigate to the page too — the page's watcher opens the drawer.
    if (n.entity_id) requestOpenEntity(n.entity_type as 'customer' | 'lead_opportunity' | 'won_job', n.entity_id)
    router.push(route)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--sidebar-accent)] transition-colors"
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
          >
            <Bell className="w-4 h-4 text-[var(--sidebar-foreground)]" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[12px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        }
      />

      <PopoverContent
        align="end"
        side="bottom"
        className="w-80 max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="text-[12px] font-medium text-primary hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {mine.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">No notifications yet.</p>
                <p className="text-[12px] text-muted-foreground/70 mt-1">You&apos;ll be notified when someone @mentions you.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {mine.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-muted transition-colors ${n.read ? '' : 'bg-primary/5'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <UserAvatar name={n.actor} size={22} className="mt-0.5" />
                        <div className={`flex-1 min-w-0`}>
                          <p className="text-[12px] text-foreground leading-snug">
                            <span className="font-semibold">{n.actor}</span> mentioned you
                            {n.entity_name ? <> in <span className="font-medium">{n.entity_name}</span></> : null}
                          </p>
                          <p className="text-[12px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[12px] text-muted-foreground/70 mt-0.5">
                            {formatDistanceToNow(parseDbDate(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
