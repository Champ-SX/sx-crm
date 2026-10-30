'use client'

import { ExternalLink, FolderOpen, Palette } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useArtwork, artworkProgress, designerJobUrl, DESIGNER_LIVE, KIND_LABEL, STATUS_LABEL,
  type ArtworkStatus,
} from '@/lib/supabase/artwork'
import type { WonJob } from '@/types'

const STATUS_CLS: Record<ArtworkStatus, string> = {
  todo: 'bg-muted text-muted-foreground',
  draft: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
  sent: 'bg-orange-500/14 text-orange-700 dark:text-orange-400',
  approved: 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400',
}

/** Days from today (Bangkok) to the event; null when there's no date. */
function daysToEvent(job: WonJob): number | null {
  if (!job.event_date) return null
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }))
  today.setHours(0, 0, 0, 0)
  return Math.round((new Date(`${job.event_date}T00:00:00`).getTime() - today.getTime()) / 86400000)
}

/**
 * Read-only artwork progress on a Won job. All editing happens in the
 * CAPTURES.DESIGNER app — this just shows where things stand and links there.
 */
export function ArtworkSummary({ job }: { job: WonJob }) {
  if (!DESIGNER_LIVE) return <ArtworkComingSoon />
  return <ArtworkLive job={job} />
}

/** Shown until the Designer app is released: greyed, nothing to click. */
function ArtworkComingSoon() {
  return (
    <div className="rounded-xl border border-dashed border-border overflow-hidden opacity-55 select-none" aria-disabled="true">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-dashed border-border">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
          <Palette className="w-4 h-4" />Artwork
        </span>
        <span className="rounded px-1.5 py-px text-[11px] font-semibold bg-muted text-muted-foreground">Coming soon</span>
      </div>
      <p className="bg-card px-4 py-3 text-[12px] text-muted-foreground">Artwork tracking moves to the CAPTURES.DESIGNER app. It will show here once the app is ready.</p>
    </div>
  )
}

function ArtworkLive({ job }: { job: WonJob }) {
  const items = useArtwork().get(job.job_id) ?? []
  const { done, total } = artworkProgress(items)
  const all = total > 0 && done === total

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <Palette className="w-4 h-4 text-muted-foreground" />Artwork
          {total > 0 && <span className={cn('rounded px-1.5 py-px text-[11px] font-semibold', all ? STATUS_CLS.approved : 'bg-muted text-muted-foreground')}>{done}/{total} approved</span>}
        </span>
        <a href={designerJobUrl(job.job_id)} target="_blank" rel="noreferrer"
          className="h-7 rounded-md bg-foreground text-background px-2.5 inline-flex items-center gap-1 text-[12px] font-semibold hover:opacity-90">
          {total ? 'Open in Designer' : 'Start in Designer'}<ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="bg-card px-4 py-3">
        {total === 0 ? (
          <p className="text-[12px] text-muted-foreground">No artwork yet. Deliverables are planned and tracked in the Designer app.</p>
        ) : (
          <>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2.5">
              <div className="h-full bg-emerald-600" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <div className="divide-y divide-dashed divide-border">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 py-1.5 text-[13px]">
                  <span className="min-w-0 truncate">{KIND_LABEL[it.kind]}{it.label && <span className="text-muted-foreground"> · {it.label}</span>}</span>
                  <span className={cn('shrink-0 rounded px-1.5 py-px text-[11px] font-semibold', STATUS_CLS[it.status])}>
                    {STATUS_LABEL[it.status]}{it.status !== 'approved' && it.version > 0 && ` v${it.version}`}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {job.aw_drive_folder && /^https?:\/\//i.test(job.aw_drive_folder) && (
          <a href={job.aw_drive_folder} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-blue-700 dark:text-blue-300 underline">
            <FolderOpen className="w-3.5 h-3.5" />Drive folder
          </a>
        )}
      </div>
    </div>
  )
}

/** Small "AW 3/5" chip for a Won board card. Red when the event is ≤3 days away and not all approved. */
export function ArtworkChip({ job }: { job: WonJob }) {
  if (!DESIGNER_LIVE) return null
  return <ArtworkChipLive job={job} />
}

function ArtworkChipLive({ job }: { job: WonJob }) {
  const { done, total } = artworkProgress(useArtwork().get(job.job_id))
  if (total === 0) return null
  const all = done === total
  const d = daysToEvent(job)
  const urgent = !all && d != null && d >= 0 && d <= 3
  return (
    <span title={`Artwork: ${done} of ${total} approved`}
      className={cn('font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded',
        all ? 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400'
          : urgent ? 'bg-red-500/14 text-red-700 dark:text-red-400'
          : 'bg-orange-500/14 text-orange-700 dark:text-orange-400')}>
      AW {done}/{total}
    </span>
  )
}
