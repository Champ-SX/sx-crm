'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { Customer, CustomerType } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Search,
  Plus,
  Mail,
  Phone,
  AtSign,
  MessageCircle,
  User,
  Tag,
  ChevronRight,
  Pencil,
  Check,
  X,
} from 'lucide-react'

const CUSTOMER_TYPES: CustomerType[] = ['brand', 'agency', 'venue', 'organizer', 'individual', 'partner']

function CustomerRow({
  customer,
  onClick,
}: {
  customer: Customer
  onClick: () => void
}) {
  return (
    <tr
      className="border-b border-border/60 hover:bg-muted/30 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {customer.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{customer.name}</p>
            {customer.company_name && (
              <p className="text-xs text-muted-foreground">{customer.company_name}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={customer.customer_type} />
      </td>
      <td className="px-4 py-4">
        <p className="text-sm text-muted-foreground">{customer.email || '—'}</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-sm text-muted-foreground">{customer.phone || '—'}</p>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1">
          {customer.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium"
            >
              {tag}
            </span>
          ))}
          {customer.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{customer.tags.length - 2}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-xs text-muted-foreground">{customer.owner}</p>
      </td>
      <td className="px-4 py-4">
        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </td>
    </tr>
  )
}

const OWNERS = ['Vitta', 'Andy', 'Fern', 'Nong']

function InlineEditText({
  value,
  onSave,
  multiline = false,
  placeholder = 'Add a note…',
}: {
  value: string
  onSave: (v: string) => void
  multiline?: boolean
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function commit() {
    onSave(draft)
    setEditing(false)
  }
  function cancel() {
    setDraft(value)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div
        className="group flex items-start gap-2 cursor-pointer rounded-md px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        <p className={`text-sm leading-relaxed flex-1 ${value ? 'text-foreground/80' : 'text-muted-foreground italic'}`}>
          {value || placeholder}
        </p>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {multiline ? (
        <Textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="text-sm resize-none"
          rows={3}
          onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
        />
      ) : (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 text-sm"
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }}
        />
      )}
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={commit}>
          <Check className="w-3 h-3" /> Save
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancel}>
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}

function CreateCustomerForm({ onClose }: { onClose: () => void }) {
  const { addCustomer } = useCRMStore()
  const [form, setForm] = useState({
    name: '',
    company_name: '',
    customer_type: 'brand' as CustomerType,
    email: '',
    phone: '',
    line_id: '',
    instagram: '',
    source: '',
    tags: '',
    notes: '',
    owner: 'Vitta',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const now = new Date().toISOString()
    addCustomer({
      customer_id: crypto.randomUUID(),
      name: form.name,
      company_name: form.company_name,
      customer_type: form.customer_type,
      email: form.email,
      phone: form.phone,
      line_id: form.line_id,
      instagram: form.instagram,
      source: form.source,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: form.notes,
      owner: form.owner,
      created_at: now,
      updated_at: now,
    })
    onClose()
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle>New Customer</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" placeholder="e.g. Pim Rattana" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company / Brand</Label>
              <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="h-8 text-sm" placeholder="e.g. LYNK & CO" />
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">LINE ID</Label>
              <Input value={form.line_id} onChange={(e) => setForm({ ...form, line_id: e.target.value })} className="h-8 text-sm" placeholder="@handle" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Instagram</Label>
              <Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="h-8 text-sm" placeholder="@handle" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="h-8 text-sm" placeholder="e.g. referral, ig" />
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
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tags <span className="text-muted-foreground font-normal">(comma-separated)</span></Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="h-8 text-sm" placeholder="e.g. brand, premium, repeat" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-sm resize-none" rows={3} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-sm">Create Customer</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CustomerDetail({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { customers, opportunities, updateCustomer } = useCRMStore()
  const customer = customers.find((c) => c.customer_id === customerId)
  if (!customer) return null
  const linkedOpps = opportunities.filter((o) => o.linked_customer_id === customer.customer_id)

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base">{customer.name}</SheetTitle>
              {customer.company_name && (
                <p className="text-sm text-muted-foreground">{customer.company_name}</p>
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
              {customer.instagram && (
                <div className="flex items-center gap-2 text-sm">
                  <AtSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span>{customer.instagram}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Meta — owner is editable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Owner</p>
              <Select
                value={customer.owner}
                onValueChange={(v) => v && updateCustomer(customer.customer_id, { owner: v })}
              >
                <SelectTrigger className="h-7 text-sm border-0 px-0 focus:ring-0 w-auto gap-1 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Source</p>
              <p className="text-sm font-medium capitalize">{customer.source}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Created</p>
              <p className="text-sm">{new Date(customer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Updated</p>
              <p className="text-sm">{new Date(customer.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          {/* Tags */}
          {customer.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags.map((tag) => (
                    <span key={tag} className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes — inline editable */}
          <Separator />
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
            <InlineEditText
              value={customer.notes}
              placeholder="Click to add notes…"
              multiline
              onSave={(v) => updateCustomer(customer.customer_id, { notes: v })}
            />
          </div>

          {/* Linked Opportunities */}
          {linkedOpps.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Opportunities ({linkedOpps.length})
                </p>
                <div className="space-y-2">
                  {linkedOpps.map((opp) => (
                    <div key={opp.opportunity_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
                      <div>
                        <p className="text-sm font-medium">{opp.deal_name}</p>
                        <p className="text-xs text-muted-foreground">{opp.service_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">฿{opp.estimated_value.toLocaleString()}</p>
                        <p className="text-[11px] text-muted-foreground">{opp.stage}</p>
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
            <AddActivityForm entityType="customer" entityId={customer.customer_id} owner={customer.owner} />
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

export default function CustomersPage() {
  const { customers } = useCRMStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = customers.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || c.customer_type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Customers"
        description={`${customers.length} records`}
      >
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setCreating(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Customer
        </Button>
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((customer) => (
              <CustomerRow
                key={customer.customer_id}
                customer={customer}
                onClick={() => setSelectedId(customer.customer_id)}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          search || typeFilter !== 'all'
            ? <EmptyState icon={Search} title="No customers match" description="Try adjusting your search or filter to find what you're looking for." />
            : <EmptyState icon={User} title="No customers yet" description="Add your first customer to start building your client base." action={{ label: '+ Add Customer', onClick: () => setCreating(true) }} />
        )}
      </div>

      {selectedId && (
        <CustomerDetail customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      {creating && <CreateCustomerForm onClose={() => setCreating(false)} />}
    </div>
  )
}
