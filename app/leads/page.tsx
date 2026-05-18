'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { Lead, LeadSource, InterestedService, LeadStatus } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Search, Plus, Mail, Phone, MessageCircle, Calendar, MapPin,
  Zap, ChevronRight, ArrowRightLeft, Star, Pencil, Check, X,
} from 'lucide-react'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { format } from 'date-fns'

const SOURCES: LeadSource[] = ['website', 'ig', 'line', 'referral', 'walk-in', 'event', 'manual']
const SERVICES: InterestedService[] = ['CAP*TURES', 'Andy & Fine', 'SX Event', 'Booth Rental', 'Custom Activation']
const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'unqualified']
const OWNERS = ['Vitta', 'Andy', 'Fern', 'Nong']

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-zinc-400'
}

function LeadRow({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <tr className="border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={onClick}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
            {lead.contact_name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium">{lead.contact_name}</p>
            {lead.company_name && <p className="text-xs text-muted-foreground">{lead.company_name}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={lead.lead_status} />
      </td>
      <td className="px-4 py-4">
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">{lead.interested_service}</span>
      </td>
      <td className="px-4 py-4">
        <span className="text-xs text-muted-foreground capitalize">{lead.source}</span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-1">
          <Star className={`w-3 h-3 ${scoreColor(lead.lead_score)}`} />
          <span className={`text-sm font-semibold ${scoreColor(lead.lead_score)}`}>{lead.lead_score}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        {lead.event_date ? (
          <p className="text-xs text-muted-foreground">{format(new Date(lead.event_date + 'T00:00:00'), 'MMM d, yyyy')}</p>
        ) : <p className="text-xs text-muted-foreground">—</p>}
      </td>
      <td className="px-4 py-4">
        <p className="text-xs text-muted-foreground">{lead.owner}</p>
      </td>
      <td className="px-4 py-4">
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>
    </tr>
  )
}

function CreateLeadForm({ onClose }: { onClose: () => void }) {
  const { addLead } = useCRMStore()
  const [form, setForm] = useState({
    contact_name: '',
    company_name: '',
    email: '',
    phone: '',
    line_id: '',
    source: 'ig' as LeadSource,
    interested_service: 'CAP*TURES' as InterestedService,
    budget_range: '',
    event_date: '',
    event_location: '',
    notes: '',
    owner: 'Vitta',
  })

  function calcScore() {
    let score = 0
    if (form.event_date) score += 20
    if (form.budget_range) score += 20
    if (form.company_name) score += 20
    if (!form.email && !form.phone && !form.line_id) score -= 30
    return Math.max(0, score)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    addLead({
      lead_id: crypto.randomUUID(),
      ...form,
      lead_status: 'new',
      lead_score: calcScore(),
      created_at: new Date().toISOString(),
    })
    onClose()
  }

  const score = calcScore()

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>New Lead</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Contact Name *</Label>
              <Input required value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company / Brand</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">LINE ID</Label>
            <Input value={form.line_id} onChange={(e) => setForm({ ...form, line_id: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Select value={form.source} onValueChange={(v) => v && setForm({ ...form, source: v as LeadSource })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Interested Service</Label>
              <Select value={form.interested_service} onValueChange={(v) => v && setForm({ ...form, interested_service: v as InterestedService })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Budget Range</Label>
              <Input placeholder="e.g. 100K–200K THB" value={form.budget_range} onChange={(e) => setForm({ ...form, budget_range: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Event Date</Label>
              <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Event Location</Label>
            <Input value={form.event_location} onChange={(e) => setForm({ ...form, event_location: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Owner</Label>
            <Select value={form.owner} onValueChange={(v) => v && setForm({ ...form, owner: v })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-sm resize-none" rows={3} />
          </div>

          <div className="flex items-center justify-between pt-1 pb-2 px-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="w-3.5 h-3.5" /> Auto lead score
            </div>
            <span className={`text-sm font-bold ${scoreColor(score)}`}>{score} / 100</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-sm">Create Lead</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function InlineEditField({
  value,
  onSave,
  multiline = false,
  placeholder = '—',
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() { onSave(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }

  if (!editing) {
    return (
      <div
        className="group flex items-start gap-2 cursor-pointer rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/50 transition-colors"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        <span className={`text-sm flex-1 ${value ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
          {value || placeholder}
        </span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {multiline ? (
        <Textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm resize-none" rows={3}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel() }} />
      ) : (
        <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} />
      )}
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={commit}><Check className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancel}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

function LeadDetail({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { leads, convertLead, updateLead } = useCRMStore()
  const lead = leads.find((l) => l.lead_id === leadId)
  const [converting, setConverting] = useState(false)
  const [converted, setConverted] = useState(false)
  if (!lead) return null

  function handleConvert() {
    if (!lead) return
    convertLead(lead.lead_id)
    setConverted(true)
    setConverting(false)
  }

  return (
    <>
      <Sheet open onOpenChange={onClose}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
                {lead.contact_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base">{lead.contact_name}</SheetTitle>
                {lead.company_name && <p className="text-sm text-muted-foreground">{lead.company_name}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <StatusBadge status={lead.lead_status} />
                  <div className="flex items-center gap-1">
                    <Star className={`w-3 h-3 ${scoreColor(lead.lead_score)}`} />
                    <span className={`text-xs font-semibold ${scoreColor(lead.lead_score)}`}>{lead.lead_score}</span>
                  </div>
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 py-5 space-y-5">
            {converted && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Converted to Customer + Opportunity!
              </div>
            )}

            {/* Convert action */}
            {lead.lead_status !== 'unqualified' && !converted && (
              <Button
                variant="outline"
                size="sm"
                className="w-full border-primary/30 text-primary hover:bg-primary/5 gap-1.5 h-9 text-sm"
                onClick={() => setConverting(true)}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                Convert to Customer + Opportunity
              </Button>
            )}

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={lead.lead_status} onValueChange={(v) => v && updateLead(lead.lead_id, { lead_status: v as LeadStatus })}>
                <SelectTrigger className="h-8 text-sm w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Contact info */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
              {lead.email && <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-muted-foreground" />{lead.email}</div>}
              {lead.phone && <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-muted-foreground" />{lead.phone}</div>}
              {lead.line_id && <div className="flex items-center gap-2 text-sm"><MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />LINE: {lead.line_id}</div>}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-muted-foreground mb-1">Service</p><p className="text-sm font-medium">{lead.interested_service}</p></div>
              <div><p className="text-xs text-muted-foreground mb-1">Source</p><p className="text-sm font-medium capitalize">{lead.source}</p></div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Budget</p>
                <InlineEditField
                  value={lead.budget_range}
                  placeholder="Add budget range…"
                  onSave={(v) => updateLead(lead.lead_id, { budget_range: v })}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Owner</p>
                <Select value={lead.owner} onValueChange={(v) => v && updateLead(lead.lead_id, { owner: v })}>
                  <SelectTrigger className="h-7 text-sm border-0 px-0 focus:ring-0 w-auto gap-1 font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(lead.event_date || lead.event_location) && (
              <>
                <Separator />
                <div className="space-y-2">
                  {lead.event_date && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Event: {format(new Date(lead.event_date + 'T00:00:00'), 'MMM d, yyyy')}
                    </div>
                  )}
                  {lead.event_location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {lead.event_location}
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
              <InlineEditField
                value={lead.notes}
                placeholder="Click to add notes…"
                multiline
                onSave={(v) => updateLead(lead.lead_id, { notes: v })}
              />
            </div>

            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Activity</p>
              <AddActivityForm entityType="lead" entityId={lead.lead_id} owner={lead.owner} />
            </div>

            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">History</p>
              <ActivityTimeline entityType="lead" entityId={lead.lead_id} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={converting} onOpenChange={setConverting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead</DialogTitle>
            <DialogDescription>
              This will create a new <strong>Customer</strong> record and a new <strong>Opportunity</strong> from{' '}
              <strong>{lead.contact_name}</strong>. The lead status will be updated to Qualified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConverting(false)}>Cancel</Button>
            <Button onClick={handleConvert}>Convert Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function LeadsPage() {
  const { leads } = useCRMStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = leads.filter((l) => {
    const matchSearch =
      l.contact_name.toLowerCase().includes(search.toLowerCase()) ||
      l.company_name.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.lead_status === statusFilter
    const matchService = serviceFilter === 'all' || l.interested_service === serviceFilter
    return matchSearch && matchStatus && matchService
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Leads" description={`${leads.length} total · ${leads.filter((l) => l.lead_status === 'new').length} new`}>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Lead
        </Button>
      </PageHeader>

      <div className="px-8 py-4 border-b bg-white flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-[130px] h-8 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v ?? 'all')}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="All services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} of {leads.length}</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lead</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <LeadRow key={lead.lead_id} lead={lead} onClick={() => setSelectedId(lead.lead_id)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          search || statusFilter !== 'all' || serviceFilter !== 'all'
            ? <EmptyState icon={Search} title="No leads match" description="Try adjusting your search or filters to find what you're looking for." />
            : <EmptyState icon={Zap} title="No leads yet" description="Start adding prospects to track them through your sales funnel." action={{ label: '+ Add Lead', onClick: () => setCreating(true) }} />
        )}
      </div>

      {selectedId && <LeadDetail leadId={selectedId} onClose={() => setSelectedId(null)} />}
      {creating && <CreateLeadForm onClose={() => setCreating(false)} />}
    </div>
  )
}
