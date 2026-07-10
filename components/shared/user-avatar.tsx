'use client'

import { useCRMStore } from '@/store/crm-store'

/**
 * Small circular avatar for a user/owner/author, looked up by name (or email)
 * against the team registry. Shows the person's Google profile picture when
 * available, else a colored initials circle. Used wherever a user name appears
 * (owner dropdowns, activity authors, dashboards, notifications, mentions).
 */
export function UserAvatar({
  name,
  size = 20,
  className = '',
}: {
  name?: string | null
  size?: number
  className?: string
}) {
  const teamMembers = useCRMStore((s) => s.teamMembers)
  if (!name) return null

  const lower = name.trim().toLowerCase()
  const member = teamMembers.find(
    (m) => m.name === name || m.email === name || (m.name || '').toLowerCase() === lower || (m.email || '').toLowerCase() === lower
  )
  const initial = (name.trim()[0] || '?').toUpperCase()
  const dims = { width: size, height: size }

  if (member?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatar_url}
        alt={name}
        title={name}
        referrerPolicy="no-referrer"
        style={dims}
        className={`rounded-full object-cover shrink-0 ${className}`}
      />
    )
  }

  return (
    <span
      title={name}
      style={{ ...dims, fontSize: Math.max(9, Math.round(size * 0.45)) }}
      className={`rounded-full bg-primary/10 text-primary font-semibold inline-flex items-center justify-center shrink-0 ${className}`}
    >
      {initial}
    </span>
  )
}
