'use client'

import { useCRMStore } from '@/store/crm-store'
import type { Activity } from '@/types'
import {
  Phone,
  Mail,
  StickyNote,
  Bell,
  TrendingUp,
  Trophy,
  XCircle,
  Download,
  Image as ImageIcon,
  File as FileIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useState } from 'react'

const activityConfig: Record<
  Activity['activity_type'],
  { icon: React.ElementType; color: string; bg: string }
> = {
  note: { icon: StickyNote, color: 'text-zinc-500', bg: 'bg-zinc-100' },
  call: { icon: Phone, color: 'text-blue-500', bg: 'bg-blue-50' },
  email: { icon: Mail, color: 'text-indigo-500', bg: 'bg-indigo-50' },
  follow_up: { icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
  status_change: { icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50' },
  deal_won: { icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  deal_lost: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
}

interface ActivityTimelineProps {
  entityType: 'customer' | 'lead_opportunity' | 'won_job'
  entityId: string
  className?: string
}

function isImageFile(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function downloadFile(base64: string, filename: string) {
  const link = document.createElement('a')
  link.href = `data:application/octet-stream;base64,${base64}`
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function ActivityTimeline({ entityType, entityId, className }: ActivityTimelineProps) {
  const allActivities = useCRMStore((s) => s.activities)
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set())

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
        const hasAttachments = activity.attachments && activity.attachments.length > 0
        const isExpanded = expandedAttachments.has(activity.activity_id)

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

              {/* Attachments section */}
              {hasAttachments && (
                <div className="mt-2 space-y-1">
                  <button
                    onClick={() => {
                      const newSet = new Set(expandedAttachments)
                      if (isExpanded) {
                        newSet.delete(activity.activity_id)
                      } else {
                        newSet.add(activity.activity_id)
                      }
                      setExpandedAttachments(newSet)
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isExpanded ? '▼' : '▶'} {activity.attachments!.length} attachment{activity.attachments!.length !== 1 ? 's' : ''}
                  </button>

                  {isExpanded && (
                    <div className="bg-slate-50 rounded-md p-2 space-y-1 border border-slate-200">
                      {activity.attachments!.map((att, attIdx) => (
                        <div key={attIdx} className="flex items-center justify-between bg-white rounded p-2 text-[11px] hover:bg-slate-50 transition-colors group">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isImageFile(att.type) ? (
                              <ImageIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            ) : (
                              <FileIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            )}
                            <span className="truncate text-slate-700 font-medium">{att.filename}</span>
                            <span className="text-slate-500 flex-shrink-0">({formatFileSize(att.size)})</span>
                          </div>
                          <button
                            onClick={() => downloadFile(att.data, att.filename)}
                            className="flex-shrink-0 ml-2 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                            title="Download file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground/60 mt-1">by {activity.created_by}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
