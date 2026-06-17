'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { EmptyState } from '@/components/shared/empty-state'
import { CreateQuotationModal } from '@/components/shared/create-quotation-modal'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { LinkifyText } from '@/components/shared/linkify-text'
import { MobileCardView } from '@/components/shared/mobile-card-view'
import { OwnerSelectItems } from '@/components/shared/owner-select-items'
import { AddLeadOpForm } from '@/components/shared/add-lead-op-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { LeadOpportunity, LeadOpStatus } from '@/types'
import {
  Search, Plus,
  ChevronRight, Trophy, XCircle, Calendar, MapPin,
  Pencil, Check, X, FileText, Send, Trash2,
  CreditCard, ChevronDown, Banknote, Phone, Mail, MessageCircle,
} from 'lucide-react'
import { format } from 'date-fns'

const SERVICES = ['CAP*TURES', 'Andy & Fine', 'SX Event', 'Booth Rental', 'Custom Activation', 'Other']

const statusConfig: Record<LeadOpStatus, { label: string; class: string }> = {
  open: { label: 'Open', class: 'bg-blue-50 text-blue-600 border-blue-200' },
  negotiating: { label: 'Negotiating', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  won: { label: 'Won', class: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  lost: { label: 'Lost', class: 'bg-red-50 text-red-500 border-red-200' },
}

const STATUS_ORDER: LeadOpStatus[] = ['open', 'negotiating', 'won', 'lost']

// ── Clickable status pill ───────────────────────────────────────────────────────
// The pill itself is the trigger: click → pick a status → it applies immediately.
// The parent's onSelect decides routing (Open/Negotiating persist directly;
// Won/Lost route through the confirm dialogs since they convert the lead).
function StatusPill({
  status,
  onSelect,
}: {
  status: LeadOpStatus
  onSelect: (next: LeadOpStatus) => void
}) {
  const cfg = statusConfig[status]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${cfg.class}`}
        aria-label={`Change status (current: ${cfg.label})`}
      >
        {cfg.label}
        <ChevronDown className="w-3 h-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[150px]">
        {STATUS_ORDER.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onSelect(s)}
            className="text-xs gap-2 cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full border ${statusConfig[s].class}`} />
            {statusConfig[s].label}
            {s === status && <Check className="w-3 h-3 ml-auto text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Inline edit ───────────────────────────────────────────────────────────────
function InlineEdit({
  value, onSave, multiline = false, placeholder = 'Click to edit…', formatDisplay,
}: {
  value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string
  formatDisplay?: (v: string) => string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function commit() { onSave(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }

  if (!editing) {
    const display = value ? (formatDisplay ? formatDisplay(value) : value) : placeholder
    return (
      <div className="group flex items-start gap-1 rounded px-2 py-1 -mx-2 hover:bg-muted/50">
        <div className={`flex-1 leading-relaxed select-text ${value ? 'field-value' : 'field-placeholder'}`} style={{ userSelect: 'text', pointerEvents: 'auto' }}>
          <LinkifyText text={display} />
        </div>
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="edit-affordance flex-shrink-0"
          title="Edit"
          type="button"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
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

// ── Date inline edit ───────────────────────────────────────────────────────────
function DateInlineEdit({
  value, onSave, placeholder = 'Click to add date…',
}: {
  value: string; onSave: (v: string) => void; placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function commit() { onSave(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }
  const displayValue = value ? format(new Date(value + 'T00:00:00'), 'EEEE, MMMM d, yyyy') : null

  if (!editing) {
    return (
      <div className="group flex items-start gap-1 rounded px-2 py-1 -mx-2 hover:bg-muted/50">
        <p className={`flex-1 leading-relaxed select-text ${value ? 'field-value' : 'field-placeholder'}`} style={{ userSelect: 'text', pointerEvents: 'auto' }}>{displayValue || placeholder}</p>
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="edit-affordance flex-shrink-0"
          title="Edit"
          type="button"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <input
        type="date"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="h-8 text-sm border border-input rounded px-2"
        onKeyDown={(e) => { if (e.key === 'Escape') cancel() }}
      />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={commit}><Check className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancel}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

// ── Table row ─────────────────────────────────────────────────────────────────
function LeadRow({
  item,
  onClick,
  isSelected = false,
  onToggleSelect,
}: {
  item: LeadOpportunity
  onClick: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
}) {
  const cfg = statusConfig[item.status]
  return (
    <tr className="border-b border-border/50 hover:bg-slate-50/70 cursor-pointer transition-colors group" onClick={onClick}>
      {/* Checkbox */}
      <td className="px-3 py-3.5 text-center w-10" onClick={(e) => { e.stopPropagation(); onToggleSelect?.(); }}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onToggleSelect?.()
          }}
          className="w-4 h-4 rounded cursor-pointer"
        />
      </td>
      {/* Name + contact */}
      <td className="px-6 py-3.5 min-w-[220px]">
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
          {item.estimated_value && item.estimated_value > 0 ? `฿ ${item.estimated_value.toLocaleString()}` : <span className="text-slate-300 font-normal">—</span>}
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

// ── Mobile card (stacked list, replaces the horizontal-scroll table < sm) ──────
function LeadCard({
  item,
  onClick,
  isSelected = false,
  onToggleSelect,
}: {
  item: LeadOpportunity
  onClick: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
}) {
  const cfg = statusConfig[item.status]
  return (
    <div
      className="flex items-start gap-3 border-b border-border/50 px-4 py-3.5 active:bg-slate-50 transition-colors"
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => { e.stopPropagation(); onToggleSelect?.() }}
        onClick={(e) => e.stopPropagation()}
        className="w-4 h-4 rounded cursor-pointer mt-0.5 shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[14px] font-semibold text-slate-800 leading-snug">{item.name}</p>
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.class}`}>{cfg.label}</span>
        </div>
        {item.contact_person && (
          <p className="text-[12px] text-slate-400 mt-0.5">{item.contact_person}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[12px] text-slate-600">
          <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-slate-500 text-[9px] font-bold shrink-0">
            {(item.customer_name || '?').charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{item.customer_name || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">{item.service_type}</span>
          <span className="text-[13px] font-bold text-slate-800">
            {item.estimated_value && item.estimated_value > 0 ? `฿ ${item.estimated_value.toLocaleString()}` : <span className="text-slate-300 font-normal">—</span>}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px] text-slate-400">
          <span>{item.event_date ? format(new Date(item.event_date + 'T00:00:00'), 'dd MMM yyyy') : '—'}</span>
          <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-slate-500">{item.owner}</span>
        </div>
      </div>
    </div>
  )
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function LeadDetail({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const router = useRouter()
  const { updateLeadOpportunity, deleteLeadOpportunity, markAsWon, markAsLost, leadOpportunities, customers, updateCustomer, addLeadOpportunity } = useCRMStore()
  const isMobile = useIsMobile()
  const [confirmWon, setConfirmWon] = useState(false)
  const [confirmLost, setConfirmLost] = useState(false)
  const [quotationOpen, setQuotationOpen] = useState(false)
  const [openAccount, setOpenAccount] = useState(false)
  // Expand Activity & History by default on mobile for better discoverability
  const [openActivity, setOpenActivity] = useState(isMobile)
  const [openHistory, setOpenHistory] = useState(isMobile)
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<LeadOpportunity | null>(null)

  const item = leadOpportunities.find((l) => l.lead_op_id === itemId)
  if (!item) return null

  // Initialize editData when entering edit mode
  if (isEditing && !editData) {
    setEditData({ ...item })
  }

  const linkedCustomer = item.customer_id ? customers.find((c) => c.customer_id === item.customer_id) : null
  const displayItem = isEditing && editData ? editData : item

  const handleFieldChange = (field: keyof LeadOpportunity, value: any) => {
    if (editData) {
      setEditData({ ...editData, [field]: value })
    }
  }

  const handleSaveEdit = async () => {
    if (editData) {
      await updateLeadOpportunity(editData.lead_op_id, editData)
      setIsEditing(false)
      setEditData(null)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditData(null)
  }

  const handleDelete = async () => {
    if (!item) return
    if (window.confirm(`Delete "${item.name}"?`)) {
      await deleteLeadOpportunity(item.lead_op_id)
      onClose()
    }
  }

  async function handleMarkWon() {
    if (!item) return
    await markAsWon(item.lead_op_id)
    setConfirmWon(false)
    onClose()
  }
  async function handleMarkLost() {
    if (!item) return
    await markAsLost(item.lead_op_id)
    setConfirmLost(false)
    onClose()
  }

  // Direct status change from the clickable pill.
  // Open/Negotiating persist immediately; Won/Lost route through the confirm
  // dialogs because markAsWon/markAsLost also convert the lead and close the drawer.
  function handleStatusSelect(next: LeadOpStatus) {
    if (!item || next === item.status) return
    if (next === 'won') { setConfirmWon(true); return }
    if (next === 'lost') { setConfirmLost(true); return }
    void updateLeadOpportunity(item.lead_op_id, { status: next })
  }

  async function handleDuplicate() {
    if (!item) return
    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newLead = {
      ...item,
      lead_op_id: newId,
      name: `${item.name} (copy)`,
      status: 'open' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await addLeadOpportunity(newLead)
    // Show the newly created duplicate
    setEditData(null)
    setIsEditing(false)
  }

  const cfg = statusConfig[item.status]

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="!fixed !top-0 !left-0 !-translate-x-0 !-translate-y-0 !w-screen !h-[100dvh] !max-w-none !grid-cols-1 !p-0 !gap-0 sm:!w-[85vw] sm:!h-auto sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2 md:!w-[82vw] !overflow-hidden !max-h-[100dvh] sm:!max-h-[88vh] !flex !flex-col !rounded-none sm:!rounded-lg">

          {/* ── Header ── */}
          <div className="px-4 sm:px-7 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b shrink-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
              {/* Lead name and metadata */}
              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <InlineEdit
                  value={item.name}
                  placeholder="Lead title"
                  onSave={(v) => updateLeadOpportunity(item.lead_op_id, { name: v })}
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {isEditing ? (
                    <Select value={editData?.status || 'open'} onValueChange={(v) => handleFieldChange('status', v as LeadOpStatus)}>
                      <SelectTrigger className="h-6 text-xs border-0 px-0 focus:ring-0 w-auto font-medium gap-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="negotiating">Negotiating</SelectItem>
                        <SelectItem value="won">Won</SelectItem>
                        <SelectItem value="lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusPill status={item.status} onSelect={handleStatusSelect} />
                  )}
                  {isEditing ? (
                    <Input
                      value={editData?.service_type || ''}
                      onChange={(e) => handleFieldChange('service_type', e.target.value)}
                      className="h-6 text-xs w-32"
                      placeholder="Service type"
                    />
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{item.service_type}</span>
                  )}
                </div>

                {/* Action buttons on mobile - below name and status */}
                <div className="flex items-center gap-3 mt-3 sm:hidden flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 gap-2 border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium"
                    onClick={() => setQuotationOpen(true)}
                  >
                    <Send className="w-4 h-4" /> Create Quotation
                  </Button>
                  {(item.status === 'open' || item.status === 'negotiating') && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        className="h-8 px-3 gap-2 text-xs"
                        onClick={() => setConfirmWon(true)}
                      >
                        <Trophy className="w-4 h-4" /> Won
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 px-3 gap-2 text-xs"
                        onClick={() => setConfirmLost(true)}
                      >
                        <XCircle className="w-4 h-4" /> Lost
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons on desktop - inline */}
              <div className="hidden sm:flex items-center gap-3 shrink-0 flex-wrap justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-10 px-4 gap-2 border-primary/30 text-primary hover:bg-primary/5 text-xs sm:text-sm min-w-[44px] font-medium"
                  onClick={() => setQuotationOpen(true)}
                >
                  <Send className="w-4 h-4" /> <span className="hidden md:inline">Create Quotation</span>
                </Button>
                {(item.status === 'open' || item.status === 'negotiating') && (
                  <>
                    <Button
                      size="sm"
                      variant="success"
                      className="h-10 px-4 gap-2 text-xs sm:text-sm min-w-[44px]"
                      onClick={() => setConfirmWon(true)}
                    >
                      <Trophy className="w-4 h-4" /> <span className="hidden sm:inline">Won</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-10 px-4 gap-2 text-xs sm:text-sm min-w-[44px]"
                      onClick={() => setConfirmLost(true)}
                    >
                      <XCircle className="w-4 h-4" /> <span className="hidden sm:inline">Lost</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Body: two columns (desktop only) ── */}
          <div className="hidden sm:flex flex-col sm:flex-row flex-1 overflow-hidden">

            {/* Left: Details */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-4 sm:py-5 space-y-5 border-b sm:border-b-0 sm:border-r">

              {/* Key info */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="field-label">Customer</p>
                  {isEditing ? (
                    <Input
                      value={editData?.customer_name || ''}
                      onChange={(e) => handleFieldChange('customer_name', e.target.value)}
                      placeholder="Customer name"
                      className="h-7 text-sm"
                    />
                  ) : (
                    <p className="field-value">{item.customer_name || '—'}</p>
                  )}
                </div>
                <div>
                  <p className="field-label">Contact</p>
                  {isEditing ? (
                    <Input
                      value={editData?.contact_person || ''}
                      onChange={(e) => handleFieldChange('contact_person', e.target.value)}
                      placeholder="Contact person"
                      className="h-7 text-sm"
                    />
                  ) : (
                    <p className="field-value">{item.contact_person || '—'}</p>
                  )}
                </div>
                <div>
                  <p className="field-label">Estimated Value</p>
                  <InlineEdit
                    value={item.estimated_value && item.estimated_value > 0 ? item.estimated_value.toString() : ''}
                    placeholder="0"
                    formatDisplay={(v) => `฿ ${(parseFloat(v) || 0).toLocaleString()}`}
                    onSave={(v) => updateLeadOpportunity(item.lead_op_id, { estimated_value: parseFloat(v) || 0 })}
                  />
                </div>
                <div>
                  <p className="field-label">Owner</p>
                  <Select value={item.owner} onValueChange={(v) => v && updateLeadOpportunity(item.lead_op_id, { owner: v })}>
                    <SelectTrigger className="h-7 text-sm border-0 px-0 focus:ring-0 w-auto gap-1 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <OwnerSelectItems />
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Details */}
              {linkedCustomer && (
                <button
                  type="button"
                  onClick={() => router.push(`/customers?selectedCustomerId=${linkedCustomer.customer_id}`)}
                  className="w-full text-left hover:bg-slate-50 rounded-lg p-3 transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">
                      {linkedCustomer.company_name}
                    </p>
                    {linkedCustomer.contact_person && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{linkedCustomer.contact_person}</p>
                    )}
                  </div>

                  <div className="space-y-2 mt-2">
                    {linkedCustomer.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-[12px] text-muted-foreground">{linkedCustomer.phone}</p>
                      </div>
                    )}

                    {linkedCustomer.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-[12px] text-muted-foreground break-all">{linkedCustomer.email}</p>
                      </div>
                    )}

                    {linkedCustomer.line_id && (
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                        <p className="text-[12px] text-muted-foreground">{linkedCustomer.line_id}</p>
                      </div>
                    )}
                  </div>
                </button>
              )}

              <Separator />

              {/* Event details */}
              <div className="space-y-2">
                <p className="field-label">Event Details</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {isEditing ? (
                      <input
                        type="date"
                        value={editData?.event_date || ''}
                        onChange={(e) => handleFieldChange('event_date', e.target.value)}
                        className="h-7 text-sm border border-input rounded px-2"
                      />
                    ) : (
                      <DateInlineEdit
                        value={item.event_date ?? ''}
                        placeholder="Add event date…"
                        onSave={(v) => updateLeadOpportunity(item.lead_op_id, { event_date: v })}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {isEditing ? (
                      <Input
                        value={editData?.venue || ''}
                        onChange={(e) => handleFieldChange('venue', e.target.value)}
                        placeholder="Add venue…"
                        className="h-7 text-sm"
                      />
                    ) : (
                      <InlineEdit
                        value={item.venue ?? ''}
                        placeholder="Add venue…"
                        onSave={(v) => updateLeadOpportunity(item.lead_op_id, { venue: v })}
                      />
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <p className="field-label">Notes</p>
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
                      <div className="bg-background px-4 py-4 space-y-4">
                        <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Changes here are saved to the Customer record and shared across all jobs.</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="field-label">Tax ID</p>
                            <InlineEdit value={linkedCustomer.tax_id ?? ''} placeholder="0105xxx" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { tax_id: v })} />
                          </div>
                          <div>
                            <p className="field-label">Branch</p>
                            <InlineEdit value={linkedCustomer.branch ?? ''} placeholder="สาขา / สำนักงานใหญ่" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { branch: v })} />
                          </div>
                        </div>
                        <div>
                          <p className="field-label">Company Address</p>
                          <InlineEdit value={linkedCustomer.company_address ?? ''} placeholder="ที่อยู่บริษัท" multiline onSave={(v) => updateCustomer(linkedCustomer.customer_id, { company_address: v })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="field-label">Billing Contact</p>
                            <InlineEdit value={linkedCustomer.billing_contact ?? ''} placeholder="ผู้ติดต่อด้านบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { billing_contact: v })} />
                          </div>
                          <div>
                            <p className="field-label">Billing Notes</p>
                            <InlineEdit value={linkedCustomer.billing_notes ?? ''} placeholder="หมายเหตุการวางบิล" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { billing_notes: v })} />
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
                            <InlineEdit value={linkedCustomer.bank_name ?? ''} placeholder="SCB / KBANK / BBL" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_name: v })} />
                          </div>
                          <div>
                            <p className="field-label">Bank Branch</p>
                            <InlineEdit value={linkedCustomer.bank_branch ?? ''} placeholder="สาขา" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_branch: v })} />
                          </div>
                        </div>
                        <div>
                          <p className="field-label">Account Number</p>
                          <InlineEdit value={linkedCustomer.bank_account_number ?? ''} placeholder="เลขบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_account_number: v })} />
                        </div>
                        <div>
                          <p className="field-label">Account Name</p>
                          <InlineEdit value={linkedCustomer.bank_account_name ?? ''} placeholder="ชื่อบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_account_name: v })} />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Activity + History (desktop only) */}
            <div className="hidden sm:flex flex-col w-[340px] shrink-0 overflow-y-auto px-6 py-4 space-y-5 bg-muted/20">
              {/* Log Activity */}
              <div>
                <p className="field-label mb-3">Log Activity</p>
                <AddActivityForm entityType="lead_opportunity" entityId={item.lead_op_id} owner={item.owner} entityName={item.name} />
              </div>

              <Separator />

              {/* History */}
              <div>
                <p className="field-label mb-3">History</p>
                <ActivityTimeline entityType="lead_opportunity" entityId={item.lead_op_id} entityName={item.name} />
              </div>
            </div>
          </div>

          {/* Mobile: Trello-style single-scroll card with sticky comment bar */}
          <MobileCardView entityType="lead_opportunity" entityId={item.lead_op_id} owner={item.owner} entityName={item.name}>
                  <div className="px-4 py-4 space-y-5">
                    {/* Key info */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <p className="field-label">Customer</p>
                        {isEditing ? (
                          <Input
                            value={editData?.customer_name || ''}
                            onChange={(e) => handleFieldChange('customer_name', e.target.value)}
                            placeholder="Customer name"
                            className="h-7 text-sm"
                          />
                        ) : (
                          <p className="field-value">{item.customer_name || '—'}</p>
                        )}
                      </div>
                      <div>
                        <p className="field-label">Contact</p>
                        {isEditing ? (
                          <Input
                            value={editData?.contact_person || ''}
                            onChange={(e) => handleFieldChange('contact_person', e.target.value)}
                            placeholder="Contact person"
                            className="h-7 text-sm"
                          />
                        ) : (
                          <p className="field-value">{item.contact_person || '—'}</p>
                        )}
                      </div>
                      <div>
                        <p className="field-label">Estimated Value</p>
                        <InlineEdit
                          value={item.estimated_value && item.estimated_value > 0 ? item.estimated_value.toString() : ''}
                          placeholder="0"
                          formatDisplay={(v) => `฿ ${(parseFloat(v) || 0).toLocaleString()}`}
                          onSave={(v) => updateLeadOpportunity(item.lead_op_id, { estimated_value: parseFloat(v) || 0 })}
                        />
                      </div>
                      <div>
                        <p className="field-label">Owner</p>
                        <Select value={item.owner} onValueChange={(v) => v && updateLeadOpportunity(item.lead_op_id, { owner: v })}>
                          <SelectTrigger className="h-7 text-sm border-0 px-0 focus:ring-0 w-auto gap-1 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <OwnerSelectItems />
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Contact Details */}
                    {linkedCustomer && (
                      <>
                        <Separator />
                        <button
                          type="button"
                          onClick={() => router.push(`/customers?selectedCustomerId=${linkedCustomer.customer_id}`)}
                          className="w-full text-left hover:bg-slate-50 rounded-lg p-3 transition-colors"
                        >
                          <div>
                            <p className="text-[13px] font-semibold text-foreground">
                              {linkedCustomer.company_name}
                            </p>
                            {linkedCustomer.contact_person && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">{linkedCustomer.contact_person}</p>
                            )}
                          </div>

                          <div className="space-y-2 mt-2">
                            {linkedCustomer.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                                <p className="text-[12px] text-muted-foreground">{linkedCustomer.phone}</p>
                              </div>
                            )}

                            {linkedCustomer.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
                                <p className="text-[12px] text-muted-foreground break-all">{linkedCustomer.email}</p>
                              </div>
                            )}

                            {linkedCustomer.line_id && (
                              <div className="flex items-center gap-2">
                                <MessageCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                                <p className="text-[12px] text-muted-foreground">{linkedCustomer.line_id}</p>
                              </div>
                            )}
                          </div>
                        </button>
                      </>
                    )}

                    {/* Notes */}
                    {(item.notes || isEditing) && (
                      <>
                        <Separator />
                        <div>
                          <p className="field-label mb-2">Notes</p>
                          {isEditing ? (
                            <Textarea
                              value={editData?.notes || ''}
                              onChange={(e) => handleFieldChange('notes', e.target.value)}
                              placeholder="Add notes…"
                              className="text-sm resize-none min-h-[80px]"
                            />
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              <LinkifyText text={item.notes} />
                            </p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Company Account */}
                    {linkedCustomer && (
                      <>
                        <Separator />
                        <div className="rounded-lg border border-amber-200/60 overflow-hidden">
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
                              <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded-md">Changes here are saved to the Customer record and shared across all jobs.</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="field-label">Tax ID</p>
                                  <InlineEdit value={linkedCustomer.tax_id ?? ''} placeholder="0105xxx" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { tax_id: v })} />
                                </div>
                                <div>
                                  <p className="field-label">Branch</p>
                                  <InlineEdit value={linkedCustomer.branch ?? ''} placeholder="สาขา / สำนักงานใหญ่" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { branch: v })} />
                                </div>
                              </div>
                              <div>
                                <p className="field-label">Company Address</p>
                                <InlineEdit value={linkedCustomer.company_address ?? ''} placeholder="ที่อยู่บริษัท" multiline onSave={(v) => updateCustomer(linkedCustomer.customer_id, { company_address: v })} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="field-label">Billing Contact</p>
                                  <InlineEdit value={linkedCustomer.billing_contact ?? ''} placeholder="ผู้ติดต่อด้านบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { billing_contact: v })} />
                                </div>
                                <div>
                                  <p className="field-label">Billing Notes</p>
                                  <InlineEdit value={linkedCustomer.billing_notes ?? ''} placeholder="หมายเหตุการวางบิล" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { billing_notes: v })} />
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
                                  <InlineEdit value={linkedCustomer.bank_name ?? ''} placeholder="SCB / KBANK / BBL" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_name: v })} />
                                </div>
                                <div>
                                  <p className="field-label">Bank Branch</p>
                                  <InlineEdit value={linkedCustomer.bank_branch ?? ''} placeholder="สาขา" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_branch: v })} />
                                </div>
                              </div>
                              <div>
                                <p className="field-label">Account Number</p>
                                <InlineEdit value={linkedCustomer.bank_account_number ?? ''} placeholder="เลขบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_account_number: v })} />
                              </div>
                              <div>
                                <p className="field-label">Account Name</p>
                                <InlineEdit value={linkedCustomer.bank_account_name ?? ''} placeholder="ชื่อบัญชี" onSave={(v) => updateCustomer(linkedCustomer.customer_id, { bank_account_name: v })} />
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
          </MobileCardView>

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
            <Button variant="success" onClick={handleMarkWon}>
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
        customerPhone={linkedCustomer?.phone || ''}
        customerLineId={linkedCustomer?.line_id || ''}
      />
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeadsOpportunitiesPage() {
  const isHydrated = useHydrated()
  const { leadOpportunities, addLeadOpportunity, deleteLeadOpportunity } = useCRMStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedForDuplicate, setSelectedForDuplicate] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

  // Don't render until hydration completes to prevent SSR/client mismatch
  if (!isHydrated) return null

  // Debug: Log selectedId changes
  console.log('[Leads Page] selectedId changed:', selectedId)

  const filtered = leadOpportunities.filter((l) => {
    const q = search.toLowerCase()
    const matchSearch = l.name.toLowerCase().includes(q) || l.customer_name.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    const matchService = serviceFilter === 'all' || l.service_type === serviceFilter
    const matchOwner = ownerFilter === 'all' || l.owner === ownerFilter
    return matchSearch && matchStatus && matchService && matchOwner
  })

  const openCount = leadOpportunities.filter((l) => l.status === 'open').length
  const pipelineValue = leadOpportunities.filter((l) => l.status === 'open').reduce((s, l) => s + (l.estimated_value || 0), 0)

  function toggleSelectForDuplicate(id: string) {
    const newSet = new Set(selectedForDuplicate)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedForDuplicate(newSet)
  }

  function toggleSelectAll() {
    if (selectedForDuplicate.size === filtered.length) {
      setSelectedForDuplicate(new Set())
    } else {
      setSelectedForDuplicate(new Set(filtered.map((l) => l.lead_op_id)))
    }
  }

  function duplicateSelected() {
    selectedForDuplicate.forEach((id) => {
      const original = leadOpportunities.find((l) => l.lead_op_id === id)
      if (original) {
        const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        addLeadOpportunity({
          ...original,
          lead_op_id: newId,
          name: `${original.name} (copy)`,
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      }
    })
    setSelectedForDuplicate(new Set())
  }

  function deleteSelected() {
    if (selectedForDuplicate.size === 0) return
    const itemNames = Array.from(selectedForDuplicate)
      .map((id) => leadOpportunities.find((l) => l.lead_op_id === id)?.name)
      .filter(Boolean)
      .join(', ')

    if (window.confirm(`Delete ${selectedForDuplicate.size} lead(s)?\n\n${itemNames}`)) {
      selectedForDuplicate.forEach((id) => {
        deleteLeadOpportunity(id)
      })
      setSelectedForDuplicate(new Set())
      setSelectedId(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <MobileMenuButton />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight truncate">Leads &amp; Opportunities</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block truncate">{openCount} open · ฿{(pipelineValue / 1000).toFixed(0)}K pipeline</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <Button size="sm" className="gap-1.5 h-8 text-xs sm:text-sm font-semibold" onClick={() => setCreating(true)}>
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Lead / Opp</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 border-b bg-card flex items-center gap-3 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search leads…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-[12px]" />
        </div>
        {/* Action buttons for selected lead */}
        {selectedId && (() => {
          console.log('[Render] Action buttons conditional rendered. selectedId:', selectedId)
          const item = leadOpportunities.find((l) => l.lead_op_id === selectedId)
          console.log('[Render] Found item:', item?.name)
          return (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                const leadDetail = document.querySelector('[role="dialog"]')
                if (leadDetail) {
                  const editBtn = leadDetail.querySelector('button:has-text("Edit")') as HTMLButtonElement | null
                  editBtn?.click()
                }
              }}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                const item = leadOpportunities.find((l) => l.lead_op_id === selectedId)
                if (item) {
                  const newId = crypto.randomUUID()
                  const duplicated: LeadOpportunity = {
                    ...item,
                    lead_op_id: newId,
                    name: `${item.name} (Copy)`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                  addLeadOpportunity(duplicated)
                  setSelectedId(newId)
                }
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Duplicate
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                const item = leadOpportunities.find((l) => l.lead_op_id === selectedId)
                if (item && window.confirm(`Delete "${item.name}"?`)) {
                  deleteLeadOpportunity(item.lead_op_id)
                  setSelectedId(null)
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </div>
        )
        })()}
        {/* Status pills */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {(['all', 'open', 'negotiating', 'won', 'lost'] as const).map((s) => {
            const count = s === 'all' ? leadOpportunities.length : leadOpportunities.filter((l) => l.status === s).length
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all capitalize ${
                  statusFilter === s ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
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
            <OwnerSelectItems className="text-[12px]" />
          </SelectContent>
        </Select>
        {selectedForDuplicate.size > 0 && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={duplicateSelected}
            >
              <Plus className="w-3 h-3" /> Duplicate {selectedForDuplicate.size}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs gap-1.5"
              onClick={deleteSelected}
            >
              <Trash2 className="w-3 h-3" /> Delete {selectedForDuplicate.size}
            </Button>
          </>
        )}
        <p className="text-[11px] text-slate-400 ml-auto">{filtered.length} items</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto bg-background">
        {filtered.length === 0 ? (
          search || serviceFilter !== 'all' || ownerFilter !== 'all' || statusFilter !== 'open'
            ? <EmptyState icon={Search} title="No results match" description="Try adjusting your filters." />
            : statusFilter === 'open'
              ? <EmptyState icon={FileText} title="No open leads yet" description="Add your first lead or opportunity to start tracking." action={{ label: '+ Add Lead / Opp', onClick: () => setCreating(true) }} />
              : <EmptyState icon={FileText} title={`No ${statusFilter} items`} description="Nothing here yet." />
        ) : (
          <>
          {/* Mobile: stacked cards */}
          <div className="sm:hidden">
            {filtered.map((item) => (
              <LeadCard
                key={item.lead_op_id}
                item={item}
                onClick={() => setSelectedId(item.lead_op_id)}
                isSelected={selectedForDuplicate.has(item.lead_op_id)}
                onToggleSelect={() => toggleSelectForDuplicate(item.lead_op_id)}
              />
            ))}
          </div>
          {/* Desktop: table */}
          <table className="hidden sm:table w-full">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border/60 bg-slate-50/80 backdrop-blur-sm">
                <th className="px-3 py-2.5 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedForDuplicate.size === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="px-6 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider min-w-[220px]">Lead / Opportunity</th>
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
                <LeadRow
                  key={item.lead_op_id}
                  item={item}
                  onClick={() => setSelectedId(item.lead_op_id)}
                  isSelected={selectedForDuplicate.has(item.lead_op_id)}
                  onToggleSelect={() => {
                    toggleSelectForDuplicate(item.lead_op_id)
                  }}
                />
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {selectedId && <LeadDetail itemId={selectedId} onClose={() => setSelectedId(null)} />}
      {creating && <AddLeadOpForm onClose={() => setCreating(false)} />}
    </div>
  )
}
