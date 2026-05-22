'use client'

import { useCRMStore } from '@/store/crm-store'
import { OP_STAGE_LABELS, OP_STAGES } from '@/types'
import { format, parseISO, addDays } from 'date-fns'
import {
  Users,
  FileText,
  Kanban,
  CheckSquare,
  CalendarDays,
  TrendingUp,
  MapPin,
  User,
  Trophy,
  ArrowRight,
  Clock,
  Building2,
  Menu,
} from 'lucide-react'
import Link from 'next/link'
import { useMobileNav } from '@/components/layout/mobile-nav-context'

function MobileMenuButton() {
  const { setOpen } = useMobileNav()
  return (
    <button
      onClick={() => setOpen(true)}
      className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}

// ── Stage styling ──────────────────────────────────────────────────────────────
const stageConfig: Record<string, { label: string; dot: string; badge: string }> = {
  WON_JOB_LIST:                    { label: 'Won Job List',     dot: 'bg-slate-400',   badge: 'bg-slate-50 text-slate-600' },
  OP_PREPARING_AW_DONE:            { label: 'OP Preparing',     dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-600' },
  OP_READY_FOR_EVENT:              { label: 'Ready for Event',  dot: 'bg-teal-400',    badge: 'bg-teal-50 text-teal-600' },
  OP_WAIT_STAFF_PAYMENT_DOC_TERR:  { label: 'Wait Staff / Pay', dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700' },
  OP_DONE_PAYMENT:                 { label: 'Done Payment',     dot: 'bg-purple-400',  badge: 'bg-purple-50 text-purple-600' },
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({
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
      <div className="bg-white border border-border rounded-xl p-5 hover:shadow-md hover:border-border/80 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon className={`w-4 h-4 ${iconColor}`} />
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className={`text-2xl font-bold leading-none mb-1 ${valueColor ?? 'text-slate-800'}`}>{value}</p>
        <p className="text-[11px] font-medium text-slate-500 leading-none mb-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 leading-snug mt-1">{sub}</p>}
      </div>
    </Link>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, sub, href, linkLabel }: {
  icon: React.ElementType
  title: string
  sub?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-slate-400" />
      <h2 className="text-[13px] font-semibold text-slate-700">{title}</h2>
      {sub && <span className="text-[11px] text-slate-400">{sub}</span>}
      {href && (
        <Link href={href} className="ml-auto text-[11px] font-medium text-primary hover:underline flex items-center gap-0.5">
          {linkLabel ?? 'View all'} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

// ── Status dot ──────────────────────────────────────────────────────────────────
function StatusDot({ color }: { color: string }) {
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0`} />
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { customers, leadOpportunities, wonJobs, tasks, activities } = useCRMStore()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in30Days = addDays(today, 30)
  const in30DaysStr = format(in30Days, 'yyyy-MM-dd')

  // Stats
  const openLeads = leadOpportunities.filter((l) => l.status === 'open')
  const totalPipelineValue = openLeads.reduce((s, l) => s + l.estimated_value, 0)
  const pendingTasks = tasks.filter((t) => t.status !== 'done' && t.due_date <= todayStr)
  const activeOPJobs = wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT')
  const wonThisMonth = wonJobs.filter((j) => {
    const m = new Date(j.created_at).getMonth()
    const y = new Date(j.created_at).getFullYear()
    return m === today.getMonth() && y === today.getFullYear()
  })
  const revenueThisMonth = wonThisMonth.reduce((s, j) => s + (j.estimated_value ?? 0), 0)

  // Pipeline breakdown
  const stageCounts = OP_STAGES.map((stage) => ({
    stage,
    ...stageConfig[stage],
    count: wonJobs.filter((j) => j.op_stage === stage).length,
  }))

  // Upcoming events
  const upcomingJobs = wonJobs
    .filter((j) => j.event_date && j.event_date >= todayStr && j.event_date <= in30DaysStr)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))
    .slice(0, 6)

  // Overdue / due-today tasks
  const urgentTasks = tasks
    .filter((t) => t.status !== 'done' && t.due_date <= todayStr)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)

  // Recent activity
  const recentActivity = [...activities]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5)

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">

      {/* Top bar */}
      <div className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <MobileMenuButton />
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-semibold text-slate-800 tracking-tight">Dashboard</h1>
              <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 hidden sm:block">{format(today, "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>
          <Link
            href="/leads-opportunities"
            className="inline-flex items-center gap-1.5 bg-primary text-white text-[11px] sm:text-[12px] font-semibold px-2.5 sm:px-3.5 py-2 rounded-lg hover:bg-primary/90 transition-colors shrink-0"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Lead / Opp</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1400px] w-full">

        {/* ── 5 stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={Users}
            label="Total Customers"
            value={customers.length}
            sub="in your database"
            href="/customers"
            iconBg="bg-blue-50"
            iconColor="text-blue-500"
          />
          <StatCard
            icon={FileText}
            label="Active Leads"
            value={openLeads.length}
            sub={`฿${(totalPipelineValue / 1000).toFixed(0)}K pipeline`}
            href="/leads-opportunities"
            iconBg="bg-orange-50"
            iconColor="text-orange-500"
            valueColor="text-orange-600"
          />
          <StatCard
            icon={Trophy}
            label="Won Jobs"
            value={wonJobs.length}
            sub={`${activeOPJobs.length} in active OP`}
            href="/won-ready-op"
            iconBg="bg-emerald-50"
            iconColor="text-emerald-500"
            valueColor="text-emerald-600"
          />
          <StatCard
            icon={Kanban}
            label="Pending OP"
            value={activeOPJobs.length}
            sub="not yet done payment"
            href="/won-ready-op"
            iconBg="bg-violet-50"
            iconColor="text-violet-500"
          />
          <StatCard
            icon={TrendingUp}
            label="Revenue (Month)"
            value={revenueThisMonth > 0 ? `฿${(revenueThisMonth / 1000).toFixed(0)}K` : '—'}
            sub={`${wonThisMonth.length} jobs won`}
            href="/won-ready-op"
            iconBg="bg-teal-50"
            iconColor="text-teal-500"
            valueColor="text-teal-600"
          />
        </div>

        {/* ── Middle row: Pipeline + Tasks ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

          {/* OP Pipeline breakdown (2/3 width) */}
          <div className="lg:col-span-2">
            <SectionHeader icon={Kanban} title="OP Pipeline" href="/won-ready-op" linkLabel="View board" />
            <div className="bg-white border border-border rounded-xl p-5">
              <div className="space-y-3">
                {stageCounts.map(({ stage, label, dot, badge, count }) => {
                  const pct = wonJobs.length > 0 ? Math.round((count / wonJobs.length) * 100) : 0
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-40 shrink-0">
                        <StatusDot color={dot} />
                        <span className="text-[12px] text-slate-600 truncate">{label}</span>
                      </div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${dot}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2 w-16 shrink-0 justify-end">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge}`}>{count}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Won job summary */}
              <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{wonJobs.length}</p>
                  <p className="text-[11px] text-slate-400">Total Won Jobs</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-800">{activeOPJobs.length}</p>
                  <p className="text-[11px] text-slate-400">Active OP</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-teal-600">
                    ฿{(wonJobs.reduce((s, j) => s + (j.estimated_value ?? 0), 0) / 1000).toFixed(0)}K
                  </p>
                  <p className="text-[11px] text-slate-400">Total Revenue</p>
                </div>
              </div>
            </div>
          </div>

          {/* Urgent Tasks (1/3 width) */}
          <div>
            <SectionHeader icon={CheckSquare} title="Tasks Due" sub="today & overdue" href="/tasks" />
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              {urgentTasks.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <CheckSquare className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                  <p className="text-[12px] text-slate-400">All caught up!</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {urgentTasks.map((task) => {
                    const isOverdue = task.due_date < todayStr
                    return (
                      <li key={task.task_id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isOverdue ? 'bg-red-400' : 'bg-amber-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium text-slate-700 leading-snug line-clamp-1">{task.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                                {isOverdue ? `Overdue` : 'Today'} · {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')}
                              </span>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{task.owner}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              {urgentTasks.length > 0 && (
                <div className="px-4 py-2 border-t border-border/60 bg-slate-50/50">
                  <Link href="/tasks" className="text-[11px] text-primary font-medium hover:underline flex items-center gap-0.5">
                    View all tasks <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bottom row: Upcoming events + Recent activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">

          {/* Upcoming Events (2/3) */}
          <div className="lg:col-span-2">
            <SectionHeader icon={CalendarDays} title="Upcoming Events" sub="next 30 days" href="/won-ready-op" />
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              {upcomingJobs.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <CalendarDays className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                  <p className="text-[12px] text-slate-400">No upcoming events in the next 30 days.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-slate-50/60">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Job</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Venue</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {upcomingJobs.map((job) => {
                      const sc = stageConfig[job.op_stage]
                      return (
                        <tr key={job.job_id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-[12px] font-bold text-primary">
                              {format(parseISO(job.event_date + 'T00:00:00'), 'dd MMM')}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {format(parseISO(job.event_date + 'T00:00:00'), 'yyyy')}
                            </p>
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="text-[12px] font-semibold text-slate-700 leading-snug line-clamp-1">
                              {job.event_display_name || job.product_name}
                            </p>
                            <p className="text-[11px] text-slate-400">{job.customer_name} · #{job.job_number}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                              {job.product_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[160px]">
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate">{job.venue || job.place || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${sc?.dot ?? 'bg-slate-300'}`} />
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc?.badge ?? 'bg-slate-50 text-slate-500'}`}>
                                {sc?.label ?? job.op_stage}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity (1/3) */}
          <div>
            <SectionHeader icon={TrendingUp} title="Recent Activity" />
            <div className="bg-white border border-border rounded-xl overflow-hidden">
              {recentActivity.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <TrendingUp className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                  <p className="text-[12px] text-slate-400">No activity yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {recentActivity.map((act) => (
                    <li key={act.activity_id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                      <p className="text-[12px] font-medium text-slate-700 leading-snug">{act.title}</p>
                      {act.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{act.description}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-1">
                        <User className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[10px] text-slate-400">
                          {act.created_by} · {format(new Date(act.created_at), 'MMM d')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
