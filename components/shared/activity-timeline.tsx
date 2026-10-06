'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import type { Activity } from '@/types'
import { LinkifyText } from './linkify-text'
import { UserAvatar } from '@/components/shared/user-avatar'
import { cn, parseDbDate } from '@/lib/utils'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { useAuth } from '@/components/auth-provider'
import { MentionTextarea } from '@/components/shared/mention-textarea'
import { Button } from '@/components/ui/button'
import { CornerDownRight, Trash2, Trophy, XCircle } from 'lucide-react'
import { collectPhotos, cleanNote, isImageAtt, NotePhotoGrid, DocRow, Lightbox, type GalleryPhoto } from './attachment-gallery'

type EntityType = 'customer' | 'lead_opportunity' | 'won_job'

/** Activities for one record, newest first. A lead's history carries over once
 *  it becomes a won job (and vice versa), so match both entity types by id. */
export function useRecordActivities(entityType: EntityType, entityId: string): Activity[] {
  const all = useCRMStore((s) => s.activities)
  return useMemo(() => all
    .filter((a) => a.entity_id === entityId && (
      a.entity_type === entityType ||
      (entityType === 'lead_opportunity' && a.entity_type === 'won_job') ||
      (entityType === 'won_job' && a.entity_type === 'lead_opportunity')
    ))
    .sort((a, b) => parseDbDate(b.created_at).getTime() - parseDbDate(a.created_at).getTime()),
  [all, entityType, entityId])
}

function dayLabel(d: Date): string {
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, d.getFullYear() === new Date().getFullYear() ? 'EEE d MMM' : 'd MMM yyyy')
}

interface ActivityTimelineProps {
  entityType: EntityType
  entityId: string
  className?: string
  entityName?: string                       // for reply @mention notification context
  onOpenPhoto?: (key: string) => void       // when hosted in ActivityPanel (shared lightbox)
}

