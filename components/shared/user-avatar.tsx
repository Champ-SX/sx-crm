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

  // Stable per-person colour from the name, so different people read as
  // different avatars at a glance (Google photo still wins above).
  const bg = AVATAR_COLORS[hashString(lower) % AVATAR_COLORS.length]
  return (
    <span
      title={name}
      style={{ ...dims, fontSize: Math.max(9, Math.round(size * 0.45)), backgroundColor: bg, color: '#fff' }}
      className={`rounded-full font-semibold inline-flex items-center justify-center shrink-0 ${className}`}
    >
      {initial}
    </span>
  )
}

// Muted, distinct palette (readable with white initials, works on cream + dark).
const AVATAR_COLORS = ['#C9772E', '#3F6EA5', '#7A5AA5', '#3F9D5B', '#B8543F', '#5A7D3F', '#2E8A9A', '#9A6B2E']
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
