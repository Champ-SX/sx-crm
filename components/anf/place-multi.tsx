'use client'

import { ALL_BRANCHES, ALL_ROOMS, joinPlaces, splitPlaces, type AnfPlace } from '@/lib/supabase/anf-tasks'
import { cn } from '@/lib/utils'

/** Rooms that belong to the picked branches (all rooms when "All branches" or none picked). */
export function roomsFor(places: AnfPlace[], branchValue: string | null | undefined): AnfPlace[] {
  const picked = splitPlaces(branchValue)
  const ids = places.filter((p) => p.kind === 'branch' && picked.includes(p.name)).map((p) => p.place_id)
  const any = !ids.length || picked.includes(ALL_BRANCHES)
  return places.filter((p) => p.kind === 'room' && (any || !p.branch_id || ids.includes(p.branch_id)))
}

/** Chip multi-select with an "All …" chip. Value is "BACC, BTT", "All branches" or null. */
export function PlaceMulti({ value, options, allLabel, onChange, label }: {
  value: string | null | undefined; options: string[]; allLabel: typeof ALL_BRANCHES | typeof ALL_ROOMS
  onChange: (v: string | null) => void; label: string
}) {
  const picked = splitPlaces(value)
  const isAll = picked.includes(allLabel)
  const extra = picked.filter((p) => p !== allLabel && !options.includes(p))   // old / renamed names
  const toggle = (name: string) => {
    if (name === allLabel) return onChange(isAll ? null : allLabel)
    const base = picked.filter((p) => p !== allLabel)
    onChange(joinPlaces(base.includes(name) ? base.filter((p) => p !== name) : [...base, name]))
  }
  const chip = (name: string, on: boolean) => (
    <button key={name} type="button" onClick={() => toggle(name)} aria-pressed={on}
      className={cn('rounded-full border px-2.5 py-0.5 text-[12.5px] font-medium transition-colors',
        on ? 'border-[#7A5AA5] bg-[#7A5AA5] text-white' : 'border-border bg-background text-foreground hover:border-foreground/30')}>
      {on && '✓ '}{name}
    </button>
  )
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {chip(allLabel, isAll)}
      {!isAll && [...options, ...extra].map((o) => chip(o, picked.includes(o)))}
    </div>
  )
}
