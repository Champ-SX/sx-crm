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
import { useCRMStore } from '@/store/crm-store'
import { OPPORTUNITY_STAGES } from '@/lib/mock-data'
import { PageHeader } from '@/components/shared/page-header'
import { ActivityTimeline } from '@/components/shared/activity-timeline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import type { Opportunity, OpportunityStage } from '@/types'
import { Calendar, User, Trophy, Target, Pencil, Check, X, Mail, Phone, MessageCircle, Building2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AddActivityForm } from '@/components/shared/add-activity-form'
import { format } from 'date-fns'
import { useDroppable } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`
  return `฿${value.toLocaleString()}`
}

const stageConfig: Record<OpportunityStage, { accent: string; dot: string }> = {
  'New Opportunity': { accent: 'border-t-zinc-300', dot: 'bg-zinc-400' },
  Contacted: { accent: 'border-t-blue-400', dot: 'bg-blue-400' },
  'Requirement Collected': { accent: 'border-t-amber-400', dot: 'bg-amber-400' },
  'Proposal Sent': { accent: 'border-t-indigo-400', dot: 'bg-indigo-400' },
  Negotiation: { accent: 'border-t-purple-400', dot: 'bg-purple-400' },
  Confirmed: { accent: 'border-t-emerald-400', dot: 'bg-emerald-400' },
  Won: { accent: 'border-t-emerald-600', dot: 'bg-emerald-600' },
  Lost: { accent: 'border-t-red-400', dot: 'bg-red-400' },
}

function OppCard({
  opp,
  onClick,
  isDragging,
}: {
  opp: Opportunity
  onClick: () => void
  isDragging?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: opp.opportunity_id })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`bg-white rounded-lg border border-border/70 p-3 cursor-pointer hover:shadow-md transition-all group select-none ${isDragging ? 'opacity-30' : ''}`}
    >
      <p className="text-[13px] font-medium text-foreground leading-snug mb-2 line-clamp-2">{opp.deal_name}</p>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{opp.service_type}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-foreground">{formatCurrency(opp.estimated_value)}</span>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <User className="w-3 h-3" />{opp.owner}
        </div>
      </div>
      {opp.next_follow_up_date && (
        <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground border-t border-border/50 pt-2">
          <Calendar className="w-3 h-3" />
          Follow-up: {format(new Date(opp.next_follow_up_date + 'T00:00:00'), 'MMM d')}
        </div>
      )}
      <div className="mt-1.5">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary/70 rounded-full" style={{ width: `${opp.probability}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-0.5">{opp.probability}% probability</p>
      </div>
    </div>
  )
}

