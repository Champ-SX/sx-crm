'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Camera, Plus, Undo2, ChevronDown, Send, Trash2, X } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { categoryMeta } from '@/lib/anf'
import { useAssets, moveAsset, returnTarget, locationLabel, locMeta } from '@/lib/supabase/assets'
import {
  useBom, kitsOf, kitLinesOf, addKit, removeKit, saveKitLine, packProgress, isPacked, kitLabel, KIND_META,
  type JobKit, type JobKitLine, type RentalProduct,
} from '@/lib/supabase/bom'
import type { AnfAsset, AnfProduct, WonJob } from '@/types'

/**
 * Won drawer — equipment by product. Add a product (LCA iPad, Tally…), it
 * expands into its BOM; pick the real unit for each equipment line, tick the
 * rest, then Send out. Every move is logged on the unit.
 */
export function EquipmentSection({ job }: { job: WonJob }) {
  const { products, kitLines: allKitLines } = useBom()
  const { assets } = useAssets()
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const { user } = useAuth()
  const me = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null
  const [error, setError] = useState<string | null>(null)
  const [openKit, setOpenKit] = useState<string | null>(null)
  const prod = useMemo(() => new Map(anfProducts.map((p) => [p.product_id, p])), [anfProducts])
  const jobNo = (id: string | null | undefined) => wonJobs.find((j) => j.job_id === id)?.job_number ?? null

  const kits = kitsOf(job.job_id)
  const jobLines = allKitLines.filter((l) => l.job_id === job.job_id)
  const { done, total } = packProgress(jobLines)
  const assetOf = (id: string | null | undefined) => (id ? assets.find((a) => a.asset_id === id) : undefined)
  const isOut = (a?: AnfAsset) => !!a && a.location_kind === 'event' && a.job_id === job.job_id
  const out = assets.filter(isOut)
  const picked = new Set(jobLines.map((l) => l.asset_id).filter(Boolean))
  const unsorted = out.filter((a) => !picked.has(a.asset_id))   // sent out before BOMs (old SET units)
  const toSend = jobLines.filter((l) => l.kind === 'equipment' && l.asset_id && !isOut(assetOf(l.asset_id)))
  const missing = jobLines.filter((l) => !l.optional && !isPacked(l))

  const run = async (fn: () => Promise<unknown>) => { setError(null); try { await fn() } catch (e) { setError((e as Error).message) } }

  async function sendOut() {
    for (const l of toSend) {
      const a = assetOf(l.asset_id)
      const k = kits.find((x) => x.id === l.kit_id)
      if (!a || !k) continue
      const slot = kitLabel(k)
      await moveAsset(a, { kind: 'event', slot, job_id: job.job_id }, { from: locationLabel(a), to: locationLabel({ location_kind: 'event', location_slot: slot }, job.job_number) }, me)
    }
  }
  async function back(list: AnfAsset[]) {
    for (const a of list) {
      const t = returnTarget(a)
      await moveAsset(a, { kind: t.kind, slot: t.slot, job_id: null }, { from: locationLabel(a, job.job_number), to: locationLabel({ location_kind: t.kind, location_slot: t.slot }) }, me, `Returned from #${job.job_number ?? 'job'}`)
    }
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <Camera className="w-4 h-4 text-muted-foreground" />Equipment
          {total > 0 && <span className={cn('rounded px-1.5 py-px text-[11px] font-semibold', done === total ? 'bg-emerald-500/14 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/14 text-amber-700 dark:text-amber-400')}>{done}/{total} packed</span>}
          {out.length > 0 && <span className="rounded bg-orange-500/14 px-1.5 py-px text-[11px] font-semibold text-orange-700 dark:text-orange-400">{out.length} out</span>}
        </span>
        <AddProduct products={products} job={job} onAdd={(p) => run(async () => { const k = await addKit(job.job_id, p); setOpenKit(k.id) })} />
      </div>

      <div className="bg-card">
        {kits.length === 0 && unsorted.length === 0 && (
          <p className="px-4 py-3 text-[12px] text-muted-foreground">No equipment yet. Use <b>Add product</b> (e.g. LCA iPad) to get its list of what goes in the box.</p>
        )}

        {kits.map((k) => (
          <KitBlock key={k.id} kit={k} open={openKit === k.id} onToggle={() => setOpenKit(openKit === k.id ? null : k.id)}
            assets={assets} prod={prod} jobId={job.job_id} jobNo={jobNo} isOut={isOut}
            onReturn={(a) => run(() => back([a]))}
            onRemove={() => {
              const lines = kitLinesOf(k.id)
              if (lines.some((l) => isOut(assetOf(l.asset_id)))) { setError(`Return ${kitLabel(k)}'s equipment before removing it.`); return }
              if (window.confirm(`Remove ${kitLabel(k)} from this job?`)) void run(() => removeKit(k.id))
            }}
            onError={setError} />
        ))}

        {unsorted.length > 0 && (
          <div className="border-t border-border px-4 py-2">
            <div className="field-label mb-1">Other units on this job</div>
            <ul className="divide-y divide-border">
              {unsorted.map((a) => (
                <li key={a.asset_id} className="flex items-center gap-2 py-1.5 text-[13px]">
                  <Link href={`/purchasing/stock?asset=${encodeURIComponent(a.code)}`} className="font-mono font-semibold hover:underline">{a.code}</Link>
                  <span className="min-w-0 flex-1 truncate">{prod.get(a.product_id)?.name ?? '—'}</span>
                  <span className={cn('rounded px-1.5 py-0.5 font-mono text-[11px] font-bold', locMeta('event').cls)}>{a.location_slot || 'EV'}</span>
                  <button type="button" onClick={() => void run(() => back([a]))} title="Return to where it came from" className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"><Undo2 className="w-3.5 h-3.5" /></button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(kits.length > 0 || out.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
            <span className="mr-auto min-w-0 text-[12px] text-muted-foreground">
              {missing.length ? <>Missing: {summarize(missing)}</> : total > 0 ? 'Everything packed ✓' : ''}
            </span>
            {out.length > 0 && (
              <button type="button" onClick={() => { if (window.confirm(`Return all ${out.length} unit(s) to where they came from?`)) void run(() => back(out)) }}
                className="h-8 rounded-md border border-border px-2.5 inline-flex items-center gap-1 text-[12px] font-medium hover:bg-muted"><Undo2 className="w-3.5 h-3.5" />Return all</button>
            )}
            {toSend.length > 0 && (
              <button type="button" onClick={() => void run(sendOut)}
                className="h-8 rounded-md bg-[#7A5AA5] px-3 inline-flex items-center gap-1 text-[12px] font-semibold text-white hover:opacity-90"><Send className="w-3.5 h-3.5" />Send out {toSend.length}</button>
            )}
          </div>
        )}
        {error && <p className="px-4 pb-2 text-[12px] text-destructive">{error}</p>}
      </div>
    </div>
  )
}

/** "Light ×1, Cable bag" */
function summarize(list: JobKitLine[]): string {
  const m = new Map<string, number>()
  for (const l of list) m.set(l.label, (m.get(l.label) ?? 0) + 1)
  return [...m].map(([k, n]) => (n > 1 ? `${k} ×${n}` : k)).join(', ')
}

function KitBlock({ kit, open, onToggle, assets, prod, jobId, jobNo, isOut, onReturn, onRemove, onError }: {
  kit: JobKit; open: boolean; onToggle: () => void
  assets: AnfAsset[]; prod: Map<string, AnfProduct>; jobId: string
  jobNo: (id: string | null | undefined) => string | null
  isOut: (a?: AnfAsset) => boolean
  onReturn: (a: AnfAsset) => void; onRemove: () => void; onError: (m: string) => void
}) {
  const lines = kitLinesOf(kit.id)
  const { done, total } = packProgress(lines)
  const save = (l: JobKitLine) => saveKitLine(l).catch((e: Error) => onError(e.message))
  // Units already picked on any line of this job can't be picked twice.
  const takenHere = new Set(useBom().kitLines.filter((l) => l.job_id === jobId && l.asset_id).map((l) => l.asset_id as string))

  return (
    <div className="border-t border-border first:border-t-0">
      <div className="flex items-center gap-2 px-4 py-2">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <ChevronDown className={cn('w-4 h-4 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')} />
          <b className="truncate text-[14px]">{kit.name}</b><span className="text-[12px] text-muted-foreground">#{kit.kit_no}</span>
          <span className="ml-auto h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-emerald-600" style={{ width: total ? `${(done / total) * 100}%` : 0 }} /></span>
          <span className="w-10 shrink-0 text-right font-mono text-[11px] text-muted-foreground">{done}/{total}</span>
        </button>
        <button type="button" onClick={onRemove} title={`Remove ${kitLabel(kit)}`} className="h-7 w-7 shrink-0 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      {open && (
        <ul className="pb-1.5">
          {lines.length === 0 && <li className="px-11 py-1.5 text-[12px] text-muted-foreground">This product has no BOM yet. Add lines in Stock &amp; Assets → Products.</li>}
          {lines.map((l) => {
            const a = l.asset_id ? assets.find((x) => x.asset_id === l.asset_id) : undefined
            const out = isOut(a)
            return (
              <li key={l.id} className="grid grid-cols-[18px_1fr_auto] items-center gap-2 border-t border-dashed border-border px-4 py-1.5 pl-10 text-[13px]">
                {l.kind === 'equipment' ? (
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded border text-[10px]', l.asset_id ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border')}>{l.asset_id && '✓'}</span>
                ) : (
                  <button type="button" onClick={() => void save({ ...l, packed: !l.packed })} aria-label={l.packed ? 'Mark not packed' : 'Mark packed'}
                    className={cn('flex h-4 w-4 items-center justify-center rounded border text-[10px]', l.packed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border hover:border-foreground/40')}>{l.packed && '✓'}</button>
                )}
                <span className="min-w-0">
                  <span className="truncate">{l.label}</span>
                  {l.of_qty > 1 && <span className="text-[11.5px] text-muted-foreground"> {l.slot} of {l.of_qty}</span>}
                  {l.optional && <span className="ml-1 text-[11px] text-muted-foreground">(optional)</span>}
                  {l.kind !== 'equipment' && <span className={cn('ml-1.5 rounded px-1 py-px text-[10.5px] font-semibold', KIND_META[l.kind].cls)}>{KIND_META[l.kind].label}</span>}
                </span>
                <span className="flex items-center gap-1">
                  {l.kind === 'equipment' ? (
                    <>
                      {out && <span className={cn('rounded px-1 py-px font-mono text-[10.5px] font-bold', locMeta('event').cls)}>OUT</span>}
                      <UnitPicker line={l} current={a} assets={assets} prod={prod} jobId={jobId} jobNo={jobNo} taken={takenHere} locked={out}
                        onPick={(id) => void save({ ...l, asset_id: id })} />
                      {out && a && <button type="button" onClick={() => onReturn(a)} title="Return to where it came from" className="h-7 w-7 rounded-md inline-flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"><Undo2 className="w-3.5 h-3.5" /></button>}
                    </>
                  ) : l.kind === 'consumable' ? (
                    <span className="flex items-center gap-1">
                      <input defaultValue={l.qty} inputMode="decimal" aria-label={`${l.label} quantity`}
                        onBlur={(e) => { const n = parseFloat(e.target.value); if (Number.isFinite(n) && n !== l.qty) void save({ ...l, qty: n }) }}
                        className="h-7 w-14 rounded-md border border-border bg-background px-1.5 text-right font-mono text-[12px] outline-none focus:border-foreground/40" />
                      <span className="w-8 text-[11.5px] text-muted-foreground">{l.unit ?? ''}</span>
                    </span>
                  ) : l.qty > 1 ? <span className="font-mono text-[12px] text-muted-foreground">×{l.qty}</span> : null}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/** Units of the line's type: preferred model and free ones first; busy ones greyed with their job. */
function UnitPicker({ line, current, assets, prod, jobId, jobNo, taken, locked, onPick }: {
  line: JobKitLine; current?: AnfAsset; assets: AnfAsset[]; prod: Map<string, AnfProduct>; jobId: string
  jobNo: (id: string | null | undefined) => string | null; taken: Set<string>; locked: boolean; onPick: (assetId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const usable = (a: AnfAsset) => a.location_kind === 'rack' || a.location_kind === 'factory'
  const options = assets
    .filter((a) => !['lost', 'retired'].includes(a.location_kind) && (!line.category || prod.get(a.product_id)?.category === line.category))
    .map((a) => {
      const busy = !usable(a) || (taken.has(a.asset_id) && a.asset_id !== current?.asset_id)
      const why = taken.has(a.asset_id) ? 'on another line' : a.location_kind === 'event' ? (a.job_id === jobId ? 'out on this job' : `on #${jobNo(a.job_id) ?? '—'}`) : locMeta(a.location_kind).label
      return { a, busy, why, pref: !!line.anf_product_id && a.product_id === line.anf_product_id }
    })
    .sort((x, y) => Number(x.busy) - Number(y.busy) || Number(y.pref) - Number(x.pref) || x.a.code.localeCompare(y.a.code))
  const color = categoryMeta(line.category ?? 'asset_other').color

  if (locked && current) return <span className="h-7 rounded-md border border-emerald-600/60 px-2 inline-flex items-center font-mono text-[12px] font-semibold">{current.code}</span>
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn('h-7 min-w-[92px] rounded-md border px-2 inline-flex items-center justify-between gap-1 font-mono text-[12px]',
        current ? 'border-emerald-600/60 font-semibold' : 'border-amber-500/70 text-amber-700 dark:text-amber-400')}>
        {current?.code ?? 'pick…'}<ChevronDown className="w-3 h-3 opacity-60" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[290px] p-1 gap-0">
        <div className="px-2 py-1.5 field-label m-0 flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{categoryMeta(line.category ?? 'asset_other').en || line.label}</div>
        <div className="max-h-60 overflow-y-auto">
          {options.length === 0 && <p className="px-2 py-2 text-[12px] text-muted-foreground">No {line.label.toLowerCase()} units yet. Add them in Stock &amp; Assets → Assets.</p>}
          {options.map(({ a, busy, why, pref }) => (
            <button key={a.asset_id} type="button" disabled={busy} onClick={() => { onPick(a.asset_id); setOpen(false) }}
              className={cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]', busy ? 'opacity-45' : 'hover:bg-muted', a.asset_id === current?.asset_id && 'bg-muted')}>
              <span className="font-mono font-semibold">{a.code}</span>
              <span className="min-w-0 flex-1 truncate">{prod.get(a.product_id)?.name ?? '—'}{pref && ' ★'}</span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{busy ? why : locationLabel(a)}</span>
            </button>
          ))}
        </div>
        {current && (
          <button type="button" onClick={() => { onPick(null); setOpen(false) }} className="mt-0.5 flex w-full items-center gap-1 rounded-md border-t border-border px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-muted"><X className="w-3 h-3" />Clear</button>
        )}
      </PopoverContent>
    </Popover>
  )
}

/** Product list; the job's own product type is suggested first. */
function AddProduct({ products, job, onAdd }: { products: RentalProduct[]; job: WonJob; onAdd: (p: RentalProduct) => void }) {
  const [open, setOpen] = useState(false)
  const type = (job.product_type ?? '').toLowerCase()
  const word = (n: string) => n.toLowerCase().split(/\s+/)[0]
  const isSuggested = (p: RentalProduct) => !!type && (type.includes(p.name.toLowerCase()) || type.includes(word(p.name)))
  const list = [...products].sort((a, b) => Number(isSuggested(b)) - Number(isSuggested(a)) || a.position - b.position)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="h-7 rounded-md border border-border bg-card px-2 inline-flex items-center gap-1 text-[12px] font-medium hover:bg-muted">
        <Plus className="w-3.5 h-3.5" />Add product
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1 gap-0">
        {list.length === 0 && <p className="px-2 py-2 text-[12px] text-muted-foreground">No products yet. Set them up in Stock &amp; Assets → Products.</p>}
        <div className="max-h-72 overflow-y-auto">
          {list.map((p) => (
            <button key={p.product_id} type="button" onClick={() => { onAdd(p); setOpen(false) }}
              className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[13px] hover:bg-muted">
              {p.name}{isSuggested(p) && <span className="text-[11px] text-[#7A5AA5]">suggested</span>}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
