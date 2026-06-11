'use client'

import { useCRMStore } from '@/store/crm-store'
import { OP_STAGES } from '@/types'
import { format, addDays } from 'date-fns'
import {
  Kanban, Activity, Users, AlertTriangle, CalendarDays, MapPin,
} from 'lucide-react'
import { StatCard, SectionHeader, StatusDot, stageConfig, fmtBaht } from './shared'

/**
 * Operation Dashboard — pipeline health and team workload view.
 * Focuses on throughput through the OP stages, who is carrying which jobs,
 * and bottlenecks (overdue payments, pending staff/docs).
 */
export function OperationDashboard() {
  const { wonJobs } = useCRMStore()

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const in30Str = format(addDays(today, 30), 'yyyy-MM-dd')

  const activeOPJobs = wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT')
  const donePaymentThisMonth = wonJobs.filter((j) => {
    if (j.op_stage !== 'OP_DONE_PAYMENT') return false
    const d = new Date(j.updated_at || j.created_at)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  })

  // Pipeline health by stage
  const stageCounts = OP_STAGES.map((stage) => ({
    stage,
    ...stageConfig[stage],
    count: wonJobs.filter((j) => j.op_stage === stage).length,
  }))

  // Team workload distribution — jobs per owner (active OP only)
  const workloadMap = new Map<string, number>()
  for (const j of activeOPJobs) {
    const owner = j.owner || 'Unassigned'
    workloadMap.set(owner, (workloadMap.get(owner) ?? 0) + 1)
  }
  const workload = [...workloadMap.entries()]
    .map(([owner, count]) => ({ owner, count }))
    .sort((a, b) => b.count - a.count)
  const maxWorkload = workload.length > 0 ? Math.max(...workload.map((w) => w.count)) : 0

  // Bottleneck alerts
  const overduePayment = activeOPJobs.filter((j) => j.payment_status === 'overdue')
  const pendingStaff = activeOPJobs.filter((j) => j.staff_status === 'pending')
  const pendingDocs = activeOPJobs.filter((j) => j.doc_status === 'pending')
  const eventSoonNotReady = activeOPJobs.filter(
    (j) => j.event_date && j.event_date >= todayStr && j.event_date <= in30Str
      && j.op_stage !== 'OP_READY_FOR_EVENT'
  )

  const bottlenecks = [
    { label: 'Payment overdue', count: overduePayment.length, color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-400' },
    { label: 'Staff pending', count: pendingStaff.length, color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-400' },
    { label: 'Docs pending', count: pendingDocs.length, color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-400' },
    { label: 'Event <30d, not ready', count: eventSoonNotReady.length, color: 'text-violet-600', bg: 'bg-violet-50', dot: 'bg-violet-400' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-[1400px] w-full">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Kanban}
          label="Active OP Jobs"
          value={activeOPJobs.length}
          sub="not yet done payment"
          href="/won-ready-op"
          iconBg="bg-violet-50"
          iconColor="text-violet-500"
        />
        <StatCard
          icon={Activity}
          label="Completed (Month)"
          value={donePaymentThisMonth.length}
          sub="reached done payment"
          href="/won-ready-op"
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
          valueColor="text-emerald-600"
        />
        <StatCard
          icon={Users}
          label="Team Members"
          value={workload.length}
          sub="with active jobs"
          href="/won-ready-op"
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Bottlenecks"
          value={overduePayment.length + pendingStaff.length + pendingDocs.length}
          sub="items need attention"
          href="/won-ready-op"
          iconBg="bg-red-50"
          iconColor="text-red-500"
          valueColor="text-red-600"
        />
      </div>

      {/* ── Pipeline health + Bottleneck alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Pipeline health (2/3) */}
        <div className="lg:col-span-2">
          <SectionHeader icon={Kanban} title="Pipeline Health by Stage" href="/won-ready-op" linkLabel="View board" />
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
                      <div className={`h-full rounded-full transition-all ${dot}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full w-10 text-center shrink-0 ${badge}`}>{count}</span>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-border/60 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">{wonJobs.length}</p>
                <p className="text-[11px] text-slate-400">Total Jobs</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-800">{activeOPJobs.length}</p>
                <p className="text-[11px] text-slate-400">Active OP</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-teal-600">
                  {fmtBaht(wonJobs.reduce((s, j) => s + (j.estimated_value ?? 0), 0))}
                </p>
                <p className="text-[11px] text-slate-400">Total Value</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottleneck alerts (1/3) */}
        <div>
          <SectionHeader icon={AlertTriangle} title="Bottleneck Alerts" />
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <ul className="divide-y divide-border/60">
              {bottlenecks.map((b) => (
                <li key={b.label} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot}`} />
                  <span className="text-[12px] text-slate-600 flex-1">{b.label}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${b.bg} ${b.color}`}>{b.count}</span>
                </li>
              ))}
            </ul>
            {bottlenecks.every((b) => b.count === 0) && (
              <div className="px-5 py-4 text-center border-t border-border/60">
                <p className="text-[12px] text-emerald-600 font-medium">No bottlenecks — all clear ✓</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Team workload distribution ── */}
      <div>
        <SectionHeader icon={Users} title="Team Workload" sub="active OP jobs per owner" />
        <div className="bg-white border border-border rounded-xl p-5">
          {workload.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-7 h-7 text-slate-200 mx-auto mb-2" />
              <p className="text-[12px] text-slate-400">No active jobs assigned.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workload.map(({ owner, count }) => {
                const pct = maxWorkload > 0 ? Math.round((count / maxWorkload) * 100) : 0
                return (
                  <div key={owner} className="flex items-center gap-3">
                    <span className="text-[12px] text-slate-600 w-32 shrink-0 truncate">{owner}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 w-8 text-right shrink-0">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
