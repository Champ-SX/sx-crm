'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { RefreshCw, MapPin, Phone, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getCosmoInstalls, getLastCosmoSync, syncCosmoNow, cosmoDiffs, isTeardown, bkkDate,
  type CosmoInstall, type CosmoSyncLog,
} from '@/lib/supabase/cosmo'
import type { WonJob } from '@/types'

/** Job number → its key in the Cosmo map ("041" and 41 both → "41"). */
export const cosmoKey = (n: string | number | null | undefined) => {
  const v = parseInt(String(n ?? ''), 10)
  return Number.isFinite(v) && v > 0 ? String(v) : null
}

export interface CosmoState {
  byJob: Map<string, CosmoInstall[]>
  rows: CosmoInstall[]
  last: CosmoSyncLog | null
  syncing: boolean
  result: string | null
  sync: () => void
}

export function useCosmo(): CosmoState {
  const [rows, setRows] = useState<CosmoInstall[]>([])
  const [last, setLast] = useState<CosmoSyncLog | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    Promise.all([getCosmoInstalls(), getLastCosmoSync()]).then(([r, l]) => {
      if (!alive) return
      setRows(r); setLast(l)
    })
    return () => { alive = false }
  }, [tick])

  const sync = useCallback(() => {
    setSyncing(true); setResult(null)
    syncCosmoNow().then((res) => {
      setSyncing(false)
      setResult(res.ok ? `Cosmo · ${res.rows ?? 0} rows` : `Cosmo unavailable — ${res.error}`)
      setTick((t) => t + 1)
    })
  }, [])

  const byJob = useMemo(() => {
    const m = new Map<string, CosmoInstall[]>()
    for (const r of rows) {
      const k = String(r.running_number)
      m.set(k, [...(m.get(k) ?? []), r])
    }
    return m
  }, [rows])

  return { byJob, rows, last, syncing, result, sync }
}

export const cosmoFor = (cz: CosmoState | undefined, job: Pick<WonJob, 'job_number'>) => {
  const k = cosmoKey(job.job_number)
  return (k && cz?.byJob.get(k)) || []
}

