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
  Moon,
  Sun,
  X,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCRMStore } from '@/store/crm-store'
import { useTheme } from '@/components/layout/theme-provider'
import { useMobileNav } from '@/components/layout/mobile-nav-context'
import { useAuth } from '@/components/auth-provider'
import { NotificationBell } from '@/components/shared/notification-bell'
import { PushPermissionBanner } from '@/components/shared/push-permission-banner'
import { Button } from '@/components/ui/button'
import { OP_STAGES } from '@/types'

const navItems = [
  { href: '/dashboard',            label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/customers',            label: 'Customers',        icon: Users },
  { href: '/leads-opportunities',  label: 'Leads & Opps',     icon: FileText },
  { href: '/won-ready-op',         label: 'Won & Ready for OP', icon: Kanban },
]

const bottomItems = [
  { href: '/settings', label: 'Settings', icon: Settings },
]

// ── User Profile Component ─────────────────────────────────────────────────────

function UserProfile() {
  const { user, role, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 mt-1 rounded-lg">
        <div className="w-7 h-7 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-muted rounded animate-pulse mb-1" />
          <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const initials = user.user_metadata?.full_name
    ? user.user_metadata.full_name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U'

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-muted cursor-default transition-colors">
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt={user.email}
            className="w-7 h-7 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-foreground text-[13px] font-medium leading-tight truncate">
            {user.user_metadata?.full_name || user.email}
          </p>
          <p className="text-muted-foreground text-[10px] leading-tight uppercase tracking-wide">
            {role}
          </p>
        </div>
      </div>

      <Button
        onClick={signOut}
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-8 px-3"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="text-[13px]">Sign out</span>
      </Button>
    </div>
  )
}

// ── Shared nav content ────────────────────────────────────────────────────────

function ThemeToggleRow() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const Icon = isDark ? Sun : Moon

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all group text-muted-foreground hover:text-foreground hover:bg-muted"
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      <Icon className="w-[15px] h-[15px] shrink-0 text-muted-foreground group-hover:text-foreground/80 transition-colors" />
      <span className="leading-none">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}

function NavContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname()
  const { leadOpportunities, wonJobs, tasks } = useCRMStore()

  // Active = open or negotiating (both are in-flight leads needing attention)
  const openLeadsCount = leadOpportunities.filter(
    (l) => l.status === 'open' || l.status === 'negotiating'
  ).length
  const today = new Date().toISOString().split('T')[0]
  const pendingTasksToday = tasks.filter(
    (t) => t.status !== 'done' && t.due_date <= today
  ).length
  // Count only jobs in built-in (non-custom) stages, excluding completed jobs
  const activeOPJobs = wonJobs.filter((j) =>
    OP_STAGES.includes(j.op_stage as typeof OP_STAGES[number]) &&
    j.op_stage !== 'OP_DONE_PAYMENT'
  ).length

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
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={cn(
            'w-[15px] h-[15px] shrink-0 transition-colors',
            isActive ? 'text-[var(--sidebar-primary)]' : 'text-muted-foreground group-hover:text-foreground/80'
          )} />
          <span className="leading-none">{label}</span>
        </div>
        {badge != null && badge > 0 && (
          <span className={cn(
            'text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5 leading-none',
            isActive ? 'bg-[var(--sidebar-primary)] text-white' : 'bg-muted text-muted-foreground'
          )}>
            {badge}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-4 pb-3 border-b border-[var(--sidebar-border)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--sidebar-primary)] flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-foreground font-bold text-[14px] leading-tight tracking-tight">SX CRM</p>
            <p className="text-muted-foreground text-[10px] leading-tight">by SIXSHEET</p>
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1">Menu</p>
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      {/* Push notification opt-in banner */}
      <PushPermissionBanner />

      {/* Bottom */}
      <div className="px-3 py-2 border-t border-[var(--sidebar-border)] shrink-0">
        {bottomItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}

        {/* Theme toggle — global action */}
        <ThemeToggleRow />

        {/* User Profile */}
        <UserProfile />
      </div>
    </div>
  )
}

// ── Sidebar (desktop + mobile) ─────────────────────────────────────────────────

export function Sidebar() {
  const { open, setOpen } = useMobileNav()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[228px] min-h-screen bg-card border-r border-[var(--sidebar-border)] shrink-0">
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
        'fixed top-0 left-0 z-50 h-full w-[228px] bg-card border-r border-[var(--sidebar-border)] flex flex-col transition-transform duration-200 lg:hidden',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <NavContent onNavClick={() => setOpen(false)} />
      </aside>
    </>
  )
}
