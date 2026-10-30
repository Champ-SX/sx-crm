'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Camera, Plus, Undo2, Search } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { categoryMeta } from '@/lib/anf'
import {
  useAssets, moveAsset, returnTarget, locationLabel, locMeta, normSlot, EVENT_SLOTS,
} from '@/lib/supabase/assets'
import type { AnfAsset, WonJob } from '@/types'

/**
 * Won drawer — equipment (asset units) out with this job. Assign from the rack,
 * return after the event. Every change is a logged move on the asset.
 */
export function EquipmentSection({ job }: { job: WonJob }) {
  const { assets } = useAssets()
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const { user } = useAuth()
  const me = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null
  const [error, setError] = useState<string | null>(null)
  const prod = useMemo(() => new Map(anfProducts.map((p) => [p.product_id, p])), [anfProducts])
  const out = assets.filter((a) => a.job_id === job.job_id && a.location_kind === 'event')
  const tag = job.job_number ? `#${job.job_number}` : null

  async function send(list: AnfAsset[], set: string) {
    setError(null)
    try {
      for (const a of list) {
        await moveAsset(a, { kind: 'event', slot: set, job_id: job.job_id }, { from: locationLabel(a), to: locationLabel({ location_kind: 'event', location_slot: set }, job.job_number) }, me)
      }
    } catch (e) { setError((e as Error).message) }
  }
  async function back(list: AnfAsset[]) {
    setError(null)
    try {
      for (const a of list) {
        const t = returnTarget(a)
        await moveAsset(a, { kind: t.kind, slot: t.slot, job_id: null }, { from: locationLabel(a, job.job_number), to: locationLabel({ location_kind: t.kind, location_slot: t.slot }) }, me, `Returned from ${tag ?? 'job'}`)
      }
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <Camera className="w-4 h-4 text-muted-foreground" />Equipment
          {out.length > 0 && <span className="rounded bg-orange-500/14 px-1.5 py-px text-[11px] font-semibold text-orange-700 dark:text-orange-400">{out.length} out</span>}
        </span>
        <span className="flex items-center gap-1.5">
          {out.length > 0 && (
            <button type="button" onClick={() => { if (window.confirm(`Return all ${out.length} item(s) to where they came from?`)) void back(out) }}
              className="h-7 rounded-md border border-border bg-card px-2 inline-flex items-center gap-1 text-[12px] font-medium hover:bg-muted"><Undo2 className="w-3.5 h-3.5" />Return all</button>
          )}
          <AssignPicker assets={assets} prod={prod} jobId={job.job_id} onAssign={send} />
        </span>
      </div>
      <div className="bg-card px-4 py-2">
        {out.length === 0 ? (
          <p className="py-1.5 text-[12px] text-muted-foreground">No equipment assigned. Use <b>Assign</b> to send cameras, lights, routers… with this job.</p>
        ) : (
          <ul className="divide-y divide-border">
            {out.map((a) => {
              const p = prod.get(a.product_id)
              const cm = categoryMeta(p?.category ?? 'asset_other')
              return (
                <li key={a.asset_id} className="flex items-center gap-2.5 py-2">
                  <span className="w-1.5 h-6 rounded-full shrink-0" style={{ backgroundColor: cm.color }} />
                  <span className="min-w-0 flex-1 flex flex-wrap items-baseline gap-x-2">
                    <Link href={`/purchasing/stock?asset=${encodeURIComponent(a.code)}`} className="font-mono text-[13px] font-semibold whitespace-nowrap hover:underline">{a.code}</Link>
                    <span className="min-w-0 text-[13px] truncate">{p?.name ?? '—'}{a.serial && <span className="text-muted-foreground font-mono text-[11px]"> · SN {a.serial}</span>}</span>
                  </span>
                  <span className={cn('rounded px-1.5 py-0.5 font-mono text-[11px] font-bold', locMeta('event').cls)}>{normSlot(a.location_slot) ?? 'EV'}</span>
                  <button type="button" onClick={() => void back([a])} title="Return to where it came from" className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"><Undo2 className="w-3.5 h-3.5" /></button>
                </li>
              )
            })}
          </ul>
        )}
        {error && <p className="pb-1.5 text-[12px] text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function AssignPicker({ assets, prod, jobId, onAssign }: {
  assets: AnfAsset[]
  prod: Map<string, { name: string; code: string | null; category: string | null }>
  jobId: string
  onAssign: (list: AnfAsset[], set: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [set, setSet] = useState(EVENT_SLOTS[0])
  // Only units sitting on a rack or at the factory can be sent out.
  const free = assets.filter((a) => (a.location_kind === 'rack' || a.location_kind === 'factory') && a.job_id !== jobId)
  const needle = q.trim().toLowerCase()
  const list = free.filter((a) => !needle || [a.code, a.serial, prod.get(a.product_id)?.name].some((v) => (v ?? '').toLowerCase().includes(needle)))
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPicked([]); setQ('') } }}>
      <PopoverTrigger className="h-7 rounded-md border border-border bg-card px-2 inline-flex items-center gap-1 text-[12px] font-medium hover:bg-muted">
        <Plus className="w-3.5 h-3.5" />Assign
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-3 gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, serial, item…" className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2 text-[13px] outline-none focus:border-foreground/40" />
        </div>
        <div className="max-h-56 overflow-y-auto -mx-1">
          {list.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-muted-foreground">{free.length ? 'No match.' : 'No units on a rack or at the factory. Add units in Order → Stock → Assets.'}</p>
          ) : list.map((a) => {
            const on = picked.includes(a.asset_id)
            return (
              <button key={a.asset_id} type="button" onClick={() => toggle(a.asset_id)}
                className={cn('w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted', on && 'bg-muted')}>
                <span className={cn('w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0', on ? 'bg-foreground border-foreground text-background' : 'border-border')}>{on && '✓'}</span>
                <span className="font-mono font-semibold">{a.code}</span>
                <span className="min-w-0 flex-1 truncate">{prod.get(a.product_id)?.name ?? '—'}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{locationLabel(a)}</span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="field-label m-0 mr-1">Set</span>
          {EVENT_SLOTS.map((s) => (
            <button key={s} type="button" onClick={() => setSet(s)} className={cn('h-7 rounded-md border px-2 text-[12px] font-medium', set === s ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground')}>{s}</button>
          ))}
        </div>
        <button type="button" disabled={picked.length === 0}
          onClick={() => { void onAssign(free.filter((a) => picked.includes(a.asset_id)), set); setOpen(false); setPicked([]) }}
          className="h-8 w-full rounded-md bg-foreground text-background text-[12px] font-semibold disabled:opacity-40">
          Assign {picked.length || ''} to this job · {set}
        </button>
      </PopoverContent>
    </Popover>
  )
}
