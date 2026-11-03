'use client'

import { useState } from 'react'
import { Truck } from 'lucide-react'
import { useCRMStore } from '@/store/crm-store'
import { useHydrated } from '@/hooks/use-hydrated'
import { MobileMenuButton } from '@/components/layout/mobile-menu-button'
import { SuppliersView } from '@/components/anf/suppliers-view'
import { ItemDrawer } from '@/components/anf/item-drawer'
import { ProductDialog } from '@/components/anf/product-dialog'
import { useAuth } from '@/components/auth-provider'
import { ANF_ACCENT } from '@/lib/anf'
import type { AnfProduct } from '@/types'

/** Buying → Suppliers · ร้านค้า: the shop contact book. Items open in the item drawer. */
export default function SuppliersPage() {
  const isHydrated = useHydrated()
  const { role } = useAuth()
  const anfProducts = useCRMStore((s) => s.anfProducts)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState<AnfProduct | null>(null)
  if (!isHydrated) return null
  const product = anfProducts.find((p) => p.product_id === openId)
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="bg-card border-b border-border px-4 sm:px-6 lg:px-8 py-3 lg:py-4 shrink-0 flex items-center gap-3">
        <MobileMenuButton />
        <span className="w-3.5 h-3.5 rounded-[5px] shrink-0 flex items-center justify-center" style={{ backgroundColor: ANF_ACCENT }}><Truck className="w-2.5 h-2.5 text-white" /></span>
        <h1 className="text-[15px] sm:text-[17px] font-semibold text-foreground tracking-tight leading-none">Suppliers · ร้านค้า</h1>
      </div>
      <SuppliersView onOpenItem={setOpenId} />
      {product && <ItemDrawer product={product} canEdit={role === 'admin'} onEdit={(p) => { setOpenId(null); setEditing(p) }} onReorder={() => setOpenId(null)} onClose={() => setOpenId(null)} />}
      {editing && <ProductDialog product={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
