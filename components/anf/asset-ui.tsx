'use client'

import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { Camera, ExternalLink, ImagePlus, Loader2, Trash2, X, Zap } from 'lucide-react'
import type { ActivityAttachment } from '@/types'
import { attachmentUrl } from '@/lib/supabase/storage'
import { uploadPhoto } from '@/lib/photo-upload'
import { cn, parseDbDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GRAPHIC_KINDS, GRAPHIC_STATUS } from '@/lib/supabase/anf-tasks'
import { ASSET_CODE_RE, assetPlace, fieldsFor, isPreset, revise, type AnfAsset } from '@/lib/supabase/anf-assets'

export const TILE: Record<string, string> = {
  frame: 'linear-gradient(135deg,#f5d0fe,#c4b5fd)', gif: 'linear-gradient(135deg,#bae6fd,#a7f3d0)',
  welcome: 'linear-gradient(135deg,#fde68a,#fca5a5)', other: 'linear-gradient(135deg,#e5e7eb,#d1d5db)',
  camera: '#1c1b19', flash: '#f59e0b',
}
export const kindLabel = (k: string) => (k === 'camera' ? 'Camera preset' : k === 'flash' ? 'Flash preset' : k === 'welcome' ? 'Welcome UI' : GRAPHIC_KINDS.find((x) => x.id === k)?.label ?? k)
/** Drive file id from /file/d/<id>/, ?id=<id> or /open?id=<id> links (folders have none). */
export function driveId(url: string | null | undefined): string | null {
  if (!url || /\/folders\//.test(url)) return null
  return /\/d\/([\w-]{20,})/.exec(url)?.[1] ?? /[?&]id=([\w-]{20,})/.exec(url)?.[1] ?? null
}

/** Artwork preview: Drive thumbnail → uploaded preview photo → coloured tile. */
export function GraphicPreview({ a, className }: { a: AnfAsset; className?: string }) {
  const id = driveId(a.url)
  const [failed, setFailed] = useState(false)
  const src = id && !failed ? `https://drive.google.com/thumbnail?id=${id}&sz=w600` : a.photos[0] ? attachmentUrl(a.photos[0]) : null
  return (
    <a href={a.url ?? '#'} target="_blank" rel="noopener noreferrer" title="Open in Google Drive"
      className={cn('relative flex items-end justify-between overflow-hidden p-1.5', className)} style={{ background: TILE[a.kind] }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={a.name} referrerPolicy="no-referrer" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-contain bg-white/60" />}
      <span className="relative rounded bg-black/60 px-1 font-mono text-[9.5px] font-semibold text-white">{kindLabel(a.kind).toUpperCase()}</span>
      <ExternalLink className="relative w-3.5 h-3.5 text-black/50" />
    </a>
  )
}

const when = (iso: string | null | undefined) => (iso ? format(parseDbDate(iso), 'd MMM HH:mm') : '')

// ── Photos ────────────────────────────────────────────────────────────────────
export function PhotoStrip({ photos, size = 56, onRemove }: { photos: ActivityAttachment[]; size?: number; onRemove?: (i: number) => void }) {
  const [open, setOpen] = useState<number | null>(null)
  if (!photos.length) return null
  const url = (i: number) => attachmentUrl(photos[i]) ?? ''
  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        {photos.map((p, i) => (
          <span key={i} className="relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url(i)} alt={p.filename} onClick={() => setOpen(i)} style={{ width: size, height: size * 0.75 }} className="rounded-md object-cover cursor-zoom-in border border-border bg-muted" />
            {onRemove && <button type="button" onClick={() => onRemove(i)} aria-label="Remove photo" className="absolute -top-1.5 -right-1.5 hidden group-hover:flex w-4 h-4 items-center justify-center rounded-full bg-foreground text-background"><X className="w-3 h-3" /></button>}
          </span>
        ))}
      </div>
      {open !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" onClick={() => setOpen(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url(open)} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" aria-label="Close" className="absolute top-4 right-4 text-white"><X className="w-6 h-6" /></button>
          {photos.length > 1 && <span className="absolute bottom-4 text-[12px] text-white/80">{open + 1} / {photos.length} · tap to close</span>}
        </div>
      )}
    </>
  )
}

