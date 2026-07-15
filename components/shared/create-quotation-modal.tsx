'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { LeadOpportunity } from '@/types'
import { Plus, Trash2, Send, CheckCircle2, ExternalLink, AlertCircle, Loader2 } from 'lucide-react'

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  unitName: string
}

interface CreateQuotationModalProps {
  lead: LeadOpportunity
  open: boolean
  onClose: () => void
  // Customer contact information
  customerPhone?: string
  customerLineId?: string
}

function formatCurrency(v: number) {
  return v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function CreateQuotationModal({ lead, open, onClose, customerPhone = '', customerLineId = '' }: CreateQuotationModalProps) {
  const today = new Date().toISOString().split('T')[0]

  const [contactName, setContactName] = useState(lead.customer_name)
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState(customerPhone)
  const [contactLineId, setContactLineId] = useState(customerLineId)
  const [documentDate, setDocumentDate] = useState(today)
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState(lead.notes || '')
  const [taxType, setTaxType] = useState<'included' | 'excluded' | 'none'>('excluded')
  const [items, setItems] = useState<LineItem[]>([
    {
      id: '1',
      description: `${lead.service_type} — ${lead.name}`,
      quantity: 1,
      unitPrice: lead.estimated_value,
      unitName: 'งาน',
    },
  ])

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<{ documentNumber?: string; viewUrl?: string; error?: string } | null>(null)

  function addItem() {
    setItems((prev) => [...prev, { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, unitName: 'งาน' }])
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function updateItem(id: string, field: keyof LineItem, value: string | number) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)))
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  // 'included': VAT is already baked into the price → VAT = subtotal × 7/107
  // 'excluded': VAT is added on top → VAT = subtotal × 7%
  const vat = taxType === 'none' ? 0 : taxType === 'included' ? subtotal * 7 / 107 : subtotal * 0.07
  const total = taxType === 'excluded' ? subtotal + vat : subtotal

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0 || !contactName.trim()) return

    setStatus('loading')
    setResult(null)

    try {
      const res = await fetch('/api/flowaccount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_quotation',
          payload: {
            contactName,
            contactEmail: contactEmail || undefined,
            contactPhone: contactPhone || undefined,
            contactLineId: contactLineId || undefined,
            documentDate,
            dueDate: dueDate || documentDate,
            note,
            includeVat: taxType !== 'none',
            referenceNumber: lead.lead_op_id,
            lineItems: items.map((i) => ({
              name: i.description,
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              unitName: i.unitName,
            })),
          },
        }),
      })

      const data = await res.json()

      if (data.success) {
        setStatus('success')
        setResult({ documentNumber: data.documentNumber, viewUrl: data.viewUrl })
      } else {
        setStatus('error')
        setResult({ error: data.error })
      }
    } catch {
      setStatus('error')
      setResult({ error: 'Network error. Please try again.' })
    }
  }

  function handleClose() {
    setStatus('idle')
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[min(680px,calc(100vw-32px))] sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            Create Quotation → FlowAccount
          </DialogTitle>
          <DialogDescription>
            Fill in the details below. This will create a quotation document in your FlowAccount.
          </DialogDescription>
        </DialogHeader>

        {/* ── Success state ── */}
        {status === 'success' && result && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              <p className="font-semibold text-emerald-700">Quotation Created!</p>
              {result.documentNumber && (
                <p className="text-sm text-emerald-600 mt-1">Document: <strong>{result.documentNumber}</strong></p>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              {result.viewUrl && (
                <a href={result.viewUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> View in FlowAccount
                  </Button>
                </a>
              )}
              <Button size="sm" onClick={handleClose} className="text-xs">Done</Button>
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {status === 'error' && result?.error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700">Failed to create quotation</p>
              <p className="text-xs text-red-600 mt-1">{result.error}</p>
              {result.error.includes('credentials') && (
                <p className="text-xs text-red-500 mt-2">
                  → Add <code className="bg-red-100 px-1 rounded">FLOWACCOUNT_CLIENT_ID</code> and{' '}
                  <code className="bg-red-100 px-1 rounded">FLOWACCOUNT_CLIENT_SECRET</code> to your{' '}
                  <code className="bg-red-100 px-1 rounded">.env.local</code> file.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {status !== 'success' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Customer info */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customer</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Customer / Company Name *</Label>
                  <Input
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="h-8 text-sm"
                    placeholder="e.g. Sephora Thailand"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="h-8 text-sm" placeholder="customer@email.com" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-8 text-sm" placeholder="08x-xxx-xxxx" />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Line ID</Label>
                  <Input value={contactLineId} onChange={(e) => setContactLineId(e.target.value)} className="h-8 text-sm" placeholder="@linenamehere" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Dates */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Document</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Document Date</Label>
                  <Input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valid Until</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</p>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addItem}>
                  <Plus className="w-3 h-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 px-1">
                  <p className="col-span-5 text-[12px] text-muted-foreground font-medium uppercase tracking-wider">Description</p>
                  <p className="col-span-2 text-[12px] text-muted-foreground font-medium uppercase tracking-wider">Unit</p>
                  <p className="col-span-1 text-[12px] text-muted-foreground font-medium uppercase tracking-wider text-center">Qty</p>
                  <p className="col-span-3 text-[12px] text-muted-foreground font-medium uppercase tracking-wider text-right">Unit Price</p>
                  <p className="col-span-1" />
                </div>

                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-muted/20 rounded-lg p-2">
                    <Input
                      className="col-span-5 h-7 text-xs"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Service description"
                      required
                    />
                    <Input
                      className="col-span-2 h-7 text-xs"
                      value={item.unitName}
                      onChange={(e) => updateItem(item.id, 'unitName', e.target.value)}
                      placeholder="งาน"
                    />
                    <Input
                      type="number"
                      className="col-span-1 h-7 text-xs text-center"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                      min={1}
                    />
                    <Input
                      type="number"
                      className="col-span-3 h-7 text-xs text-right"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="col-span-1 flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Tax + totals */}
            <div className="flex items-start justify-between gap-6">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">VAT Setting</Label>
                <Select value={taxType} onValueChange={(v) => v && setTaxType(v as typeof taxType)}>
                  <SelectTrigger className="h-8 text-sm w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excluded">+ VAT 7% (excluded)</SelectItem>
                    <SelectItem value="included">VAT 7% included</SelectItem>
                    <SelectItem value="none">No VAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-right space-y-1 min-w-[180px]">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>฿{formatCurrency(subtotal)}</span>
                </div>
                {taxType !== 'none' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT 7%</span>
                    <span>฿{formatCurrency(vat)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary">฿{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1">
              <Label className="text-xs">Note / Remark</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-sm resize-none"
                rows={2}
                placeholder="e.g. Valid for 30 days. Prices exclude travel expenses."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-9 text-sm gap-1.5"
                disabled={status === 'loading' || items.length === 0}
              >
                {status === 'loading' ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Create in FlowAccount</>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
