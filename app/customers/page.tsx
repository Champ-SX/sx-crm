'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { Customer, CustomerType } from '@/types'
import {
  Search,
  Plus,
  Mail,
  Phone,
  MessageCircle,
  AtSign,
  ChevronRight,
  Pencil,
  Check,
  X,
  Users,
  FileSpreadsheet,
} from 'lucide-react'

const CUSTOMER_TYPES: CustomerType[] = ['brand', 'agency', 'venue', 'organizer', 'individual', 'partner']
const OWNERS = ['Vitta', 'Andy', 'Fern', 'Nong']

// ── Inline edit ───────────────────────────────────────────────────────────────
function InlineEdit({
  value,
  onSave,
  multiline = false,
  placeholder = 'Click to edit…',
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
        className="group flex items-start gap-2 cursor-pointer rounded px-2 py-1.5 -mx-2 hover:bg-muted/50"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        <p className={`text-sm flex-1 leading-relaxed ${value ? 'text-foreground/80' : 'text-muted-foreground italic'}`}>
          {value || placeholder}
        </p>
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

// ── Customer row ──────────────────────────────────────────────────────────────
function CustomerRow({ customer, onClick }: { customer: Customer; onClick: () => void }) {
  return (
    <tr className="border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors group" onClick={onClick}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {customer.company_name.charAt(0)}
          </div>
          <p className="text-sm font-medium text-foreground">{customer.company_name}</p>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-muted-foreground">{customer.contact_person || '—'}</p>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={customer.customer_type} />
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-muted-foreground">{customer.phone || '—'}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-muted-foreground truncate max-w-[180px]">{customer.email || '—'}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-muted-foreground">{customer.line_id || '—'}</p>
      </td>
      <td className="px-4 py-3.5">
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>
    </tr>
  )
}

// ── Add customer form ─────────────────────────────────────────────────────────
function AddCustomerForm({ onClose }: { onClose: () => void }) {
  const { addCustomer } = useCRMStore()
  const [form, setForm] = useState({
    company_name: '', contact_person: '', phone: '', email: '',
    line_id: '', social: '', customer_type: 'brand' as CustomerType, notes: '',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) return
    const now = new Date().toISOString()
    addCustomer({
      customer_id: `cust-${Date.now()}`,
      ...form,
      created_at: now,
      updated_at: now,
    })
    onClose()
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[440px] sm:max-w-[440px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>New Customer</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <Label className="text-xs">Company / Customer Name *</Label>
            <Input required value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="h-8 text-sm" placeholder="e.g. Sephora Thailand" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Contact Person</Label>
            <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="h-8 text-sm" placeholder="e.g. Khun Pim" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-sm" placeholder="08x-xxx-xxxx" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Customer Type</Label>
              <Select value={form.customer_type} onValueChange={(v) => v && setForm({ ...form, customer_type: v as CustomerType })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">LINE ID</Label>
              <Input value={form.line_id} onChange={(e) => setForm({ ...form, line_id: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Social (IG/FB)</Label>
              <Input value={form.social} onChange={(e) => setForm({ ...form, social: e.target.value })} className="h-8 text-sm" placeholder="@handle" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-sm resize-none" rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-sm">Add Customer</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Customer detail drawer ────────────────────────────────────────────────────
function CustomerDetail({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const { updateCustomer, leadOpportunities } = useCRMStore()
  const linkedLeads = leadOpportunities.filter((l) => l.customer_id === customer.customer_id)

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {customer.company_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base">{customer.company_name}</SheetTitle>
              {customer.contact_person && (
                <p className="text-sm text-muted-foreground">{customer.contact_person}</p>
              )}
              <div className="mt-1.5">
                <StatusBadge status={customer.customer_type} />
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Contact info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</p>
            <div className="space-y-2">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline truncate">{customer.email}</a>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.line_id && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>LINE: {customer.line_id}</span>
                </div>
              )}
              {customer.social && (
                <div className="flex items-center gap-2 text-sm">
                  <AtSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{customer.social}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <p className="text-sm font-medium capitalize">{customer.customer_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{new Date(customer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <Separator />

          {/* Notes — inline editable */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
            <InlineEdit
              value={customer.notes}
              placeholder="Click to add notes…"
              multiline
              onSave={(v) => updateCustomer(customer.customer_id, { notes: v })}
            />
          </div>

          {/* Linked leads */}
          {linkedLeads.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Leads & Opportunities ({linkedLeads.length})
                </p>
                <div className="space-y-2">
                  {linkedLeads.map((l) => (
                    <div key={l.lead_op_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div>
                        <p className="text-sm font-medium">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.service_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">฿{l.estimated_value.toLocaleString()}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${l.status === 'won' ? 'bg-emerald-50 text-emerald-600' : l.status === 'lost' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                          {l.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Activity logger */}
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Activity</p>
            <AddActivityForm entityType="customer" entityId={customer.customer_id} owner="Vitta" />
          </div>

          {/* Activity timeline */}
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">History</p>
            <ActivityTimeline entityType="customer" entityId={customer.customer_id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const { customers } = useCRMStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Customer | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.company_name.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || c.customer_type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Customers" description={`${customers.length} records`}>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-muted-foreground" disabled>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Import Excel
            <span className="ml-0.5 text-[9px] bg-muted px-1 py-0.5 rounded">soon</span>
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Customer
          </Button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="px-8 py-4 border-b bg-white flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CUSTOMER_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground ml-auto">{filtered.length} of {customers.length}</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border/60">
              <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Person</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">LINE</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <CustomerRow key={c.customer_id} customer={c} onClick={() => setSelected(c)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          search || typeFilter !== 'all'
            ? <EmptyState icon={Search} title="No customers match" description="Try adjusting your search or filter." />
            : <EmptyState icon={Users} title="No customers yet" description="Add your first customer to start building your database." action={{ label: '+ Add Customer', onClick: () => setCreating(true) }} />
        )}
      </div>

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} />}
      {creating && <AddCustomerForm onClose={() => setCreating(false)} />}
    </div>
  )
}
