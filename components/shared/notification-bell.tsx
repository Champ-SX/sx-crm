'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { formatDistanceToNow } from 'date-fns'

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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Only notifications addressed to the current user (by team id, name, or email).
  const mine = notifications.filter(
    (n) =>
      n.recipient_id === user?.id ||
      n.recipient_name === user?.user_metadata?.full_name ||
      n.recipient_name === user?.email
  )
  const unread = mine.filter((n) => !n.read).length

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function handleClick(n: (typeof mine)[number]) {
    markNotificationRead(n.id)
    setOpen(false)
    router.push(ENTITY_ROUTE[n.entity_type] ?? '/dashboard')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--sidebar-accent)] transition-colors"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <Bell className="w-4 h-4 text-[var(--sidebar-foreground)]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 max-w-[90vw] z-50 bg-background border border-border rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsRead()}
                className="text-[11px] font-medium text-primary hover:underline"
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
                <p className="text-[11px] text-muted-foreground/70 mt-1">You&apos;ll be notified when someone @mentions you.</p>
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
                        <div className={`flex-1 min-w-0 ${n.read ? 'pl-3.5' : ''}`}>
                          <p className="text-[12px] text-foreground leading-snug">
                            <span className="font-semibold">{n.actor}</span> mentioned you
                            {n.entity_name ? <> in <span className="font-medium">{n.entity_name}</span></> : null}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
