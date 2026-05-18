import { Badge } from '@/components/ui/badge'
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

const variantMap: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  contacted: 'bg-amber-50 text-amber-700 border-amber-200',
  qualified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  unqualified: 'bg-zinc-100 text-zinc-500 border-zinc-200',
  won: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  lost: 'bg-red-50 text-red-600 border-red-200',
  confirmed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  brand: 'bg-orange-50 text-orange-700 border-orange-200',
  agency: 'bg-purple-50 text-purple-700 border-purple-200',
  venue: 'bg-sky-50 text-sky-700 border-sky-200',
  organizer: 'bg-teal-50 text-teal-700 border-teal-200',
  individual: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  partner: 'bg-pink-50 text-pink-700 border-pink-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  overdue: 'bg-red-50 text-red-600 border-red-200',
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
  const classes = variantMap[key] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'
  const label = labelMap[key] ?? status

  return (
    <Badge
      variant="outline"
      className={cn('text-[11px] font-medium px-2 py-0.5 capitalize border', classes, className)}
    >
      {label}
    </Badge>
  )
}
