'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { CreateQuotationModal } from '@/components/shared/create-quotation-modal'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { LeadOpportunity, LeadOpStatus } from '@/types'
import {
  Search, Plus, Mail, Phone, MessageCircle,
  ChevronRight, Trophy, XCircle, Calendar, MapPin,
  Pencil, Check, X, FileText, User, Send,
} from 'lucide-react'
import { format } from 'date-fns'

const SERVICES = ['CAP*TURES', 'Andy & Fine', 'SX Event', 'Booth Rental', 'Custom Activation', 'Other']
const OWNERS = ['Vitta', 'Andy', 'Fern', 'Nong']

const statusConfig: Record<LeadOpStatus, { label: string; class: string }> = {
  open: { label: 'Open', class: 'bg-blue-50 text-blue-600 border-blue-200' },
  won: { label: 'Won', class: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  lost: { label: 'Lost', class: 'bg-red-50 text-red-500 border-red-200' },
}

// ── Inline edit ───────────────────────────────────────────────────────────────
function InlineEdit({
  value, onSave, multiline = false, placeholder = 'Click to edit…',
}: {
  value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function commit() { onSave(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }

  if (!editing) {
    return (
      <div className="group flex items-start gap-2 cursor-pointer rounded px-2 py-1.5 -mx-2 hover:bg-muted/50" onClick={() => { setDraft(value); setEditing(true) }}>
        <p className={`text-sm flex-1 leading-relaxed ${value ? 'text-foreground/80' : 'text-muted-foreground italic'}`}>{value || placeholder}</p>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      {multiline
        ? <Textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm resize-none" rows={3} onKeyDown={(e) => { if (e.key === 'Escape') cancel() }} />
        : <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 text-sm" onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} />
      }
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={commit}><Check className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancel}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────
function LeadRow({ item, onClick }: { item: LeadOpportunity; onClick: () => void }) {
  const cfg = statusConfig[item.status]
  return (
    <tr className="border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={onClick}>
      <td className="px-5 py-3.5">
        <p className="text-sm font-medium text-foreground">{item.name}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-muted-foreground">{item.customer_name}</p>
      </td>
      <td className="px-4 py-3.5">
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">{item.service_type}</span>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-muted-foreground">
          {item.event_date ? format(new Date(item.event_date + 'T00:00:00'), 'dd MMM yyyy') : '—'}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-foreground">
          {item.estimated_value > 0 ? `฿${item.estimated_value.toLocaleString()}` : '—'}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-xs text-muted-foreground">{item.owner}</p>
      </td>
      <td className="px-4 py-3.5">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.class}`}>{cfg.label}</span>
      </td>
      <td className="px-4 py-3.5">
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>
    </tr>
  )
}

// ── Add form ──────────────────────────────────────────────────────────────────
function AddLeadOpForm({ onClose }: { onClose: () => void }) {
  const { addLeadOpportunity } = useCRMStore()
  const [form, setForm] = useState({
    name: '', customer_name: '', contact_person: '', service_type: 'CAP*TURES',
    event_date: '', venue: '', estimated_value: '', owner: 'Vitta', notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const now = new Date().toISOString()
    addLeadOpportunity({
      lead_op_id: `lop-${Date.now()}`,
      name: form.name,
      customer_name: form.customer_name,
      contact_person: form.contact_person,
      service_type: form.service_type,
      event_date: form.event_date || undefined,
      venue: form.venue || undefined,
      estimated_value: parseFloat(form.estimated_value) || 0,
      owner: form.owner,
      notes: form.notes,
      status: 'open',
      created_at: now,
      updated_at: now,
    })
    onClose()
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[460px] sm:max-w-[460px] p-0 overflow-y-auto">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>New Lead / Opportunity</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1">
            <Label className="text-xs">Lead / Opportunity Name *</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" placeholder="e.g. Sephora Annual Campaign 2026" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Customer / Company</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="h-8 text-sm" placeholder="e.g. Sephora Thailand" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contact Person</Label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="h-8 text-sm" placeholder="e.g. Khun Pim" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Service / Product</Label>
              <Select value={form.service_type} onValueChange={(v) => v && setForm({ ...form, service_type: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Owner</Label>
              <Select value={form.owner} onValueChange={(v) => v && setForm({ ...form, owner: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Event Date</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estimated Value (฿)</Label>
              <Input type="number" value={form.estimated_value} onChange={(e) => setForm({ ...form, estimated_value: e.target.value })} className="h-8 text-sm" placeholder="0" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Venue</Label>
            <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="h-8 text-sm" placeholder="e.g. EastinGrand Sathorn" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-sm resize-none" rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-sm">Add</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function LeadDetail({ item, onClose }: { item: LeadOpportunity; onClose: () => void }) {
  const { updateLeadOpportunity, markAsWon, markAsLost } = useCRMStore()
  const [confirmWon, setConfirmWon] = useState(false)
  const [confirmLost, setConfirmLost] = useState(false)
  const [quotationOpen, setQuotationOpen] = useState(false)

  function handleMarkWon() {
    markAsWon(item.lead_op_id)
    setConfirmWon(false)
    onClose()
  }
  function handleMarkLost() {
    markAsLost(item.lead_op_id)
    setConfirmLost(false)
    onClose()
  }

  const cfg = statusConfig[item.status]

  return (
    <>
      <Sheet open onOpenChange={onClose}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-snug">{item.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.class}`}>{cfg.label}</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{item.service_type}</span>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 py-5 space-y-5">
            {/* Actions */}
            <div className="flex flex-col gap-2">
              {/* Create Quotation — always available */}
              <Button
                size="sm"
                variant="outline"
                className="w-full h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium"
                onClick={() => setQuotationOpen(true)}
              >
                <Send className="w-3.5 h-3.5" /> Create Quotation → FlowAccount
              </Button>

              {/* Win/Loss — only when open */}
              {item.status === 'open' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    onClick={() => setConfirmWon(true)}
                  >
                    <Trophy className="w-3.5 h-3.5" /> Mark as Won
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 gap-1.5 border-red-200 text-red-500 hover:bg-red-50 text-xs"
                    onClick={() => setConfirmLost(true)}
                  >
                    <XCircle className="w-3.5 h-3.5" /> Mark as Lost
                  </Button>
                </div>
              )}
            </div>

            {/* Key info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Customer</p>
                <p className="text-sm font-medium">{item.customer_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contact</p>
                <p className="text-sm font-medium">{item.contact_person || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Estimated Value</p>
                <p className="text-lg font-bold text-foreground">
                  {item.estimated_value > 0 ? `฿${item.estimated_value.toLocaleString()}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Owner</p>
                <Select value={item.owner} onValueChange={(v) => v && updateLeadOpportunity(item.lead_op_id, { owner: v })}>
                  <SelectTrigger className="h-7 text-sm border-0 px-0 focus:ring-0 w-auto gap-1 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Event details */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Details</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{item.event_date ? format(new Date(item.event_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy') : '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <InlineEdit
                    value={item.venue ?? ''}
                    placeholder="Add venue…"
                    onSave={(v) => updateLeadOpportunity(item.lead_op_id, { venue: v })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
              <InlineEdit
                value={item.notes}
                placeholder="Click to add notes…"
                multiline
                onSave={(v) => updateLeadOpportunity(item.lead_op_id, { notes: v })}
              />
            </div>

            {/* Meta */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Created {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span>Updated {new Date(item.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>

            {/* Activity logger */}
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Activity</p>
              <AddActivityForm entityType="lead_opportunity" entityId={item.lead_op_id} owner={item.owner} />
            </div>

            {/* Activity timeline */}
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">History</p>
              <ActivityTimeline entityType="lead_opportunity" entityId={item.lead_op_id} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirm Won */}
      <Dialog open={confirmWon} onOpenChange={setConfirmWon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Won 🎉</DialogTitle>
            <DialogDescription>
              This will create a new job card in <strong>Won Job List</strong> on the OP board. The lead will be marked as Won.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmWon(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleMarkWon}>
              Confirm Win
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Lost */}
      <Dialog open={confirmLost} onOpenChange={setConfirmLost}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Lost</DialogTitle>
            <DialogDescription>
              This lead/opportunity will be closed as lost. You can still view it with the Lost filter.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmLost(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleMarkLost}>Mark as Lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Quotation Modal */}
      <CreateQuotationModal
        lead={item}
        open={quotationOpen}
        onClose={() => setQuotationOpen(false)}
      />
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeadsOpportunitiesPage() {
  const { leadOpportunities } = useCRMStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [selected, setSelected] = useState<LeadOpportunity | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = leadOpportunities.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = l.name.toLowerCase().includes(q) || l.customer_name.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchService = serviceFilter === 'all' || l.service_type === serviceFilter
    const matchOwner = ownerFilter === 'all' || l.owner === ownerFilter
    return matchSearch && matchStatus && matchService && matchOwner
  })

  const openCount = leadOpportunities.filter((l) => l.status === 'open').length
  const pipelineValue = leadOpportunities.filter((l) => l.status === 'open').reduce((s, l) => s + l.estimated_value, 0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Leads & Opportunities"
        description={`${openCount} open · ฿${(pipelineValue / 1000).toFixed(0)}K pipeline`}
      >
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Lead / Opp
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="px-8 py-4 border-b bg-white flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {(['all', 'open', 'won', 'lost'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all capitalize ${statusFilter === s ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {s} {s !== 'all' && <span className="ml-1 opacity-60">{leadOpportunities.filter((l) => l.status === s).length}</span>}
            </button>
          ))}
        </div>
        <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v ?? 'all')}>
          <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder="All services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v ?? 'all')}>
          <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="All owners" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} items</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <LeadRow key={item.lead_op_id} item={item} onClick={() => setSelected(item)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          search || serviceFilter !== 'all' || ownerFilter !== 'all'
            ? <EmptyState icon={Search} title="No results match" description="Try adjusting your filters." />
            : statusFilter === 'open'
              ? <EmptyState icon={FileText} title="No open leads yet" description="Add your first lead or opportunity to start tracking." action={{ label: '+ Add Lead / Opp', onClick: () => setCreating(true) }} />
              : <EmptyState icon={FileText} title={`No ${statusFilter} items`} description="Nothing here yet." />
        )}
      </div>

      {selected && <LeadDetail item={selected} onClose={() => setSelected(null)} />}
      {creating && <AddLeadOpForm onClose={() => setCreating(false)} />}
    </div>
  )
}
