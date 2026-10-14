'use client'

import { cn } from '@/lib/utils'
import { ISSUE_LEVELS, AREAS, type AnfTask, type AnfTaskType, type IssueLevel } from '@/lib/supabase/anf-tasks'

export function typeOf(types: AnfTaskType[], id: string | null | undefined) {
  return types.find((t) => t.type_id === id)
}

export function TypePill({ type }: { type?: AnfTaskType }) {
  if (!type) return null
  return (
    <span className="inline-flex items-center rounded px-1.5 py-px text-[11px] font-medium"
      style={{ backgroundColor: `${type.color}22`, color: type.color }}>
      {type.name}
    </span>
  )
}

export function LevelPill({ level }: { level: IssueLevel | null }) {
  const l = ISSUE_LEVELS.find((x) => x.id === level)
  if (!l) return null
  return <span className={cn('inline-flex items-center rounded px-1.5 py-px text-[11px] font-medium', l.cls)}>🚩 {l.label}</span>
}

export function areaLabel(id: string | null) {
  return AREAS.find((a) => a.id === id)?.label ?? null
}

export function placeLine(t: Pick<AnfTask, 'branch' | 'room'>) {
  return [t.branch, t.room].filter(Boolean).join(' · ')
}

/** Option chip used by the form pickers. */
export function Chip({ on, onClick, children, className }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors',
        on ? 'border-foreground bg-foreground/5 font-medium' : 'border-border hover:border-foreground/30', className)}>
      {children}
    </button>
  )
}
