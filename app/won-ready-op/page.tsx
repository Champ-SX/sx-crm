'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { OP_STAGES, OP_STAGE_LABELS } from '@/types'
import type { WonJob, OPStage, StaffMember } from '@/types'
import { formatJobTitle, formatJobTitleShort } from '@/lib/jobs'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Calendar, User,
  Pencil, Check, X, ChevronDown, ChevronUp,
  ClipboardList, Truck, CreditCard,
  Users, Banknote,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

const OWNERS = ['Vitta', 'Andy', 'Fern', 'Nong']

// ── Stage visual config ───────────────────────────────────────────────────────
const stageConfig: Record<OPStage, { accent: string; dot: string; headerBg: string; colBg: string }> = {
  WON_JOB_LIST:                   { accent: 'border-t-slate-400',   dot: 'bg-slate-400',   headerBg: 'bg-slate-50',      colBg: 'bg-slate-50/60' },
  OP_PREPARING_AW_DONE:            { accent: 'border-t-blue-400',    dot: 'bg-blue-400',    headerBg: 'bg-blue-50/60',    colBg: 'bg-blue-50/30' },
  OP_READY_FOR_EVENT:              { accent: 'border-t-teal-500',    dot: 'bg-teal-500',    headerBg: 'bg-teal-50/60',    colBg: 'bg-teal-50/20' },
  OP_WAIT_STAFF_PAYMENT_DOC_TERR:  { accent: 'border-t-amber-400',   dot: 'bg-amber-400',   headerBg: 'bg-amber-50/60',   colBg: 'bg-amber-50/20' },
  OP_DONE_PAYMENT:                 { accent: 'border-t-purple-400',  dot: 'bg-purple-400',  headerBg: 'bg-purple-50/60',  colBg: 'bg-purple-50/20' },
}

function formatCurrency(v: number | null | undefined) {
  if (!v) return '฿0'
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `฿${(v / 1_000).toFixed(0)}K`
  return `฿${v.toLocaleString()}`
}

