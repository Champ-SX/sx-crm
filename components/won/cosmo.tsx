'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { RefreshCw, MapPin, Phone, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
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

// ── Header: one Cosmo button (dot + age) → popover with status + Sync now ──
export function CosmoSyncControl({ cz, jobNumbers }: { cz: CosmoState; jobNumbers: (string | null | undefined)[] }) {
  const ours = new Set(jobNumbers.map(cosmoKey).filter(Boolean))
  const unmatched = [...new Set(cz.rows.map((r) => String(r.running_number)))].filter((k) => !ours.has(k))
  const failed = !!cz.last && !cz.last.ok
  const age = cz.last ? ago(cz.last.ran_at) : '—'
  const nextIn = cz.last ? 30 - (minsSince(cz.last.ran_at) % 30) : null
  return (
    <Popover>
      <PopoverTrigger aria-label="Cosmo sync" title="Cosmo sync"
        className="h-8 shrink-0 rounded-lg border border-border bg-card px-2 inline-flex items-center gap-1.5 text-[12px] text-foreground hover:bg-muted">
        <span className={cn('w-1.5 h-1.5 rounded-full', !cz.last ? 'bg-muted-foreground/50' : failed ? 'bg-orange-500' : 'bg-emerald-500')} />
        <span className="hidden md:inline text-[10px] font-bold tracking-wide text-violet-700 dark:text-violet-300">COSMO</span>
        <span className="hidden md:inline text-muted-foreground">{age}</span>
        <RefreshCw className={cn('w-3.5 h-3.5', cz.syncing && 'animate-spin')} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[260px] p-3 text-[12px]">
        <div className="text-[13px] font-semibold mb-1.5">Cosmo sync</div>
        <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-muted-foreground">
          <dt>Last sync</dt><dd className={cn('text-right font-medium', failed ? 'text-orange-700 dark:text-orange-400' : 'text-foreground')}>{cz.last ? `${age} ago · ${failed ? 'failed' : 'OK'}` : 'not yet'}</dd>
          {failed && cz.last?.message && <dd className="col-span-2 text-orange-700 dark:text-orange-400 break-words">{cz.last.message}</dd>}
          <dt>Rows</dt><dd className="text-right font-medium text-foreground">{cz.rows.length}</dd>
          {nextIn != null && <><dt>Next auto-sync</dt><dd className="text-right font-medium text-foreground">in {nextIn} min</dd></>}
          {unmatched.length > 0 && <><dt>Unmatched job #</dt><dd className="text-right font-medium text-orange-700 dark:text-orange-400">{unmatched.map((k) => `#${k}`).join(', ')}</dd></>}
        </dl>
        {cz.result && <p className="mt-2 text-muted-foreground">{cz.result}</p>}
        <button type="button" onClick={cz.sync} disabled={cz.syncing}
          className="mt-2.5 h-8 w-full rounded-md bg-foreground text-background inline-flex items-center justify-center gap-1.5 font-semibold disabled:opacity-60">
          <RefreshCw className={cn('w-3.5 h-3.5', cz.syncing && 'animate-spin')} />{cz.syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </PopoverContent>
    </Popover>
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

function minsSince(iso: string) { return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000)) }
const ago = (iso: string) => {
  const m = minsSince(iso)
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
      title={`${down ? 'Teardown' : 'Setup'} ${hhmm(r.at)} · #${r.running_number}${jobName ? ` ${jobName}` : ''}${team ? ` · Team ${team}` : ''} · from Cosmo`}
      className={cn('max-w-full text-left rounded-md border border-dashed px-1.5 py-1 text-[11px] font-semibold leading-tight truncate bg-card',
        down ? 'border-orange-400/60 text-orange-700 dark:text-orange-400' : 'border-emerald-500/60 text-emerald-700 dark:text-emerald-400')}>
      {down ? '▼ TD' : '▲ SU'} <span className="font-mono">#{r.running_number}</span> <span className="font-normal opacity-80">{hhmm(r.at)}</span>
    </button>
  )
}

// ── Drawer section ──────────────────────────────────────────────────────────
const DT = 'text-muted-foreground text-[10px] sm:text-[12px] font-bold sm:font-normal tracking-wide uppercase sm:normal-case mt-2 sm:mt-0'
const ACT = 'mt-1.5 sm:mt-0 sm:ml-2 flex sm:inline-flex w-full sm:w-auto h-9 sm:h-auto items-center justify-center gap-1 rounded-md sm:rounded border border-border px-1.5 text-[12px] sm:text-[11px] font-medium hover:bg-muted'
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
          <dl className="grid grid-cols-1 sm:grid-cols-[92px_1fr] gap-x-3 gap-y-0.5 sm:gap-y-2">
            {phases.filter((p) => !isTeardown(p)).map((p) => <Phase key={p.type} label="▲ Setup" r={p} />)}
            {head.event_start && <><dt className={DT}>● Event</dt><dd>{when(head.event_start)}{head.event_end && `–${hhmm(head.event_end)}`}</dd></>}
            {phases.filter(isTeardown).map((p) => <Phase key={p.type} label="▼ Teardown" r={p} />)}
            {head.venue_name && <><dt className={DT}>Venue</dt><dd>
              {head.venue_name}{head.venue_address && <span className="text-muted-foreground"> · {head.venue_address}</span>}
              {head.map_url && <a href={head.map_url} target="_blank" rel="noreferrer" className={ACT}><MapPin className="w-3.5 h-3.5" />Map</a>}
            </dd></>}
            {(head.site_contact_name || head.site_contact_phone) && <><dt className={DT}>Site contact</dt><dd>
              {head.site_contact_name}{head.site_contact_phone && <> · {head.site_contact_phone}
                <a href={`tel:${head.site_contact_phone.replace(/[^\d+]/g, '')}`} className={ACT}><Phone className="w-3.5 h-3.5" />Call</a></>}
            </dd></>}
            {(head.skus?.length || head.quantity) ? <><dt className={DT}>Booths</dt><dd className="font-mono text-[12px]">{(head.skus ?? []).join(', ')}{head.quantity ? ` · ×${head.quantity}` : ''}</dd></> : null}
          </dl>

          {diffs.length > 0 && (
            <div className="mt-3 space-y-2">
              {diffs.map((d) => (
                <Row key={d.field} label={d.field === 'date' ? 'Event date' : 'Venue'} ours={d.ours} cosmo={d.cosmo}
                  onUse={() => onCopy(d.field === 'date' ? { event_date: d.cosmo } : { venue: d.cosmo })} />
              ))}
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
      <dt className={DT}>{label}</dt>
      <dd><b>{when(r.at)}</b><div className="text-[12px] text-muted-foreground">Team: {team || 'not set in Cosmo'}</div></dd>
    </>
  )
}

function Row({ label, ours, cosmo, onUse }: { label: string; ours: string; cosmo: string; onUse: () => void }) {
  return (
    <div className="rounded-lg bg-orange-500/10 px-3 py-2 text-[12px]">
      <div className="text-[11px] font-bold text-orange-700 dark:text-orange-400">⚠ {label} differs</div>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="min-w-0"><div className="text-[10px] text-muted-foreground">OURS</div><div className="break-words">{ours}</div></div>
        <div className="min-w-0"><div className="text-[10px] text-muted-foreground">COSMO</div><div className="break-words">{cosmo}</div></div>
        <button type="button" onClick={onUse} className="col-span-2 sm:col-span-1 h-8 sm:h-7 rounded-md border border-border bg-card px-2 text-[12px] font-semibold hover:bg-muted">Use Cosmo&apos;s</button>
      </div>
    </div>
  )
}
