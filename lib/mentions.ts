import type { TeamMember } from '@/types'

/**
 * Find which team members are @mentioned in a block of text.
 * Matches `@Name` where Name is a team member's display name (case-insensitive).
 * Longest names are matched first so "@Andy Fine" wins over "@Andy".
 */
export function parseMentions(text: string, teamMembers: TeamMember[]): TeamMember[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const byLongest = [...teamMembers].sort(
    (a, b) => (b.name || b.email).length - (a.name || a.email).length
  )
  const found: TeamMember[] = []
  for (const m of byLongest) {
    const handle = '@' + (m.name || m.email).toLowerCase()
    if (lower.includes(handle) && !found.some((f) => f.id === m.id)) {
      found.push(m)
    }
  }
  return found
}

/**
 * Email notification — DEFERRED. In production this will call the chosen email
 * provider (Resend / SendGrid / Mailgun) to email the mentioned person at their
 * Google address, and record an email_logs row. For now it just logs so the
 * mention flow is complete locally without an external dependency.
 */
export async function notifyByEmail(opts: {
  to: string
  recipientName: string
  actor: string
  entityName: string
  message: string
}): Promise<void> {
  // TODO(Phase 2.3 email): wire real provider + email_logs once a provider is chosen.
  console.log('[notifyByEmail] (stub) would email', opts.to, '—', `${opts.actor} mentioned ${opts.recipientName}: "${opts.message}"`)
}
