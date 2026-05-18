'use client'

import { useState } from 'react'
import { useCRMStore } from '@/store/crm-store'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { WonProject } from '@/types'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Search,
  Trophy,
  Calendar,
  MapPin,
  DollarSign,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  Star,
  Target,
  Package,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'

const SERVICES = ['CAP*TURES', 'Andy & Fine', 'SX Event', 'Booth Rental', 'Custom Activation']

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `฿${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `฿${(value / 1_000).toFixed(0)}K`
  return `฿${value.toLocaleString()}`
}

const serviceColors: Record<string, string> = {
  "CAP*TURES": 'border-l-orange-400',
  "Andy & Fine": 'border-l-pink-400',
  "SX Event": 'border-l-indigo-400',
  "Booth Rental": 'border-l-sky-400',
  "Custom Activation": 'border-l-emerald-400',
}

const invoiceColors: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  sent: 'bg-blue-50 text-blue-700 border-blue-200',
  overdue: 'bg-red-50 text-red-600 border-red-200',
}

function WonCard({ project, onClick }: { project: WonProject; onClick: () => void }) {
  const accentBorder = serviceColors[project.service_used] ?? 'border-l-zinc-300'

  return (
    <Card
      className={`cursor-pointer hover:shadow-md transition-all border border-border/70 border-l-4 ${accentBorder} group`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">{project.client_name}</p>
            {project.brand && project.brand !== project.client_name && (
              <p className="text-xs text-muted-foreground">{project.brand}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {project.reusable_case_study && (
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            )}
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[11px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{project.service_used}</span>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${invoiceColors[project.invoice_status] ?? ''}`}>
            {project.invoice_status}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">{formatCurrency(project.project_value)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {project.project_date ? format(new Date(project.project_date + 'T00:00:00'), 'MMM d, yyyy') : '—'}
          </div>
          {project.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{project.location}</span>
            </div>
          )}
        </div>

        {project.result_summary && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed border-t border-border/50 pt-2.5">
            {project.result_summary}
          </p>
        )}

        {project.reactivation_date && (
          <div className="mt-2 flex items-center gap-1 text-[11px] text-primary/80 font-medium">
            <RotateCcw className="w-3 h-3" />
            Reactivate: {format(new Date(project.reactivation_date + 'T00:00:00'), 'MMM yyyy')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WonDetail({ project, onClose }: { project: WonProject; onClose: () => void }) {
  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base leading-snug">{project.client_name}</SheetTitle>
              {project.brand && <p className="text-sm text-muted-foreground">{project.brand}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">{project.service_used}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${invoiceColors[project.invoice_status] ?? ''}`}>
                  {project.invoice_status}
                </Badge>
                {project.reusable_case_study && (
                  <span className="flex items-center gap-0.5 text-[11px] text-amber-600 font-medium">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> Case Study
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Project Value</p>
              <p className="text-xl font-bold">{formatCurrency(project.project_value)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Invoice</p>
              <Badge variant="outline" className={`text-xs px-2 py-1 border ${invoiceColors[project.invoice_status] ?? ''}`}>
                {project.invoice_status}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Project Date</p>
              <p className="text-sm">{project.project_date ? format(new Date(project.project_date + 'T00:00:00'), 'MMMM d, yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <p className="text-sm">{project.location || '—'}</p>
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <Target className="w-3 h-3" /> Campaign Goal
            </p>
            <p className="text-sm leading-relaxed">{project.campaign_goal || '—'}</p>
          </div>

          {project.deliverables.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Package className="w-3 h-3" /> Deliverables
              </p>
              <ul className="space-y-1">
                {project.deliverables.map((d, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {project.result_summary && (
            <div>
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Result Summary
              </p>
              <p className="text-sm leading-relaxed text-foreground/80 bg-emerald-50/50 border border-emerald-100 p-3 rounded-lg">
                {project.result_summary}
              </p>
            </div>
          )}

          {project.reactivation_date && (
            <>
              <Separator />
              <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <RotateCcw className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-primary">Reactivation Target</p>
                  <p className="text-sm text-foreground">{format(new Date(project.reactivation_date + 'T00:00:00'), 'MMMM yyyy')}</p>
                </div>
              </div>
            </>
          )}

          {project.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Notes</p>
                <p className="text-sm leading-relaxed text-foreground/80">{project.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default function WonDeckPage() {
  const { wonProjects } = useCRMStore()
  const [search, setSearch] = useState('')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all')
  const [selected, setSelected] = useState<WonProject | null>(null)

  const filtered = wonProjects.filter((p) => {
    const matchSearch =
      p.client_name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.service_used.toLowerCase().includes(search.toLowerCase())
    const matchService = serviceFilter === 'all' || p.service_used === serviceFilter
    const matchInvoice = invoiceFilter === 'all' || p.invoice_status === invoiceFilter
    return matchSearch && matchService && matchInvoice
  })

  const totalRevenue = wonProjects.reduce((s, p) => s + p.project_value, 0)
  const caseStudies = wonProjects.filter((p) => p.reusable_case_study).length

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Won Deck"
        description={`${wonProjects.length} projects · ${formatCurrency(totalRevenue)} total · ${caseStudies} case studies`}
      />

      <div className="px-8 py-4 border-b bg-white flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
        </div>
        <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v ?? 'all')}>
          <SelectTrigger className="w-[160px] h-8 text-sm"><SelectValue placeholder="All services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All services</SelectItem>
            {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={invoiceFilter} onValueChange={(v) => setInvoiceFilter(v ?? 'all')}>
          <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue placeholder="Invoice" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All invoices</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <p className="text-xs text-muted-foreground">{caseStudies} case studies</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {filtered.length === 0 ? (
          search || serviceFilter !== 'all' || invoiceFilter !== 'all'
            ? <EmptyState icon={Search} title="No projects match" description="Try adjusting your search or filters to find what you're looking for." />
            : <EmptyState icon={Trophy} title="No won projects yet" description="Deals closed as won will appear here. Keep pushing!" />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((project) => (
              <WonCard key={project.project_id} project={project} onClick={() => setSelected(project)} />
            ))}
          </div>
        )}
      </div>

      {selected && <WonDetail project={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