// ── Inline edit ───────────────────────────────────────────────────────────────
function InlineEdit({
  value, onSave, multiline = false, placeholder = 'Click to edit…', rows = 3,
}: {
  value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string; rows?: number
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
        <p className={`text-base flex-1 leading-relaxed whitespace-pre-wrap ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
          {value || placeholder}
        </p>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      {multiline
        ? <Textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="text-base resize-none" rows={rows} onKeyDown={(e) => { if (e.key === 'Escape') cancel() }} />
        : <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-9 text-base" onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} />
      }
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={commit}><Check className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancel}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

// ── InlineEditDate ────────────────────────────────────────────────────────────
function InlineEditDate({
  value, onSave, placeholder = 'YYYY-MM-DD',
}: {
  value: string; onSave: (v: string) => void; placeholder?: string
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
        <p className={`text-base flex-1 leading-relaxed ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
          {value || placeholder}
        </p>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <Input type="date" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-9 text-base" onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={commit}><Check className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancel}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

// ── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, value, onSave, multiline, placeholder, rows, dateInput }: {
  label: string; value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string; rows?: number; dateInput?: boolean
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-muted-foreground mb-0.5 block">{label}</Label>
      {dateInput
        ? <InlineEditDate value={value} onSave={onSave} placeholder={placeholder} />
        : <InlineEdit value={value} onSave={onSave} multiline={multiline} placeholder={placeholder} rows={rows} />
      }
    </div>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job, onClick, isDragging }: { job: WonJob; onClick: () => void; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: job.job_id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`bg-white rounded-xl border border-border/60 p-3 cursor-pointer hover:shadow-md hover:border-border transition-all select-none ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* Job number + product type */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono font-semibold text-slate-400 tracking-wider">#{job.job_number}</span>
        <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">{job.product_type || '—'}</span>
      </div>

      {/* Title */}
      <p className="text-[12px] font-semibold text-slate-800 leading-snug mb-2 line-clamp-2">
        {formatJobTitleShort(job)}
      </p>

      {/* Customer */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5">
        <User className="w-3 h-3 shrink-0 text-slate-400" />
        <span className="truncate">{job.customer_name || '—'}</span>
      </div>

      {/* Date */}
      {job.event_date && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
          <Calendar className="w-3 h-3 shrink-0 text-slate-400" />
          <span>{format(parseISO(job.event_date + 'T00:00:00'), 'dd MMM yyyy')}</span>
        </div>
      )}

      {/* Value + owner */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[12px] font-bold text-slate-800">{formatCurrency(job.estimated_value)}</span>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full">{job.owner}</span>
      </div>
    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ stage, jobs, onCardClick, activeId }: {
  stage: OPStage; jobs: WonJob[]; onCardClick: (job: WonJob) => void; activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const cfg = stageConfig[stage]
  const totalValue = jobs.reduce((s, j) => s + j.estimated_value, 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full sm:min-w-[240px] sm:max-w-[240px] rounded-2xl border border-border/50 border-t-[3px] ${cfg.accent} ${isOver ? 'ring-2 ring-primary/20' : ''} ${cfg.colBg} transition-all shadow-sm`}
    >
      {/* Column header */}
      <div className={`px-3.5 pt-3.5 pb-2.5 rounded-t-xl ${cfg.headerBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <p className="text-[11px] font-semibold text-slate-700 leading-tight">{OP_STAGE_LABELS[stage]}</p>
          </div>
          <span className="text-[10px] font-bold bg-white shadow-sm text-slate-500 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-slate-100">
            {jobs.length}
          </span>
        </div>
        {jobs.length > 0 && (
          <p className="text-[10px] font-medium text-slate-400 pl-4 mt-0.5">{formatCurrency(totalValue)}</p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 px-2.5 pb-3 pt-2 space-y-2 min-h-[80px]">
        {jobs.map((job) => (
          <JobCard
            key={job.job_id}
            job={job}
            onClick={() => onCardClick(job)}
            isDragging={activeId === job.job_id}
          />
        ))}
        {jobs.length === 0 && (
          <div className={`flex items-center justify-center rounded-xl border-2 border-dashed h-20 transition-colors ${isOver ? 'border-primary/40 bg-primary/5' : 'border-slate-200/60'}`}>
            <p className="text-[10px] text-slate-400/60">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Staff Sheet ───────────────────────────────────────────────────────────────
function StaffSheet({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { staff: allStaff, addStaff, updateWonJob, wonJobs } = useCRMStore()
  const jobMaybe = wonJobs.find((j) => j.job_id === jobId)
  const [search, setSearch] = useState('')
  const [newForm, setNewForm] = useState({
    name: '', nickname: '', phone: '',
    bank_name: '', bank_account_number: '', bank_account_name: '', bank_branch: '',
  })

  if (!jobMaybe) return null
  const job = jobMaybe  // const — TS carries WonJob type into closures

  const assignedIds = new Set(job.staff_list.map((s) => s.staff_id))
  const available = allStaff.filter(
    (s) => !assignedIds.has(s.staff_id) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) || s.nickname.toLowerCase().includes(search.toLowerCase()))
  )

  function handleAddFromRegistry(member: StaffMember) {
    updateWonJob(job.job_id, { staff_list: [...job.staff_list, member] })
  }

  function handleCreateNew(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.name.trim()) return
    const newMember: StaffMember = {
      staff_id: `staff-${Date.now()}`,
      ...newForm,
    }
    addStaff(newMember)
    updateWonJob(job.job_id, { staff_list: [...job.staff_list, newMember] })
    setNewForm({ name: '', nickname: '', phone: '', bank_name: '', bank_account_number: '', bank_account_name: '', bank_branch: '' })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[480px] max-w-[90vw] sm:max-w-[480px] top-[6vh] translate-y-0 p-0 gap-0 max-h-[88vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-[15px] font-semibold text-slate-800">Add Staff</DialogTitle>
        </div>
        <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">
          {/* Add from registry */}
          <div>
            <p className="text-sm font-semibold mb-2">Add from registry</p>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm mb-2"
              placeholder="Search staff…"
            />
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground">No available staff found.</p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto">
                {available.map((s) => (
                  <li key={s.staff_id} className="flex items-center justify-between p-2 rounded-lg border border-border/60 hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{s.name} <span className="text-muted-foreground">({s.nickname})</span></p>
                      <p className="text-xs text-muted-foreground">{s.phone} · {s.bank_name}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddFromRegistry(s)}>
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Create new */}
          <div>
            <p className="text-sm font-semibold mb-3">Create new staff</p>
            <form onSubmit={handleCreateNew} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className="h-8 text-sm" required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nickname</Label>
                  <Input value={newForm.nickname} onChange={(e) => setNewForm({ ...newForm, nickname: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input value={newForm.phone} onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Bank Name</Label>
                  <Input value={newForm.bank_name} onChange={(e) => setNewForm({ ...newForm, bank_name: e.target.value })} className="h-8 text-sm" placeholder="SCB / KBANK" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bank Branch</Label>
                  <Input value={newForm.bank_branch} onChange={(e) => setNewForm({ ...newForm, bank_branch: e.target.value })} className="h-8 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Account Number</Label>
                <Input value={newForm.bank_account_number} onChange={(e) => setNewForm({ ...newForm, bank_account_number: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Account Name</Label>
                <Input value={newForm.bank_account_name} onChange={(e) => setNewForm({ ...newForm, bank_account_name: e.target.value })} className="h-8 text-sm" />
              </div>
              <Button type="submit" className="w-full h-8 text-sm">Create & Add to Job</Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Job detail drawer ─────────────────────────────────────────────────────────
function JobDetail({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { wonJobs, updateWonJob, moveWonJobStage, customers, updateCustomer } = useCRMStore()
  const jobMaybe = wonJobs.find((j) => j.job_id === jobId)
  const [stageOpen, setStageOpen] = useState(false)
  const [staffSheetOpen, setStaffSheetOpen] = useState(false)
  const [openSections, setOpenSections] = useState({ A: true, B: true, Staff: false, C: false, OpStage: false, Activity: false, History: false })
  function toggleSection(key: keyof typeof openSections) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (!jobMaybe) return null

  const job = jobMaybe
  const u = (updates: Partial<WonJob>) => updateWonJob(job.job_id, updates)
  const linkedCustomer = job.customer_id
    ? customers.find((c) => c.customer_id === job.customer_id) ?? null
    : null
  const uc = linkedCustomer
    ? (updates: Parameters<typeof updateCustomer>[1]) => updateCustomer(linkedCustomer.customer_id, updates)
    : null

  function removeStaff(staffId: string) {
    u({ staff_list: job.staff_list.filter((s) => s.staff_id !== staffId) })
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="w-[88vw] max-w-[88vw] sm:max-w-[88vw] top-[4vh] translate-y-0 p-0 gap-0 overflow-hidden max-h-[88vh] flex flex-col">

          {/* ── Header ── */}
          <div className="px-7 pt-5 pb-4 border-b shrink-0 bg-white">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">#{job.job_number}</span>
                  {job.event_date && <span className="text-[11px] text-slate-400">{job.event_date.replace(/-/g, '.')}</span>}
                </div>
                <DialogTitle className="text-[15px] font-semibold text-slate-800 leading-snug">
                  {formatJobTitleShort(job)}
                </DialogTitle>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5 break-all leading-relaxed">
                  {formatJobTitle(job)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-800">{formatCurrency(job.estimated_value)}</p>
                  <Select value={job.owner} onValueChange={(v) => v && u({ owner: v })}>
                    <SelectTrigger className="h-6 text-xs border-0 px-0 focus:ring-0 w-auto gap-1 text-slate-400 justify-end">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Body: Responsive layout ── */}
          <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">

            {/* ── LEFT: Sections A + B + C + OP Stage (on mobile) (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 sm:border-r border-border/60">

              {/* Section A: รายละเอียดงาน */}
              <div className="rounded-xl border border-blue-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('A')}
                  className="w-full bg-blue-50 px-4 py-2.5 flex items-center gap-2 hover:bg-blue-100/60 transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-blue-100 flex items-center justify-center shrink-0">
                    <ClipboardList className="w-3 h-3 text-blue-600" />
                  </div>
                  <span className="text-[12px] font-bold text-blue-800 tracking-wide flex-1">A  รายละเอียดงาน</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-blue-400 transition-transform duration-200 ${openSections.A ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                {openSections.A && <div className="bg-white px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow label="Event Date" value={job.event_date} placeholder="YYYY-MM-DD" dateInput onSave={(v) => u({ event_date: v })} />
                    <FieldRow label="Event Time" value={job.event_time} placeholder="e.g. 17.00-23.00" onSave={(v) => u({ event_time: v })} />
                  </div>
                  <FieldRow label="Event Display Name" value={job.event_display_name} placeholder="e.g. Sephora Staff Party 2026" onSave={(v) => u({ event_display_name: v })} />
                  <FieldRow label="Venue" value={job.venue} placeholder="e.g. Eastin Grand Hotel Phayathai" onSave={(v) => u({ venue: v })} />
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow label="Product Type" value={job.product_type} placeholder="e.g. LCA + Film" onSave={(v) => u({ product_type: v })} />
                    <FieldRow label="Product Cat" value={job.product_cat} placeholder="Event / Roadshow / Rental / Campaign" onSave={(v) => u({ product_cat: v })} />
                  </div>
                  <FieldRow label="รายละเอียดงาน / Notes" value={job.job_detail_notes} placeholder="รายละเอียดบริการ, backdrop, หมายเหตุ…" multiline rows={5} onSave={(v) => u({ job_detail_notes: v })} />
                </div>}
              </div>

              {/* Section B: ข้อมูลหน้างาน */}
              <div className="rounded-xl border border-emerald-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('B')}
                  className="w-full bg-emerald-50 px-4 py-2.5 flex items-center gap-2 hover:bg-emerald-100/60 transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center shrink-0">
                    <Truck className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-[12px] font-bold text-emerald-800 tracking-wide flex-1">B  ข้อมูลหน้างาน</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-emerald-400 transition-transform duration-200 ${openSections.B ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                {openSections.B && <div className="bg-white px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow label="Onsite Contact" value={job.onsite_contact_name} placeholder="ชื่อผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_contact_name: v })} />
                    <FieldRow label="Phone" value={job.onsite_contact_phone} placeholder="08x-xxx-xxxx" onSave={(v) => u({ onsite_contact_phone: v })} />
                  </div>
                  <FieldRow label="Line ID" value={job.onsite_line_id} placeholder="Line ID ผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_line_id: v })} />
                  <FieldRow label="Install Point" value={job.install_point} placeholder="จุดติดตั้ง / Backdrop location" multiline onSave={(v) => u({ install_point: v })} />
                  <FieldRow label="Team Meeting Time" value={job.team_meeting_time} placeholder="e.g. 15.00" onSave={(v) => u({ team_meeting_time: v })} />
                  <FieldRow label="Onsite Notes" value={job.onsite_notes} placeholder="หมายเหตุหน้างาน (parking, loading, etc.)" multiline onSave={(v) => u({ onsite_notes: v })} />

                  {/* Staff sub-section */}
                  <div className="rounded-xl border border-rose-200 overflow-hidden mt-1">
                    <button
                      type="button"
                      onClick={() => toggleSection('Staff')}
                      className="w-full bg-rose-50 px-4 py-2.5 flex items-center gap-2 hover:bg-rose-100/60 transition-colors text-left"
                    >
                      <div className="w-5 h-5 rounded-md bg-rose-100 flex items-center justify-center shrink-0">
                        <Users className="w-3 h-3 text-rose-600" />
                      </div>
                      <span className="text-[12px] font-bold text-rose-800 tracking-wide flex-1">จ่ายเงินน้องออกงาน</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-rose-400 transition-transform duration-200 ${openSections.Staff ? 'rotate-0' : '-rotate-90'}`} />
                    </button>
                    {openSections.Staff && <div className="bg-white px-4 py-3 space-y-2">
                      {job.staff_list.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No staff assigned yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {job.staff_list.map((s) => (
                            <li key={s.staff_id} className="flex items-start justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                              <div>
                                <p className="text-sm font-medium">{s.name} <span className="text-muted-foreground">({s.nickname})</span></p>
                                <p className="text-xs text-muted-foreground">{s.phone}</p>
                                <p className="text-xs text-muted-foreground">{s.bank_name} · {s.bank_account_number} · {s.bank_account_name}</p>
                                {s.bank_branch && <p className="text-xs text-muted-foreground">สาขา: {s.bank_branch}</p>}
                              </div>
                              <button onClick={() => removeStaff(s.staff_id)} className="text-muted-foreground hover:text-red-500 transition-colors ml-2 shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs mt-1 border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => setStaffSheetOpen(true)}>
                        + Add Staff
                      </Button>
                    </div>}
                  </div>
                </div>}
              </div>

              {/* Section C: Company Account */}
              <div className="rounded-xl border border-amber-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('C')}
                  className="w-full bg-amber-50 px-4 py-2.5 flex items-center gap-2 hover:bg-amber-100/60 transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center shrink-0">
                    <CreditCard className="w-3 h-3 text-amber-600" />
                  </div>
                  <span className="text-[12px] font-bold text-amber-800 tracking-wide flex-1">C  Company Account</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-amber-400 transition-transform duration-200 ${openSections.C ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                {openSections.C && <div className="bg-white px-4 py-4 space-y-4">
                  {/* Source badge */}
                  {linkedCustomer ? (
                    <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-md leading-snug">
                      🔗 Linked to <strong>{linkedCustomer.company_name}</strong> — edits update the shared Customer record
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 bg-slate-50 px-2.5 py-1.5 rounded-md">
                      No linked customer — data stored on this job only
                    </p>
                  )}
                  <FieldRow
                    label="Company Name / Account"
                    value={linkedCustomer ? linkedCustomer.company_name : job.company_account.company_name}
                    placeholder="ชื่อบริษัท"
                    onSave={(v) => uc ? uc({ company_name: v }) : u({ company_account: { ...job.company_account, company_name: v } })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow
                      label="Billing Contact"
                      value={linkedCustomer ? (linkedCustomer.billing_contact ?? '') : (job.company_account.contact_point ?? '')}
                      placeholder="ผู้ติดต่อด้านบัญชี"
                      onSave={(v) => uc ? uc({ billing_contact: v }) : u({ company_account: { ...job.company_account, contact_point: v } })}
                    />
                    <FieldRow
                      label="Phone"
                      value={linkedCustomer ? linkedCustomer.phone : (job.company_account.phone_number ?? '')}
                      placeholder="เบอร์โทร"
                      onSave={(v) => uc ? uc({ phone: v }) : u({ company_account: { ...job.company_account, phone_number: v } })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow
                      label="Line ID"
                      value={linkedCustomer ? (linkedCustomer.line_id ?? '') : (job.company_account.line_id ?? '')}
                      placeholder="Line ID"
                      onSave={(v) => uc ? uc({ line_id: v }) : u({ company_account: { ...job.company_account, line_id: v } })}
                    />
                    <FieldRow
                      label="Email"
                      value={linkedCustomer ? linkedCustomer.email : (job.company_account.email ?? '')}
                      placeholder="อีเมล"
                      onSave={(v) => uc ? uc({ email: v }) : u({ company_account: { ...job.company_account, email: v } })}
                    />
                  </div>
                  <FieldRow
                    label="Tax ID (เลขประจำตัวผู้เสียภาษี)"
                    value={linkedCustomer ? (linkedCustomer.tax_id ?? '') : (job.company_account.tax_id ?? '')}
                    placeholder="0105xxx"
                    onSave={(v) => uc ? uc({ tax_id: v }) : u({ company_account: { ...job.company_account, tax_id: v } })}
                  />
                  <FieldRow
                    label="Company Address"
                    value={linkedCustomer ? (linkedCustomer.company_address ?? '') : (job.company_account.company_address ?? '')}
                    placeholder="ที่อยู่บริษัท"
                    multiline
                    onSave={(v) => uc ? uc({ company_address: v }) : u({ company_account: { ...job.company_account, company_address: v } })}
                  />
                  <FieldRow
                    label="Branch"
                    value={linkedCustomer ? (linkedCustomer.branch ?? '') : (job.company_account.branch ?? '')}
                    placeholder="สาขา / สำนักงานใหญ่"
                    onSave={(v) => uc ? uc({ branch: v }) : u({ company_account: { ...job.company_account, branch: v } })}
                  />
                  <FieldRow
                    label="Billing Notes"
                    value={linkedCustomer ? (linkedCustomer.billing_notes ?? '') : (job.company_account.billing_notes ?? '')}
                    placeholder="หมายเหตุการวางบิล"
                    multiline
                    onSave={(v) => uc ? uc({ billing_notes: v }) : u({ company_account: { ...job.company_account, billing_notes: v } })}
                  />

                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex-1 border-t border-border/60" />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                      <Banknote className="w-3.5 h-3.5" /> Bank Transfer
                    </div>
                    <div className="flex-1 border-t border-border/60" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow
                      label="Bank Name"
                      value={linkedCustomer ? (linkedCustomer.bank_name ?? '') : (job.company_account.bank_name ?? '')}
                      placeholder="SCB / KBANK / BBL"
                      onSave={(v) => uc ? uc({ bank_name: v }) : u({ company_account: { ...job.company_account, bank_name: v } })}
                    />
                    <FieldRow
                      label="Bank Branch"
                      value={linkedCustomer ? (linkedCustomer.bank_branch ?? '') : (job.company_account.bank_branch ?? '')}
                      placeholder="สาขา"
                      onSave={(v) => uc ? uc({ bank_branch: v }) : u({ company_account: { ...job.company_account, bank_branch: v } })}
                    />
                  </div>
                  <FieldRow
                    label="Account Number"
                    value={linkedCustomer ? (linkedCustomer.bank_account_number ?? '') : (job.company_account.bank_account_number ?? '')}
                    placeholder="เลขบัญชี"
                    onSave={(v) => uc ? uc({ bank_account_number: v }) : u({ company_account: { ...job.company_account, bank_account_number: v } })}
                  />
                  <FieldRow
                    label="Account Name"
                    value={linkedCustomer ? (linkedCustomer.bank_account_name ?? '') : (job.company_account.bank_account_name ?? '')}
                    placeholder="ชื่อบัญชี"
                    onSave={(v) => uc ? uc({ bank_account_name: v }) : u({ company_account: { ...job.company_account, bank_account_name: v } })}
                  />
                </div>}
              </div>

              {/* OP Stage - Collapsible section (moved to left panel for mobile) */}
              <div className="rounded-xl border border-red-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection('OpStage')}
                  className="w-full bg-red-50 px-4 py-2.5 flex items-center gap-2 hover:bg-red-100/60 transition-colors text-left"
                >
                  <div className="w-5 h-5 rounded-md bg-red-100 flex items-center justify-center shrink-0">
                    <div className={`w-2 h-2 rounded-full bg-red-600`} />
                  </div>
                  <span className="text-[12px] font-bold text-red-800 tracking-wide flex-1">OP Stage</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-red-400 transition-transform duration-200 ${openSections.OpStage ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                {openSections.OpStage && <div className="bg-white px-4 py-3 space-y-2">
                  <div className="flex flex-col gap-1.5">
                    {OP_STAGES.map((s) => {
                      const isActive = job.op_stage === s
                      return (
                        <button
                          key={s}
                          onClick={() => moveWonJobStage(job.job_id, s)}
                          className={`w-full text-left text-[11px] font-semibold px-3 py-2 rounded-lg border transition-all ${
                            isActive
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {OP_STAGE_LABELS[s]}
                        </button>
                      )
                    })}
                  </div>
                </div>}
              </div>

            </div>

            {/* ── RIGHT: Activity + History (desktop only, fixed width, scrollable) ── */}
            <div className="hidden sm:flex flex-col w-[320px] shrink-0 overflow-y-auto px-5 py-5 space-y-5 bg-slate-50/60">

              {/* Log Activity */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Log Activity</p>
                <AddActivityForm entityType="won_job" entityId={job.job_id} owner={job.owner} />
              </div>

              <Separator />

              {/* History */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">History</p>
                <ActivityTimeline entityType="won_job" entityId={job.job_id} />
              </div>
            </div>

            {/* ── Activity + History on mobile (collapsible) ── */}
            <div className="sm:hidden w-full bg-muted/20 overflow-y-auto">
              {/* Log Activity - Collapsible on mobile */}
              <div className="border-t border-border/60">
                <button
                  type="button"
                  onClick={() => toggleSection('Activity')}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">Log Activity</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.Activity ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                <div className={`px-4 pb-3 ${openSections.Activity ? 'block' : 'hidden'}`}>
                  <AddActivityForm entityType="won_job" entityId={job.job_id} owner={job.owner} />
                </div>
              </div>

              <Separator />

              {/* History - Collapsible on mobile */}
              <div>
                <button
                  type="button"
                  onClick={() => toggleSection('History')}
                  className="w-full px-4 py-3 flex items-center gap-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">History</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openSections.History ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                <div className={`px-4 py-3 ${openSections.History ? 'block' : 'hidden'}`}>
                  <ActivityTimeline entityType="won_job" entityId={job.job_id} />
                </div>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {staffSheetOpen && <StaffSheet jobId={job.job_id} onClose={() => setStaffSheetOpen(false)} />}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WonReadyOpPage() {
  const isHydrated = useHydrated()
  const wonJobs = useCRMStore((s) => s.wonJobs)
  const moveWonJobStage = useCRMStore((s) => s.moveWonJobStage)
  const initializeData = useCRMStore((s) => s.initializeData)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Load data from Supabase after hydration completes
  useEffect(() => {
    if (isHydrated) {
      void initializeData()
    }
  }, [isHydrated])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8, delay: 100, tolerance: 5 } })
  )

  const activeJob = activeId ? wonJobs.find((j) => j.job_id === activeId) : null

  function onDragStart({ active }: DragStartEvent) { setActiveId(active.id as string) }
  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const stage = over.id as OPStage
    if (!OP_STAGES.includes(stage)) return
    const job = wonJobs.find((j) => j.job_id === active.id)
    if (job?.op_stage === stage) return
    moveWonJobStage(active.id as string, stage)
  }

  const activeCount = wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT').length
  const totalValue = wonJobs
    .filter((j) => j.op_stage !== 'OP_DONE_PAYMENT')
    .reduce((s, j) => s + j.estimated_value, 0)

  // Don't render until hydration completes to prevent SSR/client mismatch
  if (!isHydrated) return null

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <div>
            <h1 className="text-[15px] sm:text-[17px] font-semibold text-slate-800 tracking-tight">Won &amp; Ready for OP</h1>
            <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 hidden sm:block">{activeCount} active jobs · {formatCurrency(totalValue)} in pipeline</p>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Mobile: Vertical stack, Desktop: Horizontal scroll */}
        <div className="flex-1 overflow-x-auto overflow-y-auto sm:overflow-y-hidden bg-background">
          <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6 h-full min-w-max sm:items-start sm:min-h-max">
            {OP_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                jobs={wonJobs.filter((j) => j.op_stage === stage)}
                onCardClick={(job) => setSelectedId(job.job_id)}
                activeId={activeId}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeJob && (
            <div className="bg-white rounded-lg border border-primary/30 shadow-xl p-3 w-[230px] opacity-95">
              <p className="text-[10px] font-mono text-muted-foreground/60 mb-1">#{activeJob.job_number}</p>
              <p className="text-sm font-semibold text-foreground leading-snug">{formatJobTitleShort(activeJob)}</p>
              <p className="text-xs text-muted-foreground mt-1">{activeJob.customer_name}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selectedId && <JobDetail jobId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
