'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { CATEGORIES, categoryMeta, ANF_ACCENT, type AnfStockCategory } from '@/lib/anf'
import type { AnfProduct } from '@/types'

/** Edit one catalog product. Renames/code/category propagate to its stock+orders. */
export function ProductDialog({ product, onClose }: { product: AnfProduct; onClose: () => void }) {
  const { anfStock, updateAnfProduct, deleteAnfProduct } = useCRMStore()
  const [name, setName] = useState(product.name)
  const [code, setCode] = useState(product.code ?? '')
  const [category, setCategory] = useState<string>(product.category || 'other')
  const [unit, setUnit] = useState(product.unit ?? '')
  const usedBy = anfStock.filter((r) => r.product_id === product.product_id).length

  function save() {
    if (!name.trim()) return
    void updateAnfProduct(product.product_id, { name: name.trim(), code: code.trim() || null, category, unit: unit.trim() || null })
    onClose()
  }
  function remove() {
    if (usedBy > 0) { window.alert(`Can't delete — ${usedBy} stock row(s) use this product.`); return }
    if (window.confirm(`Delete product “${product.name}”?`)) { void deleteAnfProduct(product.product_id); onClose() }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border">
          <span className="w-3 h-3 rounded-[4px]" style={{ backgroundColor: ANF_ACCENT }} />
          <DialogTitle className="text-[15px] font-bold">Edit product</DialogTitle>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground text-lg leading-none px-1">✕</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div><label className="field-label">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" /></div>
          <div><label className="field-label">Code / spec <span className="font-normal normal-case tracking-normal text-muted-foreground/70">· optional</span></label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PAPER DNP RX1 4*6" className="h-9" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Category</label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger className="h-9 w-full"><span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: categoryMeta(category).color }} />{categoryMeta(category).th}</span></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}><span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: c.color }} />{c.th}</span></SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="field-label">Unit</label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="box" className="h-9" /></div>
          </div>
          <p className="text-[11.5px] text-muted-foreground">Used by <b className="text-foreground">{usedBy}</b> stock row(s). Renaming updates them all.</p>
        </div>
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <button onClick={remove} className="text-destructive hover:opacity-80 text-sm mr-auto">Delete</button>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="bg-[#7A5AA5] hover:opacity-90 text-white" onClick={save} disabled={!name.trim()}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
