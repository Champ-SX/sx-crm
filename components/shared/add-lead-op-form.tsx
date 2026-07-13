'use client'

import { useState, useRef, useEffect } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2, Plus, ChevronDown } from 'lucide-react'
import { OwnerSelectItems } from '@/components/shared/owner-select-items'
import type { LeadOpportunity, Customer } from '@/types'

const SERVICES = ['CAP*TURES', 'Andy & Fine', 'SX Event', 'Booth Rental', 'Custom Activation', 'Other']

interface AddLeadOpFormProps {
  onClose: () => void
  onCreated?: (lop: LeadOpportunity) => void
  initialCustomerId?: string
  initialCompanyName?: string
  initialContactPerson?: string
}

// ── Company combobox ──────────────────────────────────────────────────────────
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

  useEffect(() => { setQuery(value) }, [value])

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
          className="h-9 text-sm pl-8"
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
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

// ── Main form component ───────────────────────────────────────────────────────
export function AddLeadOpForm({
  onClose,
  onCreated,
  initialCustomerId,
  initialCompanyName = '',
  initialContactPerson = '',
}: AddLeadOpFormProps) {
  const { addLeadOpportunity, addCustomer, customers } = useCRMStore()
  const { user } = useAuth()
  // Default owner to the signed-in user; still editable via the Select below.
  const defaultOwner = user?.user_metadata?.full_name ?? user?.email ?? ''

  const existingCompanyNames = Array.from(new Set(customers.map((c) => c.company_name)))

  // Determine initial customer_id: use provided or find by company+contact match
  function resolveInitialCustomerId(): string | undefined {
    if (initialCustomerId) return initialCustomerId
    if (initialCompanyName) {
      const match = customers.find(
        (c) => c.company_name === initialCompanyName &&
          (!initialContactPerson || c.contact_person === initialContactPerson)
      )
      return match?.customer_id
    }
    return undefined
  }

  const [form, setForm] = useState({
    name: '',
    company_name: initialCompanyName,
    contact_person: initialContactPerson,
    service_type: 'CAP*TURES',
    event_date: '',
    venue: '',
    estimated_value: '',
    owner: defaultOwner,
    notes: '',
  })

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(resolveInitialCustomerId)
  const [contactDropdownOpen, setContactDropdownOpen] = useState(false)
  const [showNewContactFields, setShowNewContactFields] = useState(false)
  const [newContactName, setNewContactName] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const contactWrapRef = useRef<HTMLDivElement>(null)

  // Contacts that match the selected company
  const matchingContacts = customers.filter((c) => c.company_name === form.company_name)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (contactWrapRef.current && !contactWrapRef.current.contains(e.target as Node)) {
        setContactDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // When company changes, reset contact
  function handleCompanyChange(v: string) {
    setForm((f) => ({ ...f, company_name: v, contact_person: '' }))
    setSelectedCustomerId(undefined)
    setShowNewContactFields(false)
    // Auto-select customer_id if exact company match with one contact
    const matches = customers.filter((c) => c.company_name === v)
    if (matches.length === 1) {
      setSelectedCustomerId(matches[0].customer_id)
      setForm((f) => ({ ...f, company_name: v, contact_person: matches[0].contact_person }))
    }
  }

  function selectContact(customer: Customer) {
    setSelectedCustomerId(customer.customer_id)
    setForm((f) => ({ ...f, contact_person: customer.contact_person }))
    setShowNewContactFields(false)
    setContactDropdownOpen(false)
  }

  function handleAddNewContact() {
    setShowNewContactFields(true)
    setContactDropdownOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    // If new contact panel is open but name is blank, block submit
    if (showNewContactFields && !newContactName.trim()) return

    let finalCustomerId = selectedCustomerId
    let finalContactPerson = form.contact_person

    // If "new contact" was chosen and fields filled, create the customer
    if (showNewContactFields && newContactName.trim()) {
      const now = new Date().toISOString()
      const newCust: Customer = {
        customer_id: `cust-${Date.now()}`,
        company_name: form.company_name,
        contact_person: newContactName.trim(),
        phone: newContactPhone.trim(),
        email: '',
        customer_type: 'brand',
        notes: '',
        created_at: now,
        updated_at: now,
      }
      addCustomer(newCust)
      finalCustomerId = newCust.customer_id
      finalContactPerson = newCust.contact_person
    }

    const now = new Date().toISOString()
    const lop: LeadOpportunity = {
      lead_op_id: `lop-${Date.now()}`,
      name: form.name,
      customer_id: finalCustomerId,
      customer_name: form.company_name || finalContactPerson,
      contact_person: finalContactPerson,
      service_type: form.service_type,
      event_date: form.event_date || undefined,
      venue: form.venue || undefined,
      estimated_value: parseFloat(form.estimated_value) || 0,
      owner: form.owner,
      notes: form.notes,
      status: 'open',
      created_at: now,
      updated_at: now,
    }
    // Wait for the lead to be added to the store before closing the form
    await addLeadOpportunity(lop)
    onCreated?.(lop)
    onClose()
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[520px] max-w-[90vw] sm:max-w-[520px] top-[5vh] translate-y-0 p-0 gap-0 max-h-[88vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-[15px] font-semibold text-foreground">New Lead / Opportunity</DialogTitle>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Lead name */}
          <div className="space-y-1">
            <Label className="text-xs">Lead / Opportunity Name *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-9 text-sm"
              placeholder="e.g. Sephora Annual Campaign 2026"
            />
          </div>

          {/* Company combobox */}
          <div className="space-y-1">
            <Label className="text-xs">Company / Customer</Label>
            <CompanyCombobox
              value={form.company_name}
              onChange={handleCompanyChange}
              existingNames={existingCompanyNames}
            />
          </div>

          {/* Contact Person dropdown */}
          <div className="space-y-1" ref={contactWrapRef}>
            <Label className="text-xs">Contact Person</Label>
            {!showNewContactFields ? (
              <div className="relative">
                <button
                  type="button"
                  className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background flex items-center justify-between hover:bg-muted/30 transition-colors"
                  onClick={() => setContactDropdownOpen((o) => !o)}
                >
                  <span className={form.contact_person ? 'text-foreground' : 'text-muted-foreground'}>
                    {form.contact_person || 'Select or add contact…'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
                {contactDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                    {matchingContacts.length > 0 && (
                      <>
                        <p className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
                          Existing contacts
                        </p>
                        <ul className="max-h-40 overflow-y-auto">
                          {matchingContacts.map((c) => (
                            <li
                              key={c.customer_id}
                              onMouseDown={() => selectContact(c)}
                              className="px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                              {c.contact_person}
                              {c.phone && <span className="text-xs text-muted-foreground ml-2">{c.phone}</span>}
                            </li>
                          ))}
                        </ul>
                        <div className="border-t" />
                      </>
                    )}
                    <div
                      onMouseDown={handleAddNewContact}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50 transition-colors text-primary"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add as new contact
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground">New contact</p>
                <Input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Contact name *"
                />
                <Input
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="h-9 text-sm"
                  placeholder="Phone number"
                />
                <button
                  type="button"
                  onClick={() => setShowNewContactFields(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Service + Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Service / Product</Label>
              <Select value={form.service_type} onValueChange={(v) => v && setForm({ ...form, service_type: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Owner</Label>
              <Select value={form.owner} onValueChange={(v) => v && setForm({ ...form, owner: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><OwnerSelectItems /></SelectContent>
              </Select>
            </div>
          </div>

          {/* Event date + value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Event Date</Label>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estimated Value (฿)</Label>
              <Input
                type="number"
                value={form.estimated_value}
                onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                className="h-9 text-sm"
                placeholder="0"
              />
            </div>
          </div>

          {/* Venue */}
          <div className="space-y-1">
            <Label className="text-xs">Venue</Label>
            <Input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="h-9 text-sm"
              placeholder="e.g. EastinGrand Sathorn"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-9 text-sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 h-9 text-sm">Add</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
