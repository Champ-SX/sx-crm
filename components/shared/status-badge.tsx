import { cn } from '@/lib/utils'

type StatusVariant =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'won'
  | 'lost'
  | 'confirmed'
  | 'brand'
  | 'agency'
  | 'venue'
  | 'organizer'
  | 'individual'
  | 'partner'
  | 'paid'
  | 'pending'
  | 'sent'
  | 'overdue'
  | string

// CAP*TURES: neutral pill + mono label + a meaning-coded dot.
// green = good/done, orange = attention, lemon = new/fresh, grey = category/dormant.
const LEMON = '#D7FE3A', ORANGE = '#FF5B3F', GREEN = '#3f9d5b', GREY = '#9a968d'
const dotMap: Record<string, string> = {
  new: LEMON, sent: LEMON,
  qualified: GREEN, won: GREEN, paid: GREEN, confirmed: GREEN,
  contacted: ORANGE, pending: ORANGE, overdue: ORANGE,
  lost: GREY, unqualified: GREY,
  brand: GREY, agency: GREY, venue: GREY, organizer: GREY, individual: GREY, partner: GREY,
}

const labelMap: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  unqualified: 'Unqualified',
  won: 'Won',
  lost: 'Lost',
  confirmed: 'Confirmed',
  brand: 'Brand',
  agency: 'Agency',
  venue: 'Venue',
  organizer: 'Organizer',
  individual: 'Individual',
  partner: 'Partner',
  paid: 'Paid',
  pending: 'Pending',
  sent: 'Sent',
  overdue: 'Overdue',
}

interface StatusBadgeProps {
  status: StatusVariant
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase()
  const dot = dotMap[key] ?? GREY
  const label = labelMap[key] ?? status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-foreground bg-muted/60 border border-border rounded-full px-2 py-0.5',
        className,
      )}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dot, boxShadow: dot === LEMON ? '0 0 0 1px rgba(10,10,10,.2)' : undefined }}
      />
      {label}
    </span>
  )
}
