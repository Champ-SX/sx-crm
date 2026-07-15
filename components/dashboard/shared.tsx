'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// ── Stage styling (shared across dashboards) ────────────────────────────────────
export const stageConfig: Record<string, { label: string; dot: string; badge: string }> = {
  WON_JOB_LIST:                    { label: 'Won Job List',     dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600' },
  OP_PREPARING_AW_DONE:            { label: 'OP Preparing',     dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-600' },
  OP_READY_FOR_EVENT:              { label: 'Ready for Event',  dot: 'bg-teal-400',    badge: 'bg-teal-50 text-teal-600' },
  OP_WAIT_STAFF_PAYMENT_DOC_TERR:  { label: 'Wait Staff / Pay', dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  OP_DONE_PAYMENT:                 { label: 'Done Payment',     dot: 'bg-purple-400',  badge: 'bg-purple-50 text-purple-600' },
}

// ── Stat card ──────────────────────────────────────────────────────────────────
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  iconBg,
  iconColor,
  valueColor,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  href: string
  iconBg: string
  iconColor: string
  valueColor?: string
}) {
  return (
    <Link href={href} className="block group">
      <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-border/80 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className={`text-2xl font-bold leading-none mb-1 ${valueColor ?? 'text-foreground'}`}>{value}</p>
        <p className="text-[12px] font-medium text-muted-foreground leading-none mb-1">{label}</p>
        {sub && <p className="text-[12px] text-muted-foreground/80 leading-snug mt-1">{sub}</p>}
      </div>
    </Link>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
export function SectionHeader({ icon: Icon, title, sub, href, linkLabel }: {
  icon: React.ElementType
  title: string
  sub?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <h2 className="text-[13px] font-semibold text-foreground">{title}</h2>
      {sub && <span className="text-[12px] text-muted-foreground">{sub}</span>}
      {href && (
        <Link href={href} className="ml-auto text-[12px] font-medium text-primary hover:underline flex items-center gap-0.5">
          {linkLabel ?? 'View all'} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

// ── Status dot ──────────────────────────────────────────────────────────────────
export function StatusDot({ color }: { color: string }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0`} />
}

// ── Currency helper (Thai Baht, K-formatted) ─────────────────────────────────────
export function fmtBaht(value: number): string {
  if (!value) return '—'
  return `฿${(value / 1000).toFixed(0)}K`
}
