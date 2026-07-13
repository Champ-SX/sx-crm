'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { parseDbDate } from '@/lib/utils'
import { useHydrated } from '@/hooks/use-hydrated'
import { useOpenDeepLink } from '@/hooks/use-open-deep-link'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { MobileCardView } from '@/components/shared/mobile-card-view'
import { StatusBadge } from '@/components/shared/status-badge'
import { AddLeadOpForm } from '@/components/shared/add-lead-op-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
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
  Building2,
  Briefcase,
  CreditCard,
  ChevronDown,
  Banknote,
  Trash2,
} from 'lucide-react'

const CUSTOMER_TYPES: CustomerType[] = ['brand', 'agency', 'venue', 'organizer', 'individual', 'partner']

// ── Company combobox ──────────────────────────────────────────────────────────
// Lets user type a new company name OR pick one from existing customers.
function CompanyCombobox({
  value,
  onChange,
  existingNames,
  placeholder = 'e.g. Sephora Thailand',
}: {
  value: string
  onChange: (v: string) => void
  existingNames: string[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(value)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Keep query in sync when value is set externally (e.g. reset)
  useEffect(() => { setQuery(value) }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const suggestions = existingNames.filter(
    (n) => n.toLowerCase().includes(query.toLowerCase()) && n !== query
  )

  function select(name: string) {
    setQuery(name)
    onChange(name)
    setOpen(false)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value)
    onChange(e.target.value)
    setOpen(true)
  }

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          required
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          className="h-8 text-sm pl-8"
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          {suggestions.length > 0 ? (
            <>
              <p className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
                Existing companies
              </p>
              <ul className="max-h-48 overflow-y-auto">
                {suggestions.map((name) => (
                  <li
                    key={name}
                    onMouseDown={() => select(name)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold shrink-0">
                      {name.charAt(0)}
                    </div>
                    {name}
                  </li>
                ))}
              </ul>
            </>
          ) : query.trim().length > 0 ? (
            <div
              onMouseDown={() => select(query.trim())}
              className="px-3 py-2.5 text-xs text-primary flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Plus className="w-3 h-3" /> Create &ldquo;<strong>{query}</strong>&rdquo; as new company
            </div>
          ) : (
            <div className="px-3 py-2 text-xs text-muted-foreground">Type to search or enter new name</div>
          )}
        </div>
      )}
    </div>
  )
}

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
        className="group flex items-start gap-1 cursor-pointer rounded px-2 py-1 -mx-2 hover:bg-muted/50"
        onClick={() => { setDraft(value); setEditing(true) }}
      >
        <p className={`flex-1 leading-relaxed ${value ? 'field-value' : 'field-placeholder'}`}>
          {value || placeholder}
        </p>
        <button type="button" className="edit-affordance shrink-0" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
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

// ── Type badge colours ────────────────────────────────────────────────────────
const typeColors: Record<string, string> = {
  brand:      'bg-blue-50 text-blue-600 border-blue-100',
  agency:     'bg-violet-50 text-violet-600 border-violet-100',
  venue:      'bg-teal-50 text-teal-600 border-teal-100',
  organizer:  'bg-amber-50 text-amber-700 border-amber-100',
  individual: 'bg-muted text-foreground/80 border-border',
  partner:    'bg-emerald-50 text-emerald-600 border-emerald-100',
}

