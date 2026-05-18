'use client'

import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Inbox, TrendingUp, DollarSign, Trophy, Bell, ArrowRight, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const TODAY = '2026-05-15'

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`
  return `฿${value.toLocaleString()}`
}

export default function DashboardPage() {
  const { leads, opportunities, wonProjects, tasks } = useCRMStore()
  const currentMonth = TODAY.slice(0, 7)

  const newLeadsThisMonth = leads.filter((l) => l.created_at.startsWith(currentMonth)).length
  const openOpportunities = opportunities.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost')
  const totalPipelineValue = openOpportunities.reduce((sum, o) => sum + o.estimated_value, 0)
  const wonThisMonth = wonProjects.filter((w) => w.project_date.startsWith(currentMonth))
  const wonRevenueThisMonth = wonThisMonth.reduce((sum, w) => sum + w.project_value, 0)
  const followUpsDueToday = tasks.filter((t) => t.status !== 'done' && t.due_date <= TODAY)
  const recentOpportunities = openOpportunities.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 5)

  const stageColors: Record<string, string> = {
    'New Opportunity': 'bg-zinc-100 text-zinc-600',
    Contacted: 'bg-blue-50 text-blue-600',
    'Requirement Collected': 'bg-amber-50 text-amber-700',
    'Proposal Sent': 'bg-indigo-50 text-indigo-700',
    Negotiation: 'bg-purple-50 text-purple-700',
    Confirmed: 'bg-emerald-50 text-emerald-700',
    Won: 'bg-emerald-100 text-emerald-800',
    Lost: 'bg-red-50 text-red-500',
  }

  const stats = [
    { label: 'New Leads This Month', value: newLeadsThisMonth, icon: Inbox, color: 'text-blue-500', bg: 'bg-blue-50', href: '/leads' },
    { label: 'Open Opportunities', value: openOpportunities.length, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50', href: '/opportunities' },
    { label: 'Total Pipeline Value', value: formatCurrency(totalPipelineValue), icon: DollarSign, color: 'text-primary', bg: 'bg-orange-50', href: '/opportunities' },
    { label: 'Won Revenue This Month', value: wonRevenueThisMonth > 0 ? formatCurrency(wonRevenueThisMonth) : '฿0', icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50', href: '/won-deck' },
  ]

  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Dashboard" description={`${format(new Date(TODAY), 'EEEE, MMMM d, yyyy')}`} />
      <div className="flex-1 p-8 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Link key={stat.label} href={stat.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer group border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                    </div>
                    <div className="mt-3">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <Card className="border-border/60">
              <CardHeader className="pb-3 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">Active Pipeline</CardTitle>
                  <Link href="/opportunities">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2 gap-1">
                      View Kanban <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                <div className="divide-y divide-border/60">
                  {recentOpportunities.map((opp) => (
                    <div key={opp.opportunity_id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors">
                      <div className="flex-1 min-w-0 mr-4">
                        <p className="text-sm font-medium truncate">{opp.deal_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{opp.service_type} · {opp.owner}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${stageColors[opp.stage] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {opp.stage}
                        </span>
                        <span className="text-sm font-semibold text-foreground w-20 text-right">{formatCurrency(opp.estimated_value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1">
            <Card className="border-border/60 h-full">
              <CardHeader className="pb-3 pt-5 px-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    Follow-ups Due
                  </CardTitle>
                  <Link href="/tasks">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2">All tasks</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {followUpsDueToday.length === 0 ? (
                  <div className="px-6 py-8 text-center text-sm text-muted-foreground">All caught up! 🎉</div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {followUpsDueToday.slice(0, 6).map((task) => (
                      <div key={task.task_id} className="px-6 py-3 hover:bg-muted/40">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium leading-snug">{task.title}</p>
                          <Badge variant="outline" className={`text-[10px] shrink-0 px-1.5 py-0 ${task.priority === 'high' ? 'border-red-200 text-red-600 bg-red-50' : task.priority === 'medium' ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-zinc-200 text-zinc-500'}`}>
                            {task.priority}
                          </Badge>
                        </div>
                        {task.linked_entity_name && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />{task.linked_entity_name}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          Due {format(new Date(task.due_date + 'T00:00:00'), 'MMM d')} · {task.owner}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-border/60">
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-sm font-semibold">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="grid grid-cols-8 gap-3">
              {['New Opportunity','Contacted','Requirement Collected','Proposal Sent','Negotiation','Confirmed','Won','Lost'].map((stage) => {
                const stageOpps = opportunities.filter((o) => o.stage === stage)
                const stageValue = stageOpps.reduce((s, o) => s + o.estimated_value, 0)
                return (
                  <div key={stage} className="text-center">
                    <div className={`rounded-lg p-2.5 mb-2 ${stageColors[stage] ?? 'bg-zinc-50 text-zinc-500'}`}>
                      <p className="text-xl font-bold">{stageOpps.length}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">{stage}</p>
                    <p className="text-[11px] font-semibold mt-0.5">{stageValue > 0 ? formatCurrency(stageValue) : '—'}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
