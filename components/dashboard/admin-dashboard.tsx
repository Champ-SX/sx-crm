'use client'

import { useCRMStore } from '@/store/crm-store'
import { format } from 'date-fns'
import {
  Users, FileText, Trophy, TrendingUp, BarChart3, Activity, User,
} from 'lucide-react'
import { StatCard, SectionHeader, fmtBaht } from './shared'

/**
 * Admin Dashboard — system-wide view.
 * System metrics across every entity, a per-owner team performance matrix,
 * and a global activity log.
 */
export function AdminDashboard() {
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

      {/* ── Team performance matrix + Activity log ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Performance matrix (2/3) */}
        <div className="lg:col-span-2">
          <SectionHeader icon={BarChart3} title="Team Performance" sub="by owner" href="/admin/users" linkLabel="Manage users" />
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {matrix.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <BarChart3 className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                <p className="text-[12px] text-slate-400">No owner data yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr className="border-b border-border/60 bg-slate-50/60">
                      <th className="px-5 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Owner</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Open</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Won</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Win %</th>
                      <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {matrix.map((row) => (
                      <tr key={row.owner} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <span className="text-[12px] font-semibold text-slate-700">{row.owner}</span>
                        </td>
                        <td className="px-3 py-3 text-center text-[12px] text-slate-600">{row.open}</td>
                        <td className="px-3 py-3 text-center text-[12px] font-medium text-emerald-600">{row.won}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[11px] font-semibold text-blue-600">{row.winRate > 0 ? `${row.winRate}%` : '—'}</span>
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
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Activity className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                <p className="text-[12px] text-slate-400">No activity yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentActivity.map((act) => (
                  <li key={act.activity_id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <p className="text-[12px] font-medium text-slate-700 leading-snug line-clamp-1">{act.title}</p>
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
  )
}