function KanbanColumn({
  stage,
  opportunities,
  onCardClick,
  activeId,
}: {
  stage: OpportunityStage
  opportunities: Opportunity[]
  onCardClick: (opp: Opportunity) => void
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const config = stageConfig[stage]
  const columnValue = opportunities.reduce((s, o) => s + o.estimated_value, 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[220px] max-w-[220px] rounded-xl border border-border/60 border-t-2 ${config.accent} ${isOver ? 'bg-muted/60' : 'bg-muted/20'} transition-colors`}
    >
      {/* Column header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${config.dot}`} />
            <p className="text-[11px] font-semibold text-foreground">{stage}</p>
          </div>
          <span className="text-[11px] font-semibold bg-muted text-muted-foreground w-5 h-5 rounded-full flex items-center justify-center">
            {opportunities.length}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground pl-3.5">{formatCurrency(columnValue)}</p>
      </div>

      {/* Cards */}
      <div className="flex-1 px-2 pb-3 space-y-2 min-h-[80px]">
        {opportunities.map((opp) => (
          <OppCard
            key={opp.opportunity_id}
            opp={opp}
            onClick={() => onCardClick(opp)}
            isDragging={activeId === opp.opportunity_id}
          />
        ))}
        {opportunities.length === 0 && (
          <div className={`flex items-center justify-center rounded-lg border-2 border-dashed h-16 transition-colors ${isOver ? 'border-primary/40 bg-primary/5' : 'border-border/40'}`}>
            <p className="text-[11px] text-muted-foreground/50">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

function InlineEditField({
  value, onSave, placeholder = '—',
}: { value: string; onSave: (v: string) => void; placeholder?: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  function commit() { onSave(draft); setEditing(false) }
  function cancel() { setDraft(value); setEditing(false) }
  if (!editing) {
    return (
      <div className="group flex items-center gap-2 cursor-pointer rounded px-1.5 py-1 -mx-1.5 hover:bg-muted/50 transition-colors"
        onClick={() => { setDraft(value); setEditing(true) }}>
        <span className={`text-sm flex-1 font-medium ${value ? '' : 'text-muted-foreground italic font-normal'}`}>{value || placeholder}</span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
      </div>
    )
  }
  return (
    <div className="space-y-1.5">
      <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} className="h-8 text-sm"
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel() }} />
      <div className="flex gap-1.5">
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={commit}><Check className="w-3 h-3" /> Save</Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancel}><X className="w-3 h-3" /></Button>
      </div>
    </div>
  )
}

function OppDetail({ oppId, onClose }: { oppId: string; onClose: () => void }) {
  const { opportunities, markOpportunityWon, updateOpportunity, customers } = useCRMStore()
  const opp = opportunities.find((o) => o.opportunity_id === oppId)
  const [confirmWon, setConfirmWon] = useState(false)
  if (!opp) return null
  const customer = customers.find((c) => c.customer_id === opp.linked_customer_id)

  function handleMarkWon() {
    if (!opp) return
    markOpportunityWon(opp.opportunity_id)
    setConfirmWon(false)
    onClose()
  }

  return (
    <>
      <Sheet open onOpenChange={onClose}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base leading-snug">{opp.deal_name}</SheetTitle>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{opp.service_type}</span>
                  <span className={`w-2 h-2 rounded-full ${stageConfig[opp.stage]?.dot ?? 'bg-zinc-400'}`} />
                  <span className="text-xs text-muted-foreground">{opp.stage}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold">{formatCurrency(opp.estimated_value)}</p>
                <p className="text-xs text-muted-foreground">{opp.probability}% probability</p>
              </div>
            </div>
          </SheetHeader>

          <div className="px-6 py-5 space-y-5">
            {opp.stage !== 'Won' && opp.stage !== 'Lost' && (
              <Button size="sm" className="w-full gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setConfirmWon(true)}>
                <Trophy className="w-3.5 h-3.5" /> Mark as Won
              </Button>
            )}

            {/* Linked customer card */}
            {customer && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                  {customer.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{customer.name}</p>
                  <p className="text-xs text-muted-foreground">{customer.company_name || customer.customer_type}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  {customer.email && (
                    <a href={`mailto:${customer.email}`} className="text-muted-foreground hover:text-primary">
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {customer.phone && (
                    <a href={`tel:${customer.phone}`} className="text-muted-foreground hover:text-primary">
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {customer.line_id && (
                    <span className="text-muted-foreground"><MessageCircle className="w-3.5 h-3.5" /></span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Owner</p>
                <p className="text-sm font-medium">{opp.owner}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Est. Value</p>
                <InlineEditField
                  value={opp.estimated_value ? `${opp.estimated_value}` : ''}
                  placeholder="Enter value…"
                  onSave={(v) => updateOpportunity(opp.opportunity_id, { estimated_value: Number(v.replace(/[^0-9]/g, '')) || 0 })}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Event Date</p>
                <p className="text-sm">{opp.event_date ? format(new Date(opp.event_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Expected Close</p>
                <p className="text-sm">{opp.expected_close_date ? format(new Date(opp.expected_close_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}</p>
              </div>
            </div>

            <Separator />

            {/* Next action — inline editable */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <Target className="w-3 h-3" /> Next Action
              </p>
              <InlineEditField
                value={opp.next_action}
                placeholder="What's the next step?"
                onSave={(v) => updateOpportunity(opp.opportunity_id, { next_action: v })}
              />
              {opp.next_follow_up_date && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(opp.next_follow_up_date + 'T00:00:00'), 'MMM d, yyyy')}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Probability</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${opp.probability}%` }} />
                </div>
                <span className="text-sm font-semibold w-10 text-right">{opp.probability}%</span>
              </div>
            </div>

            {/* Notes — inline editable */}
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
              <InlineEditField
                value={opp.notes}
                placeholder="Add notes…"
                onSave={(v) => updateOpportunity(opp.opportunity_id, { notes: v })}
              />
            </div>

            {/* Activity logger */}
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Log Activity</p>
              <AddActivityForm entityType="opportunity" entityId={opp.opportunity_id} owner={opp.owner} />
            </div>

            {/* Activity timeline */}
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">History</p>
              <ActivityTimeline entityType="opportunity" entityId={opp.opportunity_id} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={confirmWon} onOpenChange={setConfirmWon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Won 🎉</DialogTitle>
            <DialogDescription>
              Mark <strong>{opp.deal_name}</strong> as Won? This will create a Won Deck record automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmWon(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleMarkWon}>Mark as Won</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function OpportunitiesPage() {
  const { opportunities, moveOpportunityStage } = useCRMStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeOpp = opportunities.find((o) => o.opportunity_id === activeId)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return
    const overId = String(over.id)
    if ((OPPORTUNITY_STAGES as readonly string[]).includes(overId)) {
      moveOpportunityStage(active.id as string, overId as OpportunityStage)
    }
  }

  const openOpps = opportunities.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost')
  const totalValue = openOpps.reduce((s, o) => s + o.estimated_value, 0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Opportunities"
        description={`${openOpps.length} open · ${formatCurrency(totalValue)} pipeline`}
      />

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full min-w-max pb-2">
            {OPPORTUNITY_STAGES.map((stage) => {
              const stageOpps = opportunities.filter((o) => o.stage === stage)
              return (
                <KanbanColumn
                  key={stage}
                  stage={stage as OpportunityStage}
                  opportunities={stageOpps}
                  onCardClick={(opp) => setSelectedId(opp.opportunity_id)}
                  activeId={activeId}
                />
              )
            })}
          </div>

          <DragOverlay>
            {activeOpp && (
              <div className="bg-white rounded-lg border border-border shadow-lg p-3 w-[220px] opacity-95">
                <p className="text-[13px] font-medium leading-snug mb-1">{activeOpp.deal_name}</p>
                <p className="text-sm font-bold">{formatCurrency(activeOpp.estimated_value)}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedId && <OppDetail oppId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
