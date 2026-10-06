'use client'

import { useMemo, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { cn, parseDbDate } from '@/lib/utils'
import { format } from 'date-fns'
import { Maximize2, Minimize2 } from 'lucide-react'
import { AddActivityForm } from './add-activity-form'
import { ActivityTimeline, RecordLightbox, useRecordActivities } from './activity-timeline'
import { attachmentUrl } from '@/lib/supabase/storage'
import { collectPhotos, DocRow, isImageAtt } from './attachment-gallery'

type EntityType = 'customer' | 'lead_opportunity' | 'won_job'
type Tab = 'activity' | 'photos' | 'files'

interface ActivityPanelProps {
  entityType: EntityType
  entityId: string
  owner: string
  entityName?: string
}

/**
 * Right-hand column of a record drawer: composer + timeline, plus record-wide
 * Photos and Files tabs. Expand overlays the whole drawer for heavy photo work —
 * the parent row must be `relative`.
 */
export function ActivityPanel({ entityType, entityId, owner, entityName }: ActivityPanelProps) {
  const activities = useRecordActivities(entityType, entityId)
  const removeActivityAttachment = useCRMStore((s) => s.removeActivityAttachment)
  const [tab, setTab] = useState<Tab>('activity')
  const [expanded, setExpanded] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const photos = useMemo(() => collectPhotos(activities), [activities])
  const files = useMemo(() => activities.flatMap((a) =>
    (a.attachments ?? []).map((att, i) => ({ att, i, a })).filter(({ att }) => !isImageAtt(att))), [activities])

  const tabs: { id: Tab; label: string; n?: number }[] = [
    { id: 'activity', label: 'Activity' },
    { id: 'photos', label: 'Photos', n: photos.length },
    { id: 'files', label: 'Files', n: files.length },
  ]

  return (
    <div className={cn(
      'hidden sm:flex flex-col shrink-0 bg-muted/40 border-l border-border min-h-0',
      expanded ? 'absolute inset-0 z-20 w-auto bg-background' : 'w-[clamp(380px,42%,560px)]',
    )}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 pt-3 border-b border-border shrink-0">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn('px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
              tab === t.id ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}{t.n ? <span className="ml-1.5 text-[11px] text-muted-foreground tabular-nums">{t.n}</span> : null}
          </button>
        ))}
        <button type="button" onClick={() => setExpanded((v) => !v)} title={expanded ? 'Collapse' : 'Expand'}
          className="ml-auto mb-1 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted">
          {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {tab === 'activity' && (
          <div className={cn('space-y-5', expanded && 'max-w-3xl mx-auto')}>
            <AddActivityForm entityType={entityType} entityId={entityId} owner={owner} entityName={entityName} />
            <ActivityTimeline entityType={entityType} entityId={entityId} entityName={entityName} onOpenPhoto={setOpenKey} />
          </div>
        )}

        {tab === 'photos' && (photos.length === 0
          ? <p className="text-center py-10 text-sm text-muted-foreground">No photos yet — add them from the Activity tab (paste, drop, or Photos).</p>
          : (
            <div className={cn('grid gap-1.5', expanded ? 'grid-cols-[repeat(auto-fill,minmax(160px,1fr))]' : 'grid-cols-3')}>
              {photos.map((p) => (
                <button key={p.key} type="button" onClick={() => setOpenKey(p.key)}
                  className="group relative aspect-square overflow-hidden rounded-md bg-muted" title={`${p.by} · ${format(parseDbDate(p.at), 'd MMM yyyy')}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={attachmentUrl(p.att) ?? ''} alt={p.att.filename} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]" />
                </button>
              ))}
            </div>
          ))}

        {tab === 'files' && (files.length === 0
          ? <p className="text-center py-10 text-sm text-muted-foreground">No files yet.</p>
          : (
            <div className="space-y-1.5">
              {files.map(({ att, i, a }) => (
                <div key={`${a.activity_id}-${i}`}>
                  <DocRow att={att} onDelete={() => void removeActivityAttachment(a.activity_id, i)} />
                  <p className="text-[11px] text-muted-foreground mt-0.5 ml-1">{a.created_by} · {format(parseDbDate(a.created_at), 'd MMM yyyy')}</p>
                </div>
              ))}
            </div>
          ))}
      </div>

      {openKey && <RecordLightbox photos={photos} openKey={openKey} setOpenKey={setOpenKey} />}
    </div>
  )
}
