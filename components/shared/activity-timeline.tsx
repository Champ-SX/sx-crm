'use client'

import { useState } from 'react'
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
  Trash2,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

interface Lightbox {
  activityId: string
  imageIndex: number
  images: Array<{ data: string; type: string; filename: string }>
}

export function ActivityTimeline({ entityType, entityId, className }: ActivityTimelineProps) {
  const allActivities = useCRMStore((s) => s.activities)
  const { removeActivityAttachment } = useCRMStore()
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)

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
                <div className="mt-3 space-y-2">
                  {/* Separate images and documents */}
                  {(() => {
                    const images = activity.attachments!.filter(a => isImageFile(a.type))
                    const documents = activity.attachments!.filter(a => !isImageFile(a.type))

                    return (
                      <>
                        {/* Image previews */}
                        {images.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-medium text-slate-600">
                              {images.length} image{images.length !== 1 ? 's' : ''}
                            </p>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {images.map((img, imgIdx) => (
                                <div
                                  key={imgIdx}
                                  className="relative group rounded-lg overflow-hidden bg-slate-100 border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer"
                                >
                                  {/* Image preview - clickable for lightbox */}
                                  <img
                                    src={`data:${img.type};base64,${img.data}`}
                                    alt={img.filename}
                                    className="w-full h-24 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                                    onClick={() => {
                                      console.log('[ActivityTimeline] Image clicked, opening lightbox:', {
                                        activityId: activity.activity_id,
                                        imageIndex: imgIdx,
                                        totalImages: images.length
                                      })
                                      setLightbox({
                                        activityId: activity.activity_id,
                                        imageIndex: imgIdx,
                                        images: images,
                                      })
                                    }}
                                  />

                                  {/* Overlay with click to view hint - pointer-events-none allows clicks to pass through */}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                    <p className="text-white text-xs font-medium">Click to view</p>
                                  </div>

                                  {/* Filename tooltip on hover */}
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1.5 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                    {img.filename}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Document files - always visible */}
                        {documents.length > 0 && (
                          <div className="space-y-1">
                            {activity.attachments!.map((att, attIdx) => (
                              !isImageFile(att.type) && (
                                <div key={attIdx} className="flex items-center justify-between bg-slate-50 rounded p-2.5 text-[11px] border border-slate-200 hover:bg-slate-100 transition-colors group">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <FileIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                    <span className="truncate text-slate-700 font-medium">{att.filename}</span>
                                    <span className="text-slate-500 flex-shrink-0">({formatFileSize(att.size)})</span>
                                  </div>
                                  <button
                                    onClick={() => removeActivityAttachment(activity.activity_id, attIdx)}
                                    className="flex-shrink-0 ml-2 text-slate-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete file"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )
                            ))}
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              )}

              <p className="text-[11px] text-muted-foreground/60 mt-1">by {activity.created_by}</p>
            </div>
          </div>
        )
      })}

      {/* Image Lightbox Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          {/* Modal Container */}
          <div
            className="relative w-full h-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900/95 rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar - Close and Menu */}
            <div className="absolute top-0 right-0 z-50 flex items-center gap-2 p-4">
              {/* More menu button */}
              <DropdownMenu>
                <DropdownMenuTrigger className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                  <DropdownMenuItem
                    onClick={() => {
                      removeActivityAttachment(lightbox.activityId, lightbox.imageIndex)
                      setLightbox(null)
                    }}
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete image
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Close button */}
              <button
                onClick={() => setLightbox(null)}
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-white transition-colors"
                title="Close (ESC)"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Image Container */}
            <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/40 relative group">
              {/* Image - right click to save */}
              <img
                src={`data:${lightbox.images[lightbox.imageIndex].type};base64,${lightbox.images[lightbox.imageIndex].data}`}
                alt={lightbox.images[lightbox.imageIndex].filename}
                className="max-w-full max-h-full object-contain cursor-context-menu"
                onContextMenu={(e) => {
                  // Allow browser's native right-click save
                  return true
                }}
              />

              {/* Navigation - Previous */}
              {lightbox.imageIndex > 0 && (
                <button
                  onClick={() =>
                    setLightbox({
                      ...lightbox,
                      imageIndex: lightbox.imageIndex - 1,
                    })
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white transition-colors opacity-0 group-hover:opacity-100"
                  title="Previous image (←)"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Navigation - Next */}
              {lightbox.imageIndex < lightbox.images.length - 1 && (
                <button
                  onClick={() =>
                    setLightbox({
                      ...lightbox,
                      imageIndex: lightbox.imageIndex + 1,
                    })
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white transition-colors opacity-0 group-hover:opacity-100"
                  title="Next image (→)"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Image counter - center bottom on hover */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {lightbox.imageIndex + 1} / {lightbox.images.length}
              </div>
            </div>

            {/* Footer - Filename and Info */}
            <div className="bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 px-6 py-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {lightbox.images[lightbox.imageIndex].filename}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Right-click to save image
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
