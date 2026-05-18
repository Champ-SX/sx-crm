'use client'

import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { OP_STAGE_LABELS, OP_STAGES } from '@/types'
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns'
import {
  Users,
  FileText,
  Kanban,
  CheckSquare,
  CalendarDays,
  TrendingUp,
  MapPin,
  User,
} from 'lucide-react'
import Link from 'next/link'

const stageColors: Record<string, string> = {
  WON_JOB_LIST: 'bg-zinc-100 text-zinc-600',
  OP_PREPARING_AW_DONE: 'bg-blue-50 text-blue-600',
  OP_READY_FOR_EVENT: 'bg-emerald-50 text-emerald-600',
  OP_WAIT_STAFF_PAYMENT_DOC_TERR: 'bg-amber-50 text-amber-600',
  OP_DONE_PAYMENT: 'bg-purple-50 text-purple-600',
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  sub?: string
  href: string
  accent?: string
}) {
  return (
    <Link href={href} className="block">
      <div className="bg-white border border-border/60 rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all group">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{label}</p>
            <p className={`text-3xl font-bold ${accent ?? 'text-foreground'}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-primary/10' : 'bg-muted'}`}>
            <Icon className={`w-5 h-5 ${accent ?? 'text-muted-foreground'}`} />
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function DashboardPage() {
  const { customers, leadOpportunities, wonJobs, tasks } = useCRMStore()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in30Days = addDays(today, 30)

  // Stats
  const openLeads = leadOpportunities.filter((l) => l.status === 'open').length
  const totalWonJobs = wonJobs.length
  const pendingTasks = tasks.filter((t) => t.status !== 'done' && t.due_date <= todayStr).length

  // OP stage counts (exclude done)
  const stageCounts = OP_STAGES.map((stage) => ({
    stage,
    label: OP_STAGE_LABELS[stage],
    count: wonJobs.filter((j) => j.op_stage === stage).length,
  }))

  // Upcoming events (jobs with event_date in next 30 days, not done payment)
  const upcomingJobs = wonJobs
    .filter((j) => {
      if (!j.event_date) return false
      const d = parseISO(j.event_date + 'T00:00:00')
      return isAfter(d, today) && isBefore(d, in30Days)
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const totalPipelineValue = leadOpportunities
    .filter((l) => l.status === 'open')
    .reduce((s, l) => s + l.estimated_value, 0)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader title="Dashboard" description={`${format(today, 'EEEE, MMMM d, yyyy')}`} />

      <div className="p-8 space-y-8">
        {/* Top stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Customers"
            value={customers.length}
            sub="in your database"
            href="/customers"
          />
          <StatCard
            icon={FileText}
            label="Open Leads / Opps"
            value={openLeads}
            sub={`฿${(totalPipelineValue / 1000).toFixed(0)}K pipeline`}
            href="/leads-opportunities"
            accent="text-primary"
          />
          <StatCard
            icon={Kanban}
            label="Active OP Jobs"
            value={wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT').length}
            sub={`${totalWonJobs} total won jobs`}
            href="/won-ready-op"
            accent="text-emerald-600"
          />
          <StatCard
            icon={CheckSquare}
            label="Tasks Due"
            value={pendingTasks}
            sub="overdue or due today"
            href="/tasks"
            accent={pendingTasks > 0 ? 'text-red-500' : 'text-foreground'}
          />
        </div>

        {/* OP Pipeline breakdown */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Kanban className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">OP Pipeline</h2>
            <Link href="/won-ready-op" className="text-xs text-primary hover:underline ml-auto">
              View board →
            </Link>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {stageCounts.map(({ stage, label, count }) => (
              <Link key={stage} href="/won-ready-op">
                <div className="bg-white border border-border/60 rounded-xl p-4 hover:shadow-sm transition-all text-center">
                  <p className={`text-2xl font-bold mb-1 ${count > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                    {count}
                  </p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block leading-relaxed ${stageColors[stage]}`}>
                    {label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Upcoming Events</h2>
            <span className="text-xs text-muted-foreground">next 30 days</span>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="bg-white border border-border/60 rounded-xl p-8 text-center">
              <CalendarDays className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming events in the next 30 days.</p>
            </div>
          ) : (
            <div className="bg-white border border-border/60 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Job</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Service</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Venue</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Stage</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingJobs.map((job) => (
                    <tr key={job.job_id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3">
                        <p className="text-sm font-semibold text-primary">
                          {format(parseISO(job.event_date + 'T00:00:00'), 'dd MMM')}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(job.event_date + 'T00:00:00'), 'yyyy')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{job.event_name}</p>
                        <p className="text-xs text-muted-foreground">{job.customer_name} · #{job.job_number}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">
                          {job.service_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="text-xs truncate max-w-[140px]">{job.venue}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stageColors[job.op_stage]}`}>
                          {OP_STAGE_LABELS[job.op_stage]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {job.owner}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
