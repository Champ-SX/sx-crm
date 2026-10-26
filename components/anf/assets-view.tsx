'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Search, Package } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ANF_ACCENT, ASSET_CATEGORIES, categoryMeta, kindOf, orderedCategories } from '@/lib/anf'
import { jobCardName } from '@/lib/jobs'
import {
  useAssets, movesFor, saveAsset, moveAsset, newAssetId, nextCode, prefixFor,
  RACKS, SHELVES, EVENT_SLOTS, LOCATION_KINDS, locMeta, locationLabel,
} from '@/lib/supabase/assets'
import type { AnfAsset, AnfProduct, AssetLocationKind, WonJob } from '@/types'

const input = 'h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-foreground/40'
const fmt = (d?: string | null) => (d ? format(new Date(d), 'd MMM yyyy') : '—')

function useMe() {
  const { user } = useAuth()
  return (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? null
}

/** Assets tab — one row per physical unit (CAM-001…), filter by location. */
export function AssetsView({ products, openCode }: { products: AnfProduct[]; openCode?: string | null }) {
  const { assets, loaded } = useAssets()
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const [q, setQ] = useState('')
  const [loc, setLoc] = useState<AssetLocationKind | 'all' | 'active'>('active')
  const [editing, setEditing] = useState<AnfAsset | null>(null)
  const [adding, setAdding] = useState(false)
  const [opened, setOpened] = useState<string | null>(null)
  const assetProducts = products.filter((p) => kindOf(p) === 'asset')
  const prodById = useMemo(() => new Map(products.map((p) => [p.product_id, p])), [products])
  const jobById = useMemo(() => new Map(wonJobs.map((j) => [j.job_id, j])), [wonJobs])

  // Deep link ?asset=CAM-001 (future QR) opens that card once loaded.
  if (openCode && loaded && opened !== openCode) {
    setOpened(openCode)
    const hit = assets.find((a) => a.code.toLowerCase() === openCode.toLowerCase())
    if (hit) setEditing(hit)
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of assets) c[a.location_kind] = (c[a.location_kind] ?? 0) + 1
    return c
  }, [assets])
  const needle = q.trim().toLowerCase()
  const list = assets.filter((a) => {
    if (loc === 'active' ? a.location_kind === 'retired' : loc !== 'all' && a.location_kind !== loc) return false
    if (!needle) return true
    const p = prodById.get(a.product_id)
    return [a.code, a.serial, p?.name, p?.code, a.location_slot].some((v) => (v ?? '').toLowerCase().includes(needle))
  })
  const groups = orderedCategories([...new Set(list.map((a) => prodById.get(a.product_id)?.category || 'asset_other'))])
    .map((cat) => ({ cat, items: list.filter((a) => (prodById.get(a.product_id)?.category || 'asset_other') === cat) }))

  const chip = (k: typeof loc, label: string, n?: number) => (
    <button key={k} type="button" onClick={() => setLoc(k)}
      className={cn('h-7 rounded-full border px-2.5 text-[12px]', loc === k ? 'border-foreground bg-foreground text-background font-semibold' : 'border-border text-muted-foreground hover:text-foreground')}>
      {label}{n != null && n > 0 && <span className="ml-1 opacity-70">{n}</span>}
    </button>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {chip('active', 'In use', assets.length - (counts.retired ?? 0))}
        {LOCATION_KINDS.map((l) => chip(l.kind, l.label, counts[l.kind]))}
        {chip('all', 'All')}
        <div className="relative ml-auto w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, serial, item…" className={cn(input, 'h-8 pl-8')} />
        </div>
        <Button size="sm" className="h-8 gap-1.5 bg-[#7A5AA5] hover:opacity-90 text-white" onClick={() => setAdding(true)}><Plus className="w-4 h-4" />Add unit</Button>
      </div>

      {loaded && list.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border">
          <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium">{assets.length ? 'Nothing matches this filter' : 'No asset units yet'}</p>
          <p className="text-[12px] text-muted-foreground mt-1">
            Use “Add unit” to register each camera, light, computer… with its own ID.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[90px_1.6fr_1fr_1.2fr] gap-3 px-4 py-2 border-b border-border font-mono text-[11px] tracking-wide text-muted-foreground">
            <span>ID</span><span>ITEM</span><span>SERIAL</span><span>LOCATION</span>
          </div>
          {groups.map(({ cat, items }) => {
            const cm = categoryMeta(cat)
            return (
              <div key={cat}>
                <div className="px-4 py-1.5 bg-muted/50 border-b border-border text-[12px] font-semibold flex items-center gap-2" style={{ boxShadow: `inset 3px 0 0 ${cm.color}` }}>
                  {cm.en || cm.th} <span className="font-mono text-[11px] text-muted-foreground font-normal">{items.length}</span>
                </div>
                {items.map((a) => {
                  const p = prodById.get(a.product_id)
                  const job = a.job_id ? jobById.get(a.job_id) : null
                  return (
                    <button key={a.asset_id} type="button" onClick={() => setEditing(a)}
                      className="w-full text-left grid grid-cols-[80px_1fr] sm:grid-cols-[90px_1.6fr_1fr_1.2fr] gap-x-3 gap-y-0.5 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/40">
                      <span className="font-mono text-[13px] font-semibold">{a.code}</span>
                      <span className="min-w-0 text-[13px] truncate">{p?.name ?? '—'}{p?.code && <span className="text-muted-foreground"> · {p.code}</span>}</span>
                      <span className="hidden sm:block font-mono text-[12px] text-muted-foreground truncate">{a.serial || '—'}</span>
                      <span className="col-start-2 sm:col-start-auto min-w-0 flex items-center gap-1.5">
                        <span className={cn('rounded px-1.5 py-0.5 font-mono text-[11px] font-bold whitespace-nowrap', locMeta(a.location_kind).cls)}>{locationLabel(a, job?.job_number)}</span>
                        {job && <span className="text-[12px] text-muted-foreground truncate">{jobCardName(job)}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {adding && <AddUnitsDialog products={assetProducts} existing={assets.map((a) => a.code)} onClose={() => setAdding(false)} onCreated={(a) => { setAdding(false); setEditing(a) }} />}
      {editing && <AssetDialog key={editing.asset_id} asset={assets.find((x) => x.asset_id === editing.asset_id) ?? editing} product={prodById.get(editing.product_id)} onClose={() => setEditing(null)} />}
    </div>
  )
}

// ── Add units ────────────────────────────────────────────────────────────────
function AddUnitsDialog({ products, existing, onClose, onCreated }: {
  products: AnfProduct[]; existing: string[]; onClose: () => void; onCreated: (a: AnfAsset) => void
}) {
  const activeBoardId = useCRMStore((s) => s.activeBoardId)
  const addAnfProduct = useCRMStore((s) => s.addAnfProduct)
  const me = useMe()
  const [productId, setProductId] = useState(products[0]?.product_id ?? '')
  const [creatingNew, setCreatingNew] = useState(products.length === 0)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState('camera')
  const [newSpec, setNewSpec] = useState('')
  const [count, setCount] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const product = creatingNew ? null : products.find((p) => p.product_id === productId)
  const prefix = prefixFor(creatingNew ? newCat : product?.category)
  const codes = useMemo(() => {
    const out: string[] = []; const all = [...existing]
    for (let i = 0; i < count; i++) { const c = nextCode(prefix, all); out.push(c); all.push(c) }
    return out
  }, [prefix, count, existing])

  async function create() {
    let target = product
    try {
      if (creatingNew) {
        if (!newName.trim()) return
        target = { product_id: newAssetId(), board_id: activeBoardId || 'anf-order', name: newName.trim(), code: newSpec.trim() || null, category: newCat, unit: 'pcs', kind: 'asset' }
        await addAnfProduct(target)
      }
      if (!target) return
      const product = target
      let first: AnfAsset | null = null
      for (const code of codes) {
        const a: AnfAsset = { asset_id: newAssetId(), board_id: activeBoardId || 'anf-order', code, product_id: product.product_id, location_kind: 'rack', location_slot: `${RACKS[0]}-${SHELVES[0]}`, job_id: null }
        await saveAsset(a)
        await moveAsset(a, { kind: 'rack', slot: a.location_slot!, job_id: null }, { from: '—', to: `New · ${a.location_slot!.replace('-', ' · ')}` }, me, 'Registered')
        first ??= a
      }
      if (first) onCreated(first)
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="text-[15px] font-bold">Add asset units</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {(
            <>
              {creatingNew ? (
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <div><label className="field-label">New asset product</label><Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Canon R6 II" className="h-9" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="field-label">Category</label>
                      <select value={newCat} onChange={(e) => setNewCat(e.target.value)} className={input}>
                        {ASSET_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.en}</option>)}
                      </select>
                    </div>
                    <div><label className="field-label">Model / spec</label><Input value={newSpec} onChange={(e) => setNewSpec(e.target.value)} placeholder="optional" className="h-9" /></div>
                  </div>
                  {products.length > 0 && <button type="button" onClick={() => setCreatingNew(false)} className="text-[12px] text-muted-foreground underline">Pick an existing product instead</button>}
                </div>
              ) : (
                <div><label className="field-label">Product</label>
                  <select value={productId} onChange={(e) => setProductId(e.target.value)} className={input}>
                    {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}{p.code ? ` · ${p.code}` : ''}</option>)}
                  </select>
                  <button type="button" onClick={() => setCreatingNew(true)} className="mt-1 text-[12px] text-muted-foreground underline">＋ New asset product</button>
                </div>
              )}
              <div><label className="field-label">How many units</label>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => setCount((n) => Math.max(1, n - 1))} className="h-9 w-9 rounded-md border border-border">−</button>
                  <span className="w-10 text-center font-mono">{count}</span>
                  <button type="button" onClick={() => setCount((n) => Math.min(50, n + 1))} className="h-9 w-9 rounded-md border border-border">＋</button>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground">New IDs: <span className="font-mono text-foreground">{codes.length > 3 ? `${codes[0]} … ${codes[codes.length - 1]}` : codes.join(', ')}</span> · start at {RACKS[0]} · {SHELVES[0]} (move them after).</p>
            </>
          )}
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" disabled={creatingNew ? !newName.trim() : !product} onClick={create}>Add {count > 1 ? `${count} units` : 'unit'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Asset card ───────────────────────────────────────────────────────────────
function AssetDialog({ asset, product, onClose }: { asset: AnfAsset; product?: AnfProduct; onClose: () => void }) {
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const me = useMe()
  const [d, setD] = useState(asset)
  const [kind, setKind] = useState<AssetLocationKind>(asset.location_kind)
  const [rack, setRack] = useState(asset.location_kind === 'rack' && asset.location_slot ? asset.location_slot.split('-')[0] : RACKS[0])
  const [shelf, setShelf] = useState(asset.location_kind === 'rack' && asset.location_slot ? asset.location_slot.split('-')[1] ?? SHELVES[0] : SHELVES[0])
  const [ev, setEv] = useState(asset.location_kind === 'event' && asset.location_slot ? asset.location_slot : EVENT_SLOTS[0])
  const [extraEv, setExtraEv] = useState<string[]>(() => (asset.location_kind === 'event' && asset.location_slot && !EVENT_SLOTS.includes(asset.location_slot) ? [asset.location_slot] : []))
  const [jobId, setJobId] = useState<string | null>(asset.job_id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [today] = useState(() => new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10))
  const jobs = useMemo(() => wonJobs.filter((j) => !j.is_archived && (j.event_end_date || j.event_date || '') >= today).sort((a, b) => (a.event_date ?? '').localeCompare(b.event_date ?? '')), [wonJobs, today])
  const jobOf = (id: string | null) => (id ? wonJobs.find((j) => j.job_id === id) : undefined)
  const history = movesFor(asset.asset_id)

  const slot = kind === 'rack' ? `${rack}-${shelf}` : kind === 'event' ? ev : null
  const target = { location_kind: kind, location_slot: slot }
  const moved = kind !== asset.location_kind || (slot ?? null) !== (asset.location_slot ?? null) || (kind === 'event' && (jobId ?? null) !== (asset.job_id ?? null))
  const detailsChanged = (['serial', 'purchase_date', 'value_thb', 'warranty_until', 'notes'] as const).some((k) => (d[k] ?? null) !== (asset[k] ?? null))

  async function save() {
    try {
      if (detailsChanged) await saveAsset({ ...asset, serial: d.serial ?? null, purchase_date: d.purchase_date ?? null, value_thb: d.value_thb ?? null, warranty_until: d.warranty_until ?? null, notes: d.notes ?? null })
      if (moved) {
        const base = { ...asset, serial: d.serial ?? null, purchase_date: d.purchase_date ?? null, value_thb: d.value_thb ?? null, warranty_until: d.warranty_until ?? null, notes: d.notes ?? null }
        await moveAsset(base, { kind, slot, job_id: kind === 'event' ? jobId : null },
          { from: locationLabel(asset, jobOf(asset.job_id ?? null)?.job_number), to: locationLabel(target, jobOf(jobId)?.job_number) }, me)
      }
      onClose()
    } catch (e) { setError((e as Error).message) }
  }

  const seg = (on: boolean) => cn('h-8 rounded-md border px-2.5 text-[12px] font-medium', on ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground')
  const set = (k: keyof AnfAsset, v: string) => setD((x) => ({ ...x, [k]: v === '' ? null : k === 'value_thb' ? (Number.isFinite(parseFloat(v.replace(/,/g, ''))) ? parseFloat(v.replace(/,/g, '')) : x.value_thb) : v }))

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-lg p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <div className="min-w-0">
            <DialogTitle className="font-mono text-[20px] font-bold leading-none">{asset.code}</DialogTitle>
            <p className="text-[13px] mt-1 truncate">{product?.name ?? '—'}{product?.code && <span className="text-muted-foreground"> · {product.code}</span>}</p>
          </div>
          <span className={cn('ml-auto rounded px-1.5 py-0.5 font-mono text-[11px] font-bold', locMeta(asset.location_kind).cls)}>{locationLabel(asset, jobOf(asset.job_id ?? null)?.job_number)}</span>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          {/* Where is it? */}
          <div>
            <label className="field-label">Where is it?</label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['rack', 'factory', 'event'] as const).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={cn('rounded-lg border py-2 text-center', kind === k ? 'border-foreground ring-1 ring-foreground' : 'border-border')}>
                  <b className="block font-mono text-[15px]">{locMeta(k).short}</b><span className="text-[11px] text-muted-foreground">{locMeta(k).label}</span>
                </button>
              ))}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(['repair', 'lost', 'retired'] as const).map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={seg(kind === k)}>{locMeta(k).label}</button>)}
            </div>
          </div>

          {kind === 'rack' && (
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label">Rack</label><div className="flex gap-1.5">{RACKS.map((r) => <button key={r} type="button" onClick={() => setRack(r)} className={seg(rack === r)}>{r}</button>)}</div></div>
              <div><label className="field-label">Shelf</label><div className="flex gap-1.5">{SHELVES.map((s) => <button key={s} type="button" onClick={() => setShelf(s)} className={seg(shelf === s)}>{s}</button>)}</div></div>
            </div>
          )}
          {kind === 'event' && (
            <>
              <div><label className="field-label">Event slot</label>
                <div className="flex flex-wrap gap-1.5">
                  {[...EVENT_SLOTS, ...extraEv].map((s) => <button key={s} type="button" onClick={() => setEv(s)} className={seg(ev === s)}>{s}</button>)}
                  <button type="button" onClick={() => { const n = `EV${EVENT_SLOTS.length + extraEv.length + 1}`; setExtraEv((x) => [...x, n]); setEv(n) }} className={seg(false)}>＋ EV{EVENT_SLOTS.length + extraEv.length + 1}</button>
                </div>
              </div>
              <div><label className="field-label">Linked Won job</label>
                <select value={jobId ?? ''} onChange={(e) => setJobId(e.target.value || null)} className={input}>
                  <option value="">No job</option>
                  {jobId && !jobs.some((j) => j.job_id === jobId) && jobOf(jobId) && <option value={jobId}>{label(jobOf(jobId)!)}</option>}
                  {jobs.map((j) => <option key={j.job_id} value={j.job_id}>{label(j)}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <div className="col-span-2"><label className="field-label">Serial number</label><Input value={d.serial ?? ''} onChange={(e) => set('serial', e.target.value)} className="h-9 font-mono" /></div>
            <div><label className="field-label">Purchase date</label><input type="date" value={d.purchase_date ?? ''} onChange={(e) => set('purchase_date', e.target.value)} className={input} /></div>
            <div><label className="field-label">Value (฿)</label><input inputMode="decimal" value={d.value_thb ?? ''} onChange={(e) => set('value_thb', e.target.value)} className={input} /></div>
            <div><label className="field-label">Warranty until</label><input type="date" value={d.warranty_until ?? ''} onChange={(e) => set('warranty_until', e.target.value)} className={input} /></div>
            <div className="col-span-2"><label className="field-label">Notes</label><Input value={d.notes ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Condition, accessories…" className="h-9" /></div>
          </div>

          {/* History */}
          <div className="border-t border-border pt-3">
            <label className="field-label">History</label>
            {history.length === 0 ? <p className="text-[12px] text-muted-foreground">No moves yet.</p> : (
              <ol className="border-l-2 border-border pl-3 space-y-1.5 text-[12px]">
                {history.slice(0, 20).map((m) => (
                  <li key={m.id}><b>→ {m.to_label}</b> <span className="text-muted-foreground">from {m.from_label ?? '—'} · {fmt(m.moved_at)}{m.moved_by && ` · ${m.moved_by}`}{m.note && ` · ${m.note}`}</span></li>
                ))}
              </ol>
            )}
          </div>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <span className="mr-auto text-[11px] text-muted-foreground font-mono">/anf-order/stock?asset={asset.code}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" disabled={!moved && !detailsChanged} onClick={save}>{moved ? `Move to ${locationLabel(target, jobOf(jobId)?.job_number)}` : 'Save'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const label = (j: WonJob) => `#${j.job_number ?? '—'} · ${j.event_date ?? ''} · ${jobCardName(j)}`
