'use client'

import { useCRMStore } from '@/store/crm-store'
import { format } from 'date-fns'
import {
  FileText, Trophy, TrendingUp, Target, User, Percent,
} from 'lucide-react'
import { StatCard, SectionHeader, fmtBaht } from './shared'

// Monthly revenue goal used for the target-progress bar.
// There is no per-user target field in the data model yet, so this is a
// sensible default; surface it clearly as a goal, not a committed quota.
const MONTHLY_TARGET = 500_000

/**
 * Sales Dashboard — personal pipeline view.
 * Filters all data to the rows owned by the signed-in user (matched on name
 * or email against the `owner` / `created_by` fields).
 */
export function SalesDashboard({ userName }: { userName: string }) {
  const { leadOpportunities, wonJobs, activities } = useCRMStore()

  const today = new Date()
  const matchesMe = (owner?: string | null) =>
    !!owner && (owner === userName || owner.toLowerCase() === userName.toLowerCase())

  // Personal slices
  const myLeads = leadOpportunities.filter((l) => matchesMe(l.owner))
  // Active = open + negotiating (both in-flight, undecided)
  const myActiveLeads = myLeads.filter((l) => l.status === 'open' || l.status === 'negotiating')
  const myWon = myLeads.filter((l) => l.status === 'won')
  const myLost = myLeads.filter((l) => l.status === 'lost')
  const myJobs = wonJobs.filter((j) => matchesMe(j.owner))

  const myPipelineValue = myActiveLeads.reduce((s, l) => s + l.estimated_value, 0)

  // Win rate = won / (won + lost), guard divide-by-zero
  const decided = myWon.length + myLost.length
  const winRate = decided > 0 ? Math.round((myWon.length / decided) * 100) : 0

  // Revenue this month (from my won jobs created this month)
  const myRevenueThisMonth = myJobs
    .filter((j) => {
      const d = new Date(j.created_at)
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
    })
    .reduce((s, j) => s + (j.estimated_value ?? 0), 0)

  const targetPct = Math.min(100, Math.round((myRevenueThisMonth / MONTHLY_TARGET) * 100))

  // My recent activity
  const myActivity = activities
    .filter((a) => matchesMe(a.created_by))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1400px] w-full">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="My Active Leads"
          value={myActiveLeads.length}
          sub={`${fmtBaht(myPipelineValue)} pipeline`}
          href="/leads-opportunities"
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          valueColor="text-orange-600"
        />
        <StatCard
          icon={Trophy}
          label="My Won Deals"
          value={myWon.length}
          sub={`${myJobs.length} jobs in OP`}
          href="/won-ready-op"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          valueColor="text-emerald-600"
        />
        <StatCard
          icon={Percent}
          label="Win Rate"
          value={decided > 0 ? `${winRate}%` : '—'}
          sub={`${myWon.length} won · ${myLost.length} lost`}
          href="/leads-opportunities"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          valueColor="text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue (Month)"
          value={fmtBaht(myRevenueThisMonth)}
          sub={`of ${fmtBaht(MONTHLY_TARGET)} goal`}
          href="/won-ready-op"
          iconBg="bg-teal-50"
          iconColor="text-teal-500"
          valueColor="text-teal-600"
        />
      </div>

      {/* ── Target progress + Recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Target progress (2/3) */}
        <div className="lg:col-span-2">
          <SectionHeader icon={Target} title="Monthly Target" sub={`${fmtBaht(myRevenueThisMonth)} of ${fmtBaht(MONTHLY_TARGET)}`} />
          <div className="bg-white border border-border rounded-xl p-5">
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-bold text-slate-800">{targetPct}%</p>
              <p className="text-[12px] text-slate-400">{format(today, 'MMMM yyyy')}</p>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${targetPct >= 100 ? 'bg-emerald-500' : 'bg-teal-400'}`}
                style={{ width: `${targetPct}%` }}
              />
            </div>
            <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">{myActiveLeads.length}</p>
                <p className="text-[11px] text-slate-400">Active Leads</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-emerald-600">{myWon.length}</p>
                <p className="text-[11px] text-slate-400">Won</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-teal-600">{fmtBaht(myPipelineValue)}</p>
                <p className="text-[11px] text-slate-400">Pipeline Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* My recent activity (1/3) */}
        <div>
          <SectionHeader icon={TrendingUp} title="My Recent Activity" />
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            {myActivity.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <TrendingUp className="w-7 h-7 text-slate-200 mx-auto mb-2" />
                <p className="text-[12px] text-slate-400">No activity logged yet.</p>
                <p className="text-[11px] text-slate-300 mt-1">Your notes and calls will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {myActivity.map((act) => (
                  <li key={act.activity_id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <p className="text-[12px] font-medium text-slate-700 leading-snug">{act.title}</p>
                    {act.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{act.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1">
                      <User className="w-2.5 h-2.5 text-slate-400" />
                      <span className="text-[10px] text-slate-400">{format(new Date(act.created_at), 'MMM d')}</span>
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
