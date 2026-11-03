'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSuppliers, saveSupplier, saveLink, linksFor, newLink, newSupplierId, SUPPLIER_CHANNELS } from '@/lib/supabase/suppliers'
import type { AnfSupplier } from '@/types'

const inputCls = 'h-9 w-full rounded-md border border-border bg-background px-2.5 text-[13px] outline-none focus:border-foreground/40'
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
const isUrl = (s: string) => /^https?:\/\//i.test(s)

/**
 * Quick "＋ New supplier" from a request line — just enough to order.
 * Warns when the name looks like an existing supplier. A pasted link that
 * isn't a shop page is kept as this item's product link from the new supplier.
 */
export function QuickSupplierDialog({ productId, boardId, onClose, onPick }: {
  productId?: string | null; boardId?: string; onClose: () => void; onPick: (supplierId: string) => void
}) {
  const { suppliers } = useSuppliers()
  const [name, setName] = useState('')
  const [channels, setChannels] = useState<string[]>([])
  const [link, setLink] = useState('')
  const [contact, setContact] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const n = norm(name)
  const similar = n.length >= 3 ? suppliers.filter((s) => { const m = norm(s.name); return m.includes(n) || n.includes(m) }).slice(0, 3) : []
  const shopLike = (u: string) => /facebook\.com|line\.me|instagram\.com|shopee\.co\.th\/(?!product)[\w.-]+\/?$/i.test(u)

  async function save() {
    if (!name.trim()) { setError('Enter a supplier name.'); return }
    const url = link.trim()
    if (url && !isUrl(url)) { setError('Link must start with https://'); return }
    setBusy(true); setError(null)
    const isLine = /^@|^line/i.test(contact.trim())
    const s: AnfSupplier = {
      supplier_id: newSupplierId(), board_id: boardId || 'anf-order', name: name.trim(), channels,
      website: url && (shopLike(url) || !productId) ? url : null,
      line_id: isLine ? contact.trim().replace(/^line\s*:?\s*/i, '') : null,
      phone: contact.trim() && !isLine ? contact.trim() : null,
    }
    try {
      await saveSupplier(s)
      if (productId && url && !s.website) await saveLink({ ...newLink(productId, s.supplier_id, linksFor(productId).length === 0), product_url: url })
      onPick(s.supplier_id)
      onClose()
    } catch (e) { setError((e as Error).message); setBusy(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 gap-0">
        <div className="px-5 py-3 border-b border-border"><DialogTitle className="text-[15px] font-bold">New supplier</DialogTitle></div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="field-label">Supplier name *</label>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. COZII.TH" className={inputCls} />
            {similar.length > 0 && (
              <div className="mt-1.5 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-[12px] text-amber-800 dark:text-amber-300">
                Did you mean {similar.map((s, i) => (
                  <span key={s.supplier_id}>{i > 0 && ', '}<button type="button" onClick={() => { onPick(s.supplier_id); onClose() }} className="font-semibold underline">{s.name}</button></span>
                ))}? Tap to use it instead.
              </div>
            )}
          </div>
          <div>
            <label className="field-label">Channel · ช่องทางสั่ง</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SUPPLIER_CHANNELS.map((c) => {
                const on = channels.includes(c)
                return <button key={c} type="button" onClick={() => setChannels(on ? channels.filter((x) => x !== c) : [...channels, c])}
                  className={cn('h-7 rounded-md border px-2.5 text-[12px]', on ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:bg-muted')}>{c}</button>
              })}
            </div>
          </div>
          <div>
            <label className="field-label">Shop / product link</label>
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://s.shopee.co.th/…" className={inputCls} />
          </div>
          <div>
            <label className="field-label">LINE ID or phone</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="@shop or 08x-xxx-xxxx" className={inputCls} />
          </div>
          <p className="text-[11.5px] text-muted-foreground">Tax ID, payment terms and address can be added later on the Suppliers page.</p>
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={busy || !name.trim()} onClick={() => void save()} className="bg-[#7A5AA5] hover:opacity-90 text-white">Add &amp; use</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
