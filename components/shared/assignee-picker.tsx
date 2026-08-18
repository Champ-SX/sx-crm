'use client'

import { Check, Plus, UserPlus, Users, User } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

/**
 * Assign-to control: an avatar stack of the assigned members plus a "+" that
 * opens a multi-select of the team roster. Value/onChange are users.id[].
 * Shared by Lead and Won detail drawers.
 */
export function AssigneePicker({
  value,
  onChange,
  size = 24,
}: {
  value: string[] | null | undefined
  onChange: (ids: string[]) => void
  size?: number
}) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const ids = value ?? []
  const assigned = teamMembers.filter((m) => ids.includes(m.id))

  function toggle(id: string) {
    onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  }

  return (
    <div className="flex items-center gap-2">
      {assigned.length > 0 && (
        <div className="flex -space-x-1.5">
          {assigned.map((m) => (
            <div key={m.id} className="ring-2 ring-card rounded-full" title={m.name || m.email}>
              <UserAvatar name={m.name || m.email} size={size} />
            </div>
          ))}
        </div>
      )}

      <Popover>
        <PopoverTrigger
          render={
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-dashed border-border text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {assigned.length > 0 ? <Plus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              {assigned.length > 0 ? 'Edit' : 'Assign'}
            </button>
          }
        />
        <PopoverContent align="start" className="w-60 p-1.5 gap-1">
          <p className="px-2 py-1 text-[12px] font-semibold text-muted-foreground">Assign to</p>
          <div className="max-h-64 overflow-y-auto flex flex-col">
            {teamMembers.length === 0 && (
              <p className="px-2 py-2 text-[12px] text-muted-foreground">No team members yet.</p>
            )}
            {teamMembers.map((m) => {
              const on = ids.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${on ? 'bg-primary/10' : 'hover:bg-muted'}`}
                >
                  <UserAvatar name={m.name || m.email} size={22} />
                  <span className="flex-1 min-w-0 truncate font-medium">{m.name || m.email}</span>
                  <span className="text-[12px] text-muted-foreground capitalize">{m.role}</span>
                  {on && <Check className="w-4 h-4 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export const ASSIGNEE_FILTER_ALL = 'all'
export const ASSIGNEE_FILTER_ME = '__me__'

/**
 * Assignee filter dropdown: All · Assigned to me · <each member>.
 * Value is 'all', '__me__', or a member id. `meId` is the signed-in user's id.
 */
export function AssigneeFilter({
  value,
  onChange,
  meId,
  className,
}: {
  value: string
  onChange: (v: string) => void
  meId?: string | null
  className?: string
}) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  const meName = meId ? (teamMembers.find((m) => m.id === meId)?.name ?? null) : null
  const selected = value === ASSIGNEE_FILTER_ALL || value === ASSIGNEE_FILTER_ME
    ? null
    : teamMembers.find((m) => m.id === value)
  const selectedLabel =
    value === ASSIGNEE_FILTER_ALL
      ? 'All assignees'
      : value === ASSIGNEE_FILTER_ME
        ? 'Assigned to me'
        : (selected?.name ?? 'Assignee')

  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? ASSIGNEE_FILTER_ALL)}>
      <SelectTrigger className={className ?? 'w-[150px] h-8 text-[12px] bg-muted border-border'}>
        <span className="inline-flex items-center gap-1.5 min-w-0">
          {selected && <UserAvatar name={selected.name || selected.email} size={16} />}
          <span className="truncate">{selectedLabel}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ASSIGNEE_FILTER_ALL} className="text-[12px]">
          <span className="inline-flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />All assignees
          </span>
        </SelectItem>
        {meId && (
          <SelectItem value={ASSIGNEE_FILTER_ME} className="text-[12px]">
            <span className="inline-flex items-center gap-2">
              {meName ? <UserAvatar name={meName} size={18} /> : <User className="w-4 h-4 text-muted-foreground shrink-0" />}
              Assigned to me
            </span>
          </SelectItem>
        )}
        {teamMembers.map((m) => (
          <SelectItem key={m.id} value={m.id} className="text-[12px]">
            <span className="inline-flex items-center gap-2">
              <UserAvatar name={m.name || m.email} size={18} />{m.name || m.email}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Does a card with these assignee_ids match the given filter value? */
export function matchesAssigneeFilter(
  assigneeIds: string[] | null | undefined,
  filter: string,
  meId?: string | null,
): boolean {
  if (filter === ASSIGNEE_FILTER_ALL) return true
  const ids = assigneeIds ?? []
  if (filter === ASSIGNEE_FILTER_ME) return meId ? ids.includes(meId) : false
  return ids.includes(filter)
}
