'use client'

import { useState } from 'react'
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
import { OP_STAGES, OP_STAGE_LABELS } from '@/types'
import type { WonJob, OPStage, PaymentStatus, StaffStatus, DocStatus } from '@/types'
import { PageHeader } from '@/components/shared/page-header'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Calendar, MapPin, User, DollarSign, FileText,
  Users, CheckCircle2, AlertCircle, Clock, Pencil, Check, X,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

const OWNERS = ['Vitta', 'Andy', 'Fern', 'Nong']

// ── Stage visual config ───────────────────────────────────────────────────────
const stageConfig: Record<OPStage, { accent: string; dot: string; headerBg: string }> = {
  WON_JOB_LIST:                   { accent: 'border-t-zinc-400',    dot: 'bg-zinc-400',    headerBg: 'bg-zinc-50' },
  OP_PREPARING_AW_DONE:            { accent: 'border-t-blue-400',    dot: 'bg-blue-400',    headerBg: 'bg-blue-50/40' },
  OP_READY_FOR_EVENT:              { accent: 'border-t-emerald-500', dot: 'bg-emerald-500', headerBg: 'bg-emerald-50/40' },
  OP_WAIT_STAFF_PAYMENT_DOC_TERR:  { accent: 'border-t-amber-500',  dot: 'bg-amber-500',   headerBg: 'bg-amber-50/30' },
  OP_DONE_PAYMENT:                 { accent: 'border-t-purple-400',  dot: 'bg-purple-400',  headerBg: 'bg-purple-50/40' },
}

// ── Status chips ──────────────────────────────────────────────────────────────
const paymentColors: Record<PaymentStatus, string> = {
  unpaid: 'bg-red-50 text-red-500',
  partial: 'bg-amber-50 text-amber-600',
  paid: 'bg-emerald-50 text-emerald-600',
  overdue: 'bg-red-100 text-red-600',
}
const staffColors: Record<StaffStatus, string> = {
  pending: 'bg-amber-50 text-amber-600',
  confirmed: 'bg-emerald-50 text-emerald-600',
  na: 'bg-zinc-100 text-zinc-400',
}
const docColors: Record<DocStatus, string> = {
  pending: 'bg-amber-50 text-amber-600',
  ready: 'bg-emerald-50 text-emerald-600',
  na: 'bg-zinc-100 text-zinc-400',
}

function formatCurrency(v: number) {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `฿${(v / 1_000).toFixed(0)}K`
  return `฿${v.toLocaleString()}`
}

/** Card title format: 2026.05.21 - 041 - LCA + Film - EventName@Venue */
function jobCardTitle(job: WonJob) {
  const dateStr = job.event_date
    ? format(parseISO(job.event_date + 'T00:00:00'), 'yyyy.MM.dd')
    : '—'
  return `${dateStr} - ${job.job_number} - ${job.service_type} - ${job.event_name}@${job.venue}`
}

