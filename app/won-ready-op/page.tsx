'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { OP_STAGES, OP_STAGE_LABELS } from '@/types'
import type { WonJob, OPStage, StaffMember } from '@/types'
import { formatJobTitle, formatJobTitleShort } from '@/lib/jobs'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { LinkifyText } from '@/components/shared/linkify-text'
import { JobDetailTabs } from '@/components/shared/job-detail-tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Calendar, User,
  Pencil, Check, X, ChevronDown, ChevronUp,
  ClipboardList, Truck, CreditCard,
  Users, Banknote, ArrowUpDown, GripVertical,
  Trash2,
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
      <div className="group flex items-start gap-2 rounded px-2 py-1.5 -mx-2 hover:bg-muted/50">
        <div className={`text-base flex-1 leading-relaxed whitespace-pre-wrap select-text ${value ? 'text-foreground' : 'text-muted-foreground italic'}`} style={{ userSelect: 'text', pointerEvents: 'auto' }}>
          <LinkifyText text={value || placeholder} />
        </div>
        <button
          onClick={() => { setDraft(value); setEditing(true) }}
          className="flex-shrink-0 mt-1 p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer"
          title="Edit"
          type="button"
        >
          <Pencil className="w-3 h-3 text-muted-foreground group-hover:text-blue-600" />
        </button>
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
        className="group flex items-start gap-2 rounded px-2 py-1.5 -mx-2 hover:bg-muted/50"
      >
        <p className={`text-base flex-1 leading-relaxed ${value ? 'text-foreground' : 'text-muted-foreground italic'}`}>
          {value || placeholder}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }}
          className="flex-shrink-0 mt-1 p-1 rounded hover:bg-blue-100 transition-colors cursor-pointer"
          title="Edit"
        >
          <Pencil className="w-3 h-3 text-muted-foreground group-hover:text-blue-600" />
        </button>
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
function JobCard({
  job,
  onClick,
  isDragging,
}: {
  job: WonJob
  onClick: () => void
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isSortableDragging } = useSortable({ id: job.job_id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const isBeingDragged = isDragging || isSortableDragging

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-xl border border-border/60 p-3 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-border transition-all select-none flex items-start gap-2 group ${isBeingDragged ? 'opacity-50 shadow-lg' : ''}`}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Job number + product type */}
        <div className="flex items-center justify-between mb-2 gap-1">
          <span className="text-[9px] font-mono font-semibold text-slate-400 tracking-wider">#{job.job_number}</span>
          <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md shrink-0">{job.product_type || '—'}</span>
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
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-1">
          <span className="text-[12px] font-bold text-slate-800">{formatCurrency(job.estimated_value)}</span>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-full shrink-0">{job.owner}</span>
        </div>
      </div>

    </div>
  )
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({
  stage,
  jobs,
  onCardClick,
  activeId,
  onDeleteStage,
  onChangeColor,
  onAddStage,
  opStages,
}: {
  stage: string
  jobs: WonJob[]
  onCardClick: (job: WonJob) => void
  activeId: string | null
  onDeleteStage?: (stage: string) => void
  onChangeColor?: (stage: string) => void
  onAddStage?: () => void
  opStages: any[]
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: stage })
  const { setNodeRef: setSortableRef, isDragging, attributes, listeners, transform } = useSortable({ id: stage })

  // Get colors from opStages or fall back to stageConfig
  const opStage = opStages.find((s) => s.id === stage)
  const cfg = opStage
    ? {
        accent: opStage.accentColor || 'border-t-slate-400',
        dot: opStage.dotColor || 'bg-slate-400',
        headerBg: opStage.headerBg || 'bg-slate-50',
        colBg: opStage.columnBg || 'bg-slate-50/60',
      }
    : stageConfig[stage as OPStage] || {
        accent: `border-t-purple-500`,
        dot: `bg-purple-500`,
        headerBg: `bg-purple-50/60`,
        colBg: `bg-purple-50/20`,
      }
  const totalValue = jobs.reduce((s, j) => s + (j.estimated_value || 0), 0)
  const [sortBy, setSortBy] = useState<'position' | 'date' | 'value' | 'name'>('position')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  // Combine both refs - sortable for stage reordering, droppable for card drops
  const setNodeRef = (node: HTMLDivElement | null) => {
    setSortableRef(node)
    setDroppableRef(node)
  }

  // Apply transform for drag animation
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? 'none' : 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
  } as React.CSSProperties

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return (a.event_date || '').localeCompare(b.event_date || '')
        case 'value':
          return (b.estimated_value || 0) - (a.estimated_value || 0)
        case 'name':
          return (a.customer_name || '').localeCompare(b.customer_name || '')
        case 'position':
        default:
          return (a.position ?? 0) - (b.position ?? 0)
      }
    })
  }, [jobs, sortBy])

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col w-full sm:min-w-[240px] sm:max-w-[240px] rounded-2xl border border-border/50 border-t-[3px] ${cfg.accent} ${isOver ? 'ring-2 ring-primary/20' : ''} ${isDragging ? 'opacity-50' : ''} ${cfg.colBg} shadow-sm cursor-grab active:cursor-grabbing`}
      {...attributes}
      {...listeners}
    >
      {/* Column header */}
      <div
        className={`px-3.5 pt-3.5 pb-2.5 rounded-t-xl ${cfg.headerBg} select-none`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Drag handle icon - visual indicator */}
            <div
              className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity p-1 -m-1 rounded hover:bg-slate-200/30 pointer-events-none"
              title="Drag to reorder stages"
            >
              <GripVertical className="w-4 h-4 text-slate-500" />
            </div>
            <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <p className="text-[11px] font-semibold text-slate-700 leading-tight">
              {opStages.find((s) => s.id === stage)?.label || OP_STAGE_LABELS[stage as OPStage] || stage}
            </p>
          </div>
          {/* Card count with sort dropdown button */}
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="text-[10px] font-bold bg-white shadow-sm text-slate-500 w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-slate-100 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer"
              title="Click to sort"
            >
              {jobs.length}
            </button>
            {/* Dropdown menu */}
            {sortMenuOpen && (
              <div className="absolute right-0 top-7 bg-white border border-slate-200 rounded-md shadow-lg z-10 min-w-[140px]">
                {/* Sort section */}
                <div className="text-[9px] font-bold text-slate-500 px-3 py-1.5 uppercase tracking-wider">Sort</div>
                <button
                  onClick={() => { setSortBy('position'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-slate-100 ${sortBy === 'position' ? 'bg-slate-50 text-slate-700' : 'text-slate-600'}`}
                >
                  Order
                </button>
                <button
                  onClick={() => { setSortBy('date'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-slate-100 ${sortBy === 'date' ? 'bg-slate-50 text-slate-700' : 'text-slate-600'}`}
                >
                  Event Date
                </button>
                <button
                  onClick={() => { setSortBy('value'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-slate-100 ${sortBy === 'value' ? 'bg-slate-50 text-slate-700' : 'text-slate-600'}`}
                >
                  Value
                </button>
                <button
                  onClick={() => { setSortBy('name'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-slate-100 ${sortBy === 'name' ? 'bg-slate-50 text-slate-700' : 'text-slate-600'}`}
                >
                  Alphabetically
                </button>

                {/* Separator */}
                <div className="h-px bg-slate-200 my-1" />

                {/* Manage section */}
                <div className="text-[9px] font-bold text-slate-500 px-3 py-1.5 uppercase tracking-wider">Manage</div>
                <button
                  onClick={() => { setSortMenuOpen(false); onChangeColor?.(stage) }}
                  className="block w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-slate-100 text-slate-600"
                >
                  Change Color
                </button>
                <button
                  onClick={() => { setSortMenuOpen(false); onAddStage?.() }}
                  className="block w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-slate-100 text-slate-600"
                >
                  Add Stage
                </button>
                <button
                  onClick={() => { setSortMenuOpen(false); onDeleteStage?.(stage) }}
                  className="block w-full text-left px-3 py-2 text-[10px] font-medium hover:bg-red-50 text-red-600 last:rounded-b-md"
                >
                  Delete Stage
                </button>
              </div>
            )}
          </div>
        </div>
        {jobs.length > 0 && (
          <p className="text-[10px] font-medium text-slate-400 pl-4 mt-0.5">{formatCurrency(totalValue)}</p>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={sortedJobs.map(j => j.job_id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 px-2.5 pb-3 pt-2 space-y-2 min-h-[80px]">
          {sortedJobs.map((job) => (
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
      </SortableContext>
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

  const assignedIds = new Set((job.staff_list || []).map((s) => s.staff_id))
  const available = allStaff.filter(
    (s) => !assignedIds.has(s.staff_id) &&
      (s.name.toLowerCase().includes(search.toLowerCase()) || s.nickname.toLowerCase().includes(search.toLowerCase()))
  )

  function handleAddFromRegistry(member: StaffMember) {
    updateWonJob(job.job_id, { staff_list: [...(job.staff_list || []), member] })
  }

  function handleCreateNew(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.name.trim()) return
    const newMember: StaffMember = {
      staff_id: `staff-${Date.now()}`,
      ...newForm,
    }
    addStaff(newMember)
    updateWonJob(job.job_id, { staff_list: [...(job.staff_list || []), newMember] })
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
function JobDetail({
  jobId,
  onClose,
  onDelete,
}: {
  jobId: string
  onClose: () => void
  onDelete?: (jobId: string) => void
}) {
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
    u({ staff_list: (job.staff_list || []).filter((s) => s.staff_id !== staffId) })
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
                <DialogTitle className="text-[15px] font-semibold text-slate-800 leading-snug mb-2">
                  <InlineEdit
                    value={job.event_display_name || formatJobTitleShort(job)}
                    onSave={(v) => u({ event_display_name: v })}
                    placeholder="Enter event name…"
                  />
                </DialogTitle>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5 break-all leading-relaxed">
                  {formatJobTitle(job)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete?.(job.job_id)
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete card"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
                <div className="text-right">
                  <div className="mb-1">
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">Value</Label>
                    <InlineEdit
                      value={job.estimated_value ? job.estimated_value.toString() : ''}
                      onSave={(v) => {
                        const num = parseFloat(v) || 0
                        u({ estimated_value: num })
                      }}
                      placeholder="0"
                    />
                  </div>
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
          {/* Desktop only: Two-panel layout */}
          <div className="hidden sm:flex flex-col sm:flex-row flex-1 overflow-hidden">

            {/* ── LEFT: Sections A + B + C + OP Stage (scrollable) ── */}
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
                    <FieldRow label="Event Date" value={job.event_date || ''} placeholder="YYYY-MM-DD" dateInput onSave={(v) => u({ event_date: v })} />
                    <FieldRow label="Event Time" value={job.event_time || ''} placeholder="e.g. 17.00-23.00" onSave={(v) => u({ event_time: v })} />
                  </div>
                  <FieldRow label="Event Display Name" value={job.event_display_name || ''} placeholder="e.g. Sephora Staff Party 2026" onSave={(v) => u({ event_display_name: v })} />
                  <FieldRow label="Venue" value={job.venue || ''} placeholder="e.g. Eastin Grand Hotel Phayathai" onSave={(v) => u({ venue: v })} />
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow label="Product Type" value={job.product_type || ''} placeholder="e.g. LCA + Film" onSave={(v) => u({ product_type: v })} />
                    <FieldRow label="Product Cat" value={job.product_cat || ''} placeholder="Event / Roadshow / Rental / Campaign" onSave={(v) => u({ product_cat: v })} />
                  </div>
                  <FieldRow label="รายละเอียดงาน / Notes" value={job.job_detail_notes || ''} placeholder="รายละเอียดบริการ, backdrop, หมายเหตุ…" multiline rows={5} onSave={(v) => u({ job_detail_notes: v })} />
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
                    <FieldRow label="Onsite Contact" value={job.onsite_contact_name || ''} placeholder="ชื่อผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_contact_name: v })} />
                    <FieldRow label="Phone" value={job.onsite_contact_phone || ''} placeholder="08x-xxx-xxxx" onSave={(v) => u({ onsite_contact_phone: v })} />
                  </div>
                  <FieldRow label="Line ID" value={job.onsite_line_id || ''} placeholder="Line ID ผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_line_id: v })} />
                  <FieldRow label="Install Point" value={job.install_point || ''} placeholder="จุดติดตั้ง / Backdrop location" multiline onSave={(v) => u({ install_point: v })} />
                  <FieldRow label="Team Meeting Time" value={job.team_meeting_time || ''} placeholder="e.g. 15.00" onSave={(v) => u({ team_meeting_time: v })} />
                  <FieldRow label="Onsite Notes" value={job.onsite_notes || ''} placeholder="หมายเหตุหน้างาน (parking, loading, etc.)" multiline onSave={(v) => u({ onsite_notes: v })} />

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
                      {(job.staff_list || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No staff assigned yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {(job.staff_list || []).map((s) => (
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
                    value={linkedCustomer ? (linkedCustomer.company_name ?? '') : (job.company_account.company_name ?? '')}
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
                      value={linkedCustomer ? (linkedCustomer.phone ?? '') : (job.company_account.phone_number ?? '')}
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
                      value={linkedCustomer ? (linkedCustomer.email ?? '') : (job.company_account.email ?? '')}
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
                <AddActivityForm entityType="lead_opportunity" entityId={job.lead_op_id || job.job_id} owner={job.owner || ''} />
              </div>

              <Separator />

              {/* History */}
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">History</p>
                <ActivityTimeline entityType="lead_opportunity" entityId={job.lead_op_id || job.job_id} />
              </div>
            </div>

          </div>

          {/* ── Mobile: Tab interface ── */}
          <div className="sm:hidden flex flex-col flex-1 overflow-hidden">
            <JobDetailTabs>
              {{
                details: (
                  <div className="px-6 py-5 space-y-5 overflow-y-auto">
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
                          <FieldRow label="Event Date" value={job.event_date || ''} placeholder="YYYY-MM-DD" dateInput onSave={(v) => u({ event_date: v })} />
                          <FieldRow label="Event Time" value={job.event_time || ''} placeholder="e.g. 17.00-23.00" onSave={(v) => u({ event_time: v })} />
                        </div>
                        <FieldRow label="Event Display Name" value={job.event_display_name || ''} placeholder="e.g. Sephora Staff Party 2026" onSave={(v) => u({ event_display_name: v })} />
                        <FieldRow label="Venue" value={job.venue || ''} placeholder="e.g. Eastin Grand Hotel Phayathai" onSave={(v) => u({ venue: v })} />
                        <div className="grid grid-cols-2 gap-4">
                          <FieldRow label="Product Type" value={job.product_type || ''} placeholder="e.g. LCA + Film" onSave={(v) => u({ product_type: v })} />
                          <FieldRow label="Product Cat" value={job.product_cat || ''} placeholder="Event / Roadshow / Rental / Campaign" onSave={(v) => u({ product_cat: v })} />
                        </div>
                        <FieldRow label="รายละเอียดงาน / Notes" value={job.job_detail_notes || ''} placeholder="รายละเอียดบริการ, backdrop, หมายเหตุ…" multiline rows={5} onSave={(v) => u({ job_detail_notes: v })} />
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
                          <FieldRow label="Onsite Contact" value={job.onsite_contact_name || ''} placeholder="ชื่อผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_contact_name: v })} />
                          <FieldRow label="Phone" value={job.onsite_contact_phone || ''} placeholder="08x-xxx-xxxx" onSave={(v) => u({ onsite_contact_phone: v })} />
                        </div>
                        <FieldRow label="Line ID" value={job.onsite_line_id || ''} placeholder="Line ID ผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_line_id: v })} />
                        <FieldRow label="Install Point" value={job.install_point || ''} placeholder="จุดติดตั้ง / Backdrop location" multiline onSave={(v) => u({ install_point: v })} />
                        <FieldRow label="Team Meeting Time" value={job.team_meeting_time || ''} placeholder="e.g. 15.00" onSave={(v) => u({ team_meeting_time: v })} />
                        <FieldRow label="Onsite Notes" value={job.onsite_notes || ''} placeholder="หมายเหตุหน้างาน (parking, loading, etc.)" multiline onSave={(v) => u({ onsite_notes: v })} />

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
                            {(job.staff_list || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">No staff assigned yet.</p>
                            ) : (
                              <ul className="space-y-2">
                                {(job.staff_list || []).map((s) => (
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

                    {/* Section C: Company Account & OP Stage */}
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
                          value={linkedCustomer ? (linkedCustomer.company_name ?? '') : (job.company_account.company_name ?? '')}
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
                            value={linkedCustomer ? (linkedCustomer.phone ?? '') : (job.company_account.phone_number ?? '')}
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
                            value={linkedCustomer ? (linkedCustomer.email ?? '') : (job.company_account.email ?? '')}
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

                    {/* OP Stage */}
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
                ),
                activity: (
                  <div className="px-6 py-5 overflow-y-auto space-y-6">
                    {/* Log Activity Form */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Log Activity</p>
                      <AddActivityForm entityType="lead_opportunity" entityId={job.lead_op_id || job.job_id} owner={job.owner || ''} />
                    </div>

                    <Separator />

                    {/* Activity Timeline */}
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">History</p>
                      <ActivityTimeline entityType="lead_opportunity" entityId={job.lead_op_id || job.job_id} />
                    </div>
                  </div>
                ),
              }}
            </JobDetailTabs>
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
  const opStages = useCRMStore((s) => s.opStages)
  const moveWonJobStage = useCRMStore((s) => s.moveWonJobStage)
  const deleteOpStage = useCRMStore((s) => s.deleteOpStage)
  const updateStageColor = useCRMStore((s) => s.updateStageColor)
  const addOpStage = useCRMStore((s) => s.addOpStage)
  const reorderStages = useCRMStore((s) => s.reorderStages)
  const reorderWonJobWithinStage = useCRMStore((s) => s.reorderWonJobWithinStage)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [stageToDelete, setStageToDelete] = useState<string | null>(null)
  const [stageToColorize, setStageToColorize] = useState<string | null>(null)
  const [jobToDelete, setJobToDelete] = useState<string | null>(null)
  const [showAddStageDialog, setShowAddStageDialog] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('blue')

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5, // Reduced for easier dragging
      }
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Reduced delay for quicker response
        tolerance: 8,
      }
    })
  )

  const activeJob = activeId ? wonJobs.find((j) => j.job_id === activeId) : null

  function onDragStart({ active }: DragStartEvent) {
    console.log('[onDragStart] Drag started:', { activeId: active.id, activeData: active.data, sortedStages: JSON.stringify(sortedStages) })
    setActiveId(active.id as string)
  }
  function onDragEnd({ active, over }: DragEndEvent) {
    console.log('[onDragEnd] Drag ended:', {
      activeId: active.id,
      activeData: active.data,
      overId: over?.id,
      overData: over?.data,
      sortedStages: JSON.stringify(sortedStages)
    })
    setActiveId(null)
    if (!over) {
      console.log('[onDragEnd] No over element, returning')
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    // Check if dragging a stage (stage reordering) - check against sortedStages instead of just OP_STAGES
    const isActiveStage = sortedStages.includes(activeId as OPStage)
    const isOverStage = sortedStages.includes(overId as OPStage)

    console.log('[onDragEnd] Stage check:', { activeId, overId, isActiveStage, isOverStage, sortedStagesArray: JSON.stringify(sortedStages) })

    if (isActiveStage && isOverStage) {
      // Reorder stages - use sortedStages to get current order, then reorder and save
      const fromIndex = sortedStages.indexOf(activeId as OPStage)
      const toIndex = sortedStages.indexOf(overId as OPStage)
      console.log('[onDragEnd] Stage reordering detected:', { fromIndex, toIndex })
      if (fromIndex !== toIndex) {
        const newOrder = [...sortedStages]
        newOrder.splice(fromIndex, 1)
        newOrder.splice(toIndex, 0, activeId as OPStage)
        console.log('[onDragEnd] Reordering stages:', { fromIndex, toIndex, newOrder })
        void reorderStages(newOrder)
      }
      return
    }

    // Otherwise, handle job card dragging
    const activeJob = wonJobs.find((j) => j.job_id === activeId)
    if (!activeJob) return

    // Determine target stage - could be direct drop on stage or parent of job card
    let targetStage: OPStage | null = null
    let targetJob = null

    // Check if dropped directly on a stage (built-in or custom)
    // Use sortedStages which includes both built-in and custom stages
    if (sortedStages.includes(overId as OPStage)) {
      // Direct drop on stage header (works for built-in and custom stages)
      targetStage = overId as OPStage
      console.log('[onDragEnd] Dropped on stage:', targetStage)
    } else {
      // Check if dropped on a job card - if so, map to parent stage
      targetJob = wonJobs.find((j) => j.job_id === overId)
      if (targetJob) {
        targetStage = targetJob.op_stage
        console.log('[onDragEnd] Dropped on job, parent stage:', targetStage)
      }
    }

    if (!targetStage) {
      console.log('[onDragEnd] No valid target stage found')
      return
    }

    // If dropping on different stage, move the card
    if (activeJob.op_stage !== targetStage) {
      void moveWonJobStage(activeId, targetStage)
    }
    // If dropping within same stage on a job card, reorder
    else if (targetJob && targetJob.op_stage === activeJob.op_stage) {
      const stageJobs = wonJobs
        .filter((j) => j.op_stage === activeJob.op_stage)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const newPosition = stageJobs.findIndex((j) => j.job_id === overId)
      if (newPosition >= 0) {
        void reorderWonJobWithinStage(activeId, newPosition, activeJob.op_stage)
      }
    }
  }

  const handleDeleteStage = (stage: string) => {
    setStageToDelete(stage)
  }

  const handleChangeColor = (stage: string) => {
    setStageToColorize(stage)
  }

  const handleDeleteCard = (jobId: string) => {
    setJobToDelete(jobId)
  }

  const confirmDeleteCard = async () => {
    if (!jobToDelete) return

    try {
      console.log('[Delete Card] Deleting job:', jobToDelete)
      const { deleteWonJob } = useCRMStore.getState()
      await deleteWonJob(jobToDelete)
      setJobToDelete(null)
      console.log('[Delete Card] Job deleted successfully')
    } catch (error) {
      console.error('[Delete Card] Error deleting job:', error)
    }
  }

  const activeCount = wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT').length
  const totalValue = wonJobs
    .filter((j) => j.op_stage !== 'OP_DONE_PAYMENT')
    .reduce((s, j) => s + (j.estimated_value || 0), 0)

  // Sort stages based on their order property in the store, including custom stages
  const sortedStages = useMemo(() => {
    // Get all stage IDs: built-in stages + custom stages
    const builtInStageIds = OP_STAGES as string[]
    const customStageIds = opStages
      .filter((s) => s.isCustom)
      .map((s) => s.id)
    const allStageIds = [...builtInStageIds, ...customStageIds] as OPStage[]

    const result = allStageIds.sort((a, b) => {
      const stageA = opStages.find((s) => s.id === a)
      const stageB = opStages.find((s) => s.id === b)
      return (stageA?.order ?? 0) - (stageB?.order ?? 0)
    })

    console.log('[sortedStages]', { builtInStageIds, customStageIds, result, opStages })
    return result
  }, [opStages])

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
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Mobile: Vertical stack, Desktop: Horizontal scroll */}
        <div className="flex-1 overflow-x-auto overflow-y-auto sm:overflow-y-hidden bg-background">
          <SortableContext items={sortedStages} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6 h-full sm:min-w-max sm:items-start sm:min-h-max">
              {sortedStages.map((stage) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  jobs={wonJobs.filter((j) => j.op_stage === stage)}
                  onCardClick={(job) => setSelectedId(job.job_id)}
                  activeId={activeId}
                  onDeleteStage={handleDeleteStage}
                  onChangeColor={handleChangeColor}
                  onAddStage={() => setShowAddStageDialog(true)}
                  opStages={opStages}
                />
              ))}
            </div>
          </SortableContext>
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

      {selectedId && <JobDetail jobId={selectedId} onClose={() => setSelectedId(null)} onDelete={handleDeleteCard} />}

      {/* Delete Stage Confirmation Dialog */}
      <Dialog open={!!stageToDelete} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <DialogContent>
          <DialogTitle>Delete Stage</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {stageToDelete && (opStages.find((s) => s.id === stageToDelete)?.label || OP_STAGE_LABELS[stageToDelete as OPStage] || stageToDelete)}?
            {stageToDelete && wonJobs.filter((j) => j.op_stage === stageToDelete).length > 0 && (
              <> {wonJobs.filter((j) => j.op_stage === stageToDelete).length} job(s) will be moved to the default stage.</>
            )}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStageToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (stageToDelete) {
                  await deleteOpStage(stageToDelete)
                  setStageToDelete(null)
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Stage Color Dialog */}
      <Dialog open={!!stageToColorize} onOpenChange={(open) => !open && setStageToColorize(null)}>
        <DialogContent>
          <DialogTitle>Change Stage Color</DialogTitle>
          <DialogDescription>
            Select a new color for {stageToColorize && (opStages.find((s) => s.id === stageToColorize)?.label || OP_STAGE_LABELS[stageToColorize as OPStage] || stageToColorize)}
          </DialogDescription>

          <div className="grid grid-cols-4 gap-3 py-4">
            {[
              { name: 'slate', bg: 'bg-slate-400', label: 'Slate' },
              { name: 'blue', bg: 'bg-blue-400', label: 'Blue' },
              { name: 'teal', bg: 'bg-teal-500', label: 'Teal' },
              { name: 'green', bg: 'bg-green-500', label: 'Green' },
              { name: 'amber', bg: 'bg-amber-400', label: 'Amber' },
              { name: 'orange', bg: 'bg-orange-400', label: 'Orange' },
              { name: 'red', bg: 'bg-red-500', label: 'Red' },
              { name: 'purple', bg: 'bg-purple-500', label: 'Purple' },
            ].map((color) => (
              <Button
                key={color.name}
                onClick={async () => {
                  if (stageToColorize) {
                    await updateStageColor(stageToColorize, color.name)
                    setStageToColorize(null)
                  }
                }}
                className={`h-12 rounded-lg ${color.bg} hover:opacity-80 transition-opacity flex flex-col items-center justify-center`}
                title={color.label}
              >
                <span className="text-xs text-white font-medium">{color.label}</span>
              </Button>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStageToColorize(null)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Card Confirmation Dialog */}
      <Dialog open={!!jobToDelete} onOpenChange={(open) => !open && setJobToDelete(null)}>
        <DialogContent>
          <DialogTitle>Delete Card</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this card? This action cannot be undone.
            {jobToDelete && wonJobs.find((j) => j.job_id === jobToDelete) && (
              <>
                <br />
                <br />
                <strong>{formatJobTitleShort(wonJobs.find((j) => j.job_id === jobToDelete)!)}</strong>
              </>
            )}
          </DialogDescription>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJobToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteCard}
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stage Dialog */}
      <Dialog open={showAddStageDialog} onOpenChange={setShowAddStageDialog}>
        <DialogContent>
          <DialogTitle>Create New Stage</DialogTitle>
          <DialogDescription>
            Add a new stage to your kanban board
          </DialogDescription>

          <div className="space-y-4 py-4">
            {/* Stage Name Input */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Stage Name</Label>
              <Input
                placeholder="e.g. Custom Stage"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Color Picker */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Color</Label>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {[
                  { name: 'slate', bg: 'bg-slate-400', label: 'Slate' },
                  { name: 'blue', bg: 'bg-blue-400', label: 'Blue' },
                  { name: 'teal', bg: 'bg-teal-500', label: 'Teal' },
                  { name: 'green', bg: 'bg-green-500', label: 'Green' },
                  { name: 'amber', bg: 'bg-amber-400', label: 'Amber' },
                  { name: 'orange', bg: 'bg-orange-400', label: 'Orange' },
                  { name: 'red', bg: 'bg-red-500', label: 'Red' },
                  { name: 'purple', bg: 'bg-purple-500', label: 'Purple' },
                ].map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setNewStageColor(color.name)}
                    className={`h-10 rounded-lg ${color.bg} transition-all ${newStageColor === color.name ? 'ring-2 ring-offset-2 ring-slate-400' : 'hover:opacity-80'}`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddStageDialog(false)
                setNewStageName('')
                setNewStageColor('blue')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (newStageName.trim()) {
                  const stageId = `custom_${Date.now()}`
                  const colorMappings: Record<string, { accent: string; dot: string; headerBg: string; colBg: string }> = {
                    slate: { accent: 'border-t-slate-400', dot: 'bg-slate-400', headerBg: 'bg-slate-50', colBg: 'bg-slate-50/60' },
                    blue: { accent: 'border-t-blue-400', dot: 'bg-blue-400', headerBg: 'bg-blue-50/60', colBg: 'bg-blue-50/30' },
                    teal: { accent: 'border-t-teal-500', dot: 'bg-teal-500', headerBg: 'bg-teal-50/60', colBg: 'bg-teal-50/20' },
                    green: { accent: 'border-t-green-500', dot: 'bg-green-500', headerBg: 'bg-green-50/60', colBg: 'bg-green-50/20' },
                    amber: { accent: 'border-t-amber-400', dot: 'bg-amber-400', headerBg: 'bg-amber-50/60', colBg: 'bg-amber-50/20' },
                    orange: { accent: 'border-t-orange-400', dot: 'bg-orange-400', headerBg: 'bg-orange-50/60', colBg: 'bg-orange-50/20' },
                    red: { accent: 'border-t-red-500', dot: 'bg-red-500', headerBg: 'bg-red-50/60', colBg: 'bg-red-50/20' },
                    purple: { accent: 'border-t-purple-500', dot: 'bg-purple-500', headerBg: 'bg-purple-50/60', colBg: 'bg-purple-50/20' },
                  }

                  const mapping = colorMappings[newStageColor]
                  const maxOrder = Math.max(...opStages.map(s => s.order), 0)

                  await addOpStage({
                    id: stageId,
                    label: newStageName,
                    order: maxOrder + 1,
                    accentColor: mapping.accent,
                    dotColor: mapping.dot,
                    headerBg: mapping.headerBg,
                    columnBg: mapping.colBg,
                    isCustom: true,
                  })

                  setShowAddStageDialog(false)
                  setNewStageName('')
                  setNewStageColor('blue')
                }
              }}
              disabled={!newStageName.trim()}
            >
              Create Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
