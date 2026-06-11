'use client'

import { useState, useEffect } from 'react'
import { useHydrated } from '@/hooks/use-hydrated'
import { useAuth } from '@/components/auth-provider'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import Link from 'next/link'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { OperationDashboard } from '@/components/dashboard/operation-dashboard'
import { SalesDashboard } from '@/components/dashboard/sales-dashboard'

type DashboardView = 'Sales' | 'Operation' | 'Admin'

// Map the auth role to the dashboard view it should land on by default.
// 'user' (unassigned) gets the most limited personal view.
function roleToView(role: string | null): DashboardView {
  switch (role) {
    case 'admin': return 'Admin'
    case 'operation': return 'Operation'
    case 'sales': return 'Sales'
    default: return 'Sales'
  }
}

export default function DashboardPage() {
  const isHydrated = useHydrated()
  const { role, user } = useAuth()

  // View auto-selects from the signed-in role. Admins can override to preview
  // other role views; everyone else is locked to their own.
  const [view, setView] = useState<DashboardView>('Sales')
  const isAdmin = role === 'admin'

  // Sync the view to the role once it loads (and whenever it changes).
  useEffect(() => {
    setView(roleToView(role))
  }, [role])

  if (!isHydrated) return null

  const today = new Date()
  const userName =
    user?.user_metadata?.full_name || user?.email || ''

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      {/* Top bar */}
      <div className="bg-white border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div>
              <h1 className="text-[15px] sm:text-[17px] font-semibold text-slate-800 tracking-tight">
                {view} Dashboard
              </h1>
              <p className="text-[11px] sm:text-[12px] text-slate-400 mt-0.5 hidden sm:block">
                {format(today, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Admins can preview other role views; others see their own only */}
            {isAdmin && (
              <select
                value={view}
                onChange={(e) => setView(e.target.value as DashboardView)}
                className="text-[11px] font-medium text-slate-600 bg-white border border-border rounded-lg px-3 py-2 cursor-pointer hover:border-border/80 transition-colors"
                aria-label="Preview dashboard view"
              >
                <option value="Admin">Admin View</option>
                <option value="Operation">Operation View</option>
                <option value="Sales">Sales View</option>
              </select>
            )}
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
      </div>

      {/* Role-specific dashboard body */}
      {view === 'Admin' && <AdminDashboard />}
      {view === 'Operation' && <OperationDashboard />}
      {view === 'Sales' && <SalesDashboard userName={userName} />}
    </div>
  )
}