// ── Inline edit ───────────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, multiline = false, placeholder = 'Click to edit…' }: {
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
      className={`bg-white rounded-lg border border-border/70 p-3 cursor-pointer hover:shadow-md transition-all select-none ${isDragging ? 'opacity-30' : ''}`}
    >
      {/* Title */}
      <p className="text-[11px] font-mono text-muted-foreground/60 mb-1">#{job.job_number}</p>
      <p className="text-[12px] font-medium text-foreground leading-snug mb-2 line-clamp-2">{job.event_name}</p>

      {/* Customer + date */}
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-1">
        <User className="w-3 h-3 shrink-0" />
        <span className="truncate">{job.customer_name}</span>
      </div>
      {job.event_date && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-2">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{format(parseISO(job.event_date + 'T00:00:00'), 'dd MMM yyyy')}</span>
        </div>
      )}

      {/* Service tag + value */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{job.service_type}</span>
        <span className="text-xs font-bold text-foreground">{formatCurrency(job.estimated_value)}</span>
      </div>

      {/* Status chips */}
      <div className="flex gap-1 flex-wrap">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${paymentColors[job.payment_status]}`}>
          💰 {job.payment_status}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${staffColors[job.staff_status]}`}>
          👥 {job.staff_status}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${docColors[job.doc_status]}`}>
          📄 {job.doc_status}
        </span>
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
      className={`flex flex-col min-w-[230px] max-w-[230px] rounded-xl border border-border/60 border-t-2 ${cfg.accent} ${isOver ? 'bg-muted/50' : 'bg-muted/20'} transition-colors`}
    >
      {/* Header */}
      <div className={`px-3 pt-3 pb-2 rounded-t-xl ${cfg.headerBg}`}>
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
            <p className="text-[11px] font-semibold text-foreground leading-tight">{OP_STAGE_LABELS[stage]}</p>
          </div>
          <span className="text-[11px] font-semibold bg-white/70 text-muted-foreground w-5 h-5 rounded-full flex items-center justify-center shrink-0">
            {jobs.length}
          </span>
        </div>
        {jobs.length > 0 && (
          <p className="text-[10px] text-muted-foreground pl-3.5">{formatCurrency(totalValue)}</p>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-3 pt-2 space-y-2 min-h-[80px]">
        {jobs.map((job) => (
          <JobCard
            key={job.job_id}
            job={job}
            onClick={() => onCardClick(job)}
            isDragging={activeId === job.job_id}
          />
        ))}
        {jobs.length === 0 && (
          <div className={`flex items-center justify-center rounded-lg border-2 border-dashed h-16 transition-colors ${isOver ? 'border-primary/40 bg-primary/5' : 'border-border/40'}`}>
            <p className="text-[11px] text-muted-foreground/40">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Job detail drawer ─────────────────────────────────────────────────────────
function JobDetail({ job, onClose }: { job: WonJob; onClose: () => void }) {
  const { updateWonJob, moveWonJobStage } = useCRMStore()

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-mono text-muted-foreground">Job #{job.job_number}</p>
            <SheetTitle className="text-base leading-snug">{job.event_name}</SheetTitle>
            <p className="text-[11px] font-mono text-muted-foreground/60 break-all">{jobCardTitle(job)}</p>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Stage selector */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">OP Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {OP_STAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => moveWonJobStage(job.job_id, s)}
                  className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
                    job.op_stage === s
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {OP_STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Key details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Customer</p>
              <p className="text-sm font-medium">{job.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contact</p>
              <p className="text-sm font-medium">{job.contact_person || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Service</p>
              <p className="text-sm font-medium">{job.service_type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Value</p>
              <p className="text-lg font-bold">{formatCurrency(job.estimated_value)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Event Date</p>
              <p className="text-sm">
                {job.event_date ? format(parseISO(job.event_date + 'T00:00:00'), 'EEEE, dd MMMM yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Venue</p>
              <InlineEdit
                value={job.venue}
                placeholder="Add venue…"
                onSave={(v) => updateWonJob(job.job_id, { venue: v })}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Owner</p>
              <Select value={job.owner} onValueChange={(v) => v && updateWonJob(job.job_id, { owner: v })}>
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

          {/* Status fields */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Payment
                </p>
                <Select value={job.payment_status} onValueChange={(v) => v && updateWonJob(job.job_id, { payment_status: v as PaymentStatus })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Staff
                </p>
                <Select value={job.staff_status} onValueChange={(v) => v && updateWonJob(job.job_id, { staff_status: v as StaffStatus })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Docs
                </p>
                <Select value={job.doc_status} onValueChange={(v) => v && updateWonJob(job.job_id, { doc_status: v as DocStatus })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="ready">Ready</SelectItem>
                    <SelectItem value="na">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
            <InlineEdit
              value={job.notes}
              placeholder="Click to add notes…"
              multiline
              onSave={(v) => updateWonJob(job.job_id, { notes: v })}
            />
          </div>

          {/* Activity logger */}
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Activity</p>
            <AddActivityForm entityType="won_job" entityId={job.job_id} owner={job.owner} />
          </div>

          {/* Activity timeline */}
          <Separator />
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">History</p>
            <ActivityTimeline entityType="won_job" entityId={job.job_id} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WonReadyOpPage() {
  const { wonJobs, moveWonJobStage } = useCRMStore()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<WonJob | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeJob = activeId ? wonJobs.find((j) => j.job_id === activeId) : null

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const stage = over.id as OPStage
    if (OP_STAGES.includes(stage)) {
      moveWonJobStage(active.id as string, stage)
    }
  }

  const activeCount = wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT').length
  const totalValue = wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT').reduce((s, j) => s + j.estimated_value, 0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Won & Ready for OP"
        description={`${activeCount} active jobs · ${formatCurrency(totalValue)} in pipeline`}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-4 p-6 h-full min-w-max">
            {OP_STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                jobs={wonJobs.filter((j) => j.op_stage === stage)}
                onCardClick={setSelected}
                activeId={activeId}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeJob && (
            <div className="bg-white rounded-lg border border-primary/30 shadow-xl p-3 w-[230px] opacity-95">
              <p className="text-[11px] font-mono text-muted-foreground/60 mb-1">#{activeJob.job_number}</p>
              <p className="text-[12px] font-medium text-foreground leading-snug">{activeJob.event_name}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{activeJob.customer_name}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {selected && <JobDetail job={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
