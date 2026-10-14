'use client'

import { format, parseISO } from 'date-fns'
import { CheckSquare, Repeat } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { UserAvatar } from '@/components/shared/user-avatar'
import { WAITING_REASONS, checklistProgress, type AnfTask, type AnfTaskType } from '@/lib/supabase/anf-tasks'
import type { TeamMember } from '@/types'
import { TypePill, LevelPill, placeLine, typeOf } from './task-ui'

const today = () => format(new Date(), 'yyyy-MM-dd')

export function TaskCard({ t, types, people, onOpen, compact }: {
  t: AnfTask; types: AnfTaskType[]; people: TeamMember[]; onOpen: () => void; compact?: boolean
}) {
  const type = typeOf(types, t.type_id)
  const prog = checklistProgress(t)
  const overdue = t.due_date && t.column_id !== 'solved' && t.due_date < today()
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      style={{ borderLeftColor: type?.color ?? '#888780' }}
      className={cn('rounded-lg border border-border border-l-4 bg-card p-2.5 cursor-pointer hover:border-foreground/25 transition-colors text-left min-w-0 select-none',
        t.column_id === 'solved' && 'opacity-80')}>
      <div className="flex flex-wrap gap-1">
        <TypePill type={type} /><LevelPill level={t.issue_level} />
        {t.tags.includes('Repeating') && <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-px text-[11px] font-medium text-amber-800 dark:text-amber-300" title="Repeat issue"><Repeat className="w-3 h-3" />Repeat</span>}
      </div>
      <div className={cn('font-semibold leading-snug mt-1 [overflow-wrap:anywhere]', compact ? 'text-[12px] line-clamp-2' : 'text-[13px]')}>{t.name}</div>
      {placeLine(t) && <div className="text-[11px] text-muted-foreground truncate">{placeLine(t)}</div>}
      {t.column_id === 'waiting' && t.waiting_reason && (
        <div className="text-[11px] text-blue-700 dark:text-blue-400 truncate">⏳ {WAITING_REASONS.find((r) => r.id === t.waiting_reason)?.label}{t.waiting_note && ` · ${t.waiting_note}`}</div>
      )}
      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
        {t.due_date && <span className={cn(overdue && 'text-red-600 font-semibold')}>{t.column_id === 'solved' ? '✓ ' : 'due '}{format(parseISO(t.due_date + 'T00:00:00'), 'd MMM')}</span>}
        {prog.total > 0 && <span className={cn('inline-flex items-center gap-0.5', prog.done === prog.total && 'text-emerald-600')}><CheckSquare className="w-3 h-3" />{prog.done}/{prog.total}</span>}
        <span className="ml-auto flex -space-x-1.5">
          {people.slice(0, 3).map((m) => <span key={m.id} className="rounded-full ring-2 ring-card"><UserAvatar name={m.name || m.email} size={18} /></span>)}
        </span>
      </div>
    </div>
  )
}

/** Draggable + sortable wrapper (same behaviour as Won board cards). */
export function SortableTask({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn('touch-manipulation', isDragging && 'opacity-30')}>
      {children}
    </div>
  )
}

/** A column you can drop into (also when it's empty). */
export function DropColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef}
      className={cn('w-[84vw] sm:w-[280px] shrink-0 rounded-2xl bg-muted/50 p-2.5 max-h-full flex flex-col transition-colors', isOver && 'ring-2 ring-[#FF809E]/50 bg-muted')}>
      {children}
    </div>
  )
}
