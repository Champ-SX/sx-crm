'use client'

import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileNav } from '@/components/layout/mobile-nav-context'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  const { setOpen } = useMobileNav()

  return (
    <div className={cn(
      'flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 lg:py-4 bg-card border-b border-border shrink-0',
      className
    )}>
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => setOpen(true)}
          className="lg:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-tight">{title}</h1>
          {description && (
            <p className="text-[11px] sm:text-[12px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">{description}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2">{children}</div>
      )}
    </div>
  )
}