// ── Customer row ──────────────────────────────────────────────────────────────
function CustomerRow({
  customer, onClick, onNewLead,
}: { customer: Customer; onClick: () => void; onNewLead: () => void }) {
  const colorClass = typeColors[customer.customer_type] ?? 'bg-muted text-foreground/80 border-border'
  return (
    <tr
      className="border-b border-border/50 hover:bg-muted/70 cursor-pointer transition-colors group"
      onClick={onClick}
    >
      {/* Company */}
      <td className="px-6 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-[10px] font-bold shrink-0">
            {customer.company_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-foreground leading-tight">{customer.company_name}</p>
            {customer.contact_person && (
              <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{customer.contact_person}</p>
            )}
          </div>
        </div>
      </td>
      {/* Type */}
      <td className="px-4 py-3.5">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${colorClass}`}>
          {customer.customer_type}
        </span>
      </td>
      {/* Phone */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {customer.phone ? (
            <><Phone className="w-3 h-3 text-muted-foreground/60 shrink-0" />{customer.phone}</>
          ) : <span className="text-muted-foreground/40">—</span>}
        </div>
      </td>
      {/* Email */}
      <td className="px-4 py-3.5 max-w-[180px]">
        <p className="text-[12px] text-muted-foreground truncate">{customer.email || <span className="text-muted-foreground/40">—</span>}</p>
      </td>
      {/* LINE */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          {customer.line_id ? (
            <><MessageCircle className="w-3 h-3 text-green-400 shrink-0" />{customer.line_id}</>
          ) : <span className="text-muted-foreground/40">—</span>}
        </div>
      </td>
      {/* Actions */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onNewLead() }}
            className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/8 hover:bg-primary/15 px-2 py-1 rounded-md transition-colors"
          >
            <Plus className="w-3 h-3" /> New Lead
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        </div>
      </td>
    </tr>
  )
}

// ── Customer card (stacked list, replaces the table < sm) ──────────────────────
function CustomerCard({
  customer, onClick, onNewLead,
}: { customer: Customer; onClick: () => void; onNewLead: () => void }) {
  const colorClass = typeColors[customer.customer_type] ?? 'bg-muted text-foreground/80 border-border'
  return (
    <div
      className="flex items-start gap-3 border-b border-border/50 px-4 py-3.5 active:bg-muted transition-colors"
      onClick={onClick}
    >
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-[11px] font-bold shrink-0 mt-0.5">
        {customer.company_name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-semibold text-foreground leading-snug">{customer.company_name}</p>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${colorClass}`}>
            {customer.customer_type}
          </span>
        </div>
        {customer.contact_person && (
          <p className="text-[12px] text-muted-foreground mt-0.5">{customer.contact_person}</p>
        )}
        <div className="mt-2 space-y-1">
          {customer.phone && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Phone className="w-3 h-3 text-muted-foreground/60 shrink-0" /><span className="truncate">{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Mail className="w-3 h-3 text-muted-foreground/60 shrink-0" /><span className="truncate">{customer.email}</span>
            </div>
          )}
          {customer.line_id && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MessageCircle className="w-3 h-3 text-green-400 shrink-0" /><span className="truncate">{customer.line_id}</span>
            </div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onNewLead() }}
          className="mt-2.5 flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/8 hover:bg-primary/15 px-2.5 py-1 rounded-md transition-colors"
        >
          <Plus className="w-3 h-3" /> New Lead
        </button>
      </div>
    </div>
  )
}

