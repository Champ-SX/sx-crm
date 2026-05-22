'use client'

import { useMobileNav } from '@/components/layout/mobile-nav-context'
import { Menu } from 'lucide-react'

export function MobileMenuButton() {
  const { setOpen } = useMobileNav()
  return (
    <button
      onClick={() => setOpen(true)}
      className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  )
}
