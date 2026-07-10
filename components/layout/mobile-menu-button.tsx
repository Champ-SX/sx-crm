'use client'

import { useMobileNav } from '@/components/layout/mobile-nav-context'
import { Menu } from 'lucide-react'

export function MobileMenuButton() {
  const { setOpen } = useMobileNav()
  return (
    <button
      onClick={() => setOpen(true)}
      className="lg:hidden p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}
