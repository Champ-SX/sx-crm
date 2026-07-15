'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCRMStore } from '@/store/crm-store'
import { format } from 'date-fns'
import { parseDbDate } from '@/lib/utils'
import { jobDisplayTitle } from '@/lib/jobs'
import { UserAvatar } from '@/components/shared/user-avatar'
import {
  Users, FileText, Trophy, TrendingUp, BarChart3, Activity, User, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react'
import { StatCard, SectionHeader, fmtBaht } from './shared'

/**
 * Admin Dashboard — system-wide view.
 * System metrics across every entity, a per-owner team performance matrix,
 * and a global activity log.
 */
export function AdminDashboard() {
  const router = useRouter()
  const { customers, leadOpportunities, wonJobs, activities } = useCRMStore()

  const today = new Date()

  // Active pipeline = open + negotiating (both in-flight, undecided deals)
  const activeLeads = leadOpportunities.filter(
    (l) => l.status === 'open' || l.status === 'negotiating'
  )
  const totalPipeline = activeLeads.reduce((s, l) => s + l.estimated_value, 0)
  const totalRevenue = wonJobs.reduce((s, j) => s + (j.estimated_value ?? 0), 0)

  // Team performance matrix — aggregate per owner across leads + jobs
  const owners = new Set<string>()
  leadOpportunities.forEach((l) => l.owner && owners.add(l.owner))
  wonJobs.forEach((j) => j.owner && owners.add(j.owner))

  const matrix = [...owners].map((owner) => {
    const leads = leadOpportunities.filter((l) => l.owner === owner)
    const won = leads.filter((l) => l.status === 'won').length
    const lost = leads.filter((l) => l.status === 'lost').length
    const open = leads.filter((l) => l.status === 'open').length
    const decided = won + lost
    const winRate = decided > 0 ? Math.round((won / decided) * 100) : 0
    const revenue = wonJobs
      .filter((j) => j.owner === owner)
      .reduce((s, j) => s + (j.estimated_value ?? 0), 0)
    return { owner, open, won, lost, winRate, revenue }
  }).sort((a, b) => b.revenue - a.revenue)

  // ── Monthly won summary (by won date = created_at) ──
  const [monthOffset, setMonthOffset] = useState(0)
  const monthDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1)
  const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
  const monthLabel = format(monthDate, 'MMMM yyyy')
  const monthJobs = wonJobs.filter((j) => (j.created_at ?? '').slice(0, 7) === monthKey)
  const monthCount = monthJobs.length
  const monthRevenue = monthJobs.reduce((s, j) => s + (j.estimated_value ?? 0), 0)
  const monthRanking = [...owners]
    .map((owner) => {
      const jobs = monthJobs.filter((j) => j.owner === owner)
      return { owner, deals: jobs.length, revenue: jobs.reduce((s, j) => s + (j.estimated_value ?? 0), 0) }
    })
    .filter((r) => r.deals > 0)
    .sort((a, b) => b.revenue - a.revenue)
  const monthJobsSorted = [...monthJobs].sort((a, b) => (b.estimated_value ?? 0) - (a.estimated_value ?? 0))

  // Global activity log
  const recentActivity = [...activities]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1400px] w-full">
      {/* ── System metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Users}
          label="Total Customers"
          value={customers.length}
          sub="in database"
          href="/customers"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          icon={FileText}
          label="Active Leads"
          value={activeLeads.length}
          sub={`${fmtBaht(totalPipeline)} pipeline`}
          href="/leads-opportunities"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          valueColor="text-orange-600"
        />
        <StatCard
          icon={Trophy}
          label="Won Jobs"
          value={wonJobs.length}
          sub="all time"
          href="/won-ready-op"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          valueColor="text-emerald-600"
        />
        <StatCard
          icon={Users}
          label="Active Owners"
          value={owners.size}
          sub="with assigned work"
          href="/admin/users"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Revenue"
          value={fmtBaht(totalRevenue)}
          sub="from won jobs"
          href="/won-ready-op"
          iconBg="bg-teal-50"
          iconColor="text-teal-500"
          valueColor="text-teal-600"
        />
      </div>

      {/* ── Monthly won summary ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-[15px] font-semibold text-foreground">Monthly Won Summary</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              className="w-7 h-7 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[130px] text-center text-[13px] font-medium text-foreground">{monthLabel}</span>
            <button
              onClick={() => setMonthOffset((o) => Math.max(0, o - 1))}
              disabled={monthOffset === 0}
              className="w-7 h-7 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Month metrics */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Won this month</p>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{monthCount}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Revenue this month</p>
              </div>
              <p className="text-2xl font-bold text-teal-600">{fmtBaht(monthRevenue)}</p>
            </div>
          </div>

          {/* Owner ranking (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
              {monthRanking.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <Trophy className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground">No won jobs in {monthLabel}.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/50">
                      <th className="px-5 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                      <th className="px-3 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Deals</th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {monthRanking.map((row, i) => (
                      <tr key={row.owner} className="hover:bg-muted/50 transition-colors">
                        <td className="px-5 py-3 text-[12px] font-semibold text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-3 text-[12px] font-semibold text-foreground">
                          <span className="inline-flex items-center gap-2"><UserAvatar name={row.owner} size={20} />{row.owner}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-[12px] font-medium text-emerald-600">{row.deals}</td>
                        <td className="px-4 py-3 text-right text-[12px] font-semibold text-teal-600">{fmtBaht(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Won jobs list for the month */}
        {monthJobsSorted.length > 0 && (
          <div className="mt-4 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-2.5 border-b border-border/60 bg-muted/50 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Won jobs · {monthLabel}</span>
              <span className="text-[12px] font-semibold text-teal-600">{monthCount} · {fmtBaht(monthRevenue)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-5 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Job</th>
                    <th className="px-3 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                    <th className="px-3 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                    <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {monthJobsSorted.map((j) => (
                    <tr
                      key={j.job_id}
                      onClick={() => router.push('/won-ready-op')}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-mono font-semibold text-muted-foreground">#{j.job_number}</span>
                          <span className="text-[12px] font-medium text-foreground truncate max-w-[240px]">{jobDisplayTitle(j)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-foreground/80 truncate max-w-[160px]">{j.customer_name || '—'}</td>
                      <td className="px-3 py-3 text-[12px] text-foreground/80"><span className="inline-flex items-center gap-1.5">{j.owner ? <><UserAvatar name={j.owner} size={16} />{j.owner}</> : '—'}</span></td>
                      <td className="px-4 py-3 text-right text-[12px] font-semibold text-teal-600">{fmtBaht(j.estimated_value ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Team performance matrix + Activity log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Performance matrix (2/3) */}
        <div className="lg:col-span-2">
          <SectionHeader icon={BarChart3} title="Team Performance" sub="by owner" href="/admin/users" linkLabel="Manage users" />
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {matrix.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <BarChart3 className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">No owner data yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/50">
                      <th className="px-5 py-2.5 text-left text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Open</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Won</th>
                      <th className="px-3 py-2.5 text-center text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Win %</th>
                      <th className="px-4 py-2.5 text-right text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {matrix.map((row) => (
                      <tr key={row.owner} className="hover:bg-muted/50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-foreground"><UserAvatar name={row.owner} size={20} />{row.owner}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-[12px] text-foreground/80">{row.open}</td>
                        <td className="px-3 py-3 text-center text-[12px] font-medium text-emerald-600">{row.won}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[12px] font-semibold text-blue-600">{row.winRate > 0 ? `${row.winRate}%` : '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] font-semibold text-teal-600">{fmtBaht(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Activity log (1/3) */}
        <div>
          <SectionHeader icon={Activity} title="System Activity" />
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Activity className="w-7 h-7 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-[12px] text-muted-foreground">No activity yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentActivity.map((act) => (
                  <li key={act.activity_id} className="px-4 py-3 hover:bg-muted/50 transition-colors">
                    <p className="text-[12px] font-medium text-foreground leading-snug line-clamp-1">{act.title}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <User className="w-2.5 h-2.5 text-muted-foreground" />
                      <span className="text-[12px] text-muted-foreground">
                        {act.created_by} · {format(parseDbDate(act.created_at), 'MMM d')}
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
  )
}