export function ActivityTimeline({ entityType, entityId, className, entityName, onOpenPhoto }: ActivityTimelineProps) {
  const activities = useRecordActivities(entityType, entityId)
  const { removeActivityAttachment, addActivity, deleteActivity, notifyMentions, loadActivityAttachments } = useCRMStore()
  const { user } = useAuth()
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [ownLightboxKey, setOwnLightboxKey] = useState<string | null>(null)
  const currentUserName = user?.user_metadata?.full_name || user?.email || 'You'

  // Startup skips attachment blobs (egress fix) — pull this record's
  // attachments once its timeline mounts so thumbnails/files appear.
  useEffect(() => {
    void loadActivityAttachments(entityId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId])

  const allPhotos = useMemo(() => collectPhotos(activities), [activities])
  const openPhoto = (p: GalleryPhoto) => (onOpenPhoto ? onOpenPhoto(p.key) : setOwnLightboxKey(p.key))

  function submitReply() {
    const text = replyText.trim()
    if (!text) return
    void addActivity({
      activity_id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      entity_type: entityType, entity_id: entityId, activity_type: 'note',
      title: 'Reply', description: text, created_by: currentUserName, created_at: new Date().toISOString(),
    })
    notifyMentions({ text, actor: currentUserName, entityType, entityId, entityName: entityName || '' })
    setReplyText('')
    setReplyingTo(null)
  }

  if (activities.length === 0) {
    return <div className={cn('text-center py-10 text-sm text-muted-foreground', className)}>No activity yet — notes and photos you log appear here.</div>
  }

  const dayHeads = activities.map((a, i) => {
    const d = dayLabel(parseDbDate(a.created_at))
    return i === 0 || d !== dayLabel(parseDbDate(activities[i - 1].created_at)) ? d : null
  })
  return (
    <div className={cn('space-y-3', className)}>
      {activities.map((activity, idx) => {
        const when = parseDbDate(activity.created_at)
        const day = dayHeads[idx]
        const showDay = day !== null
        const text = cleanNote(activity.description)
        const photos = allPhotos.filter((p) => p.activityId === activity.activity_id)
        const docs = (activity.attachments ?? []).map((att, i) => ({ att, i })).filter(({ att }) => !isImageAtt(att))
        const isWin = activity.activity_type === 'deal_won'
        const isLoss = activity.activity_type === 'deal_lost'
        const isSystem = activity.activity_type === 'status_change' || isWin || isLoss

        return (
          <div key={activity.activity_id}>
            {showDay && (
              <div className="flex items-center gap-2 pt-1 pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}

            {isSystem ? (
              // Status/won/lost events: one quiet line, not a card
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-1">
                {isWin ? <Trophy className="w-3.5 h-3.5 text-emerald-500" /> : isLoss ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <CornerDownRight className="w-3.5 h-3.5" />}
                <span className="font-medium text-foreground/80">{activity.created_by}</span>
                <span className="truncate">{text || activity.title}</span>
                <span className="ml-auto shrink-0" title={format(when, 'd MMM yyyy, HH:mm')}>{format(when, 'HH:mm')}</span>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card p-3">
                {/* Header: who · what · when */}
                <div className="flex items-center gap-2 mb-1.5">
                  <UserAvatar name={activity.created_by} size={22} />
                  <span className="text-[13px] font-semibold text-foreground truncate">{activity.created_by}</span>
                  {activity.title && activity.title !== 'Note' && <span className="text-[11px] text-muted-foreground shrink-0">· {activity.title}</span>}
                  <span className="ml-auto text-[11px] text-muted-foreground shrink-0" title={format(when, 'd MMM yyyy, HH:mm')}>
                    {isToday(when) ? formatDistanceToNow(when, { addSuffix: true }) : format(when, 'HH:mm')}
                  </span>
                </div>

                {text && (
                  <p className="text-[14px] text-foreground leading-relaxed whitespace-pre-wrap break-words">
                    <LinkifyText text={text} />
                  </p>
                )}

                {photos.length > 0 && <div className={cn(text && 'mt-2.5')}><NotePhotoGrid photos={photos} onOpen={openPhoto} /></div>}

                {docs.length > 0 && (
                  <div className={cn('space-y-1.5', (text || photos.length > 0) && 'mt-2.5')}>
                    {docs.map(({ att, i }) => (
                      <DocRow key={`${att.storage_path ?? att.filename}-${i}`} att={att} onDelete={() => void removeActivityAttachment(activity.activity_id, i)} />
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 mt-2 -ml-2 -mb-1">
                  <Button type="button" variant="ghost" size="xs" className="text-muted-foreground"
                    onClick={() => { if (replyingTo === activity.activity_id) { setReplyingTo(null) } else { setReplyingTo(activity.activity_id); setReplyText(`@${activity.created_by} `) } }}>
                    Reply
                  </Button>
                  <Button type="button" variant="ghost" size="xs" className="text-muted-foreground hover:text-destructive gap-1"
                    onClick={() => { if (window.confirm('Delete this note and its attachments? This cannot be undone.')) void deleteActivity(activity.activity_id) }}>
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>

                {replyingTo === activity.activity_id && (
                  <div className="mt-2 space-y-2">
                    <MentionTextarea value={replyText} onChange={setReplyText} placeholder="Write a reply… type @ to mention" className="text-sm resize-none min-h-[64px]" onSubmitShortcut={submitReply} />
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-7 px-3 text-xs" onClick={submitReply} disabled={!replyText.trim()}>Reply</Button>
                      <Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={() => { setReplyingTo(null); setReplyText('') }}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Standalone use (e.g. mobile card): own lightbox across all record photos */}
      {!onOpenPhoto && ownLightboxKey && (
        <RecordLightbox photos={allPhotos} openKey={ownLightboxKey} setOpenKey={setOwnLightboxKey} />
      )}
    </div>
  )
}

/** Lightbox bound to live record photos — survives deletes by tracking a key. */
export function RecordLightbox({ photos, openKey, setOpenKey }: { photos: GalleryPhoto[]; openKey: string; setOpenKey: (k: string | null) => void }) {
  const removeActivityAttachment = useCRMStore((s) => s.removeActivityAttachment)
  const index = photos.findIndex((p) => p.key === openKey)
  if (index === -1) return null
  return (
    <Lightbox
      photos={photos}
      index={index}
      onIndex={(i) => setOpenKey(photos[i].key)}
      onClose={() => setOpenKey(null)}
      onDelete={(p) => {
        const next = photos[index + 1] ?? photos[index - 1] ?? null
        setOpenKey(next ? next.key : null)
        void removeActivityAttachment(p.activityId, p.attIndex)
      }}
    />
  )
}
