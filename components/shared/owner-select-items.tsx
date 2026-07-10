'use client'

import { SelectItem } from '@/components/ui/select'
import { useCRMStore } from '@/store/crm-store'
import { UserAvatar } from '@/components/shared/user-avatar'

/**
 * Renders <SelectItem>s for every team member (signed-in user), sourced from the
 * store's `teamMembers` — the Supabase `users` table in production, or the mock
 * team locally. Replaces the old hardcoded OWNERS array so owner dropdowns stay
 * in sync with who has actually signed in. Owner value is the member's name
 * (falling back to email), matching how `owner` is stored on records.
 */
export function OwnerSelectItems({ className }: { className?: string }) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  return (
    <>
      {teamMembers.map((m) => {
        const name = m.name || m.email
        return (
          <SelectItem key={m.id} value={name} className={className}>
            <span className="inline-flex items-center gap-1.5">
              <UserAvatar name={name} size={18} />
              {name}
            </span>
          </SelectItem>
        )
      })}
    </>
  )
}
