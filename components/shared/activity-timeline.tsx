'use client'

import { useCRMStore } from '@/store/crm-store'
import type { Activity } from '@/types'
import {
  Phone,
  Mail,
  StickyNote,
  Bell,
  TrendingUp,
  Send,
  Trophy,
  XCircle,
  CheckSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

const activityConfig: Record<
  Activity['activity_type'],
  { icon: React.ElementType; color: string; bg: string }
> = {
  note: { icon: StickyNote, color: 'text-zinc-500', bg: 'bg-zinc-100' },
  call: { icon: Phone, color: 'text-blue-500', bg: 'bg-blue-50' },
  email: { icon: Mail, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  follow_up: { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
  status_change: { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  proposal_sent: { icon: Send, color: 'text-sky-500', bg: 'bg-sky-50' },
  deal_won: { icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  deal_lost: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
  task: { icon: CheckSquare, color: 'text-teal-500', bg: 'bg-teal-50' },
}

interface ActivityTimelineProps {
  entityType: Activity['entity_type']
  entityId: string
  className?: string
}

export function ActivityTimeline({ entityType, entityId, className }: ActivityTimelineProps) {
  const allActivities = useCRMStore((s) => s.activities)
  const activities = allActivities
    .filter((a) => a.entity_type === entityType && a.entity_id === entityId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-sm text-muted-foreground', className)}>
        No activity yet.
      </div>
    )
  }

  return (
    <div className={cn('space-y-0', className)}>
      {activities.map((activity, idx) => {
        const config = activityConfig[activity.activity_type] ?? activityConfig.note
        const Icon = config.icon
        const isLast = idx === activities.length - 1

        return (
          <div key={activity.activity_id} className="flex gap-3">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', config.bg)}>
                <Icon className={cn('w-3.5 h-3.5', config.color)} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" />}
            </div>

            {/* Content */}
            <div className={cn('pb-4 flex-1', isLast ? 'pb-0' : '')}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                </span>
              </div>
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {activity.description}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground/60 mt-1">by {activity.created_by}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
