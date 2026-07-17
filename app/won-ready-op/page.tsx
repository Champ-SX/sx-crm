'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useCRMStore } from '@/store/crm-store'
import { useAuth } from '@/components/auth-provider'
import { OwnerSelectItems } from '@/components/shared/owner-select-items'
import { useHydrated } from '@/hooks/use-hydrated'
import { useOpenDeepLink } from '@/hooks/use-open-deep-link'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { OP_STAGES, OP_STAGE_LABELS } from '@/types'
import type { WonJob, OPStage, StaffMember } from '@/types'
import { formatJobMeta, jobDisplayTitle } from '@/lib/jobs'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { LinkifyText } from '@/components/shared/linkify-text'
import { MobileCardView } from '@/components/shared/mobile-card-view'
import { DetailHeader } from '@/components/shared/detail-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Calendar, User,
  Pencil, Check, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ClipboardList, Truck, CreditCard,
  Users, Banknote, ArrowUpDown, GripVertical,
  Trash2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'


// ── Stage visual config ───────────────────────────────────────────────────────
const stageConfig: Record<OPStage, { accent: string; dot: string; headerBg: string; colBg: string }> = {
  WON_JOB_LIST:                   { accent: 'border-t-slate-400',   dot: 'bg-slate-400',   headerBg: 'bg-muted',      colBg: 'bg-muted/60' },
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
  value, onSave, multiline = false, placeholder = 'Click to edit…', rows = 3, formatDisplay,
}: {
  value: string; onSave: (v: string) => void; multiline?: boolean; placeholder?: string; rows?: number
  formatDisplay?: (v: string) => string  // format the read-only display (e.g. currency)
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
        className="group flex items-start gap-1 rounded px-2 py-1 -mx-2 hover:bg-muted/50"
      >
        <p className={`flex-1 leading-relaxed ${value ? 'field-value' : 'field-placeholder'}`}>
          {value || placeholder}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true) }}
          className="edit-affordance flex-shrink-0"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
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
      <Label className="field-label">{label}</Label>
      {dateInput
        ? <InlineEditDate value={value} onSave={onSave} placeholder={placeholder} />
        : <InlineEdit value={value} onSave={onSave} multiline={multiline} placeholder={placeholder} rows={rows} />
      }
    </div>
  )
}

// ── Section header ──────────────────────────────────────────────────────────
// Neutral, consistent collapsible header for the A/B/C detail sections. The
// icon differentiates each section; colour no longer carries meaning so the
// card reads calmly instead of as a traffic-light of blue/green/amber chips.
function SectionHeader({ letter, title, icon: Icon, open, onToggle }: {
  letter: string; title: string; icon: React.ComponentType<{ className?: string }>; open: boolean; onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full bg-muted/60 px-4 py-2.5 flex items-center gap-2 hover:bg-muted transition-colors text-left"
    >
      <div className="w-5 h-5 rounded-md bg-background border border-border flex items-center justify-center shrink-0">
        <Icon className="w-3 h-3 text-muted-foreground" />
      </div>
      <span className="text-[12px] font-bold text-foreground tracking-wide flex-1">{letter}  {title}</span>
      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
    </button>
  )
}

// ── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({
  job,
  onClick,
  isDragging,
  isMobile = false,
}: {
  job: WonJob
  onClick: () => void
  isDragging?: boolean
  isMobile?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isSortableDragging } = useSortable({ id: job.job_id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const isBeingDragged = isDragging || isSortableDragging
  // Cards are draggable on desktop only. On mobile the board is a pager; tap a
  // card to open it and change its stage via the detail drawer. Withholding the
  // listeners here means no drag can start on touch (was crashing the page).
  const dragProps = isMobile ? {} : { ...attributes, ...listeners }

  // Staff-payment summary for the card's bottom tab (so payers spot pending tasks)
  const staff = job.staff_list || []
  const paidStaff = staff.filter((s) => s.paid).length
  const staffFeeTotal = staff.reduce((sum, s) => sum + (s.fee_thb || 0), 0)
  const allPaid = staff.length > 0 && paidStaff === staff.length

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => { e.stopPropagation(); onClick() }}
      {...dragProps}
      className={`bg-card rounded-xl border border-border/60 p-3 ${isMobile ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} hover:shadow-md hover:border-border transition-all select-none flex items-start gap-2 group ${isBeingDragged ? 'opacity-50 shadow-lg' : ''}`}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Job number + product type */}
        <div className="flex items-center justify-between mb-2 gap-1">
          <span className="text-[12px] font-mono font-semibold text-muted-foreground tracking-wider">#{job.job_number}</span>
          <span className="text-[12px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md shrink-0">{job.product_type || '—'}</span>
        </div>

        {/* Title */}
        <p className="text-[12px] font-semibold text-foreground leading-snug mb-2 line-clamp-2">
          {jobDisplayTitle(job)}
        </p>

        {/* Customer */}
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-1.5">
          <User className="w-3 h-3 shrink-0 text-muted-foreground" />
          <span className="truncate">{job.customer_name || '—'}</span>
        </div>

        {/* Date */}
        {job.event_date && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground mb-2">
            <Calendar className="w-3 h-3 shrink-0 text-muted-foreground" />
            <span>{format(parseISO(job.event_date + 'T00:00:00'), 'dd MMM yyyy')}</span>
          </div>
        )}

        {/* Value + owner */}
        <div className="flex items-center justify-between pt-2 border-t border-border gap-1 min-w-0">
          <span className="text-[12px] font-bold text-foreground shrink-0">{formatCurrency(job.estimated_value)}</span>
          <span className="text-[12px] font-medium text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-full truncate min-w-0" title={job.owner || ''}>{job.owner}</span>
        </div>

        {/* Staff-payment tab — red while pending, green when fully paid */}
        {staff.length > 0 && (
          <div className={`-mx-3 -mb-3 mt-2 px-3 py-1.5 rounded-b-xl border-t flex items-center gap-1.5 ${allPaid ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300'}`}>
            {allPaid ? <Check className="w-3 h-3 shrink-0" /> : <CreditCard className="w-3 h-3 shrink-0" />}
            <span className="text-[12px] font-semibold">จ่ายแล้ว {paidStaff}/{staff.length} · ฿{staffFeeTotal.toLocaleString()}</span>
          </div>
        )}
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
  isMobile = false,
}: {
  stage: string
  jobs: WonJob[]
  onCardClick: (job: WonJob) => void
  activeId: string | null
  onDeleteStage?: (stage: string) => void
  onChangeColor?: (stage: string) => void
  onAddStage?: () => void
  opStages: any[]
  isMobile?: boolean
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: stage })
  const { setNodeRef: setSortableRef, isDragging, attributes, listeners, transform } = useSortable({ id: stage })

  // Get colors from opStages or fall back to stageConfig
  const opStage = opStages.find((s) => s.id === stage)
  const cfg = opStage
    ? {
        accent: opStage.accentColor || 'border-t-slate-400',
        dot: opStage.dotColor || 'bg-slate-400',
        headerBg: opStage.headerBg || 'bg-muted',
        colBg: opStage.columnBg || 'bg-muted/60',
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
      className={`flex flex-col shrink-0 snap-center w-[86vw] min-w-[86vw] h-full min-h-0 sm:w-auto sm:min-w-[240px] sm:max-w-[240px] sm:h-auto sm:max-h-full sm:snap-align-none rounded-2xl border border-border/50 border-t-[3px] ${cfg.accent} ${isOver ? 'ring-2 ring-primary/40' : ''} ${isDragging ? 'opacity-50' : ''} ${cfg.colBg} dark:!bg-card/40 shadow-sm`}
    >
      {/* Column header */}
      <div
        className={`px-3.5 pt-3.5 pb-2.5 rounded-t-xl ${cfg.headerBg} dark:!bg-muted/50 select-none`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Dedicated stage-drag handle (desktop only; mobile pages via swipe).
                Only this grip carries the sortable listeners, so dragging a
                card never accidentally grabs the column. */}
            {!isMobile && (
              <button
                type="button"
                className="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity p-1 -m-1 rounded hover:bg-muted/30 cursor-grab active:cursor-grabbing touch-none"
                title="Drag to reorder stages"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <p className="text-[12px] font-semibold text-foreground leading-tight">
              {opStages.find((s) => s.id === stage)?.label || OP_STAGE_LABELS[stage as OPStage] || stage}
            </p>
          </div>
          {/* Card count with sort dropdown button */}
          <div className="relative">
            <button
              onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className="text-[12px] font-bold bg-card shadow-sm text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-border hover:border-border hover:shadow-md transition-all cursor-pointer"
              title="Click to sort"
            >
              {jobs.length}
            </button>
            {/* Dropdown menu */}
            {sortMenuOpen && (
              <div className="absolute right-0 top-7 bg-card border border-border rounded-md shadow-lg z-10 min-w-[140px]">
                {/* Sort section */}
                <div className="text-[12px] font-bold text-muted-foreground px-3 py-1.5 uppercase tracking-wider">Sort</div>
                <button
                  onClick={() => { setSortBy('position'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-muted ${sortBy === 'position' ? 'bg-muted text-foreground' : 'text-foreground/80'}`}
                >
                  Order
                </button>
                <button
                  onClick={() => { setSortBy('date'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-muted ${sortBy === 'date' ? 'bg-muted text-foreground' : 'text-foreground/80'}`}
                >
                  Event Date
                </button>
                <button
                  onClick={() => { setSortBy('value'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-muted ${sortBy === 'value' ? 'bg-muted text-foreground' : 'text-foreground/80'}`}
                >
                  Value
                </button>
                <button
                  onClick={() => { setSortBy('name'); setSortMenuOpen(false) }}
                  className={`block w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-muted ${sortBy === 'name' ? 'bg-muted text-foreground' : 'text-foreground/80'}`}
                >
                  Alphabetically
                </button>

                {/* Separator */}
                <div className="h-px bg-muted my-1" />

                {/* Manage section */}
                <div className="text-[12px] font-bold text-muted-foreground px-3 py-1.5 uppercase tracking-wider">Manage</div>
                <button
                  onClick={() => { setSortMenuOpen(false); onChangeColor?.(stage) }}
                  className="block w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-muted text-foreground/80"
                >
                  Change Color
                </button>
                <button
                  onClick={() => { setSortMenuOpen(false); onAddStage?.() }}
                  className="block w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-muted text-foreground/80"
                >
                  Add Stage
                </button>
                <button
                  onClick={() => { setSortMenuOpen(false); onDeleteStage?.(stage) }}
                  className="block w-full text-left px-3 py-2 text-[12px] font-medium hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 last:rounded-b-md"
                >
                  Delete Stage
                </button>
              </div>
            )}
          </div>
        </div>
        {jobs.length > 0 && (
          <p className="text-[12px] font-medium text-muted-foreground pl-4 mt-0.5">{formatCurrency(totalValue)}</p>
        )}
      </div>

      {/* Cards */}
      <SortableContext items={sortedJobs.map(j => j.job_id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 px-2.5 pb-3 pt-2 space-y-2 overflow-y-auto overflow-x-hidden min-h-0">
          {sortedJobs.map((job) => (
            <JobCard
              key={job.job_id}
              job={job}
              onClick={() => onCardClick(job)}
              isDragging={activeId === job.job_id}
              isMobile={isMobile}
            />
          ))}
          {jobs.length === 0 && (
            <div className={`flex items-center justify-center rounded-xl border-2 border-dashed h-20 transition-colors ${isOver ? 'border-primary/40 bg-primary/5' : 'border-border/60'}`}>
              <p className="text-[12px] text-muted-foreground/60">Drop here</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Staff Sheet ───────────────────────────────────────────────────────────────
function StaffSheet({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const { staff: allStaff, addStaff, updateWonJob, wonJobs, deleteStaff } = useCRMStore()
  const { role } = useAuth()
  const isAdmin = role === 'admin'
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
          <DialogTitle className="text-[15px] font-semibold text-foreground">Add Staff</DialogTitle>
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
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddFromRegistry(s)}>
                        Add
                      </Button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete ${s.name} from the staff registry? Existing jobs keep their record; they just won't appear in this list.`)) {
                              void deleteStaff(s.staff_id)
                            }
                          }}
                          className="p-1.5 text-muted-foreground/70 hover:text-destructive transition-colors"
                          title="Delete from registry (admin)"
                          aria-label={`Delete ${s.name} from registry`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
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

// ── Edit Staff dialog ─────────────────────────────────────────────────────────
// Edits a staff member's identity fields. Caller persists to both the job's
// staff_list snapshot and the master registry (see saveStaffEdit).
type StaffIdentity = Omit<StaffMember, 'staff_id' | 'fee_thb' | 'paid'>
function EditStaffDialog({
  staff,
  onSave,
  onClose,
}: {
  staff: StaffMember
  onSave: (fields: StaffIdentity) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<StaffIdentity>({
    name: staff.name,
    nickname: staff.nickname,
    phone: staff.phone,
    bank_name: staff.bank_name,
    bank_account_number: staff.bank_account_number,
    bank_account_name: staff.bank_account_name,
    bank_branch: staff.bank_branch,
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[480px] max-w-[90vw] sm:max-w-[480px] top-[6vh] translate-y-0 p-0 gap-0 max-h-[88vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="text-[15px] font-semibold text-foreground">Edit Staff</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">
            อัปเดตข้อมูลทั้งงานนี้และในทะเบียนพนักงาน (updates this job and the registry)
          </DialogDescription>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nickname</Label>
              <Input value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Bank Name</Label>
              <Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="h-8 text-sm" placeholder="SCB / KBANK" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Bank Branch</Label>
              <Input value={form.bank_branch} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Account Number</Label>
            <Input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Account Name</Label>
            <Input value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} className="h-8 text-sm" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Due date + reminder editor (Phase 2.7) ───────────────────────────────────
const DUE_LEAD_OPTIONS = [
  { v: 0, l: 'At due time' },
  { v: 30, l: '30 min before' },
  { v: 60, l: '1 hour before' },
  { v: 180, l: '3 hours before' },
  { v: 1440, l: '1 day before' },
  { v: 2880, l: '2 days before' },
]

// ISO(UTC) → value for <input type="datetime-local"> in the viewer's local time.
function isoToLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function JobDueDateEditor({ job, onUpdate }: { job: WonJob; onUpdate: (u: Partial<WonJob>) => void }) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const assignees = job.assignee_ids ?? []
  const lead = job.due_lead_minutes ?? 0
  const [open, setOpen] = useState(!!job.due_at)

  function setDue(localValue: string) {
    // Changing the due time re-arms the notification (clear the dedup stamp).
    onUpdate({ due_at: localValue ? new Date(localValue).toISOString() : null, due_notified_at: null })
  }
  function toggleAssignee(id: string) {
    const next = assignees.includes(id) ? assignees.filter((x) => x !== id) : [...assignees, id]
    onUpdate({ assignee_ids: next })
  }

  return (
    <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2.5 flex items-center gap-2 hover:bg-indigo-100/60 dark:hover:bg-indigo-500/20 transition-colors text-left"
      >
        <div className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
          <Calendar className="w-3 h-3 text-indigo-600 dark:text-indigo-300" />
        </div>
        <span className="text-[12px] font-bold text-indigo-800 dark:text-indigo-300 tracking-wide flex-1">Due date &amp; reminder</span>
        {job.due_at && !open && (
          <span className="text-[12px] font-medium text-indigo-700/80 dark:text-indigo-300/80">
            {new Date(job.due_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-indigo-400 transition-transform duration-200 ${open ? 'rotate-0' : '-rotate-90'}`} />
      </button>
      {open && <div className="bg-card px-4 py-3 space-y-3">
        <div className="space-y-1">
          <label className="field-label">Due date &amp; time</label>
          <input
            type="datetime-local"
            value={isoToLocalInput(job.due_at)}
            onChange={(e) => setDue(e.target.value)}
            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
          />
        </div>
        <div className="space-y-1">
          <label className="field-label">Remind</label>
          <Select value={String(lead)} onValueChange={(v) => v && onUpdate({ due_lead_minutes: Number(v) })}>
            <SelectTrigger className="h-8 text-xs">
              <span className="truncate">{DUE_LEAD_OPTIONS.find((o) => o.v === lead)?.l ?? 'At due time'}</span>
            </SelectTrigger>
            <SelectContent>
              {DUE_LEAD_OPTIONS.map((o) => (
                <SelectItem key={o.v} value={String(o.v)} className="text-xs">{o.l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="field-label">Notify (owner is always notified)</label>
          <div className="flex flex-wrap gap-1.5">
            {teamMembers.map((m) => {
              const on = assignees.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleAssignee(m.id)}
                  className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium border transition-colors ${
                    on
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-border text-muted-foreground bg-card hover:bg-muted'
                  }`}
                >
                  {on && <Check className="w-3 h-3" />}{m.name || m.email}
                </button>
              )
            })}
          </div>
        </div>
        {!job.due_at && (
          <p className="text-[12px] text-muted-foreground/70">Set a due date to schedule a reminder push.</p>
        )}
      </div>}
    </div>
  )
}

// ── Compact OP-stage picker (bare pill; header meta cell provides the label) ──
function JobStagePill({ job }: { job: WonJob }) {
  const moveWonJobStage = useCRMStore((s) => s.moveWonJobStage)
  return (
    <div className="inline-flex items-center">
      <Select value={job.op_stage} onValueChange={(v) => v && moveWonJobStage(job.job_id, v as OPStage)}>
        <SelectTrigger className="h-6 w-auto max-w-[200px] gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 text-[12px] font-semibold text-foreground focus:ring-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${stageConfig[job.op_stage as OPStage]?.dot || 'bg-slate-400'}`} />
          <span className="truncate">{OP_STAGE_LABELS[job.op_stage as OPStage] || job.op_stage}</span>
        </SelectTrigger>
        <SelectContent>
          {OP_STAGES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs">
              <span className="inline-flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${stageConfig[s]?.dot || 'bg-slate-400'}`} />
                {OP_STAGE_LABELS[s]}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
  const { wonJobs, updateWonJob, moveWonJobStage, customers, updateCustomer, updateStaff } = useCRMStore()
  const jobMaybe = wonJobs.find((j) => j.job_id === jobId)
  const [stageOpen, setStageOpen] = useState(false)
  const [staffSheetOpen, setStaffSheetOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
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

  function updateStaffFee(staffId: string, fee: number | null) {
    u({ staff_list: (job.staff_list || []).map((s) => s.staff_id === staffId ? { ...s, fee_thb: fee ?? undefined } : s) })
  }

  function toggleStaffPaid(staffId: string) {
    u({ staff_list: (job.staff_list || []).map((s) => s.staff_id === staffId ? { ...s, paid: !s.paid } : s) })
  }

  // Edit a staff member's identity: update this job's snapshot (keep fee/paid)
  // AND the master registry so future jobs pick up the correction.
  function saveStaffEdit(staffId: string, fields: Omit<StaffMember, 'staff_id' | 'fee_thb' | 'paid'>) {
    u({ staff_list: (job.staff_list || []).map((s) => s.staff_id === staffId ? { ...s, ...fields } : s) })
    void updateStaff(staffId, fields)
    setEditingStaff(null)
  }

  // Payment progress summary for the staff section header
  function staffPaySummary(list: typeof job.staff_list) {
    const staff = list || []
    const paidCount = staff.filter((s) => s.paid).length
    const total = staff.reduce((sum, s) => sum + (s.fee_thb || 0), 0)
    return { count: staff.length, paidCount, total }
  }

  // Staff payment block — non-collapsible, shared by desktop + mobile so they
  // never drift. Each row shows the fee input and a paid/unpaid toggle pill;
  // paid rows tint green. Header shows payment progress + total.
  function renderStaffSection() {
    const list = job.staff_list || []
    const { count, paidCount, total } = staffPaySummary(list)
    return (
      <div className="rounded-xl border border-rose-200 overflow-hidden mt-1">
        <div className="bg-rose-50 dark:bg-rose-500/10 px-4 py-2.5 flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-rose-100 flex items-center justify-center shrink-0">
            <Users className="w-3 h-3 text-rose-600" />
          </div>
          <span className="text-[12px] font-bold text-rose-800 dark:text-rose-300 tracking-wide flex-1">จ่ายเงินน้องออกงาน</span>
          {count > 0 && (
            <span className="text-[12px] font-medium text-rose-700/80 dark:text-rose-300/80">
              จ่ายแล้ว {paidCount}/{count} · ฿{total.toLocaleString()}
            </span>
          )}
        </div>
        <div className="bg-card px-4 py-3 space-y-2">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No staff assigned yet.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((s) => (
                <li
                  key={s.staff_id}
                  className={`flex items-start justify-between p-3 rounded-lg border ${s.paid ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border-border/60 bg-muted/20'}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.name} <span className="text-muted-foreground">({s.nickname})</span></p>
                    <p className="text-xs text-muted-foreground">{s.phone}</p>
                    <p className="text-xs text-muted-foreground">{s.bank_name} · {s.bank_account_number} · {s.bank_account_name}</p>
                    {s.bank_branch && <p className="text-xs text-muted-foreground">สาขา: {s.bank_branch}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {/* ค่าจ้าง — per-job fee in THB (commits on blur) */}
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-medium text-rose-700 dark:text-rose-300">ค่าจ้าง</label>
                        <span className="text-xs text-muted-foreground">฿</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          defaultValue={s.fee_thb ?? ''}
                          placeholder="0"
                          onBlur={(e) => {
                            const raw = e.target.value.trim()
                            const next = raw === '' ? null : Math.max(0, Math.round(parseFloat(raw) || 0))
                            const cur = s.fee_thb ?? null
                            if (next !== cur) updateStaffFee(s.staff_id, next)
                          }}
                          className="h-7 w-28 rounded-md border border-border bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                        />
                      </div>
                      {/* Paid/unpaid toggle pill */}
                      <button
                        type="button"
                        onClick={() => toggleStaffPaid(s.staff_id)}
                        className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-medium transition-colors ${s.paid
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-300 dark:bg-amber-500/10 dark:hover:bg-amber-500/20'}`}
                        title={s.paid ? 'คลิกเพื่อเปลี่ยนเป็นยังไม่จ่าย' : 'คลิกเพื่อทำเครื่องหมายจ่ายแล้ว'}
                      >
                        {s.paid ? <><Check className="w-3 h-3" /> จ่ายแล้ว</> : <>ยังไม่จ่าย</>}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button onClick={() => setEditingStaff(s)} className="text-muted-foreground hover:text-foreground transition-colors p-0.5" title="แก้ไขข้อมูล / Edit staff">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeStaff(s.staff_id)} className="text-muted-foreground hover:text-red-500 transition-colors p-0.5" title="ลบออกจากงานนี้ / Remove from job">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button size="sm" variant="outline" className="w-full h-8 text-xs mt-1 border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10" onClick={() => setStaffSheetOpen(true)}>
            + Add Staff
          </Button>
        </div>
      </div>
    )
  }

  function removeStaff(staffId: string) {
    u({ staff_list: (job.staff_list || []).filter((s) => s.staff_id !== staffId) })
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent showCloseButton={false} className="w-[88vw] max-w-[88vw] sm:max-w-[88vw] top-[4vh] translate-y-0 p-0 gap-0 overflow-hidden max-h-[88dvh] flex flex-col">

          {/* ── Header (unified DetailHeader) ── */}
          <DialogTitle className="sr-only">{jobDisplayTitle(job)}</DialogTitle>
          <DetailHeader
            idChip={job.job_number}
            dateLabel={job.event_date ? job.event_date.replace(/-/g, '.') : undefined}
            onClose={onClose}
            title={
              <InlineEdit
                value={jobDisplayTitle(job)}
                onSave={(v) => u({ event_display_name: v })}
                placeholder="Enter event name…"
              />
            }
            subtitle={formatJobMeta(job) || undefined}
            actions={[
              { label: 'Delete card', icon: <Trash2 className="w-4 h-4" />, onClick: () => onDelete?.(job.job_id), danger: true },
            ]}
            meta={[
              {
                label: 'Owner',
                node: (
                  <Select value={job.owner} onValueChange={(v) => v && u({ owner: v })}>
                    <SelectTrigger className="h-6 text-sm border-0 px-0 focus:ring-0 w-auto gap-1 text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent><OwnerSelectItems /></SelectContent>
                  </Select>
                ),
              },
              { label: 'OP Stage', node: <JobStagePill job={job} /> },
              {
                label: 'Value',
                node: (
                  <span className="font-semibold">
                    <InlineEdit
                      value={job.estimated_value ? job.estimated_value.toString() : ''}
                      onSave={(v) => u({ estimated_value: parseFloat(v) || 0 })}
                      placeholder="0"
                      formatDisplay={(v) => `฿ ${(parseFloat(v) || 0).toLocaleString()}`}
                    />
                  </span>
                ),
              },
              {
                label: 'Due',
                node: (
                  <span className={job.due_at ? '' : 'text-muted-foreground/60'}>
                    {job.due_at
                      ? new Date(job.due_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </span>
                ),
              },
            ]}
          />

          {/* ── Body: Responsive layout ── */}
          {/* Desktop only: Two-panel layout */}
          <div className="hidden sm:flex flex-col sm:flex-row flex-1 overflow-hidden">

            {/* ── LEFT: Sections A + B + C + OP Stage (scrollable) ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 sm:border-r border-border/60">

              {/* Customer Insights — shared from the linked customer */}
              {linkedCustomer && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10 p-4">
                  <p className="field-label mb-2 text-amber-700 dark:text-amber-300">Customer Insights ⭐</p>
                  <InlineEdit value={linkedCustomer.customer_insights ?? ''} placeholder="Insight about this customer (shared across their Leads & Won jobs)…" multiline onSave={(v) => uc?.({ customer_insights: v })} />
                </div>
              )}

              {/* Section A: รายละเอียดงาน */}
              <div className="rounded-xl border border-border overflow-hidden">
                <SectionHeader letter="A" title="รายละเอียดงาน" icon={ClipboardList} open={openSections.A} onToggle={() => toggleSection('A')} />
                {openSections.A && <div className="bg-card px-4 py-4 space-y-4">
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
              <div className="rounded-xl border border-border overflow-hidden">
                <SectionHeader letter="B" title="ข้อมูลหน้างาน" icon={Truck} open={openSections.B} onToggle={() => toggleSection('B')} />
                {openSections.B && <div className="bg-card px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FieldRow label="Onsite Contact" value={job.onsite_contact_name || ''} placeholder="ชื่อผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_contact_name: v })} />
                    <FieldRow label="Phone" value={job.onsite_contact_phone || ''} placeholder="08x-xxx-xxxx" onSave={(v) => u({ onsite_contact_phone: v })} />
                  </div>
                  <FieldRow label="Line ID" value={job.onsite_line_id || ''} placeholder="Line ID ผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_line_id: v })} />
                  <FieldRow label="Install Point" value={job.install_point || ''} placeholder="จุดติดตั้ง / Backdrop location" multiline onSave={(v) => u({ install_point: v })} />
                  <FieldRow label="Team Meeting Time" value={job.team_meeting_time || ''} placeholder="e.g. 15.00" onSave={(v) => u({ team_meeting_time: v })} />
                  <FieldRow label="Onsite Notes" value={job.onsite_notes || ''} placeholder="หมายเหตุหน้างาน (parking, loading, etc.)" multiline onSave={(v) => u({ onsite_notes: v })} />

                  {/* Staff payment section (non-collapsible) */}
                  {renderStaffSection()}
                </div>}
              </div>

              {/* Section C: Company Account */}
              <div className="rounded-xl border border-border overflow-hidden">
                <SectionHeader letter="C" title="Company Account" icon={CreditCard} open={openSections.C} onToggle={() => toggleSection('C')} />
                {openSections.C && <div className="bg-card px-4 py-4 space-y-4">
                  {/* Source badge */}
                  {linkedCustomer ? (
                    <p className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-2.5 py-1.5 rounded-md leading-snug">
                      🔗 Linked to <strong>{linkedCustomer.company_name}</strong> — edits update the shared Customer record
                    </p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md">
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

              {/* OP Stage picker moved to the header (under owner, matches mobile). */}

              {/* Due date + reminder */}
              <JobDueDateEditor job={job} onUpdate={u} />

            </div>

            {/* ── RIGHT: Activity + History (desktop only, fixed width, scrollable) ── */}
            <div className="hidden sm:flex flex-col w-[320px] shrink-0 overflow-y-auto px-5 py-5 space-y-5 bg-muted/60">

              {/* Log Activity */}
              <div>
                <p className="field-label mb-3">Log Activity</p>
                <AddActivityForm entityType="lead_opportunity" entityId={job.lead_op_id || job.job_id} owner={job.owner || ''} entityName={job.event_display_name || job.product_name || `#${job.job_number}`} />
              </div>

              <Separator />

              {/* History */}
              <div>
                <p className="field-label mb-3">History</p>
                <ActivityTimeline entityType="lead_opportunity" entityId={job.lead_op_id || job.job_id} entityName={job.event_display_name || job.product_name || `#${job.job_number}`} />
              </div>
            </div>

          </div>

          {/* ── Mobile: Trello-style single-scroll card with sticky comment bar ── */}
          <MobileCardView entityType="lead_opportunity" entityId={job.lead_op_id || job.job_id} owner={job.owner || ''} entityName={job.event_display_name || job.product_name || `#${job.job_number}`}>
                  <div className="px-6 py-5 space-y-5">
                    {/* Customer Insights — shared from the linked customer */}
                    {linkedCustomer && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10 p-4">
                        <p className="field-label mb-2 text-amber-700 dark:text-amber-300">Customer Insights ⭐</p>
                        <InlineEdit value={linkedCustomer.customer_insights ?? ''} placeholder="Insight about this customer (shared across their Leads & Won jobs)…" multiline onSave={(v) => uc?.({ customer_insights: v })} />
                      </div>
                    )}
                    {/* Section A: รายละเอียดงาน */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <SectionHeader letter="A" title="รายละเอียดงาน" icon={ClipboardList} open={openSections.A} onToggle={() => toggleSection('A')} />
                      {openSections.A && <div className="bg-card px-4 py-4 space-y-4">
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
                    <div className="rounded-xl border border-border overflow-hidden">
                      <SectionHeader letter="B" title="ข้อมูลหน้างาน" icon={Truck} open={openSections.B} onToggle={() => toggleSection('B')} />
                      {openSections.B && <div className="bg-card px-4 py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FieldRow label="Onsite Contact" value={job.onsite_contact_name || ''} placeholder="ชื่อผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_contact_name: v })} />
                          <FieldRow label="Phone" value={job.onsite_contact_phone || ''} placeholder="08x-xxx-xxxx" onSave={(v) => u({ onsite_contact_phone: v })} />
                        </div>
                        <FieldRow label="Line ID" value={job.onsite_line_id || ''} placeholder="Line ID ผู้ติดต่อหน้างาน" onSave={(v) => u({ onsite_line_id: v })} />
                        <FieldRow label="Install Point" value={job.install_point || ''} placeholder="จุดติดตั้ง / Backdrop location" multiline onSave={(v) => u({ install_point: v })} />
                        <FieldRow label="Team Meeting Time" value={job.team_meeting_time || ''} placeholder="e.g. 15.00" onSave={(v) => u({ team_meeting_time: v })} />
                        <FieldRow label="Onsite Notes" value={job.onsite_notes || ''} placeholder="หมายเหตุหน้างาน (parking, loading, etc.)" multiline onSave={(v) => u({ onsite_notes: v })} />

                        {/* Staff payment section (non-collapsible) */}
                        {renderStaffSection()}
                      </div>}
                    </div>

                    {/* Section C: Company Account & OP Stage */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <SectionHeader letter="C" title="Company Account" icon={CreditCard} open={openSections.C} onToggle={() => toggleSection('C')} />
                      {openSections.C && <div className="bg-card px-4 py-4 space-y-4">
                        {linkedCustomer ? (
                          <p className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30 px-2.5 py-1.5 rounded-md leading-snug">
                            🔗 Linked to <strong>{linkedCustomer.company_name}</strong> — edits update the shared Customer record
                          </p>
                        ) : (
                          <p className="text-[12px] text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md">
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
                    {/* OP Stage picker moved to the header pill (one-tap, always visible). */}

                    {/* Due date + reminder */}
                    <JobDueDateEditor job={job} onUpdate={u} />
                  </div>
          </MobileCardView>

        </DialogContent>
      </Dialog>

      {staffSheetOpen && <StaffSheet jobId={job.job_id} onClose={() => setStaffSheetOpen(false)} />}
      {editingStaff && (
        <EditStaffDialog
          staff={editingStaff}
          onSave={(fields) => saveStaffEdit(editingStaff.staff_id, fields)}
          onClose={() => setEditingStaff(null)}
        />
      )}
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
  // Open a specific card from a notification deep-link (?open=<job_id>).
  useOpenDeepLink(
    isHydrated && wonJobs.length > 0,
    'won_job',
    (id) => wonJobs.some((j) => j.job_id === id),
    setSelectedId,
  )
  const [stageToDelete, setStageToDelete] = useState<string | null>(null)
  const [stageToColorize, setStageToColorize] = useState<string | null>(null)
  const [jobToDelete, setJobToDelete] = useState<string | null>(null)
  const [showAddStageDialog, setShowAddStageDialog] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('blue')

  // Horizontal board scrolling: ref + a paging helper for the ‹ › buttons, and a
  // Shift+wheel handler so a vertical wheel scrolls the board sideways.
  const boardRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()
  const COLUMN_STEP = 256 // ~240px column + 16px gap
  function scrollBoard(dir: -1 | 1) {
    boardRef.current?.scrollBy({ left: dir * COLUMN_STEP, behavior: 'smooth' })
  }
  function handleBoardWheel(e: React.WheelEvent) {
    // Trackpad horizontal (deltaX) is native; make Shift+wheel scroll sideways too.
    if (e.shiftKey && e.deltaY !== 0 && boardRef.current) {
      boardRef.current.scrollLeft += e.deltaY
    }
  }

  // ── Mobile pagination: one stage column per page, swipe/tap to page ───────────
  const [activePage, setActivePage] = useState(0)
  // The column DOM elements live inside the flex row (boardRef → row → columns).
  function columnEls(): HTMLElement[] {
    const row = boardRef.current?.firstElementChild as HTMLElement | null
    return row ? (Array.from(row.children) as HTMLElement[]) : []
  }
  // Track which column is centered in the viewport as the user swipes.
  function handleBoardScroll() {
    const el = boardRef.current
    if (!el) return
    const contRect = el.getBoundingClientRect()
    const contCenter = contRect.left + contRect.width / 2
    let best = 0
    let bestDist = Infinity
    columnEls().forEach((child, i) => {
      const r = child.getBoundingClientRect()
      const c = r.left + r.width / 2
      const d = Math.abs(c - contCenter)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setActivePage((prev) => (prev === best ? prev : best))
  }
  function scrollToPage(i: number) {
    const el = boardRef.current
    const cols = columnEls()
    const clamped = Math.max(0, Math.min(i, cols.length - 1))
    const col = cols[clamped]
    if (!el || !col) return
    // Center the target column in the viewport (matches CSS snap-center).
    const left = col.offsetLeft - (el.clientWidth - col.offsetWidth) / 2
    // NOTE: `scroll-snap-type: x mandatory` cancels programmatic *smooth* scrolls
    // in Chromium, so button/dot jumps use an instant scroll. Native swipes still
    // animate + snap smoothly on their own.
    el.scrollTo({ left, behavior: 'instant' as ScrollBehavior })
  }

  // Drag is a DESKTOP-only interaction (see JobCard/KanbanColumn: no drag
  // listeners are attached on mobile, so nothing can start a drag there — the
  // mobile board is a swipe pager and stage changes go through the card detail).
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  )

  const activeJob = activeId ? wonJobs.find((j) => j.job_id === activeId) : null

  // Resolve the stage a drop target belongs to (target may be a stage or a card).
  function stageOf(overId: string): OPStage | null {
    if (sortedStages.includes(overId as OPStage)) return overId as OPStage
    const job = wonJobs.find((j) => j.job_id === overId)
    return job ? (job.op_stage as OPStage) : null
  }

  // Prefer the droppable under the pointer; fall back to rectangle overlap so
  // empty columns and edges still accept the card. Far more predictable than
  // corner-distance for a wide kanban. (We intentionally do NOT live re-parent
  // the card during drag — doing so shifts layout under the cursor and causes
  // an onDragOver→setState→re-render feedback loop. The card moves on drop.)
  const collisionDetection: CollisionDetection = (args) => {
    const hits = pointerWithin(args)
    return hits.length ? hits : rectIntersection(args)
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    const draggedId = active.id as string
    const overId = over?.id as string | undefined
    setActiveId(null)
    if (!overId) return

    // Stage reordering (via the grip handle).
    if (sortedStages.includes(draggedId as OPStage)) {
      if (!sortedStages.includes(overId as OPStage)) return
      const fromIndex = sortedStages.indexOf(draggedId as OPStage)
      const toIndex = sortedStages.indexOf(overId as OPStage)
      if (fromIndex !== toIndex) {
        const newOrder = [...sortedStages]
        newOrder.splice(fromIndex, 1)
        newOrder.splice(toIndex, 0, draggedId as OPStage)
        void reorderStages(newOrder)
      }
      return
    }

    // Card dragging.
    const activeJob = wonJobs.find((j) => j.job_id === draggedId)
    if (!activeJob) return

    // Resolve the target stage from the drop position (stage or a card in it).
    const targetStage = stageOf(overId)
    if (!targetStage) return

    // Different stage → move.
    if (activeJob.op_stage !== targetStage) {
      void moveWonJobStage(draggedId, targetStage)
      return
    }

    // Same stage, dropped on another card → reorder within the stage.
    const targetJob = wonJobs.find((j) => j.job_id === overId)
    if (targetJob && targetJob.op_stage === activeJob.op_stage) {
      const stageJobs = wonJobs
        .filter((j) => j.op_stage === activeJob.op_stage)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const newPosition = stageJobs.findIndex((j) => j.job_id === overId)
      if (newPosition >= 0) {
        void reorderWonJobWithinStage(draggedId, newPosition, activeJob.op_stage)
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

    return result
  }, [opStages])

  // Don't render until hydration completes to prevent SSR/client mismatch
  if (!isHydrated) return null

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Top bar */}
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <div>
            <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight">Won &amp; Ready for OP</h1>
            <p className="text-[12px] sm:text-[12px] text-muted-foreground mt-0.5 hidden sm:block">{activeCount} active jobs · {formatCurrency(totalValue)} in pipeline</p>
          </div>
        </div>
        {/* Scroll the board sideways one stage at a time (desktop) */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollBoard(-1)}
            className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
            aria-label="Scroll stages left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBoard(1)}
            className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition-colors"
            aria-label="Scroll stages right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        autoScroll={{ threshold: { x: 0.18, y: 0.25 } }}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {/* Horizontal stage board. Mobile: one stage per page, snap-paginated, each
            column fills the screen and its cards scroll vertically inside it.
            Desktop: free horizontal scroll of fixed-width columns. */}
        <div
          ref={boardRef}
          onWheel={handleBoardWheel}
          onScroll={handleBoardScroll}
          className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory sm:snap-none bg-background"
        >
          <SortableContext items={sortedStages} strategy={horizontalListSortingStrategy}>
            <div className="flex flex-row gap-4 p-4 sm:p-6 h-full min-w-max items-stretch sm:items-start sm:min-h-0">
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
                  isMobile={isMobile}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        {/* Mobile pager — dots + arrows, one page per stage */}
        {sortedStages.length > 0 && (
          <div className="sm:hidden shrink-0 flex items-center justify-center gap-3 py-2.5 border-t border-border bg-card">
            <button
              type="button"
              onClick={() => scrollToPage(activePage - 1)}
              disabled={activePage === 0}
              className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-30 flex items-center justify-center transition-colors"
              aria-label="Previous stage"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {sortedStages.map((stage, i) => (
                <button
                  key={stage}
                  type="button"
                  onClick={() => scrollToPage(i)}
                  aria-label={`Go to stage ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === activePage ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/40'}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => scrollToPage(activePage + 1)}
              disabled={activePage === sortedStages.length - 1}
              className="w-8 h-8 rounded-lg border border-border bg-card text-muted-foreground disabled:opacity-30 flex items-center justify-center transition-colors"
              aria-label="Next stage"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <DragOverlay>
          {activeJob && (
            <div className="bg-card rounded-lg border border-primary/30 shadow-xl p-3 w-[230px] opacity-95">
              <p className="text-[12px] font-mono text-muted-foreground/60 mb-1">#{activeJob.job_number}</p>
              <p className="text-sm font-semibold text-foreground leading-snug">{jobDisplayTitle(activeJob)}</p>
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
                <strong>{jobDisplayTitle(wonJobs.find((j) => j.job_id === jobToDelete)!)}</strong>
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
              <Label className="text-xs font-semibold text-foreground">Stage Name</Label>
              <Input
                placeholder="e.g. Custom Stage"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="mt-2"
              />
            </div>

            {/* Color Picker */}
            <div>
              <Label className="text-xs font-semibold text-foreground">Color</Label>
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
                    slate: { accent: 'border-t-slate-400', dot: 'bg-slate-400', headerBg: 'bg-muted', colBg: 'bg-muted/60' },
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