// ── Header: "COSMO synced 12 min ago  ⟳ Sync now" ────────────────────────────
export function CosmoSyncControl({ cz, jobNumbers }: { cz: CosmoState; jobNumbers: (string | null | undefined)[] }) {
  const ours = new Set(jobNumbers.map(cosmoKey).filter(Boolean))
  const unmatched = [...new Set(cz.rows.map((r) => String(r.running_number)))].filter((k) => !ours.has(k))
  const label = cz.result
    ?? (cz.last ? (cz.last.ok ? `${ago(cz.last.ran_at)} ago` : `unavailable — ${cz.last.message ?? 'error'}`) : 'not synced yet')
  return (
    <div className="hidden lg:flex shrink-0 items-center gap-1.5 text-[12px] text-muted-foreground">
      <span className="rounded px-1.5 py-px text-[10px] font-bold tracking-wide bg-violet-500/12 text-violet-700 dark:text-violet-300">COSMO</span>
      <span className={cn('max-w-[150px] truncate', cz.last && !cz.last.ok && !cz.result && 'text-orange-700 dark:text-orange-400')} title={label}>{label}</span>
      {unmatched.length > 0 && (
        <span className="text-orange-700 dark:text-orange-400" title={`Cosmo job # not found here: ${unmatched.map((k) => `#${k}`).join(', ')}`}>· unmatched {unmatched.length}</span>
      )}
      <button type="button" onClick={cz.sync} disabled={cz.syncing}
        className="h-8 px-2.5 rounded-lg border border-border bg-card inline-flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:bg-muted disabled:opacity-60">
        <RefreshCw className={cn('w-3.5 h-3.5', cz.syncing && 'animate-spin')} />Sync now
      </button>
    </div>
  )
}

// ── Calendar: ⚠ chip + phase markers ────────────────────────────────────────
export function CosmoWarn({ job, rows }: { job: WonJob; rows: CosmoInstall[] }) {
  const d = cosmoDiffs(job, rows)
  if (!d.length) return null
  return (
    <span title={d.map((x) => `${x.field}: ours ${x.ours} · Cosmo ${x.cosmo}`).join('\n')}
      className="inline-flex items-center gap-0.5 rounded px-1 text-[10px] font-semibold bg-orange-500/12 text-orange-700 dark:text-orange-400">
      <TriangleAlert className="w-3 h-3" />{d.map((x) => x.field).join(' · ')}
    </span>
  )
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`
}
const hhmm = (iso: string | null) => (iso ? format(new Date(iso), 'HH:mm') : '')

/** Setup / teardown rows that fall on a given day (Bangkok date). */
export function phasesOn(rows: CosmoInstall[], day: string) {
  return rows.filter((r) => r.at && bkkDate(r.at) === day)
}

export function CosmoMarker({ r, onOpen, jobName }: { r: CosmoInstall; onOpen?: () => void; jobName?: string }) {
  const down = isTeardown(r)
  const team = (r.install_teams ?? []).join(', ')
  return (
    <button type="button" onClick={onOpen}
      title={`${down ? 'Teardown' : 'Setup'} ${hhmm(r.at)}${team ? ` · ${team}` : ''} · from Cosmo`}
      className={cn('w-full text-left rounded-md border border-dashed px-1.5 py-1 text-[11px] leading-tight truncate bg-card',
        down ? 'border-orange-400/60 text-orange-700 dark:text-orange-400' : 'border-emerald-500/60 text-emerald-700 dark:text-emerald-400')}>
      {down ? '▼ Teardown' : '▲ Setup'} {hhmm(r.at)}
      {jobName && <span className="text-muted-foreground"> · #{r.running_number} {jobName}</span>}
      {team && <span className="text-muted-foreground"> · {team}</span>}
    </button>
  )
}

// ── Drawer section ──────────────────────────────────────────────────────────
const when = (iso: string | null) => (iso ? format(new Date(iso), 'EEE d MMM · HH:mm') : '—')

export function CosmoSection({ job, rows, onCopy }: {
  job: WonJob
  rows: CosmoInstall[]
  onCopy: (patch: Partial<WonJob>) => void
}) {
  const head = rows.find((r) => r.event_start) ?? rows[0]
  const diffs = cosmoDiffs(job, rows)
  const phases = [...rows].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''))
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="rounded px-1.5 py-px text-[10px] font-bold tracking-wide bg-violet-500/12 text-violet-700 dark:text-violet-300">COSMO</span>
          {head ? <span className="font-mono text-[12px] text-muted-foreground">{head.booking_id}</span> : null}
        </span>
        {head?.status && <span className="rounded-full border border-emerald-500/50 px-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">{head.status}</span>}
      </div>
      {!head ? (
        <p className="px-4 py-3 text-[12px] text-muted-foreground">
          {cosmoKey(job.job_number) ? 'Not in Cosmo (Cosmo only shares today → 30 days ahead, confirmed bookings).' : 'Add a job number to link this card to Cosmo.'}
        </p>
      ) : (
        <div className="bg-card px-4 py-3 text-[13px]">
          <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-2">
            {phases.filter((p) => !isTeardown(p)).map((p) => <Phase key={p.type} label="▲ Setup" r={p} />)}
            {head.event_start && <><dt className="text-muted-foreground text-[12px]">● Event</dt><dd>{when(head.event_start)}{head.event_end && `–${hhmm(head.event_end)}`}</dd></>}
            {phases.filter(isTeardown).map((p) => <Phase key={p.type} label="▼ Teardown" r={p} />)}
            {head.venue_name && <><dt className="text-muted-foreground text-[12px]">Venue</dt><dd>
              {head.venue_name}{head.venue_address && <span className="text-muted-foreground"> · {head.venue_address}</span>}
              {head.map_url && <a href={head.map_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 rounded border border-border px-1.5 text-[11px] font-medium hover:bg-muted"><MapPin className="w-3 h-3" />Map</a>}
            </dd></>}
            {(head.site_contact_name || head.site_contact_phone) && <><dt className="text-muted-foreground text-[12px]">Site contact</dt><dd>
              {head.site_contact_name}{head.site_contact_phone && <> · {head.site_contact_phone}
                <a href={`tel:${head.site_contact_phone.replace(/[^\d+]/g, '')}`} className="ml-2 inline-flex items-center gap-1 rounded border border-border px-1.5 text-[11px] font-medium hover:bg-muted"><Phone className="w-3 h-3" />Call</a></>}
            </dd></>}
            {(head.skus?.length || head.quantity) ? <><dt className="text-muted-foreground text-[12px]">Booths</dt><dd className="font-mono text-[12px]">{(head.skus ?? []).join(', ')}{head.quantity ? ` · ×${head.quantity}` : ''}</dd></> : null}
          </dl>

          {diffs.length > 0 && (
            <div className="mt-3 rounded-lg bg-orange-500/10 px-3 py-2 text-[12px]">
              <div className="grid grid-cols-[72px_1fr_1fr_auto] gap-x-3 gap-y-1 items-center">
                <span /><b className="text-orange-700 dark:text-orange-400">Ours</b><b className="text-orange-700 dark:text-orange-400">Cosmo</b><span />
                {diffs.map((d) => (
                  <Row key={d.field} label={d.field === 'date' ? 'Event date' : 'Venue'} ours={d.ours} cosmo={d.cosmo}
                    onUse={() => onCopy(d.field === 'date' ? { event_date: d.cosmo } : { venue: d.cosmo })} />
                ))}
              </div>
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">Synced {formatDistanceToNow(new Date(head.synced_at))} ago · read-only — edit in Cosmo</p>
        </div>
      )}
    </div>
  )
}

function Phase({ label, r }: { label: string; r: CosmoInstall }) {
  const team = (r.install_teams ?? []).join(', ')
  return (
    <>
      <dt className="text-muted-foreground text-[12px]">{label}</dt>
      <dd><b>{when(r.at)}</b><div className="text-[12px] text-muted-foreground">Team: {team || 'not set in Cosmo'}</div></dd>
    </>
  )
}

function Row({ label, ours, cosmo, onUse }: { label: string; ours: string; cosmo: string; onUse: () => void }) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span><span className="truncate">{ours}</span><span className="truncate">{cosmo}</span>
      <button type="button" onClick={onUse} className="rounded border border-border bg-card px-1.5 py-0.5 text-[11px] font-medium hover:bg-muted">Use Cosmo&apos;s</button>
    </>
  )
}
