'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { CreateQuotationModal } from '@/components/shared/create-quotation-modal'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { AddLeadOpForm } from '@/components/shared/add-lead-op-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { LeadOpportunity, LeadOpStatus } from '@/types'
import {
  Search, Plus,
  ChevronRight, Trophy, XCircle, Calendar, MapPin,
  Pencil, Check, X, FileText, Send,
  CreditCard, ChevronDown, Banknote,
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
    <tr className="border-b border-border/50 hover:bg-slate-50/70 cursor-pointer transition-colors group" onClick={onClick}>
      {/* Name + contact */}
      <td className="px-5 py-3.5">
        <p className="text-[13px] font-semibold text-slate-800 leading-tight">{item.name}</p>
        {item.contact_person && (
          <p className="text-[11px] text-slate-400 mt-0.5">{item.contact_person}</p>
        )}
      </td>
      {/* Company */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-bold shrink-0">
            {(item.customer_name || '?').charAt(0).toUpperCase()}
          </div>
          <p className="text-[12px] text-slate-600">{item.customer_name || '—'}</p>
        </div>
      </td>
      {/* Service */}
      <td className="px-4 py-3.5">
        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{item.service_type}</span>
      </td>
      {/* Event date */}
      <td className="px-4 py-3.5">
        <p className="text-[12px] text-slate-500">
          {item.event_date ? format(new Date(item.event_date + 'T00:00:00'), 'dd MMM yyyy') : <span className="text-slate-300">—</span>}
        </p>
      </td>
      {/* Value */}
      <td className="px-4 py-3.5">
        <p className="text-[13px] font-bold text-slate-800">
          {item.estimated_value > 0 ? `฿${item.estimated_value.toLocaleString()}` : <span className="text-slate-300 font-normal">—</span>}
        </p>
      </td>
      {/* Owner */}
      <td className="px-4 py-3.5">
        <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">{item.owner}</span>
      </td>
      {/* Status */}
      <td className="px-4 py-3.5">
        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${cfg.class}`}>{cfg.label}</span>
      </td>
      {/* Arrow */}
      <td className="px-4 py-3.5">
        <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 group-hover:text-slate-500 transition-all" />
      </td>
    </tr>
  )
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function LeadDetail({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const { updateLeadOpportunity, markAsWon, markAsLost, leadOpportunities, customers, updateCustomer } = useCRMStore()
  const [confirmWon, setConfirmWon] = useState(false)
  const [confirmLost, setConfirmLost] = useState(false)
  const [quotationOpen, setQuotationOpen] = useState(false)
  const [openAccount, setOpenAccount] = useState(false)

  const item = leadOpportunities.find((l) => l.lead_op_id === itemId)
  if (!item) return null

  const linkedCustomer = item.customer_id ? customers.find((c) => c.customer_id === item.customer_id) : null

  function handleMarkWon() {
    if (!item) return
    markAsWon(item.lead_op_id)
    setConfirmWon(false)
    onClose()
  }
  function handleMarkLost() {
    if (!item) return
    markAsLost(item.lead_op_id)
    setConfirmLost(false)
    onClose()
  }

  const cfg = statusConfig[item.status]

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="w-[82vw] max-w-[82vw] sm:max-w-[82vw] top-[4vh] translate-y-0 p-0 gap-0 overflow-hidden max-h-[88vh] flex flex-col">

          {/* ── Header ── */}
          <div className="px-7 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg font-semibold leading-snug">{item.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.class}`}>{cfg.label}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{item.service_type}</span>
                </div>
              </div>
              {/* Action buttons in header */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium"
                  onClick={() => setQuotationOpen(true)}
                >
                  <Send className="w-3.5 h-3.5" /> Create Quotation → FlowAccount
                </Button>
                {item.status === 'open' && (
                  <>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                      onClick={() => setConfirmWon(true)}
                    >
                      <Trophy className="w-3.5 h-3.5" /> Mark as Won
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-red-200 text-red-500 hover:bg-red-50 text-xs"
                      onClick={() => setConfirmLost(true)}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Mark as Lost
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Body: two columns ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: Details */}
            <div className="flex-1 overflow-y-auto px-7 py-5 space-y-5 border-r">

              {/* Key info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
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
                  <p className="text-2xl font-bold text-foreground">
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
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                <span>Created {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>Updated {new Date(item.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>

              {/* Company Account (from customer record) */}
              {linkedCustomer && (
                <>
                  <Separator />
                  <div className="rounded-xl border border-amber-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenAccount((o) => !o)}
                      className="w-full bg-amber-50 px-4 py-2.5 flex items-center gap-2 hover:bg-amber-100/60 transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                        <CreditCard className="w-3 h-3 text-amber-600" />
                      </div>
                      <span className="text-[12px] font-bold text-amber-800 tracking-wide flex-1">Company Account</span>
                      <span className="text-[10px] text-amber-500/70 mr-1">{linkedCustomer.company_name}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${openAccount ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    {openAccount && (
                      <div className="bg-white px-4 py-4 space-y-4">
                        <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Changes here are saved to the Customer record and shared across all jobs.</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Tax ID</p>
                            <InlineEdit value={linkedCustomer.tax_id ?? ''} placeholder="0105xxx" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { tax_id: v })} />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Branch</p>
                            <InlineEdit value={linkedCustomer.branch ?? ''} placeholder="สาขา / สำนักงานใหญ่" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { branch: v })} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Company Address</p>
                          <InlineEdit value={linkedCustomer.company_address ?? ''} placeholder="ที่อยู่บริษัท" multiline onSave={(v) => updateCustomer(linkedCustomer.customer_id, { company_address: v })} />
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex-1 border-t border-border/60" />
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                            <Banknote className="w-3.5 h-3.5" /> Bank Transfer
                          </div>
                          <div className="flex-1 border-t border-border/60" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Bank Name</p>
                            <InlineEdit value={linkedCustomer.bank_name ?? ''} placeholder="SCB / KBANK / BBL" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_name: v })} />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Bank Branch</p>
                            <InlineEdit value={linkedCustomer.bank_branch ?? ''} placeholder="สาขา" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_branch: v })} />
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Account Number</p>
                          <InlineEdit value={linkedCustomer.bank_account_number ?? ''} placeholder="เลขบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_account_number: v })} />
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Account Name</p>
                          <InlineEdit value={linkedCustomer.bank_account_name ?? ''} placeholder="ชื่อบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_account_name: v })} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Activity */}
            <div className="w-[340px] shrink-0 overflow-y-auto px-6 py-5 space-y-5 bg-muted/20">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Activity</p>
                <AddActivityForm entityType="lead_opportunity" entityId={item.lead_op_id} owner={item.owner} />
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">History</p>
                <ActivityTimeline entityType="lead_opportunity" entityId={item.lead_op_id} />
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>

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
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
      {/* Top bar */}
      <div className="bg-white border-b border-border px-8 py-4 shrink-0 flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-800 tracking-tight">Leads &amp; Opportunities</h1>
          <p className="text-[12px] text-slate-400 mt-0.5">{openCount} open · ฿{(pipelineValue / 1000).toFixed(0)}K pipeline</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-[12px] font-semibold" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Lead / Opp
        </Button>
      </div>

      {/* Filter bar */}
      <div className="px-8 py-3 border-b bg-white flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-[12px] bg-slate-50 border-slate-200" />
        </div>
        {/* Status pills */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['all', 'open', 'won', 'lost'] as const).map((s) => {
            const count = s === 'all' ? leadOpportunities.length : leadOpportunities.filter((l) => l.status === s).length
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all capitalize ${
                  statusFilter === s ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s} <span className="ml-0.5 opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
        <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v ?? 'all')}>
          <SelectTrigger className="w-[140px] h-8 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="All services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {SERVICES.map((s) => <SelectItem key={s} value={s} className="text-[12px]">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v ?? 'all')}>
          <SelectTrigger className="w-[120px] h-8 text-[12px] bg-slate-50 border-slate-200"><SelectValue placeholder="All owners" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All owners</SelectItem>
            {OWNERS.map((o) => <SelectItem key={o} value={o} className="text-[12px]">{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-slate-400 ml-auto">{filtered.length} items</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-white">
        {filtered.length === 0 ? (
          search || serviceFilter !== 'all' || ownerFilter !== 'all'
            ? <EmptyState icon={Search} title="No results match" description="Try adjusting your filters." />
            : statusFilter === 'open'
              ? <EmptyState icon={FileText} title="No open leads yet" description="Add your first lead or opportunity to start tracking." action={{ label: '+ Add Lead / Opp', onClick: () => setCreating(true) }} />
              : <EmptyState icon={FileText} title={`No ${statusFilter} items`} description="Nothing here yet." />
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border/60 bg-slate-50/80 backdrop-blur-sm">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Lead / Opportunity</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Company</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Service</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Event Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Value</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <LeadRow key={item.lead_op_id} item={item} onClick={() => setSelectedId(item.lead_op_id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedId && <LeadDetail itemId={selectedId} onClose={() => setSelectedId(null)} />}
      {creating && <AddLeadOpForm onClose={() => setCreating(false)} />}
    </div>
  )
}
