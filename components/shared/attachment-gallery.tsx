'use client'

import { useCallback, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Download, Trash2, X as XIcon, AlertCircle, RotateCw, Loader2, File as FileIcon } from 'lucide-react'
import type { Activity, ActivityAttachment } from '@/types'
import { attachmentUrl } from '@/lib/supabase/storage'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn, parseDbDate } from '@/lib/utils'
import type { UploadItem } from './use-attachment-uploader'

export const isImageAtt = (a: Pick<ActivityAttachment, 'type'>) => a.type?.startsWith('image/')

export function formatBytes(bytes: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Save an attachment to disk. Storage URLs are cross-origin, so the plain
 *  <a download> attribute is ignored — fetch as a blob first, fall back to
 *  opening the file in a new tab. */
export async function downloadAttachment(att: ActivityAttachment) {
  const url = attachmentUrl(att)
  if (!url) return
  const save = (href: string) => {
    const a = document.createElement('a')
    a.href = href
    a.download = att.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  if (url.startsWith('data:')) return save(url)
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(String(res.status))
    const blobUrl = URL.createObjectURL(await res.blob())
    save(blobUrl)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 4000)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// ── One photo in a record-wide gallery ────────────────────────────────────────
export interface GalleryPhoto {
  key: string
  att: ActivityAttachment
  activityId: string
  attIndex: number          // index within activity.attachments (for delete)
  by: string
  at: string
  note: string
}

/** Every image across a record's notes, newest note first, in note order. */
export function collectPhotos(activities: Activity[]): GalleryPhoto[] {
  const out: GalleryPhoto[] = []
  for (const a of activities) {
    (a.attachments ?? []).forEach((att, i) => {
      if (isImageAtt(att) && attachmentUrl(att)) {
        out.push({ key: `${a.activity_id}:${att.storage_path ?? `${att.filename}#${i}`}`, att, activityId: a.activity_id, attIndex: i, by: a.created_by, at: a.created_at, note: cleanNote(a.description) })
      }
    })
  }
  return out
}

/** Drop the legacy "📎 N files attached" / "[N file(s)]" markers from note text. */
export function cleanNote(text: string | null | undefined): string {
  return (text ?? '')
    .split('\n')
    .filter((l) => !/^📎 \d+ files? attached$/.test(l.trim()) && !/^\[\d+ file\(s\)\]$/.test(l.trim()) && l.trim() !== '[Note]')
    .join('\n')
    .trim()
}

// ── Full-screen lightbox ──────────────────────────────────────────────────────
export function Lightbox({ photos, index, onIndex, onClose, onDelete }: {
  photos: GalleryPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onDelete?: (p: GalleryPhoto) => void
}) {
  const photo = photos[index]
  const n = photos.length
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex])
  const stripRef = useRef<HTMLDivElement>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  // Keep the active thumbnail in view in the filmstrip.
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])

  if (!photo) return null
  const url = attachmentUrl(photo.att) ?? undefined

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-[100dvh] !max-w-none !max-h-none !p-0 !gap-0 !rounded-none !border-0 !bg-black/95 !flex !flex-col text-white"
      >
        <DialogTitle className="sr-only">{photo.att.filename}</DialogTitle>

        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0">
          <span className="text-[13px] font-mono text-white/70">{index + 1} / {n}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium truncate">{photo.by} · {format(parseDbDate(photo.at), 'd MMM yyyy, HH:mm')}</p>
            {photo.note && <p className="text-[12px] text-white/60 truncate">{photo.note}</p>}
          </div>
          <button onClick={() => void downloadAttachment(photo.att)} className="inline-flex items-center gap-1.5 rounded-md bg-white/10 hover:bg-white/20 px-3 h-9 text-[13px]" title="Download">
            <Download className="w-4 h-4" /><span className="hidden sm:inline">Download</span>
          </button>
          {onDelete && (
            <button
              onClick={() => { if (window.confirm(`Delete “${photo.att.filename}”? This can't be undone.`)) onDelete(photo) }}
              className="inline-flex items-center justify-center rounded-md bg-white/10 hover:bg-red-500/80 w-9 h-9" title="Delete photo"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="inline-flex items-center justify-center rounded-md bg-white/10 hover:bg-white/20 w-9 h-9" title="Close (Esc)">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Stage — arrows always visible; swipe on touch */}
        <div
          className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16"
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
            touchX.current = null
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={photo.key} src={url} alt={photo.att.filename} className="max-w-full max-h-full object-contain select-none" draggable={false} />
          {n > 1 && (
            <>
              <button onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Filmstrip */}
        {n > 1 && (
          <div ref={stripRef} className="shrink-0 flex gap-2 overflow-x-auto px-4 py-3 justify-start sm:justify-center">
            {photos.map((p, i) => (
              <button
                key={p.key} data-i={i} onClick={() => onIndex(i)}
                className={cn('shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-opacity', i === index ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-90')}
                aria-label={`Photo ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={attachmentUrl(p.att) ?? undefined} alt="" className="w-full h-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Adaptive thumbnail grid inside one note ───────────────────────────────────
/** 1 photo → large; 2 → side by side; 3+ → 3-up squares; >6 → "+N" on the last. */
export function NotePhotoGrid({ photos, onOpen }: { photos: GalleryPhoto[]; onOpen: (p: GalleryPhoto) => void }) {
  if (photos.length === 0) return null
  const MAX = 6
  const shown = photos.slice(0, MAX)
  const extra = photos.length - MAX
  const cols = photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
  return (
    <div className={cn('grid gap-1.5', cols)}>
      {shown.map((p, i) => {
        const isOverflowTile = extra > 0 && i === MAX - 1
        return (
          <button
            key={p.key} onClick={() => onOpen(p)}
            className={cn('relative overflow-hidden rounded-lg bg-muted border border-border group', photos.length === 1 ? 'aspect-[4/3] max-h-80' : 'aspect-square')}
            title={p.att.filename}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachmentUrl(p.att) ?? undefined} alt={p.att.filename} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-[1.03]" />
            {isOverflowTile && (
              <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white text-lg font-semibold">+{extra + 1}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Document row (download + delete) ─────────────────────────────────────────
export function DocRow({ att, onDelete }: { att: ActivityAttachment; onDelete?: () => void }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2">
      <span className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0 text-muted-foreground"><FileIcon className="w-4 h-4" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium truncate">{att.filename}</p>
        <p className="text-[11px] text-muted-foreground">{formatBytes(att.size)}</p>
      </div>
      <button onClick={() => void downloadAttachment(att)} className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground" title="Download" aria-label={`Download ${att.filename}`}>
        <Download className="w-4 h-4" />
      </button>
      {onDelete && (
        <button
          onClick={() => { if (window.confirm(`Delete “${att.filename}”?`)) onDelete() }}
          className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-destructive" title="Delete" aria-label={`Delete ${att.filename}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ── Composer tiles: instant previews with upload status ──────────────────────
export function UploadTiles({ items, onRemove, onRetry, size = 'md' }: {
  items: UploadItem[]; onRemove: (id: string) => void; onRetry: (id: string) => void; size?: 'sm' | 'md'
}) {
  if (items.length === 0) return null
  const dim = size === 'sm' ? 'w-14 h-14' : 'w-[72px] h-[72px]'
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <div key={it.id} className={cn('relative rounded-lg overflow-hidden border bg-muted shrink-0', dim, it.status === 'error' ? 'border-destructive' : 'border-border')} title={it.error || it.name}>
          {it.previewUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={it.previewUrl} alt={it.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1 text-muted-foreground"><FileIcon className="w-4 h-4" /><span className="text-[9px] leading-tight text-center line-clamp-2 break-all">{it.name}</span></div>}

          {it.status === 'uploading' && (
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin" /></span>
          )}
          {it.status === 'error' && (
            <button type="button" onClick={() => onRetry(it.id)} className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-0.5 text-white text-[10px] font-medium" aria-label={`Retry ${it.name}`}>
              <RotateCw className="w-4 h-4" /> Retry
            </button>
          )}
          <button
            type="button" onClick={() => onRemove(it.id)}
            className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center"
            aria-label={`Remove ${it.name}`}
          >
            <XIcon className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function UploadNotice({ text }: { text: string | null }) {
  if (!text) return null
  return (
    <div className="flex gap-2 items-start rounded-md border border-red-200 bg-red-50 dark:bg-red-500/10 dark:border-red-500/30 p-2 text-[12px] text-red-700 dark:text-red-300">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{text}</span>
    </div>
  )
}