/** Camera-roll button: uploads, then hands back the attachments. */
export function PhotoButton({ onAdd, label = 'Photo', className }: { onAdd: (p: ActivityAttachment[]) => void; label?: string; className?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <>
      <input ref={ref} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={async (e) => {
        const files = Array.from(e.target.files ?? []); e.target.value = ''
        if (!files.length) return
        setBusy(true); setErr(null)
        try { onAdd(await Promise.all(files.map(uploadPhoto))) } catch (x) { setErr(x instanceof Error ? x.message : 'Upload failed') } finally { setBusy(false) }
      }} />
      <button type="button" onClick={() => ref.current?.click()} disabled={busy} title={err ?? 'Add photos'}
        className={cn('inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 h-8 text-[12px] text-muted-foreground hover:text-foreground disabled:opacity-50', err && 'border-red-400 text-red-600', className)}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}{label}
      </button>
    </>
  )
}

// ── Chips + mentions ──────────────────────────────────────────────────────────
export function AssetChip({ a, onOpen, onRemove }: { a: AnfAsset; onOpen?: () => void; onRemove?: () => void }) {
  const st = GRAPHIC_STATUS.find((x) => x.id === a.status)
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background py-0.5 pl-1 pr-1.5 text-[12px] align-middle">
      <button type="button" onClick={onOpen} className="inline-flex min-w-0 items-center gap-1.5">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded" style={{ background: TILE[a.kind] }}>
          {a.kind === 'camera' && <Camera className="w-2.5 h-2.5 text-white" />}{a.kind === 'flash' && <Zap className="w-2.5 h-2.5 text-white" />}
        </span>
        <span className="font-mono text-[10.5px] font-semibold text-[#7A5AA5]">{a.code}</span>
        <span className="truncate">{isPreset(a) ? assetPlace(a) : a.name}</span>
        {!isPreset(a) && st && <span className={cn('rounded px-1 text-[9.5px] font-bold', st.cls)}>{st.label.toUpperCase()}</span>}
      </button>
      {onRemove && <button type="button" onClick={onRemove} aria-label="Unlink" className="text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>}
    </span>
  )
}

/** Report / note text with GA-…, CAM-…, FL-… turned into chips. */
export function MentionText({ text, assets, onOpen }: { text: string; assets: AnfAsset[]; onOpen: (a: AnfAsset) => void }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(ASSET_CODE_RE)) {
    const a = assets.find((x) => x.code === m[0])
    if (!a) continue
    if (m.index! > last) parts.push(text.slice(last, m.index))
    parts.push(<AssetChip key={m.index} a={a} onOpen={() => onOpen(a)} />)
    last = m.index! + m[0].length
  }
  parts.push(text.slice(last))
  return <span className="whitespace-pre-wrap break-words">{parts}</span>
}

