'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Phone, MessageCircle, ExternalLink, Star, Trash2, Plus, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useSuppliers, linksFor, saveLink, deleteLink, newLink, telHref, lineHref,
} from '@/lib/supabase/suppliers'
import type { AnfProductSupplier } from '@/types'

const input = 'h-8 w-full rounded-md border border-border bg-background px-2 text-[13px] outline-none focus:border-foreground/40'
const baht = (n: number | null | undefined) => (n == null ? null : `฿ ${n.toLocaleString()}`)

/** Suppliers linked to one catalog product — preferred first, editable inline. */
export function ProductSuppliers({ productId, unit, canEdit }: { productId: string; unit?: string | null; canEdit: boolean }) {
  const { suppliers } = useSuppliers()
  const list = linksFor(productId).sort((a, b) => Number(b.preferred) - Number(a.preferred))
  const [open, setOpen] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const unlinked = suppliers.filter((s) => !list.some((l) => l.supplier_id === s.supplier_id))
  const put = (l: AnfProductSupplier) => saveLink(l).catch((e: Error) => setError(e.message))

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="field-label">Suppliers</label>
        <Link href="/purchasing/catalog?tab=suppliers" className="text-[11px] text-muted-foreground underline">All suppliers</Link>
      </div>
      {list.length === 0 && <p className="text-[12px] text-muted-foreground mt-1">No supplier linked yet{canEdit ? ' — link one so anyone can re-order.' : '.'}</p>}
      <div className="mt-1.5 space-y-2">
        {list.map((l) => {
          const s = suppliers.find((x) => x.supplier_id === l.supplier_id)
          if (!s) return null
          const tel = telHref(s.phone), line = lineHref(s.line_id)
          const expanded = open === l.id
          return (
            <div key={l.id} className={cn('rounded-lg border px-3 py-2', l.preferred ? 'border-foreground/60' : 'border-border')}>
              <div className="flex items-center gap-2">
                <b className="text-[13px] truncate">{s.name}</b>
                {l.preferred && <span className="rounded bg-[#e8f25c] px-1.5 py-px text-[10px] font-bold text-black">PREFERRED</span>}
                <span className="ml-auto flex items-center gap-1">
                  {tel && <a href={tel} className="h-7 w-7 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted" aria-label="Call"><Phone className="w-3.5 h-3.5" /></a>}
                  {line && <a href={line} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted" aria-label="LINE"><MessageCircle className="w-3.5 h-3.5" /></a>}
                  {s.website && <a href={s.website} target="_blank" rel="noreferrer" className="h-7 w-7 rounded-md border border-border inline-flex items-center justify-center hover:bg-muted" aria-label="Shop link"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  {canEdit && <button type="button" onClick={() => setOpen(expanded ? null : l.id)} aria-label="Edit" className="h-7 w-7 rounded-md inline-flex items-center justify-center hover:bg-muted"><ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} /></button>}
                </span>
              </div>
              <div className="mt-1 grid grid-cols-[76px_1fr] gap-x-2 gap-y-0.5 text-[12px]">
                {(s.contact_person || s.phone) && <><span className="text-muted-foreground">Contact</span><span>{[s.contact_person, s.phone, s.line_id && `LINE ${s.line_id}`].filter(Boolean).join(' · ')}</span></>}
                {l.price != null && <><span className="text-muted-foreground">Price</span><span className="font-mono">{baht(l.price)}{(l.unit || unit) && ` / ${l.unit || unit}`}</span></>}
                {l.lead_time && <><span className="text-muted-foreground">Lead time</span><span>{l.lead_time}</span></>}
                {l.min_order && <><span className="text-muted-foreground">Min order</span><span>{l.min_order}</span></>}
                {l.order_via && <><span className="text-muted-foreground">Order via</span><span>{l.order_via}</span></>}
                {l.note && <><span className="text-muted-foreground">Note</span><span>{l.note}</span></>}
              </div>
              {expanded && canEdit && <LinkEditor link={l} onSave={put} onRemove={() => { setOpen(null); deleteLink(l.id).catch((e: Error) => setError(e.message)) }} />}
            </div>
          )
        })}
      </div>
      {canEdit && (picking ? (
        <div className="mt-2 rounded-lg border border-border p-2">
          {unlinked.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">All suppliers are linked. <Link href="/purchasing/catalog?tab=suppliers" className="underline">Add a new supplier</Link></p>
          ) : (
            <div className="max-h-44 overflow-y-auto">
              {unlinked.map((s) => (
                <button key={s.supplier_id} type="button"
                  onClick={() => { const l = newLink(productId, s.supplier_id, list.length === 0); put(l); setPicking(false); setOpen(l.id) }}
                  className="w-full text-left rounded-md px-2 py-1.5 text-[13px] hover:bg-muted">{s.name}{s.contact_person && <span className="text-muted-foreground"> · {s.contact_person}</span>}</button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setPicking(false)} className="mt-1 text-[12px] text-muted-foreground">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className="mt-2 h-8 rounded-md border border-border px-2.5 inline-flex items-center gap-1 text-[12px] font-medium hover:bg-muted"><Plus className="w-3.5 h-3.5" />Link supplier</button>
      ))}
      {error && <p className="mt-1 text-[12px] text-destructive">{error}</p>}
    </div>
  )
}

function LinkEditor({ link, onSave, onRemove }: { link: AnfProductSupplier; onSave: (l: AnfProductSupplier) => void; onRemove: () => void }) {
  const [d, setD] = useState(link)
  const set = (k: keyof AnfProductSupplier, v: string) => setD((x) => ({ ...x, [k]: v === '' ? null : v }))
  const price = d.price == null ? '' : String(d.price)
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
      <div><div className="field-label">Price (฿)</div><input inputMode="decimal" className={input} value={price}
        onChange={(e) => { const n = parseFloat(e.target.value.replace(/,/g, '')); setD((x) => ({ ...x, price: e.target.value === '' ? null : Number.isFinite(n) ? n : x.price })) }} /></div>
      <div><div className="field-label">Per unit</div><input className={input} value={d.unit ?? ''} placeholder="box" onChange={(e) => set('unit', e.target.value)} /></div>
      <div><div className="field-label">Lead time</div><input className={input} value={d.lead_time ?? ''} placeholder="3–5 days" onChange={(e) => set('lead_time', e.target.value)} /></div>
      <div><div className="field-label">Min order</div><input className={input} value={d.min_order ?? ''} placeholder="2 boxes" onChange={(e) => set('min_order', e.target.value)} /></div>
      <div className="col-span-2"><div className="field-label">How to order</div><input className={input} value={d.order_via ?? ''} placeholder="LINE / email PO / shop link" onChange={(e) => set('order_via', e.target.value)} /></div>
      <div className="col-span-2"><div className="field-label">Note</div><input className={input} value={d.note ?? ''} placeholder="Order before 14:00 for next-day dispatch" onChange={(e) => set('note', e.target.value)} /></div>
      <div className="col-span-2 flex items-center gap-2">
        <button type="button" onClick={() => setD((x) => ({ ...x, preferred: !x.preferred }))}
          className={cn('h-8 rounded-md border px-2.5 inline-flex items-center gap-1 text-[12px] font-medium', d.preferred ? 'border-foreground bg-foreground text-background' : 'border-border')}>
          <Star className="w-3.5 h-3.5" />{d.preferred ? 'Preferred' : 'Make preferred'}
        </button>
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" />Unlink</button>
        <button type="button" onClick={() => onSave(d)} className="ml-auto h-8 rounded-md bg-foreground px-3 text-[12px] font-semibold text-background">Save</button>
      </div>
    </div>
  )
}
