'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  Kanban,
  CheckSquare,
  Settings,
  Zap,
  Upload,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCRMStore } from '@/store/crm-store'
import { useMobileNav } from '@/components/layout/mobile-nav-context'

const navItems = [
  { href: '/dashboard',            label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/customers',            label: 'Customers',        icon: Users },
  { href: '/leads-opportunities',  label: 'Leads & Opps',     icon: FileText },
  { href: '/won-ready-op',         label: 'Won & Ready for OP', icon: Kanban },
]

const bottomItems = [
  { href: '/import',   label: 'Import',   icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]

// ── Shared nav content ────────────────────────────────────────────────────────

function NavContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()
  const { leadOpportunities, wonJobs, tasks } = useCRMStore()

  const openLeadsCount = leadOpportunities.filter((l) => l.status === 'open').length
  const today = new Date().toISOString().split('T')[0]
  const pendingTasksToday = tasks.filter(
    (t) => t.status !== 'done' && t.due_date <= today
  ).length
  const activeOPJobs = wonJobs.filter((j) => j.op_stage !== 'OP_DONE_PAYMENT').length

  const badges: Record<string, number> = {
    '/leads-opportunities': openLeadsCount,
    '/won-ready-op':        activeOPJobs,
  }

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const isActive = pathname === href || pathname.startsWith(href + '/')
    const badge = badges[href]

    return (
      <Link
        href={href}
        onClick={onNavClick}
        className={cn(
          'flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group',
          isActive
            ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn(
            'w-[15px] h-[15px] shrink-0 transition-colors',
            isActive ? 'text-[var(--sidebar-primary)]' : 'text-slate-400 group-hover:text-slate-600'
          )} />
          <span className="leading-none">{label}</span>
        </div>
        {badge != null && badge > 0 && (
          <span className={cn(
            'text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 leading-none',
            isActive ? 'bg-[var(--sidebar-primary)] text-white' : 'bg-slate-100 text-slate-500'
          )}>
            {badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-[var(--sidebar-border)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--sidebar-primary)] flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-slate-800 font-bold text-[14px] leading-tight tracking-tight">SX CRM</p>
            <p className="text-slate-400 text-[10px] leading-tight">by SIXSHEET</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">Menu</p>
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)] shrink-0">
        {bottomItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {/* User */}
        <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center text-[var(--sidebar-primary)] text-xs font-bold shrink-0">
            V
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-700 text-[13px] font-medium leading-tight">Vitta</p>
            <p className="text-slate-400 text-[10px] leading-tight">Admin</p>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Sidebar (desktop + mobile) ─────────────────────────────────────────────────

export function Sidebar() {
  const { open, setOpen } = useMobileNav()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[228px] min-h-screen bg-white border-r border-[var(--sidebar-border)] shrink-0">
        <NavContent />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-[228px] bg-white border-r border-[var(--sidebar-border)] flex flex-col transition-transform duration-200 lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <NavContent onNavClick={() => setOpen(false)} />
      </aside>
    </>
  )
}