/** Text box with "#" asset suggestions. */
export function MentionInput({ value, onChange, onEnter, assets, placeholder, className }: {
  value: string; onChange: (v: string) => void; onEnter?: () => void; assets: AnfAsset[]; placeholder?: string; className?: string
}) {
  const m = /#([^\s#]*)$/.exec(value)
  const q = m?.[1].toLowerCase() ?? ''
  const hits = m ? assets.filter((a) => [a.code, a.name, a.room, a.branch, kindLabel(a.kind)].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0, 6) : []
  const pick = (a: AnfAsset) => onChange(value.replace(/#([^\s#]*)$/, `${a.code} `))
  return (
    <div className="relative flex-1 min-w-0">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={className}
        onKeyDown={(e) => { if (e.key === 'Enter') { if (hits.length) { e.preventDefault(); pick(hits[0]) } else onEnter?.() } }} />
      {hits.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border bg-popover p-1 shadow-lg">
          {hits.map((a) => (
            <button key={a.asset_id} type="button" onMouseDown={(e) => { e.preventDefault(); pick(a) }} className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-[12.5px] hover:bg-muted">
              <span className="font-mono text-[10.5px] font-semibold text-[#7A5AA5]">{a.code}</span><span className="truncate">{a.name}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{kindLabel(a.kind)} · {assetPlace(a)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── One asset, full card (library + peek from a task) ─────────────────────────
export function AssetCard({ a, me, onSave, onDelete, usedIn }: {
  a: AnfAsset; me: string; onSave: (a: AnfAsset) => void; onDelete?: () => void; usedIn?: { id: string; name: string; open: () => void }[]
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>(a.settings)
  const [showHist, setShowHist] = useState(false)
  const fields = fieldsFor(a.kind)
  const st = GRAPHIC_STATUS.find((x) => x.id === a.status)!

  if (!isPreset(a)) return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <GraphicPreview a={a} className="h-36" />
      <div className="p-2 space-y-1.5">
        <div className="font-mono text-[10.5px] font-semibold text-[#7A5AA5]">{a.code}</div>
        <a href={a.url ?? '#'} target="_blank" rel="noopener noreferrer" className="block truncate text-[12.5px] font-semibold hover:underline">{a.name}</a>
        <div className="flex items-center gap-1.5">
          <select value={a.status} onChange={(e) => onSave({ ...a, status: e.target.value as AnfAsset['status'], updated_by: me, updated_at: new Date().toISOString() })}
            className={cn('h-5 rounded px-1 text-[10.5px] font-semibold border-0', st.cls)} aria-label="Status">
            {GRAPHIC_STATUS.map((x) => <option key={x.id} value={x.id}>{x.label.toUpperCase()}</option>)}
          </select>
          <span className="text-[10.5px] text-muted-foreground">v{a.version}</span>
          {onDelete && <button type="button" className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Delete asset" onClick={() => window.confirm(`Delete ${a.code} “${a.name}”? The Drive file is not touched.`) && onDelete()}><Trash2 className="w-3 h-3" /></button>}
        </div>
        {!driveId(a.url) && !a.photos.length && <p className="text-[10.5px] text-muted-foreground">No preview (folder link or not shared). Upload one ↓</p>}
        <div className="flex flex-wrap items-center gap-2">
        <PhotoButton label={a.photos.length ? 'Change preview' : 'Upload preview'} className="h-6 text-[11px]" onAdd={(p) => onSave({ ...a, photos: p.slice(0, 1), updated_by: me, updated_at: new Date().toISOString() })} />
        <button type="button" className="text-[11px] text-muted-foreground underline hover:text-foreground"
          onClick={() => { const u = window.prompt('New version — paste the new Google Drive link', ''); if (u && /^https?:\/\//.test(u.trim())) onSave(revise(a, { url: u.trim(), status: 'draft' }, me)) }}>New version</button>
        </div>
        {usedIn && usedIn.length > 0 && <p className="text-[11px] text-muted-foreground">Used in: {usedIn.map((u, i) => <span key={u.id}>{i > 0 && ', '}<button type="button" onClick={u.open} className="underline hover:text-foreground">{u.name}</button></span>)}</p>}
      </div>
    </div>
  )

  // Camera / flash preset
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: TILE[a.kind] }}>{a.kind === 'camera' ? <Camera className="w-3.5 h-3.5 text-white" /> : <Zap className="w-3.5 h-3.5 text-white" />}</span>
        <div className="min-w-0">
          <div className="font-mono text-[10.5px] font-semibold tracking-wide text-muted-foreground">{a.kind === 'camera' ? 'CAMERA PRESET' : 'FLASH PRESET'} · <span className="text-[#7A5AA5]">{a.code}</span></div>
          <div className="truncate text-[12px] text-muted-foreground">{a.kind === 'camera' ? [a.settings.body, a.settings.lens, a.settings.focal && `@ ${a.settings.focal}`].filter(Boolean).join(' · ') : [a.settings.model, a.settings.trigger].filter(Boolean).join(' · ') || assetPlace(a)}</div>
        </div>
        {!editing && <button type="button" onClick={() => { setDraft(a.settings); setEditing(true) }} className="ml-auto text-[12px] font-medium text-[#7A5AA5]">Edit</button>}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {fields.map((f) => (
              <label key={f.key} className={cn('block', f.key === 'note' && 'col-span-2 sm:col-span-3')}>
                <span className="font-mono text-[9.5px] font-semibold tracking-wide text-muted-foreground">{f.label.toUpperCase()}</span>
                <Input list={f.options.length ? `${a.asset_id}-${f.key}` : undefined} value={draft[f.key] ?? ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="h-8 text-[13px]" />
                {f.options.length > 0 && <datalist id={`${a.asset_id}-${f.key}`}>{f.options.map((o) => <option key={o} value={o} />)}</datalist>}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={() => { const clean = Object.fromEntries(Object.entries(draft).filter(([, v]) => v?.trim())); onSave(revise(a, { settings: clean }, me)); setEditing(false) }}>Save as v{a.version + 1}</Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {fields.filter((f) => !['body', 'lens', 'model', 'trigger', 'note'].includes(f.key)).map((f) => (
            <div key={f.key} className="rounded-md border border-border bg-background px-2 py-1">
              <div className="font-mono text-[9px] font-semibold tracking-wide text-muted-foreground truncate">{f.label.toUpperCase()}</div>
              <div className={cn('font-mono text-[14px] font-semibold truncate', !a.settings[f.key] && 'text-muted-foreground/50')}>{a.settings[f.key] || '—'}</div>
            </div>
          ))}
          {a.settings.note && <div className="col-span-4 rounded-md border border-border bg-background px-2 py-1 text-[12px]"><span className="font-mono text-[9px] font-semibold text-muted-foreground">NOTE </span>{a.settings.note}</div>}
        </div>
      )}

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-[9.5px] font-semibold tracking-wide text-muted-foreground">LATEST OUTPUT {a.photos.length > 0 && `· ${a.photos.length}`}</span>
          <PhotoButton label="Upload" className="h-6" onAdd={(p) => onSave({ ...a, photos: [...p, ...a.photos].slice(0, 8), updated_by: me, updated_at: new Date().toISOString() })} />
        </div>
        {a.photos.length ? <PhotoStrip photos={a.photos} size={88} onRemove={(i) => onSave({ ...a, photos: a.photos.filter((_, j) => j !== i) })} />
          : <p className="rounded-md border border-dashed border-border py-3 text-center text-[11.5px] text-muted-foreground">No test shot yet — upload a photo taken with this setting.</p>}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
        <span>v{a.version} · {a.updated_by ?? '—'} · {when(a.updated_at)}</span>
        {a.history.length > 0 && <button type="button" onClick={() => setShowHist((v) => !v)} className="underline hover:text-foreground">{showHist ? 'Hide' : 'History'} ({a.history.length})</button>}
      </div>
      {showHist && (
        <div className="mt-1.5 space-y-1 border-t border-border pt-1.5 text-[11.5px]">
          {a.history.map((h) => (
            <div key={h.version + h.at}><b>v{h.version}</b> · {h.by ?? '—'} · {when(h.at)}{h.settings && <span className="text-muted-foreground"> — {Object.entries(h.settings).filter(([k]) => k !== 'note').map(([k, v]) => `${k} ${v}`).join(' · ')}</span>}</div>
          ))}
        </div>
      )}
      {usedIn && usedIn.length > 0 && <p className="mt-1.5 text-[11px] text-muted-foreground">Used in: {usedIn.map((u, i) => <span key={u.id}>{i > 0 && ', '}<button type="button" onClick={u.open} className="underline hover:text-foreground">{u.name}</button></span>)}</p>}
      {onDelete && <button type="button" className="mt-1 text-[11px] text-muted-foreground hover:text-destructive" onClick={() => window.confirm(`Delete ${a.code}? Its history goes too.`) && onDelete()}>Delete preset</button>}
    </div>
  )
}
