'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Inbox,
  TrendingUp,
  Trophy,
  CheckSquare,
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCRMStore } from '@/store/crm-store'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/leads', label: 'Leads', icon: Inbox },
  { href: '/opportunities', label: 'Opportunities', icon: TrendingUp },
  { href: '/won-deck', label: 'Won Deck', icon: Trophy },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { leads, tasks } = useCRMStore()

  const newLeadsCount = leads.filter((l) => l.lead_status === 'new').length
  const pendingTasksToday = tasks.filter(
    (t) =>
      t.status !== 'done' &&
      t.due_date <= new Date().toISOString().split('T')[0]
  ).length

  const badges: Record<string, number> = {
    '/leads': newLeadsCount,
    '/tasks': pendingTasksToday,
  }

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[var(--sidebar-foreground)] font-semibold text-sm leading-tight">SX CRM</p>
            <p className="text-[var(--sidebar-accent-foreground)] text-[10px] opacity-50 leading-tight">
              by SIXSHEET
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          const badge = badges[href]

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors group',
                isActive
                  ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)] font-medium'
                  : 'text-[var(--sidebar-foreground)] opacity-60 hover:opacity-100 hover:bg-[var(--sidebar-accent)]'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-primary' : 'text-current'
                  )}
                />
                <span>{label}</span>
              </div>
              {badge != null && badge > 0 && (
                <span className="text-[10px] font-semibold bg-primary text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-[var(--sidebar-border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            V
          </div>
          <div>
            <p className="text-[var(--sidebar-foreground)] text-xs font-medium leading-tight">Vitta</p>
            <p className="text-[10px] opacity-40 text-[var(--sidebar-foreground)] leading-tight">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