// ── Add customer form ─────────────────────────────────────────────────────────
function AddCustomerForm({ onClose }: { onClose: () => void }) {
  const { addCustomer, customers } = useCRMStore()
  const existingCompanyNames = customers.map((c) => c.company_name)
  const [form, setForm] = useState({
    company_name: '', contact_person: '', phone: '', email: '',
    line_id: '', social: '', customer_type: 'brand' as CustomerType, notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name.trim()) return
    const now = new Date().toISOString()
    await addCustomer({
      customer_id: `cust-${Date.now()}`,
      ...form,
      created_at: now,
      updated_at: now,
    })
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[500px] max-w-[90vw] sm:max-w-[500px] top-[6vh] translate-y-0 p-0 gap-0 max-h-[88vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-[15px] font-semibold text-foreground">New Customer</DialogTitle>
          <p className="text-[12px] text-muted-foreground mt-0.5">Add a company or individual to your database</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <Label className="field-label">Company / Customer Name *</Label>
            <CompanyCombobox
              value={form.company_name}
              onChange={(v) => setForm({ ...form, company_name: v })}
              existingNames={existingCompanyNames}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="field-label">Contact Person</Label>
            <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="h-9 text-sm" placeholder="e.g. Khun Pim" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="field-label">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-9 text-sm" placeholder="08x-xxx-xxxx" />
            </div>
            <div className="space-y-1.5">
              <Label className="field-label">Customer Type</Label>
              <Select value={form.customer_type} onValueChange={(v) => v && setForm({ ...form, customer_type: v as CustomerType })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="field-label">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="field-label">LINE ID</Label>
              <Input value={form.line_id} onChange={(e) => setForm({ ...form, line_id: e.target.value })} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="field-label">Social (IG/FB)</Label>
              <Input value={form.social} onChange={(e) => setForm({ ...form, social: e.target.value })} className="h-9 text-sm" placeholder="@handle" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="field-label">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="text-sm resize-none" rows={3} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-sm font-semibold">Add Customer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Customer detail drawer ────────────────────────────────────────────────────
function CustomerDetail({ customerId, onClose }: { customerId: string; onClose: () => void }) {
  const { updateCustomer, deleteCustomer, leadOpportunities, wonJobs, customers } = useCRMStore()
  const isMobile = useIsMobile()
  const [creatingLead, setCreatingLead] = useState(false)
  const [openAccount, setOpenAccount] = useState(false)
  // Expand Activity & History by default on mobile for better discoverability
  const [openActivity, setOpenActivity] = useState(isMobile)
  const [openHistory, setOpenHistory] = useState(isMobile)

  const customerMaybe = customers.find((c) => c.customer_id === customerId)
  if (!customerMaybe) return null
  const customer = customerMaybe  // const — TS carries Customer type into closures
  const existingCompanyNames = customers
    .map((c) => c.company_name)
    .filter((n) => n !== customer.company_name)
  const linkedLeads = leadOpportunities.filter((l) => l.customer_id === customer.customer_id)
  const linkedWonJobs = wonJobs.filter((j) => j.customer_id === customer.customer_id)

  function formatCurrency(v: number) {
    if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `฿${(v / 1_000).toFixed(0)}K`
    return `฿${v.toLocaleString()}`
  }

  function isEmailUnique(email: string, excludeCustomerId?: string): boolean {
    if (!email.trim()) return true // Empty email is always valid
    return !customers.some(
      (c) =>
        c.email.toLowerCase() === email.toLowerCase() &&
        c.customer_id !== excludeCustomerId
    )
  }

  async function handleDeleteCustomer() {
    if (
      window.confirm(
        `Are you sure you want to delete "${customer.company_name}"? This action cannot be undone. Associated leads and won jobs will remain but the customer reference will be cleared.`
      )
    ) {
      await deleteCustomer(customer.customer_id)
      onClose()
    }
  }

  return (
    <>
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="!w-[95vw] sm:!w-[95vw] md:!w-[900px] lg:!w-[1000px] !max-w-none sm:!max-w-none !max-h-[96dvh] sm:!max-h-[88vh] !top-[2vh] sm:!top-[4vh] !translate-y-0 !p-0 !gap-0 !overflow-hidden !flex !flex-col">

        {/* Header */}
        <div className="px-4 sm:px-7 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b shrink-0">
          <div className="flex flex-col sm:flex-row items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
              {customer.company_name.charAt(0).toUpperCase()}
            </div>

            {/* Names section */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-[15px] font-semibold text-foreground leading-tight break-words">{customer.company_name}</DialogTitle>
              {customer.contact_person && <p className="text-[12px] text-muted-foreground mt-1 break-words">{customer.contact_person}</p>}

              {/* Buttons on mobile - below names */}
              <div className="flex items-center gap-2 mt-3 sm:hidden flex-wrap">
                <StatusBadge status={customer.customer_type} />
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={() => setCreatingLead(true)}>
                  <Plus className="w-3 h-3" /> New Lead
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs border-red-200/60 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20" onClick={handleDeleteCustomer}>
                  <Trash2 className="w-3 h-3" /> Delete
                </Button>
              </div>
            </div>

            {/* Buttons on desktop - inline */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <StatusBadge status={customer.customer_type} />
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs border-primary/30 text-primary hover:bg-primary/5" onClick={() => setCreatingLead(true)}>
                <Plus className="w-3 h-3" /> New Lead
              </Button>
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs border-red-200/60 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/20" onClick={handleDeleteCustomer}>
                <Trash2 className="w-3 h-3" /> Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Two-column body (desktop only) */}
        <div className="hidden sm:flex flex-col sm:flex-row flex-1 overflow-hidden">

          {/* Left: Customer details */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-4 sm:py-5 space-y-4 sm:space-y-5 border-b sm:border-b-0 sm:border-r border-border/60">

            {/* Company name edit */}
            <div>
              <p className="field-label mb-2">Company Name</p>
              <CompanyCombobox
                value={customer.company_name}
                onChange={(v) => updateCustomer(customer.customer_id, { company_name: v })}
                existingNames={existingCompanyNames}
                placeholder="Company name…"
              />
            </div>

            <Separator />

            {/* Contact person edit */}
            <div>
              <p className="field-label mb-2">Contact Person</p>
              <InlineEdit value={customer.contact_person} placeholder="Name of contact" onSave={(v) => updateCustomer(customer.customer_id, { contact_person: v })} />
            </div>

            <Separator />

            {/* Contact info */}
            <div className="space-y-3">
              <p className="field-label mb-2">Contact Details</p>
              <div className="space-y-2.5">
                <div>
                  <label className="field-label mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground/60" /> Email
                  </label>
                  <InlineEdit
                    value={customer.email}
                    placeholder="email@example.com"
                    onSave={(v) => {
                      if (v && !isEmailUnique(v, customer.customer_id)) {
                        alert('This email is already in use by another customer.')
                        return
                      }
                      updateCustomer(customer.customer_id, { email: v })
                    }}
                  />
                </div>
                <div>
                  <label className="field-label mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground/60" /> Phone
                  </label>
                  <InlineEdit
                    value={customer.phone}
                    placeholder="08x-xxx-xxxx"
                    onSave={(v) => updateCustomer(customer.customer_id, { phone: v })}
                  />
                </div>
                <div>
                  <label className="field-label mb-1.5 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-green-400" /> LINE ID
                  </label>
                  <InlineEdit
                    value={customer.line_id ?? ''}
                    placeholder="LINE ID"
                    onSave={(v) => updateCustomer(customer.customer_id, { line_id: v })}
                  />
                </div>
                <div>
                  <label className="field-label mb-1.5 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-muted-foreground/60" /> Social (IG/FB)
                  </label>
                  <InlineEdit
                    value={customer.social ?? ''}
                    placeholder="@handle"
                    onSave={(v) => updateCustomer(customer.customer_id, { social: v })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer type edit */}
            <div>
              <p className="field-label mb-2">Customer Type</p>
              <div className="space-y-1.5">
                <Select value={customer.customer_type} onValueChange={(v) => updateCustomer(customer.customer_id, { customer_type: v as CustomerType })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Meta */}
            <div>
              <p className="field-label">Created</p>
              <p className="text-[13px] text-foreground">{parseDbDate(customer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <p className="field-label mb-2">Notes</p>
              <InlineEdit value={customer.notes} placeholder="Click to add notes…" multiline onSave={(v) => updateCustomer(customer.customer_id, { notes: v })} />
            </div>

            {/* Customer Insights — shared, shows on Lead + Won cards too */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10 p-3">
              <p className="field-label mb-2 text-amber-700 dark:text-amber-300">Customer Insights ⭐</p>
              <InlineEdit value={customer.customer_insights ?? ''} placeholder="Add an insight that follows this customer across Leads & Won jobs…" multiline onSave={(v) => updateCustomer(customer.customer_id, { customer_insights: v })} />
            </div>

            <Separator />

            {/* Company Account */}
            <div className="rounded-xl border border-amber-200/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenAccount((o) => !o)}
                className="w-full bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5 flex items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left"
              >
                <div className="w-5 h-5 rounded-md bg-amber-100/60 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <CreditCard className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300 tracking-wide flex-1">Company Account</span>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${openAccount ? 'rotate-0' : '-rotate-90'}`} />
              </button>
              {openAccount && (
                <div className="bg-background px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="field-label">Tax ID (เลขประจำตัวผู้เสียภาษี)</p>
                      <InlineEdit value={customer.tax_id ?? ''} placeholder="0105xxx" onSave={(v) => updateCustomer(customer.customer_id, { tax_id: v })} />
                    </div>
                    <div>
                      <p className="field-label">Branch</p>
                      <InlineEdit value={customer.branch ?? ''} placeholder="สาขา / สำนักงานใหญ่" onSave={(v) => updateCustomer(customer.customer_id, { branch: v })} />
                    </div>
                  </div>
                  <div>
                    <p className="field-label">Company Address</p>
                    <InlineEdit value={customer.company_address ?? ''} placeholder="ที่อยู่บริษัท" multiline onSave={(v) => updateCustomer(customer.customer_id, { company_address: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="field-label">Billing Contact</p>
                      <InlineEdit value={customer.billing_contact ?? ''} placeholder="ผู้ติดต่อด้านบัญชี" onSave={(v) => updateCustomer(customer.customer_id, { billing_contact: v })} />
                    </div>
                    <div>
                      <p className="field-label">Billing Notes</p>
                      <InlineEdit value={customer.billing_notes ?? ''} placeholder="หมายเหตุการวางบิล" onSave={(v) => updateCustomer(customer.customer_id, { billing_notes: v })} />
                    </div>
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
                      <p className="field-label">Bank Name</p>
                      <InlineEdit value={customer.bank_name ?? ''} placeholder="SCB / KBANK / BBL" onSave={(v) => updateCustomer(customer.customer_id, { bank_name: v })} />
                    </div>
                    <div>
                      <p className="field-label">Bank Branch</p>
                      <InlineEdit value={customer.bank_branch ?? ''} placeholder="สาขา" onSave={(v) => updateCustomer(customer.customer_id, { bank_branch: v })} />
                    </div>
                  </div>
                  <div>
                    <p className="field-label">Account Number</p>
                    <InlineEdit value={customer.bank_account_number ?? ''} placeholder="เลขบัญชี" onSave={(v) => updateCustomer(customer.customer_id, { bank_account_number: v })} />
                  </div>
                  <div>
                    <p className="field-label">Account Name</p>
                    <InlineEdit value={customer.bank_account_name ?? ''} placeholder="ชื่อบัญชี" onSave={(v) => updateCustomer(customer.customer_id, { bank_account_name: v })} />
                  </div>
                </div>
              )}
            </div>

            {/* Linked leads */}
            {linkedLeads.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="field-label mb-3">Leads &amp; Opportunities ({linkedLeads.length})</p>
                  <div className="space-y-2">
                    {linkedLeads.map((l) => (
                      <div key={l.lead_op_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/60">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground">{l.name}</p>
                          <p className="text-[11px] text-muted-foreground">{l.service_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[13px] font-bold text-foreground">฿{(l.estimated_value || 0).toLocaleString()}</p>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${l.status === 'won' ? 'bg-emerald-50 text-emerald-600' : l.status === 'lost' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                            {l.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Linked Won Jobs */}
            {linkedWonJobs.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="field-label mb-3">Won Jobs ({linkedWonJobs.length})</p>
                  <div className="space-y-2">
                    {linkedWonJobs.map((j) => (
                      <div key={j.job_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/60">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">{j.event_display_name || `Job #${j.job_number}`}</p>
                            <p className="text-[11px] text-muted-foreground">{j.event_date?.replace(/-/g, '.') || '—'}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-[13px] font-bold text-foreground">{formatCurrency(j.estimated_value || 0)}</p>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                            {j.op_stage.replace(/_/g, ' ').toLowerCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right: Activity + History (desktop only) */}
          <div className="hidden sm:flex flex-col w-[320px] shrink-0 overflow-y-auto px-5 py-5 space-y-5 bg-muted/30">
            {/* Log Activity */}
            <div>
              <p className="field-label mb-3">Log Activity</p>
              <AddActivityForm entityType="customer" entityId={customer.customer_id} owner="Vitta" entityName={customer.company_name} />
            </div>

            <Separator />

            {/* History */}
            <div>
              <p className="field-label mb-3">History</p>
              <ActivityTimeline entityType="customer" entityId={customer.customer_id} entityName={customer.company_name} />
            </div>
          </div>
        </div>

        {/* Mobile: Trello-style single-scroll card with sticky comment bar */}
        <MobileCardView entityType="customer" entityId={customer.customer_id} owner="Vitta" entityName={customer.company_name}>
                <div className="px-4 py-4 space-y-4">
                  {/* Company name edit */}
                  <div>
                    <p className="field-label mb-2">Company Name</p>
                    <CompanyCombobox
                      value={customer.company_name}
                      onChange={(v) => updateCustomer(customer.customer_id, { company_name: v })}
                      existingNames={existingCompanyNames}
                      placeholder="Company name…"
                    />
                  </div>

                  <Separator />

                  {/* Contact person edit */}
                  <div>
                    <p className="field-label mb-2">Contact Person</p>
                    <InlineEdit value={customer.contact_person} placeholder="Name of contact" onSave={(v) => updateCustomer(customer.customer_id, { contact_person: v })} />
                  </div>

                  <Separator />

                  {/* Contact info */}
                  <div className="space-y-3">
                    <p className="field-label mb-2">Contact Details</p>
                    <div className="space-y-2.5">
                      <div>
                        <label className="field-label mb-1.5 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground/60" /> Email
                        </label>
                        <InlineEdit
                          value={customer.email}
                          placeholder="email@example.com"
                          onSave={(v) => {
                            if (v && !isEmailUnique(v, customer.customer_id)) {
                              alert('This email is already in use by another customer.')
                              return
                            }
                            updateCustomer(customer.customer_id, { email: v })
                          }}
                        />
                      </div>
                      <div>
                        <label className="field-label mb-1.5 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground/60" /> Phone
                        </label>
                        <InlineEdit
                          value={customer.phone}
                          placeholder="08x-xxx-xxxx"
                          onSave={(v) => updateCustomer(customer.customer_id, { phone: v })}
                        />
                      </div>
                      <div>
                        <label className="field-label mb-1.5 flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-green-400" /> LINE ID
                        </label>
                        <InlineEdit
                          value={customer.line_id ?? ''}
                          placeholder="LINE ID"
                          onSave={(v) => updateCustomer(customer.customer_id, { line_id: v })}
                        />
                      </div>
                      <div>
                        <label className="field-label mb-1.5 flex items-center gap-1.5">
                          <AtSign className="w-3.5 h-3.5 text-muted-foreground/60" /> Social (IG/FB)
                        </label>
                        <InlineEdit
                          value={customer.social ?? ''}
                          placeholder="@handle"
                          onSave={(v) => updateCustomer(customer.customer_id, { social: v })}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Customer type edit */}
                  <div>
                    <p className="field-label mb-2">Customer Type</p>
                    <div className="space-y-1.5">
                      <Select value={customer.customer_type} onValueChange={(v) => updateCustomer(customer.customer_id, { customer_type: v as CustomerType })}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* Meta */}
                  <div>
                    <p className="field-label">Created</p>
                    <p className="text-[13px] text-foreground">{parseDbDate(customer.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>

                  <Separator />

                  {/* Notes */}
                  <div>
                    <p className="field-label mb-2">Notes</p>
                    <InlineEdit value={customer.notes} placeholder="Click to add notes…" multiline onSave={(v) => updateCustomer(customer.customer_id, { notes: v })} />
                  </div>

                  {/* Customer Insights — shared, shows on Lead + Won cards too */}
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10 p-3">
                    <p className="field-label mb-2 text-amber-700 dark:text-amber-300">Customer Insights ⭐</p>
                    <InlineEdit value={customer.customer_insights ?? ''} placeholder="Add an insight that follows this customer across Leads & Won jobs…" multiline onSave={(v) => updateCustomer(customer.customer_id, { customer_insights: v })} />
                  </div>

                  <Separator />

                  {/* Company Account */}
                  <div className="rounded-xl border border-amber-200/60 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpenAccount((o) => !o)}
                      className="w-full bg-amber-50/50 dark:bg-amber-950/20 px-4 py-2.5 flex items-center gap-2 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-md bg-amber-100/60 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <CreditCard className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span className="text-[12px] font-bold text-amber-700 dark:text-amber-300 tracking-wide flex-1">Company Account</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${openAccount ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    {openAccount && (
                      <div className="bg-background px-4 py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="field-label">Tax ID (เลขประจำตัวผู้เสียภาษี)</p>
                            <InlineEdit value={customer.tax_id ?? ''} placeholder="0105xxx" onSave={(v) => updateCustomer(customer.customer_id, { tax_id: v })} />
                          </div>
                          <div>
                            <p className="field-label">Branch</p>
                            <InlineEdit value={customer.branch ?? ''} placeholder="สาขา / สำนักงานใหญ่" onSave={(v) => updateCustomer(customer.customer_id, { branch: v })} />
                          </div>
                        </div>
                        <div>
                          <p className="field-label">Company Address</p>
                          <InlineEdit value={customer.company_address ?? ''} placeholder="ที่อยู่บริษัท" multiline onSave={(v) => updateCustomer(customer.customer_id, { company_address: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="field-label">Billing Contact</p>
                            <InlineEdit value={customer.billing_contact ?? ''} placeholder="ผู้ติดต่อด้านบัญชี" onSave={(v) => updateCustomer(customer.customer_id, { billing_contact: v })} />
                          </div>
                          <div>
                            <p className="field-label">Billing Notes</p>
                            <InlineEdit value={customer.billing_notes ?? ''} placeholder="หมายเหตุการวางบิล" onSave={(v) => updateCustomer(customer.customer_id, { billing_notes: v })} />
                          </div>
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
                            <p className="field-label">Bank Name</p>
                            <InlineEdit value={customer.bank_name ?? ''} placeholder="SCB / KBANK / BBL" onSave={(v) => updateCustomer(customer.customer_id, { bank_name: v })} />
                          </div>
                          <div>
                            <p className="field-label">Bank Branch</p>
                            <InlineEdit value={customer.bank_branch ?? ''} placeholder="สาขา" onSave={(v) => updateCustomer(customer.customer_id, { bank_branch: v })} />
                          </div>
                        </div>
                        <div>
                          <p className="field-label">Account Number</p>
                          <InlineEdit value={customer.bank_account_number ?? ''} placeholder="เลขบัญชี" onSave={(v) => updateCustomer(customer.customer_id, { bank_account_number: v })} />
                        </div>
                        <div>
                          <p className="field-label">Account Name</p>
                          <InlineEdit value={customer.bank_account_name ?? ''} placeholder="ชื่อบัญชี" onSave={(v) => updateCustomer(customer.customer_id, { bank_account_name: v })} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Linked leads */}
                  {linkedLeads.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="field-label mb-3">Leads &amp; Opportunities ({linkedLeads.length})</p>
                        <div className="space-y-2">
                          {linkedLeads.map((l) => (
                            <div key={l.lead_op_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/60">
                              <div>
                                <p className="text-[13px] font-semibold text-foreground">{l.name}</p>
                                <p className="text-[11px] text-muted-foreground">{l.service_type}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[13px] font-bold text-foreground">฿{(l.estimated_value || 0).toLocaleString()}</p>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${l.status === 'won' ? 'bg-emerald-50 text-emerald-600' : l.status === 'lost' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}>
                                  {l.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Linked Won Jobs */}
                  {linkedWonJobs.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="field-label mb-3">Won Jobs ({linkedWonJobs.length})</p>
                        <div className="space-y-2">
                          {linkedWonJobs.map((j) => (
                            <div key={j.job_id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/60">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                                <div>
                                  <p className="text-[13px] font-semibold text-foreground">{j.event_display_name || `Job #${j.job_number}`}</p>
                                  <p className="text-[11px] text-muted-foreground">{j.event_date?.replace(/-/g, '.') || '—'}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-[13px] font-bold text-foreground">{formatCurrency(j.estimated_value || 0)}</p>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                  {j.op_stage.replace(/_/g, ' ').toLowerCase()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
        </MobileCardView>
      </DialogContent>
    </Dialog>

    {creatingLead && (
      <AddLeadOpForm
        onClose={() => setCreatingLead(false)}
        initialCustomerId={customer.customer_id}
        initialCompanyName={customer.company_name}
        initialContactPerson={customer.contact_person}
      />
    )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const isHydrated = useHydrated()
  const router = useRouter()
  const { customers } = useCRMStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Open a specific customer from a notification deep-link (?open=<customer_id>).
  useOpenDeepLink(
    isHydrated && customers.length > 0,
    (id) => customers.some((c) => c.customer_id === id),
    setSelectedId,
  )
  const [creating, setCreating] = useState(false)
  const [newLeadCustomer, setNewLeadCustomer] = useState<Customer | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter])

  // Don't render until hydration completes to prevent SSR/client mismatch
  if (!isHydrated) return null

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase()
    const matchSearch =
      c.company_name.toLowerCase().includes(q) ||
      c.contact_person.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    const matchType = typeFilter === 'all' || c.customer_type === typeFilter
    return matchSearch && matchType
  })

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedItems = filtered.slice(startIdx, startIdx + itemsPerPage)

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <MobileMenuButton />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight truncate">Customers</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block truncate">{customers.length} records in your database</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs sm:text-sm" onClick={() => router.push('/import')}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Import</span>
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-xs sm:text-sm font-semibold" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Customer</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 border-b bg-background flex items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search company, contact, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[12px] bg-muted border-border"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
          <SelectTrigger className="w-[140px] h-8 text-[12px] bg-muted border-border">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {CUSTOMER_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize text-[12px]">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground ml-auto">{filtered.length} of {customers.length}</p>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            search || typeFilter !== 'all'
              ? <EmptyState icon={Search} title="No customers match" description="Try adjusting your search or filter." />
              : <EmptyState icon={Users} title="No customers yet" description="Add your first customer to start building your database." action={{ label: '+ Add Customer', onClick: () => setCreating(true) }} />
          ) : (
            <>
            {/* Mobile: stacked cards */}
            <div className="sm:hidden">
              {paginatedItems.map((c) => (
                <CustomerCard
                  key={c.customer_id}
                  customer={c}
                  onClick={() => setSelectedId(c.customer_id)}
                  onNewLead={() => setNewLeadCustomer(c)}
                />
              ))}
            </div>
            {/* Desktop: table */}
            <table className="hidden sm:table w-full">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border/60 bg-muted/50 backdrop-blur-sm">
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">LINE ID</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map((c) => (
                  <CustomerRow
                    key={c.customer_id}
                    customer={c}
                    onClick={() => setSelectedId(c.customer_id)}
                    onNewLead={() => setNewLeadCustomer(c)}
                  />
                ))}
              </tbody>
            </table>
            </>
          )}
        </div>

        {/* Pagination controls */}
        {filtered.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between text-xs shrink-0">
            <p className="text-muted-foreground">
              Showing {startIdx + 1}–{Math.min(startIdx + itemsPerPage, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-7 px-2.5 text-xs"
              >
                ← Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = currentPage <= 3
                    ? i + 1
                    : currentPage >= totalPages - 2
                    ? totalPages - 4 + i
                    : currentPage - 2 + i
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      onClick={() => setCurrentPage(pageNum)}
                      className="h-7 w-7 p-0 text-xs"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-7 px-2.5 text-xs"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedId && <CustomerDetail customerId={selectedId} onClose={() => setSelectedId(null)} />}
      {creating && <AddCustomerForm onClose={() => setCreating(false)} />}
      {newLeadCustomer && (
        <AddLeadOpForm
          onClose={() => setNewLeadCustomer(null)}
          initialCustomerId={newLeadCustomer.customer_id}
          initialCompanyName={newLeadCustomer.company_name}
          initialContactPerson={newLeadCustomer.contact_person}
        />
      )}
    </div>
  )
}
