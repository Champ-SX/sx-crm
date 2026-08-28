'use client'

import { useMemo, useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Plus, Check, ChevronDown } from 'lucide-react'
import { CATEGORIES, categoryMeta, inferCategory, type AnfStockCategory } from '@/lib/anf'
import type { AnfProduct } from '@/types'

/**
 * Product picker — select an existing catalog product or create a new one.
 * Selecting reuses the same SKU across warehouse + branches (no duplicates).
 */
export function ProductPicker({ value, onSelect, boardId }: {
  value: string | null | undefined
  onSelect: (p: AnfProduct) => void
  boardId?: string | null
}) {
  const { anfProducts, anfStock, addAnfProduct } = useCRMStore()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)

  const selected = anfProducts.find((p) => p.product_id === value) || null
  const locOf = (pid: string) => [...new Set(anfStock.filter((r) => r.product_id === pid).map((r) => r.branch).filter(Boolean))] as string[]

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return anfProducts
      .filter((p) => !s || p.name.toLowerCase().includes(s) || (p.code ?? '').toLowerCase().includes(s))
      .slice(0, 30)
  }, [anfProducts, q])

  function pick(p: AnfProduct) { onSelect(p); setOpen(false); setQ(''); setCreating(false) }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreating(false) }}>
      <PopoverTrigger render={
        <button type="button" className="w-full h-9 px-3 rounded-md border border-border bg-card flex items-center gap-2 text-sm">
          {selected
            ? <span className="flex-1 min-w-0 truncate text-left font-medium">{selected.name}</span>
            : <span className="flex-1 text-left text-muted-foreground">Select a product…</span>}
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      } />
      <PopoverContent align="start" className="w-[340px] p-0 overflow-hidden">
        {creating ? (
          <NewProduct query={q} boardId={boardId} onCancel={() => setCreating(false)} onCreate={(p) => { void addAnfProduct(p); pick(p) }} />
        ) : (
          <>
            <div className="p-2 border-b border-border">
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or code…" className="h-8 text-[13px]" />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {list.map((p) => {
                const locs = locOf(p.product_id)
                const on = p.product_id === value
                return (
                  <button key={p.product_id} type="button" onClick={() => pick(p)} className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted ${on ? 'bg-primary/10' : ''}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium truncate">{p.name}</span>
                      {p.code && <span className="block font-mono text-[10.5px] text-muted-foreground truncate">{p.code}</span>}
                    </span>
                    {locs.length > 0 && <span className="font-mono text-[9.5px] text-muted-foreground shrink-0">{locs.join(' · ')}</span>}
                    {on && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                )
              })}
              {list.length === 0 && <p className="px-3 py-3 text-[12px] text-muted-foreground">No match.</p>}
            </div>
            <button type="button" onClick={() => setCreating(true)} className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-border text-[13px] font-medium text-[#7A5AA5] hover:bg-muted">
              <Plus className="w-4 h-4" /> New product{q.trim() ? ` “${q.trim()}”` : ''}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

function NewProduct({ query, boardId, onCancel, onCreate }: {
  query: string; boardId?: string | null; onCancel: () => void; onCreate: (p: AnfProduct) => void
}) {
  const [name, setName] = useState(query.trim())
  const [code, setCode] = useState('')
  const [category, setCategory] = useState<AnfStockCategory>(inferCategory(query))
  const [unit, setUnit] = useState('')
  function create() {
    if (!name.trim()) return
    onCreate({
      product_id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `p-${Date.now()}`,
      board_id: boardId ?? 'anf-order', name: name.trim(), code: code.trim() || null, category, unit: unit.trim() || null,
    })
  }
  return (
    <div className="p-3">
      <p className="text-[13px] font-semibold mb-2.5">New product</p>
      <label className="field-label">Name</label>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="product name" className="h-8 text-[13px] mb-2.5" />
      <label className="field-label">Code / spec <span className="font-normal normal-case tracking-normal text-muted-foreground/70">· optional</span></label>
      <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PAPER DNP RX1 4*6" className="h-8 text-[13px] mb-2.5" />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="field-label">Category</label>
          <Select value={category} onValueChange={(v) => v && setCategory(v as AnfStockCategory)}>
            <SelectTrigger className="h-8 w-full text-[13px]"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: categoryMeta(category).color }} />{categoryMeta(category).th}</span></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: c.color }} />{c.th}</span></SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><label className="field-label">Unit</label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="box" className="h-8 text-[13px]" /></div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onCancel} className="text-[12px] text-muted-foreground px-2">Back</button>
        <button type="button" onClick={create} disabled={!name.trim()} className="ml-auto text-[13px] font-medium bg-[#7A5AA5] text-white rounded-md px-3 h-8 disabled:opacity-50">Create &amp; select</button>
      </div>
    </div>
  )
}
